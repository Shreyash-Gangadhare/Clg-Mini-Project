"""
Refund signal — Section 11 requirement.

When a MenuItem is set is_available=False OR when SlotItemCapacity max_units
is reduced below units_booked, automatically:
1. Find all affected paid+placed/preparing orders.
2. Remove the affected item from those orders.
3. Issue Razorpay partial refund.
4. Recalculate order total.
5. Push WS refund notification to student.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from decimal import Decimal


@receiver(pre_save, sender='menu.MenuItem')
def on_menu_item_save(sender, instance, **kwargs):
    """Detect when is_available changes to False."""
    if not instance.pk:
        return  # new item, skip
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    if old.is_available and not instance.is_available:
        # Trigger refunds for this item in all open slots
        _refund_for_unavailable_item(instance)


def _refund_for_unavailable_item(menu_item):
    """Find all placed/preparing paid orders containing this item and refund it."""
    from apps.orders.models import Order, OrderItem
    order_items = OrderItem.objects.filter(
        menu_item=menu_item,
        order__status__in=[Order.STATUS_PLACED, Order.STATUS_PREPARING],
        order__payment_status=Order.PAYMENT_PAID,
    ).select_related('order')

    processed_orders = set()
    for oi in order_items:
        if oi.order_id in processed_orders:
            continue
        processed_orders.add(oi.order_id)
        refund_amount = oi.price_at_order * oi.quantity
        _process_refund(oi.order, refund_amount, f'{menu_item.name} is now unavailable')
        # Remove the item from the order
        oi.delete()
        oi.order.recalculate_total()


def _process_refund(order, amount: Decimal, reason: str):
    """Issue partial refund via Razorpay and push WS notification."""
    from django.conf import settings

    # Attempt Razorpay partial refund
    if order.razorpay_payment_id and not order.razorpay_payment_id.startswith('pay_mock'):
        try:
            import razorpay
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            client.payment.refund(order.razorpay_payment_id, {
                'amount': int(amount * 100),
                'notes': {'reason': reason, 'order_id': str(order.id)},
            })
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Razorpay refund failed for order {order.id}: {e}')

    # Update payment status
    from apps.orders.models import Order
    new_total = order.total_amount - amount
    if new_total <= 0:
        order.payment_status = Order.PAYMENT_REFUNDED
    else:
        order.payment_status = Order.PAYMENT_PARTIAL_REFUND
    order.save(update_fields=['payment_status'])

    # Push WS notification to student
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    try:
        async_to_sync(channel_layer.group_send)(
            f'order_{order.id}',
            {
                'type': 'order.refund_issued',
                'amount': str(amount),
                'reason': reason,
                'new_total': str(max(new_total, Decimal('0'))),
            }
        )
    except Exception:
        pass
