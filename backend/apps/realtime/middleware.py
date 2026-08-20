"""
JWT authentication middleware for Django Channels WebSocket connections.
Reads token from query string: ws://host/ws/orders/1/?token=<access_token>
"""
import urllib.parse
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params = urllib.parse.parse_qs(query_string)
        token_list = params.get('token', [])

        if token_list:
            try:
                token = AccessToken(token_list[0])
                user_id = token['user_id']
                user = await User.objects.aget(id=user_id)
                scope['user'] = user
            except Exception:
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
