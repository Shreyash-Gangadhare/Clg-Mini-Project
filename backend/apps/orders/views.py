from django.db.models import F as models_F, Sum
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.users.permissions import IsStudentUser, IsStaffUser
from apps.menu.models import MenuItem
from apps.slots.models import Slot, SlotItemCapacity
from .models import Order, OrderItem
from .serializers import OrderSerializer, PlaceOrderSerializer
from .qr_utils import generate_qr_token, generate_qr_data, verify_qr_token, generate_qr_image_base64


class OrderViewSet(viewsets.ModelViewSet):
    """
    POST   /api/v1/orders/                     — place order
    GET    /api/v1/orders/                     — list student's orders
    GET    /api/v1/orders/{id}/                — get single order
    GET    /api/v1/orders/{id}/qr/             — get QR data
    POST   /api/v1/orders/{id}/scan/           — mark picked up (staff)
    POST   /api/v1/orders/bulk-status/         — bulk status update (staff)
    """
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsStudentUser()]
        if self.action in ('scan', 'bulk_status'):
            return [IsStaffUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('staff', 'admin'):
            return Order.objects.prefetch_related('items__menu_item').select_related('slot', 'user').all()
        return Order.objects.filter(user=user).prefetch_related('items__menu_item').select_related('slot')

    def create(self, request):
        serializer = PlaceOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Validate slot
        try:
            slot = Slot.objects.get(id=data['slot_id'])
        except Slot.DoesNotExist:
            return Response({'detail': 'Slot not found.'}, status=404)

        if not slot.is_open:
            return Response({'detail': 'This slot is closed for ordering.'}, status=400)

        # Validate capacity for each item
        order_items_data = []
        for item_data in data['items']:
            menu_item_id = int(item_data['menu_item_id'])
            quantity = int(item_data['quantity'])
            try:
                menu_item = MenuItem.objects.get(id=menu_item_id, is_available=True)
            except MenuItem.DoesNotExist:
                return Response({'detail': f'Menu item {menu_item_id} not found or unavailable.'}, status=400)

            try:
                cap = SlotItemCapacity.objects.select_for_update().get(slot=slot, menu_item=menu_item)
                if cap.remaining < quantity:
                    return Response(
                        {'detail': f'{menu_item.name} has only {cap.remaining} remaining for this slot.'},
                        status=400
                    )
            except SlotItemCapacity.DoesNotExist:
                pass  # No cap set means unlimited

            order_items_data.append((menu_item, quantity))

        # Token number = count of existing orders for this slot + 1
        token_number = Order.objects.filter(slot=slot).count() + 1

        # Create order
        total = sum(mi.price * qty for mi, qty in order_items_data)
        order = Order.objects.create(
            user=request.user,
            slot=slot,
            total_amount=total,
            token_number=token_number,
            status=Order.STATUS_PLACED,
            payment_status=Order.PAYMENT_PENDING,
        )

        for menu_item, quantity in order_items_data:
            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=quantity,
                price_at_order=menu_item.price,
            )

        # Reserve capacity
        for menu_item, quantity in order_items_data:
            SlotItemCapacity.objects.filter(slot=slot, menu_item=menu_item).update(
                units_booked=models_F('units_booked') + quantity
            )

        # Generate QR token
        qr_token = generate_qr_token(order.id, slot.id, request.user.id)
        order.qr_token = qr_token
        order.save(update_fields=['qr_token'])

        return Response(OrderSerializer(order).data, status=201)

    @action(detail=True, methods=['get'], url_path='qr')
    def qr(self, request, pk=None):
        order = self.get_object()
        if order.payment_status != Order.PAYMENT_PAID:
            return Response({'detail': 'QR not available until payment is confirmed.'}, status=400)
        qr_data = generate_qr_data(order)
        qr_image = generate_qr_image_base64(qr_data)
        return Response({
            'order_id': order.id,
            'token_number': order.token_number,
            'qr_data': qr_data,
            'qr_image_url': qr_image,
        })

    @action(detail=True, methods=['post'], url_path='scan')
    def scan(self, request, pk=None):
        order = self.get_object()
        token = request.data.get('token', '')

        # Manual token entry (staff override)
        if token == 'manual':
            pass  # skip verification for staff manual entry
        elif not verify_qr_token(order.id, token, order.slot_id, order.user_id):
            return Response({'detail': 'Invalid QR code.'}, status=400)

        if order.status == Order.STATUS_PICKED_UP:
            return Response({'detail': 'Already picked up.'}, status=400)
        if order.payment_status != Order.PAYMENT_PAID:
            return Response({'detail': 'Order not paid.'}, status=400)

        order.status = Order.STATUS_PICKED_UP
        order.save(update_fields=['status'])

        # Push WS update
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        try:
            async_to_sync(channel_layer.group_send)(
                f'order_{order.id}',
                {'type': 'order.status_update', 'status': Order.STATUS_PICKED_UP}
            )
        except Exception:
            pass

        return Response({'order': OrderSerializer(order).data})

    @action(detail=False, methods=['post'], url_path='bulk-status')
    def bulk_status(self, request):
        slot_id = request.data.get('slot_id')
        from_status = request.data.get('from_status')
        to_status = request.data.get('to_status')

        valid_transitions = {
            Order.STATUS_PLACED: Order.STATUS_PREPARING,
            Order.STATUS_PREPARING: Order.STATUS_READY,
        }
        if valid_transitions.get(from_status) != to_status:
            return Response({'detail': f'Invalid transition: {from_status} → {to_status}'}, status=400)

        updated = Order.objects.filter(
            slot_id=slot_id,
            status=from_status,
            payment_status=Order.PAYMENT_PAID,
        ).update(status=to_status)

        # Push WS updates
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        orders = Order.objects.filter(slot_id=slot_id, status=to_status)
        for order in orders:
            try:
                async_to_sync(channel_layer.group_send)(
                    f'order_{order.id}',
                    {'type': 'order.status_update', 'status': to_status}
                )
            except Exception:
                pass

        return Response({'updated': updated, 'to_status': to_status})


