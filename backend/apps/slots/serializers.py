from rest_framework import serializers
from .models import Slot, SlotItemCapacity


class SlotItemCapacitySerializer(serializers.ModelSerializer):
    menu_item_id = serializers.IntegerField(source='menu_item.id', read_only=True)

    class Meta:
        model = SlotItemCapacity
        fields = ['id', 'slot_id', 'menu_item_id', 'max_units', 'units_booked']
        read_only_fields = ['id', 'slot_id', 'units_booked']


class SlotSerializer(serializers.ModelSerializer):
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()

    class Meta:
        model = Slot
        fields = ['id', 'date', 'start_time', 'end_time', 'cutoff_time']

    def get_start_time(self, obj):
        return obj.start_time.strftime('%H:%M')

    def get_end_time(self, obj):
        return obj.end_time.strftime('%H:%M')


class SlotCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ['date', 'start_time', 'end_time', 'cutoff_time']
