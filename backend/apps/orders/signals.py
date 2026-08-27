"""
Order signals.

Refund logic is in apps.menu.signals and apps.slots.signals.

Cache invalidation
------------------
When a new paid order is recorded, the similarity matrix cached by the
recommendation engine is stale (it doesn't yet include this order).
We invalidate the cache key so the next recommendation request recomputes
and re-caches with fresh data.

We only invalidate on a *genuine payment transition* (old value != 'paid',
new value == 'paid') to avoid blowing the cache on every field update.
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Order

# Cache key must match the constant in views.py
_CACHE_KEY_SIM = 'campuseats_item_similarity_matrix'


@receiver(pre_save, sender=Order)
def _capture_old_payment_status(sender, instance, **kwargs):
    """Store the current DB value of payment_status on the instance before save."""
    if instance.pk:
        try:
            instance._pre_save_payment_status = (
                Order.objects.filter(pk=instance.pk)
                .values_list('payment_status', flat=True)
                .get()
            )
        except Order.DoesNotExist:
            instance._pre_save_payment_status = None
    else:
        # New instance — no previous status
        instance._pre_save_payment_status = None


@receiver(post_save, sender=Order)
def invalidate_sim_cache_on_paid_order(sender, instance, created, **kwargs):
    """
    Invalidate the recommendation similarity-matrix cache whenever an Order
    transitions to payment_status='paid'.

    Does NOT recompute synchronously — the next recommendation API call will
    rebuild and re-cache the matrix.
    """
    old_status = getattr(instance, '_pre_save_payment_status', None)
    new_status = instance.payment_status

    is_new_paid = created and new_status == Order.PAYMENT_PAID
    is_transitioned_to_paid = (not created) and (old_status != Order.PAYMENT_PAID) and (new_status == Order.PAYMENT_PAID)

    if is_new_paid or is_transitioned_to_paid:
        from django.core.cache import cache
        cache.delete(_CACHE_KEY_SIM)
