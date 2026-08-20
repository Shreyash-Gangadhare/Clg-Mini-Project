from rest_framework import serializers
from apps.menu.serializers import MenuItemSerializer
from apps.slots.serializers import SlotSerializer
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)
    menu_item_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'menu_item', 'menu_item_id', 'quantity', 'price_at_order']
        read_only_fields = ['id', 'price_at_order', 'menu_item']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    slot = SlotSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'slot', 'status', 'payment_status',
            'total_amount', 'token_number', 'items', 'created_at',
        ]
        read_only_fields = fields


class PlaceOrderSerializer(serializers.Serializer):
    slot_id = serializers.IntegerField()
    items = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False
    )

    def validate_items(self, value):
        for item in value:
            if 'menu_item_id' not in item or 'quantity' not in item:
                raise serializers.ValidationError('Each item must have menu_item_id and quantity.')
            if int(item['quantity']) < 1:
                raise serializers.ValidationError('Quantity must be at least 1.')
        return value
