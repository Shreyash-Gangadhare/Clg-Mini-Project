"""
Slot capacity signals — refund when capacity is reduced below booked units.
"""
from django.db.models.signals import pre_save
from django.dispatch import receiver


@receiver(pre_save, sender='slots.SlotItemCapacity')
def on_capacity_save(sender, instance, **kwargs):
    """Detect when max_units reduced below units_booked."""
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    if instance.max_units < old.max_units and instance.max_units < instance.units_booked:
        # Capacity reduced — need to refund some orders
        excess = instance.units_booked - instance.max_units
        _refund_excess_capacity(instance, excess)


def _refund_excess_capacity(cap, excess_units: int):
    """
    Find the most recently placed orders for this slot+item and refund
    the excess units (FIFO: newest orders get cancelled first).
    """
    from apps.orders.models import Order, OrderItem
    from decimal import Decimal

    order_items = OrderItem.objects.filter(
        order__slot_id=cap.slot_id,
        menu_item_id=cap.menu_item_id,
        order__status__in=[Order.STATUS_PLACED, Order.STATUS_PREPARING],
        order__payment_status=Order.PAYMENT_PAID,
    ).select_related('order').order_by('-order__created_at')

    remaining_excess = excess_units
    for oi in order_items:
        if remaining_excess <= 0:
            break
        refund_qty = min(oi.quantity, remaining_excess)
        refund_amount = Decimal(str(oi.price_at_order)) * refund_qty
        remaining_excess -= refund_qty

        from apps.menu.signals import _process_refund
        _process_refund(
            oi.order,
            refund_amount,
            f'Capacity reduced for {oi.menu_item.name} in slot {cap.slot}'
        )

        if refund_qty >= oi.quantity:
            oi.delete()
        else:
            oi.quantity -= refund_qty
            oi.save(update_fields=['quantity'])

        oi.order.recalculate_total()
        cap.units_booked = max(cap.units_booked - refund_qty, 0)
