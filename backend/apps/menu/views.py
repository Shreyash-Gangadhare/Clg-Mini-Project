from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny

from apps.users.permissions import IsStaffUser
from .models import MenuItem
from .serializers import MenuItemSerializer


class MenuItemViewSet(viewsets.ModelViewSet):
    """
    GET  /api/v1/menu/          — list (students + staff)
    POST /api/v1/menu/          — create (staff only)
    GET  /api/v1/menu/{id}/     — retrieve
    PATCH/PUT /api/v1/menu/{id}/ — update (staff only)
    DELETE /api/v1/menu/{id}/   — delete (staff only)
    """
    serializer_class = MenuItemSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsStaffUser()]

    def get_queryset(self):
        qs = MenuItem.objects.all()
        category = self.request.query_params.get('category')
        if category and category != 'all':
            if category == 'today_special':
                qs = qs.filter(name__icontains='today')
            elif category == 'beverages':
                qs = qs.filter(name__in=[
                    'Cold Coffee', 'Masala Chai', 'Cutting Chai', 'Lemon Soda'
                ])
            elif category == 'breakfast':
                qs = qs.filter(name__in=[
                    'Poha', 'Masala Chai', 'Cutting Chai', 'Misal Pav', 'Vada Pav'
                ])
            elif category == 'snacks':
                qs = qs.filter(name__in=[
                    'Samosa (2 pcs)', 'Vada Pav', 'Veg Sandwich',
                    'Paneer Sandwich', 'Chicken Sandwich', 'Maggi',
                ])
            elif category == 'meals':
                qs = qs.filter(name__in=[
                    'Veg Fried Rice', 'Paneer Fried Rice',
                    "Today's Special: Pav Bhaji", 'Misal Pav',
                ])
            else:
                qs = qs.filter(category=category)
        return qs
