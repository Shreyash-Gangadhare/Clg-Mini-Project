from datetime import timedelta, datetime, time
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsStaffUser
from apps.menu.models import MenuItem
from .models import Slot, SlotItemCapacity
from .serializers import SlotSerializer, SlotItemCapacitySerializer, SlotCreateSerializer


class SlotViewSet(viewsets.ModelViewSet):
    """
    GET  /api/v1/slots/                  — list today's slots
    POST /api/v1/slots/                  — create a slot (staff)
    POST /api/v1/slots/generate_today/   — bulk-generate today's slots (staff)
    GET  /api/v1/slots/{id}/capacity/    — get per-item capacities
    POST /api/v1/slots/{id}/capacity/    — set capacity (staff)
    PATCH /api/v1/slots/{id}/capacity/{cap_id}/ — update capacity (staff)
    """
    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'capacity_list', 'capacity_detail'):
            return [IsAuthenticated()]
        return [IsStaffUser()]

    def get_serializer_class(self):
        if self.action == 'create':
            return SlotCreateSerializer
        return SlotSerializer

    def get_queryset(self):
        today = timezone.now().date()
        return Slot.objects.filter(date=today).order_by('start_time')

    @action(detail=False, methods=['post'], url_path='generate_today')
    def generate_today(self, request):
        """Generate 15-minute slots from 08:00 to 17:00 for today."""
        today = timezone.now().date()
        created = 0
        for h in range(8, 17):
            for m in range(0, 60, 15):
                start = time(h, m)
                end_h, end_m = (h, m + 15) if m + 15 < 60 else (h + 1, 0)
                end = time(end_h, end_m)

                # cutoff = slot start - 30 minutes
                dt_start = timezone.make_aware(datetime.combine(today, start))
                cutoff = dt_start - timedelta(minutes=30)

                _, was_created = Slot.objects.get_or_create(
                    date=today, start_time=start,
                    defaults={'end_time': end, 'cutoff_time': cutoff}
                )
                if was_created:
                    created += 1

        return Response({'generated': created, 'date': str(today)}, status=201)

    @action(detail=True, methods=['get', 'post'], url_path='capacity')
    def capacity(self, request, pk=None):
        slot = self.get_object()

        if request.method == 'GET':
            caps = SlotItemCapacity.objects.filter(slot=slot).select_related('menu_item')
            serializer = SlotItemCapacitySerializer(caps, many=True)
            return Response(serializer.data)

        # POST — set/create capacity for a menu item
        menu_item_id = request.data.get('menu_item_id')
        max_units = request.data.get('max_units', 20)
        try:
            menu_item = MenuItem.objects.get(id=menu_item_id)
        except MenuItem.DoesNotExist:
            return Response({'detail': 'Menu item not found.'}, status=404)

        cap, _ = SlotItemCapacity.objects.get_or_create(
            slot=slot, menu_item=menu_item,
            defaults={'max_units': max_units}
        )
        cap.max_units = max_units
        cap.save()
        return Response(SlotItemCapacitySerializer(cap).data, status=201)

    @action(detail=True, methods=['patch'], url_path=r'capacity/(?P<cap_id>\d+)')
    def capacity_detail(self, request, pk=None, cap_id=None):
        slot = self.get_object()
        try:
            cap = SlotItemCapacity.objects.get(id=cap_id, slot=slot)
        except SlotItemCapacity.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        max_units = request.data.get('max_units')
        if max_units is not None:
            cap.max_units = max_units
            cap.save()
        return Response(SlotItemCapacitySerializer(cap).data)
