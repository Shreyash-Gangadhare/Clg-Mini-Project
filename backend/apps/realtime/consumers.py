import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser


class StudentOrderConsumer(AsyncWebsocketConsumer):
    """
    ws://.../ws/orders/{order_id}/?token=<jwt>
    Student subscribes to their order's status updates.
    """
    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.group_name = f'order_{self.order_id}'
        user = self.scope.get('user')

        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        # Verify the order belongs to this user (or user is staff)
        if user.role not in ('staff', 'admin'):
            from apps.orders.models import Order
            try:
                order = await Order.objects.aget(id=self.order_id, user=user)
            except Order.DoesNotExist:
                await self.close(code=4003)
                return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(json.dumps({'type': 'connected', 'order_id': int(self.order_id)}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Students don't send anything; just ping-pong
        pass

    # Group message handlers
    async def order_status_update(self, event):
        await self.send(json.dumps({
            'type': 'status_update',
            'status': event['status'],
            'payment_status': event.get('payment_status'),
        }))

    async def order_refund_issued(self, event):
        await self.send(json.dumps({
            'type': 'refund_issued',
            'amount': str(event['amount']),
            'reason': event.get('reason', ''),
            'new_total': str(event.get('new_total', 0)),
        }))


class AdminKDSConsumer(AsyncWebsocketConsumer):
    """
    ws://.../ws/kds/?token=<jwt>
    Staff subscribes to aggregated order updates across all slots.
    """
    KDS_GROUP = 'kds_all_staff'

    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser) or user.role not in ('staff', 'admin'):
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(self.KDS_GROUP, self.channel_name)
        await self.accept()
        await self.send(json.dumps({'type': 'connected', 'group': 'kds'}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.KDS_GROUP, self.channel_name)

    async def receive(self, text_data):
        pass

    async def kds_new_order(self, event):
        await self.send(json.dumps({
            'type': 'new_order',
            'slot_id': event['slot_id'],
            'order_id': event['order_id'],
            'aggregated_items': event.get('aggregated_items', []),
        }))

    async def kds_status_update(self, event):
        await self.send(json.dumps({
            'type': 'slot_status_update',
            'slot_id': event['slot_id'],
            'status': event['status'],
        }))