# ── Dashboard ──────────────────────────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncDate
        today = timezone.now().date()

        paid_orders = Order.objects.filter(
            payment_status=Order.PAYMENT_PAID,
            slot__date=today,
        )
        revenue = paid_orders.aggregate(total=Sum('total_amount'))['total'] or 0
        orders_processed = paid_orders.filter(status=Order.STATUS_PICKED_UP).count()
        orders_pending = paid_orders.exclude(status__in=[
            Order.STATUS_PICKED_UP, Order.STATUS_CANCELLED
        ]).count()

        # Top 5 items by units sold today
        from apps.orders.models import OrderItem
        top = (
            OrderItem.objects
            .filter(order__in=paid_orders)
            .values('menu_item__name')
            .annotate(count=Sum('quantity'))
            .order_by('-count')[:5]
        )
        top_items = [{'name': r['menu_item__name'], 'count': r['count']} for r in top]

        return Response({
            'revenue': str(revenue),
            'orders_processed': orders_processed,
            'orders_pending': orders_pending,
            'top_items': top_items,
        })


class CanteenStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        today = timezone.now().date()
        orders_today = Order.objects.filter(slot__date=today).count()
        return Response({
            'is_open': True,
            'message': 'Kitchen is live 🔥',
            'orders_today': orders_today,
        })


# ── Insights ───────────────────────────────────────────────────────────────

class InsightsView(APIView):
    """
    GET /api/v1/insights/

    Returns computed analytics over all historical orders.
    Staff-only endpoint.

    Query params:
        demo=1  — return sample data when real order count < 5.
                  The response always includes is_sample_data: bool so the
                  frontend can show an appropriate banner.

    Response is intentionally NOT cached server-side in the mock/dev
    environment so changes are visible immediately during development.
    In production, wrap with Django's cache_page or a CDN TTL.
    """
    permission_classes = [IsStaffUser]

    # Minimum real orders before we use real data (not sample)
    MIN_REAL_ORDERS = 5

    def get(self, request):
        from .analytics import (
            compute_peak_hours,
            compute_peak_days,
            compute_cancelled_items,
            compute_revenue_by_category,
            compute_orders_processed,
            compute_waste_reduction,
            compute_wait_time_reduction,
        )
        from .analytics_sample import get_sample_payload

        use_demo = request.query_params.get('demo') == '1'
        real_count = Order.objects.count()

        # Fall back to sample data if explicitly requested and DB is sparse
        if use_demo and real_count < self.MIN_REAL_ORDERS:
            return Response(get_sample_payload())

        # Real computation — operate on full order history
        all_orders = Order.objects.select_related('slot', 'user').all()

        return Response({
            'is_sample_data': False,
            'peak_hours': compute_peak_hours(all_orders),
            'peak_days': compute_peak_days(all_orders),
            'cancelled_items': compute_cancelled_items(all_orders),
            'revenue_by_category': compute_revenue_by_category(all_orders),
            'orders_processed': compute_orders_processed(all_orders),
            'waste_reduction': compute_waste_reduction(all_orders),
            'wait_time': compute_wait_time_reduction(all_orders),
        })


