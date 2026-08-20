from rest_framework import serializers
from .models import MenuItem


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'price', 'category',
            'prep_time_minutes', 'veg_flag', 'image_url', 'is_available', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
