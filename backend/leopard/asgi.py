"""
ASGI config for leopard project.

WebSocket support has been removed in favor of Server-Sent Events (SSE).
SSE provides simpler, more reliable real-time notifications without requiring
WebSocket infrastructure.

See: /api/v1/notifications/stream/ for SSE endpoint
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')

# Standard Django ASGI application
application = get_asgi_application()

# WebSocket routing removed - using SSE instead
# Previous implementation used Django Channels WebSocket consumers
# Now using SSE endpoint at /api/v1/notifications/stream/

# from channels.routing import ProtocolTypeRouter, URLRouter
# from channels.auth import AuthMiddlewareStack
# from channels.security.websocket import AllowedHostsOriginValidator
# from . import urls
#
# application = ProtocolTypeRouter(
#     {
#         "http": django_application,
#         "websocket": AllowedHostsOriginValidator(
#                 AuthMiddlewareStack(
#                     URLRouter(
#                         urls.websocket_urlpatterns
#                     )
#                 )
#             )
#     }
# )
