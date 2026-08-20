from django.db import models
from django.conf import settings


class Order(models.Model):
    STATUS_PLACED = 'placed'
    STATUS_PREPARING = 'preparing'
    STATUS_READY = 'ready'
    STATUS_PICKED_UP = 'picked_up'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PLACED, 'Placed'),
        (STATUS_PREPARING, 'Preparing'),
        (STATUS_READY, 'Ready'),
        (STATUS_PICKED_UP, 'Picked Up'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    PAYMENT_PENDING = 'pending'
    PAYMENT_PAID = 'paid'
    PAYMENT_FAILED = 'failed'
    PAYMENT_REFUNDED = 'refunded'
    PAYMENT_PARTIAL_REFUND = 'partial_refund'
    PAYMENT_CHOICES = [
        (PAYMENT_PENDING, 'Pending'),
        (PAYMENT_PAID, 'Paid'),
        (PAYMENT_FAILED, 'Failed'),
        (PAYMENT_REFUNDED, 'Refunded'),
        (PAYMENT_PARTIAL_REFUND, 'Partial Refund'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    slot = models.ForeignKey('slots.Slot', on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=STATUS_PLACED)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default=PAYMENT_PENDING)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    razorpay_order_id = models.CharField(max_length=100, blank=True, default='')
    razorpay_payment_id = models.CharField(max_length=100, blank=True, default='')

    # QR token: HMAC-signed string for pickup verification
    token_number = models.PositiveIntegerField(default=1)  # sequential per slot
    qr_token = models.CharField(max_length=255, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.id} by {self.user} [{self.status}]'

    def recalculate_total(self):
        """Recalculate total from remaining order items."""
        self.total_amount = sum(
            oi.price_at_order * oi.quantity for oi in self.items.all()
        )
        self.save(update_fields=['total_amount'])


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey('menu.MenuItem', on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    price_at_order = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f'{self.quantity}x {self.menu_item.name}'
