"""
WebSocket consumers - DEPRECATED in favor of SSE implementation.

This file is kept for reference but WebSocket functionality has been
replaced with Server-Sent Events (SSE) in the notification_stream endpoint.

See: immigration/api/v1/views/notifications.py - notification_sse_view()

Reasons for migration to SSE:
1. Simpler implementation (unidirectional notifications)
2. Works over standard HTTP/HTTPS
3. No need for WebSocket-specific infrastructure
4. Better compatibility with proxy servers
5. Automatic reconnection handling by browsers
"""

# import json, logging
# from channels.generic.websocket import AsyncWebsocketConsumer
# from channels.db import database_sync_to_async
# from django.contrib.auth import get_user_model
# from rest_framework_simplejwt.tokens import UntypedToken
# from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
# from rest_framework_simplejwt.backends import TokenBackend
# from django.conf import settings
# from asgiref.sync import async_to_sync
# from channels.layers import get_channel_layer

# User = get_user_model()

# logger = logging.getLogger(__name__)
# # Loading public key from settings
# public_key = settings.SIMPLE_JWT['VERIFYING_KEY']


# class NotificationConsumers(AsyncWebsocketConsumer):
#     """DEPRECATED: Use SSE endpoint at /api/v1/notifications/stream/ instead."""
#     def __init__(self, *args, **kwargs):
#         super().__init__(args, kwargs)
#         self.user_id = None
#         self.user = None
#         self.group_name = None

#     async def connect(self):
#         # Retrieve and verify the JWT from the query string
#         token = self.scope['query_string'].decode('utf-8').split('token=')[1]
#         try:
#             # Decode the token and verify it
#             valid_data = UntypedToken(token)
#             token_backend = TokenBackend(algorithm='RS256', signing_key=None, verifying_key=public_key)
#             decoded_data = token_backend.decode(token, verify=True)
#             self.user_id = decoded_data['user_id']

#             # Fetch the user from the database
#             self.user = await database_sync_to_async(User.objects.get)(id=self.user_id)

#             # Add user to their group (user-specific group)
#             self.group_name = f"user_{self.user.id}"
#             await self.channel_layer.group_add(
#                 self.group_name,
#                 self.channel_name
#             )

#             await self.accept()
#         except (InvalidToken, TokenError, User.DoesNotExist):
#             await self.close()

#     async def disconnect(self, close_code):
#         # Remove the user from the group
#         await self.channel_layer.group_discard(
#             self.group_name,
#             self.channel_name
#         )

#     async def receive(self, text_data):
#         data = json.loads(text_data)
#         message = data.get('message')
#         print(text_data)

#         # Example: Echo the received message
#         # await self.send(text_data=json.dumps({
#         #     'message': message + 'from server'
#         # }))

#     async def send_message(self, event):
#         """ Send a message to the WebSocket """
#         logger.debug("ws message sent: " + json.dumps(event['message']))
#         await self.send(text_data=json.dumps(event['message']))


# def send_message_to_user(user_id, message):
#     """DEPRECATED: Use send_notification_to_user from services.notifications instead."""
#     # Send message to the WebSocket consumer
#     channel_layer = get_channel_layer()
#     # user_id = notification.assigned_to
#     group_name = f"user_{user_id}"
#     # message_body = Json
#     if channel_layer:
#         group_channel = channel_layer.groups.get(group_name)
#         if group_channel:
#             async_to_sync(channel_layer.group_send)(
#                 group_name,
#                 {
#                     'type': 'send_message',
#                     'message': message
#                 }
#             )
