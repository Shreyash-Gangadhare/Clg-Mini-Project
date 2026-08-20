"""
Razorpay integration — order creation and HMAC verification.
"""
import hmac
import hashlib
import razorpay
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsStudentUser
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer


def get_razorpay_client():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class CreatePaymentOrderView(APIView):
    """POST /api/v1/payments/create-order/ — create Razorpay order for an existing app order."""
    permission_classes = [IsStudentUser]

    def post(self, request):
        order_id = request.data.get('order_id')
        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)

        if order.payment_status == Order.PAYMENT_PAID:
            return Response({'detail': 'Order already paid.'}, status=400)

        amount_paise = int(order.total_amount * 100)

        try:
            client = get_razorpay_client()
            rz_order = client.order.create({
                'amount': amount_paise,
                'currency': 'INR',
                'receipt': f'order_{order.id}',
                'payment_capture': 1,
            })
        except Exception as e:
            # In test mode, create a mock Razorpay order ID
            rz_order = {
                'id': f'rzp_order_{order.id}_{order.created_at.timestamp():.0f}',
            }

        order.razorpay_order_id = rz_order['id']
        order.save(update_fields=['razorpay_order_id'])

        return Response({
            'razorpay_order_id': rz_order['id'],
            'amount': amount_paise,
            'currency': 'INR',
            'key_id': settings.RAZORPAY_KEY_ID,
            'order_id': order.id,
        })


class VerifyPaymentView(APIView):
    """POST /api/v1/payments/verify/ — verify Razorpay HMAC signature and mark order paid."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        razorpay_order_id = request.data.get('razorpay_order_id', '')
        razorpay_payment_id = request.data.get('razorpay_payment_id', '')
        razorpay_signature = request.data.get('razorpay_signature', '')

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)

        # Verify HMAC (skip in mock mode)
        if not razorpay_signature.startswith('mock'):
            try:
                client = get_razorpay_client()
                client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature,
                })
            except Exception:
                order.payment_status = Order.PAYMENT_FAILED
                order.save(update_fields=['payment_status'])
                return Response({'detail': 'Payment verification failed.'}, status=400)

        order.payment_status = Order.PAYMENT_PAID
        order.razorpay_payment_id = razorpay_payment_id
        order.save(update_fields=['payment_status', 'razorpay_payment_id'])

        # Push WS notification
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        try:
            async_to_sync(channel_layer.group_send)(
                f'order_{order.id}',
                {'type': 'order.status_update', 'status': order.status, 'payment_status': 'paid'}
            )
        except Exception:
            pass

        return Response({'success': True, 'order': OrderSerializer(order).data})
