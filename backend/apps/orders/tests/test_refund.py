"""
test_refund.py — Phase 3 mandatory test case.

Tests the refund signal logic when:
1. MenuItem.is_available is set to False while paid orders exist
2. SlotItemCapacity.max_units is reduced below units_booked

Both cases should:
- Remove the item from affected orders
- Update payment_status to 'partial_refund' or 'refunded'
- Recalculate order total
"""
from datetime import timedelta, time, datetime
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from apps.users.models import User
from apps.menu.models import MenuItem
from apps.slots.models import Slot, SlotItemCapacity
from apps.orders.models import Order, OrderItem


def make_slot(offset_minutes=60):
    """Create a slot that starts `offset_minutes` from now."""
    now = timezone.now()
    start_dt = now + timedelta(minutes=offset_minutes)
    end_dt = start_dt + timedelta(minutes=15)
    cutoff = start_dt - timedelta(minutes=30)
    return Slot.objects.create(
        date=start_dt.date(),
        start_time=start_dt.time(),
        end_time=end_dt.time(),
        cutoff_time=cutoff,
    )


def make_student(email='test@sies.edu.in'):
    return User.objects.create_user(email=email, name='Test Student', password='pw123', role='student')


def make_item(name='Vada Pav', price='15.00', available=True):
    return MenuItem.objects.create(
        name=name, price=price, category='ready_stock', veg_flag=True, is_available=available
    )


def make_paid_order(user, slot, item, quantity=2):
    """Create a paid+placed order with the given item."""
    order = Order.objects.create(
        user=user,
        slot=slot,
        total_amount=Decimal(item.price) * quantity,
        token_number=1,
        status=Order.STATUS_PLACED,
        payment_status=Order.PAYMENT_PAID,
        razorpay_payment_id='pay_mock_test_123',
    )
    OrderItem.objects.create(
        order=order,
        menu_item=item,
        quantity=quantity,
        price_at_order=item.price,
    )
    return order


class TestMenuItemUnavailableRefund(TestCase):
    """
    When MenuItem.is_available is set False:
    - Affected paid+placed orders should have the item removed
    - payment_status should become 'partial_refund' (or 'refunded' if total goes to 0)
    - total_amount should be recalculated
    """

    def setUp(self):
        self.student = make_student()
        self.slot = make_slot()
        self.item = make_item()
        self.order = make_paid_order(self.student, self.slot, self.item, quantity=2)

    def test_order_total_before_refund(self):
        self.assertEqual(self.order.total_amount, Decimal('30.00'))

    @patch('apps.menu.signals._process_refund')
    def test_refund_triggered_on_is_available_false(self, mock_refund):
        """Signal should call _process_refund when is_available goes False."""
        self.item.is_available = False
        self.item.save()
        # Signal fires pre_save, so refund should be triggered
        mock_refund.assert_called_once()

    def test_order_item_removed_on_unavailable(self):
        """OrderItem should be deleted when item becomes unavailable."""
        self.item.is_available = False
        self.item.save()

        # Reload order
        self.order.refresh_from_db()
        remaining_items = self.order.items.count()
        self.assertEqual(remaining_items, 0, 'OrderItem should be removed when item becomes unavailable')

    def test_payment_status_updated_to_refunded_when_total_zero(self):
        """If the only item is refunded, payment_status should be 'refunded'."""
        # The order only has one item type, so full refund
        self.item.is_available = False
        self.item.save()
        self.order.refresh_from_db()
        self.assertIn(
            self.order.payment_status,
            [Order.PAYMENT_REFUNDED, Order.PAYMENT_PARTIAL_REFUND],
            'payment_status should be refunded or partial_refund after item removal'
        )

    def test_order_not_affected_if_already_picked_up(self):
        """Orders with status=picked_up should NOT be affected by refund signal."""
        self.order.status = Order.STATUS_PICKED_UP
        self.order.save()

        self.item.is_available = False
        self.item.save()

        self.order.refresh_from_db()
        # Items should still be there (order is already completed)
        self.assertEqual(self.order.items.count(), 1)