# ── Recommendations ────────────────────────────────────────────────────────

_CACHE_KEY_SIM = 'campuseats_item_similarity_matrix'
_CACHE_TTL = 600  # 10 minutes


def _get_cached_sim():
    """Return the cached similarity DataFrame, or None if stale/absent."""
    from django.core.cache import cache
    return cache.get(_CACHE_KEY_SIM)


def _set_cached_sim(sim_df):
    from django.core.cache import cache
    cache.set(_CACHE_KEY_SIM, sim_df, _CACHE_TTL)


class ItemRecommendationsView(APIView):
    """
    GET /api/v1/recommendations/item/{item_id}/

    Return up to N items similar to the given menu item.
    Available to any authenticated user (student or staff).

    Query params:
        exclude  — comma-separated item IDs to exclude (e.g. current cart)
        n        — max results (default 3, max 6)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, item_id):
        from .recommendations import get_item_recommendations, build_cooccurrence_matrix, compute_cosine_similarity

        # Parse query params
        raw_exclude = request.query_params.get('exclude', '')
        try:
            exclude_ids = [int(x) for x in raw_exclude.split(',') if x.strip()]
        except ValueError:
            exclude_ids = []

        try:
            n = max(1, min(6, int(request.query_params.get('n', 3))))
        except ValueError:
            n = 3

        all_orders = Order.objects.all()
        menu_qs = MenuItem.objects.all()

        # Use cached similarity matrix if available
        sim_df = _get_cached_sim()
        if sim_df is None:
            from .recommendations import build_cooccurrence_matrix, compute_cosine_similarity
            _cooc, pivot = build_cooccurrence_matrix(all_orders)
            sim_df = compute_cosine_similarity(pivot)
            if not sim_df.empty:
                _set_cached_sim(sim_df)

        result = get_item_recommendations(
            item_id=item_id,
            cart_ids=exclude_ids,
            n=n,
            order_qs=all_orders,
            menu_qs=menu_qs,
            sim_df=sim_df,
        )
        return Response(result)


class CartRecommendationsView(APIView):
    """
    GET /api/v1/recommendations/cart/

    Return up to N recommended add-ons based on the given basket of item IDs.
    Available to any authenticated user.

    Query params:
        ids  — comma-separated item IDs in the cart (required)
        n    — max results (default 2, max 4)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .recommendations import get_cart_recommendations

        raw_ids = request.query_params.get('ids', '')
        try:
            cart_ids = [int(x) for x in raw_ids.split(',') if x.strip()]
        except ValueError:
            cart_ids = []

        try:
            n = max(1, min(4, int(request.query_params.get('n', 2))))
        except ValueError:
            n = 2

        all_orders = Order.objects.all()
        menu_qs = MenuItem.objects.all()

        sim_df = _get_cached_sim()
        if sim_df is None:
            from .recommendations import build_cooccurrence_matrix, compute_cosine_similarity
            _cooc, pivot = build_cooccurrence_matrix(all_orders)
            sim_df = compute_cosine_similarity(pivot)
            if not sim_df.empty:
                _set_cached_sim(sim_df)

        result = get_cart_recommendations(
            cart_ids=cart_ids,
            n=n,
            order_qs=all_orders,
            menu_qs=menu_qs,
            sim_df=sim_df,
        )
        return Response(result)
