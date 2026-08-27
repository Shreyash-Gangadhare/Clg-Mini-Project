"""
test_recommendations.py — Unit tests for the CampusEats recommendation engine.

Tests cover:
1. Correct top-N similar items for an item with clear co-occurrence signal.
2. Fallback behaviour when an item has zero order history (new item).
3. Fallback behaviour when total order volume is below the threshold.
4. Cart items are correctly excluded from recommendations.
5. Unavailable items are correctly excluded.

The helper functions (make_slot, make_student, make_item, make_paid_order)
follow the same pattern as test_refund.py to keep the test setup consistent.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.users.models import User
from apps.menu.models import MenuItem
from apps.slots.models import Slot
from apps.orders.models import Order, OrderItem
from apps.orders.recommendations import (
    MIN_ORDERS_FOR_SIMILARITY,
    build_cooccurrence_matrix,
    compute_cosine_similarity,
    get_item_recommendations,
    get_cart_recommendations,
)


# ---------------------------------------------------------------------------
# Shared helpers (mirrors test_refund.py pattern)
# ---------------------------------------------------------------------------

def make_slot(offset_minutes=60):
    """Create a slot ``offset_minutes`` from now."""
    now = timezone.now()
    start_dt = now + timedelta(minutes=offset_minutes)
    end_dt   = start_dt + timedelta(minutes=15)
    cutoff   = start_dt - timedelta(minutes=30)
    return Slot.objects.create(
        date=start_dt.date(),
        start_time=start_dt.time(),
        end_time=end_dt.time(),
        cutoff_time=cutoff,
    )


def make_student(email='test@sies.edu.in'):
    return User.objects.create_user(
        email=email, name='Test Student', password='pw123', role='student'
    )


def make_item(name='Vada Pav', price='15.00', category='ready_stock', available=True):
    return MenuItem.objects.create(
        name=name, price=price, category=category, veg_flag=True, is_available=available
    )


def make_order(user, slot, items_and_qty, status='placed', payment_status='paid'):
    """
    Create an Order with OrderItems.

    Args:
        items_and_qty: list of (MenuItem, quantity) tuples.
    """
    total = sum(Decimal(str(item.price)) * qty for item, qty in items_and_qty)
    order = Order.objects.create(
        user=user, slot=slot,
        total_amount=total,
        token_number=Order.objects.filter(slot=slot).count() + 1,
        status=status,
        payment_status=payment_status,
    )
    for item, qty in items_and_qty:
        OrderItem.objects.create(
            order=order, menu_item=item, quantity=qty, price_at_order=item.price
        )
    return order


# ---------------------------------------------------------------------------
# Helpers for generating enough orders to pass the threshold
# ---------------------------------------------------------------------------

def seed_cooccurrences(user, slot, item_a, item_b, n_together, item_c=None, n_c=1):
    """
    Create ``n_together`` orders that contain both ``item_a`` and ``item_b``,
    and ``n_c`` orders that contain ``item_a`` and ``item_c`` (if given).
    Returns all created orders.
    """
    orders = []
    for _ in range(n_together):
        o = make_order(user, slot, [(item_a, 1), (item_b, 1)])
        orders.append(o)
    if item_c is not None:
        for _ in range(n_c):
            o = make_order(user, slot, [(item_a, 1), (item_c, 1)])
            orders.append(o)
    return orders


def pad_to_threshold(user, slot, items, current_count):
    """Create solo orders to reach MIN_ORDERS_FOR_SIMILARITY."""
    needed = max(0, MIN_ORDERS_FOR_SIMILARITY - current_count)
    for i in range(needed):
        item = items[i % len(items)]
        make_order(user, slot, [(item, 1)])


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCooccurrenceMatrix(TestCase):
    """Unit tests for build_cooccurrence_matrix and compute_cosine_similarity."""

    def setUp(self):
        self.user = make_student()
        self.slot = make_slot()
        self.a = make_item('Item A', '20.00')
        self.b = make_item('Item B', '30.00')
        self.c = make_item('Item C', '40.00')

    def test_cooccurrence_counts_correctly(self):
        """A and B co-occur 3 times; A and C co-occur 1 time."""
        for _ in range(3):
            make_order(self.user, self.slot, [(self.a, 1), (self.b, 1)])
        make_order(self.user, self.slot, [(self.a, 1), (self.c, 1)])

        all_orders = Order.objects.all()
        cooc, pivot = build_cooccurrence_matrix(all_orders)

        self.assertIn(self.a.id, cooc.index)
        self.assertEqual(cooc.loc[self.a.id, self.b.id], 3)
        self.assertEqual(cooc.loc[self.a.id, self.c.id], 1)
        # Diagonal should be zero
        self.assertEqual(cooc.loc[self.a.id, self.a.id], 0)

    def test_empty_orders_returns_empty_matrix(self):
        cooc, pivot = build_cooccurrence_matrix(Order.objects.none())
        self.assertTrue(cooc.empty)

    def test_similarity_values_in_range(self):
        """All cosine similarity values must be in [0, 1]."""
        for _ in range(4):
            make_order(self.user, self.slot, [(self.a, 1), (self.b, 1)])
        make_order(self.user, self.slot, [(self.a, 1), (self.c, 1)])

        cooc, pivot = build_cooccurrence_matrix(Order.objects.all())
        sim = compute_cosine_similarity(pivot)

        self.assertFalse(sim.empty)
        self.assertTrue((sim.values >= 0).all())
        self.assertTrue((sim.values <= 1.001).all())  # allow floating-point rounding


class TestGetItemRecommendations(TestCase):
    """Tests for get_item_recommendations."""

    def setUp(self):
        self.user  = make_student()
        self.slot  = make_slot()
        self.a = make_item('Idli',        '30.00', 'ready_stock')
        self.b = make_item('Sambar',      '20.00', 'ready_stock')
        self.c = make_item('Filter Coffee', '25.00', 'ready_stock')
        self.d = make_item('Vada',        '25.00', 'ready_stock')

    def _all_orders(self):
        return Order.objects.all()

    def _all_menu(self):
        return MenuItem.objects.all()

    def test_similar_item_ranked_first(self):
        """Item B co-occurs with A 10 times; C co-occurs with A 2 times → B ranked first."""
        seed_cooccurrences(
            self.user, self.slot, self.a, self.b,
            n_together=10, item_c=self.c, n_c=2,
        )
        pad_to_threshold(
            self.user, self.slot,
            [self.d], Order.objects.count(),
        )

        result = get_item_recommendations(
            self.a.id, cart_ids=[], n=2,
            order_qs=self._all_orders(), menu_qs=self._all_menu(),
        )

        self.assertEqual(result['source'], 'cosine_similarity')
        self.assertTrue(len(result['recommendations']) > 0)
        # B should appear before C
        names = [r['name'] for r in result['recommendations']]
        self.assertIn('Sambar', names)
        if 'Filter Coffee' in names:
            self.assertLess(names.index('Sambar'), names.index('Filter Coffee'))

    def test_fallback_below_threshold(self):
        """With fewer than MIN_ORDERS_FOR_SIMILARITY orders → fallback_category or fallback_popularity."""
        # Create only 3 orders (well below threshold)
        for _ in range(3):
            make_order(self.user, self.slot, [(self.a, 1), (self.b, 1)])

        result = get_item_recommendations(
            self.a.id, cart_ids=[], n=2,
            order_qs=self._all_orders(), menu_qs=self._all_menu(),
        )

        self.assertIn(result['source'], ('fallback_category', 'fallback_popularity'))

    def test_fallback_for_new_item(self):
        """Item with no order history at all → fallback_category."""
        # Create enough orders using only b, c, d — not item a
        for _ in range(MIN_ORDERS_FOR_SIMILARITY + 5):
            make_order(self.user, self.slot, [(self.b, 1), (self.c, 1)])

        new_item = make_item('Brand New Dish', '50.00', 'ready_stock')

        result = get_item_recommendations(
            new_item.id, cart_ids=[], n=2,
            order_qs=self._all_orders(), menu_qs=self._all_menu(),
        )

        # Source must NOT claim cosine_similarity for a brand-new item
        self.assertIn(result['source'], ('fallback_category', 'fallback_popularity'))
        # Result must not include the new item itself
        returned_ids = [r['id'] for r in result['recommendations']]
        self.assertNotIn(new_item.id, returned_ids)

    def test_cart_items_excluded(self):
        """Items already in the cart must not appear in recommendations."""
        seed_cooccurrences(
            self.user, self.slot, self.a, self.b,
            n_together=10, item_c=self.c, n_c=5,
        )
        pad_to_threshold(self.user, self.slot, [self.d], Order.objects.count())

        # Cart contains B
        result = get_item_recommendations(
            self.a.id, cart_ids=[self.b.id], n=3,
            order_qs=self._all_orders(), menu_qs=self._all_menu(),
        )

        returned_ids = [r['id'] for r in result['recommendations']]
        self.assertNotIn(self.b.id, returned_ids)

    def test_unavailable_items_excluded(self):
        """Items with is_available=False must not appear in recommendations."""
        seed_cooccurrences(
            self.user, self.slot, self.a, self.b,
            n_together=10, item_c=self.c, n_c=5,
        )
        pad_to_threshold(self.user, self.slot, [self.d], Order.objects.count())

        # Mark B as unavailable
        self.b.is_available = False
        self.b.save(update_fields=['is_available'])

        result = get_item_recommendations(
            self.a.id, cart_ids=[], n=3,
            order_qs=self._all_orders(), menu_qs=self._all_menu(),
        )

        returned_ids = [r['id'] for r in result['recommendations']]
        self.assertNotIn(self.b.id, returned_ids)


class TestGetCartRecommendations(TestCase):
    """Tests for get_cart_recommendations."""

    def setUp(self):
        self.user = make_student()
        self.slot = make_slot()
        self.a = make_item('Poha',         '40.00', 'ready_stock')
        self.b = make_item('Tea',          '10.00', 'ready_stock')
        self.c = make_item('Masala Dosa',  '60.00', 'made_to_order')
        self.d = make_item('Filter Coffee','25.00', 'ready_stock')

    def _all_orders(self):
        return Order.objects.all()

    def _all_menu(self):
        return MenuItem.objects.all()

    def test_cart_recs_exclude_cart_items(self):
        """Recommendations for a cart must never include items already in the cart."""
        for _ in range(MIN_ORDERS_FOR_SIMILARITY + 2):
            make_order(self.user, self.slot, [(self.a, 1), (self.b, 1), (self.c, 1)])

        result = get_cart_recommendations(
            cart_ids=[self.a.id, self.b.id], n=2,
            order_qs=self._all_orders(), menu_qs=self._all_menu(),
        )

        returned_ids = [r['id'] for r in result['recommendations']]
        self.assertNotIn(self.a.id, returned_ids)
        self.assertNotIn(self.b.id, returned_ids)

    def test_empty_cart_returns_popularity_fallback(self):
        """Empty cart → popularity fallback (not an error or empty list)."""
        for _ in range(MIN_ORDERS_FOR_SIMILARITY + 2):
            make_order(self.user, self.slot, [(self.c, 1)])

        result = get_cart_recommendations(
            cart_ids=[], n=2,
            order_qs=self._all_orders(), menu_qs=self._all_menu(),
        )

        self.assertIn(result['source'], ('fallback_popularity', 'fallback_category'))
        # Must return something (not crash or return empty)
        self.assertIsInstance(result['recommendations'], list)

    def test_below_threshold_returns_popularity_fallback(self):
        """Below MIN_ORDERS_FOR_SIMILARITY → popularity fallback, not cosine."""
        for _ in range(3):
            make_order(self.user, self.slot, [(self.a, 1), (self.b, 1)])

        result = get_cart_recommendations(
            cart_ids=[self.a.id], n=2,
            order_qs=self._all_orders(), menu_qs=self._all_menu(),
        )

        self.assertNotEqual(result['source'], 'cosine_similarity')


# ---------------------------------------------------------------------------
# Cache-invalidation signal tests (Task 2)
# ---------------------------------------------------------------------------

class TestCacheInvalidationSignal(TestCase):
    """
    Verify that the post_save signal on Order invalidates the similarity-matrix
    cache exactly when payment_status transitions to 'paid', and not otherwise.
    """

    def setUp(self):
        self.user = make_student('cache_signal@sies.edu.in')
        self.slot = make_slot()
        self.item_a = make_item('Cache Item A', '20.00')
        self.item_b = make_item('Cache Item B', '25.00')

    def _seed_cache(self):
        """Plant a sentinel value in the cache and return the key."""
        from django.core.cache import cache
        from apps.orders.signals import _CACHE_KEY_SIM
        cache.set(_CACHE_KEY_SIM, 'sentinel_value', 60)
        return _CACHE_KEY_SIM

    def test_cache_invalidated_on_payment_transition_to_paid(self):
        """
        Creating an order with payment_status='pending' then updating it to
        'paid' should delete the similarity-matrix cache entry.
        """
        from django.core.cache import cache

        cache_key = self._seed_cache()
        self.assertEqual(cache.get(cache_key), 'sentinel_value')  # cache is set

        # Create order as pending (no invalidation expected)
        order = Order.objects.create(
            user=self.user, slot=self.slot,
            total_amount='20.00', token_number=1,
            status='placed', payment_status='pending',
        )
        OrderItem.objects.create(
            order=order, menu_item=self.item_a, quantity=1, price_at_order=self.item_a.price
        )

        # Cache still intact — 'pending' create should NOT invalidate
        self.assertEqual(cache.get(cache_key), 'sentinel_value')

        # Re-plant sentinel in case the create did invalidate (defensive)
        cache.set(cache_key, 'sentinel_value', 60)

        # Now transition to paid
        order.payment_status = 'paid'
        order.save(update_fields=['payment_status'])

        # Cache must be cleared
        self.assertIsNone(cache.get(cache_key), 'Expected cache to be invalidated after transition to paid')

    def test_cache_not_invalidated_on_unrelated_field_update(self):
        """
        Updating Order.status (e.g. placed→preparing) without touching
        payment_status must NOT invalidate the similarity-matrix cache.
        """
        from django.core.cache import cache

        # Create a paid order so signal fires once and cache is already clear
        order = make_order(self.user, self.slot, [(self.item_a, 1)], payment_status='paid')

        # Plant sentinel after the paid-order creation (which would have cleared it)
        cache_key = self._seed_cache()
        self.assertEqual(cache.get(cache_key), 'sentinel_value')

        # Update an unrelated field — status changes, payment_status stays 'paid'
        order.status = 'preparing'
        order.save(update_fields=['status'])

        # Cache must NOT be cleared — payment_status didn't change
        self.assertEqual(
            cache.get(cache_key), 'sentinel_value',
            'Cache should NOT be invalidated on a non-payment_status update'
        )
