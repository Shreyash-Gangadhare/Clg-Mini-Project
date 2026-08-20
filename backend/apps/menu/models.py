from django.db import models


class MenuItem(models.Model):
    CATEGORY_READY = 'ready_stock'
    CATEGORY_MTO = 'made_to_order'
    CATEGORY_CHOICES = [
        (CATEGORY_READY, 'Ready Stock'),
        (CATEGORY_MTO, 'Made to Order'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=8, decimal_places=2)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_READY)
    prep_time_minutes = models.PositiveIntegerField(default=0)
    veg_flag = models.BooleanField(default=True)
    image_url = models.URLField(blank=True, default='')
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'menu_items'
        ordering = ['category', 'name']

    def __str__(self):
        return self.name