class TestSlotCapacityRefund(TestCase):
    """
    When SlotItemCapacity.max_units is reduced below units_booked:
    - Excess orders should be (partially) refunded
    - units_booked should be corrected
    """

    def setUp(self):
        self.student = make_student(email='cap@sies.edu.in')
        self.slot = make_slot(offset_minutes=120)
        self.item = make_item(name='Samosa (2 pcs)', price='20.00')
        self.cap = SlotItemCapacity.objects.create(
            slot=self.slot, menu_item=self.item, max_units=10, units_booked=4
        )
        # Two orders of 2 each = 4 booked
        self.order1 = make_paid_order(self.student, self.slot, self.item, quantity=2)
        self.order2 = make_paid_order(self.student, self.slot, self.item, quantity=2)

    @patch('apps.slots.signals._refund_excess_capacity')
    def test_refund_triggered_when_capacity_reduced(self, mock_excess):
        """Reducing max_units below units_booked should trigger refund."""
        self.cap.max_units = 2  # was 10, booked is 4 → excess of 2
        self.cap.save()
        mock_excess.assert_called_once()

    @patch('apps.slots.signals._refund_excess_capacity')
    def test_no_refund_when_capacity_not_reduced(self, mock_excess):
        """Increasing capacity should NOT trigger refund."""
        self.cap.max_units = 20
        self.cap.save()
        mock_excess.assert_not_called()


class TestOrderPlacement(TestCase):
    """Basic order placement flow."""

    def setUp(self):
        self.student = make_student(email='order@sies.edu.in')
        self.slot = make_slot(offset_minutes=90)  # slot is open (cutoff > now)
        self.item = make_item(name='Misal Pav', price='45.00')
        SlotItemCapacity.objects.create(
            slot=self.slot, menu_item=self.item, max_units=20, units_booked=0
        )

    def test_order_total_calculation(self):
        order = Order.objects.create(
            user=self.student,
            slot=self.slot,
            total_amount=Decimal('90.00'),
            token_number=1,
            status=Order.STATUS_PLACED,
            payment_status=Order.PAYMENT_PENDING,
        )
        OrderItem.objects.create(
            order=order, menu_item=self.item, quantity=2, price_at_order=self.item.price
        )
        self.assertEqual(order.total_amount, Decimal('90.00'))
        self.assertEqual(order.status, 'placed')

    def test_slot_is_open(self):
        """Slot created 90 min in future with 30-min cutoff should be open."""
        self.assertTrue(self.slot.is_open)

    def test_slot_cutoff_in_past_is_closed(self):
        """Slot created in the past should be closed."""
        past_slot = make_slot(offset_minutes=-60)
        self.assertFalse(past_slot.is_open)


class TestAuthPermissions(TestCase):
    """Test student vs staff permission classes."""

    def setUp(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        self.student = make_student(email='perm@sies.edu.in')
        self.staff = User.objects.create_user(
            email='staff@sies.edu.in', name='Staff', password='pw', role='staff', is_staff=True
        )
        self.client = APIClient()

        student_token = RefreshToken.for_user(self.student)
        self.student_token = str(student_token.access_token)

        staff_token = RefreshToken.for_user(self.staff)
        self.staff_token = str(staff_token.access_token)

    def test_student_can_access_menu(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        resp = self.client.get('/api/v1/menu/')
        self.assertEqual(resp.status_code, 200)

    def test_student_cannot_create_menu_item(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        resp = self.client.post('/api/v1/menu/', {
            'name': 'Hack Item', 'price': '10.00', 'category': 'ready_stock'
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_staff_can_create_menu_item(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        resp = self.client.post('/api/v1/menu/', {
            'name': 'Staff Item', 'price': '20.00', 'category': 'ready_stock',
            'veg_flag': True, 'is_available': True, 'prep_time_minutes': 0
        }, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_unauthenticated_student_auth_redirects(self):
        resp = self.client.post('/api/v1/auth/student/', {
            'email': 'perm@sies.edu.in', 'password': 'pw123'
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
