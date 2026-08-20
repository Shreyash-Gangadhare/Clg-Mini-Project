"""
All /api/v1/ routes — assembled from each app's router.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.users.views import StudentAuthView, StaffAuthView, StudentRegisterView
from apps.menu.views import MenuItemViewSet
from apps.slots.views import SlotViewSet
from apps.orders.views import OrderViewSet
from apps.payments.views import CreatePaymentOrderView, VerifyPaymentView
from apps.orders.views import DashboardView, CanteenStatusView, InsightsView
from apps.orders.views import ItemRecommendationsView, CartRecommendationsView

router = DefaultRouter()
router.register(r'menu', MenuItemViewSet, basename='menu')
router.register(r'slots', SlotViewSet, basename='slots')
router.register(r'orders', OrderViewSet, basename='orders')

urlpatterns = [
    # Auth
    path('auth/student/', StudentAuthView.as_view(), name='auth-student'),
    path('auth/staff/', StaffAuthView.as_view(), name='auth-staff'),
    path('register/', StudentRegisterView.as_view(), name='register'),

    # Payments
    path('payments/create-order/', CreatePaymentOrderView.as_view(), name='payment-create'),
    path('payments/verify/', VerifyPaymentView.as_view(), name='payment-verify'),

    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('canteen-status/', CanteenStatusView.as_view(), name='canteen-status'),
    path('insights/', InsightsView.as_view(), name='insights'),

    # Recommendations
    path('recommendations/item/<int:item_id>/', ItemRecommendationsView.as_view(), name='rec-item'),
    path('recommendations/cart/', CartRecommendationsView.as_view(), name='rec-cart'),

    # ViewSets (menu, slots, orders + nested actions)
    path('', include(router.urls)),
]
