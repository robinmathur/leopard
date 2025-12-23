"""
API v1 URL configuration.

Includes all ViewSets via a shared router plus the SSE stream endpoint.
"""

from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt

from immigration.api.v1.routers import router
from immigration.api.v1.views.notifications import notification_sse_view
from immigration.api.v1.views.health import health_check

# Note: SSE endpoint must be a separate path because it returns StreamingHttpResponse
# and cannot be part of the ViewSet router pattern. CSRF is exempt because it uses JWT
# authentication via query parameter or Authorization header.
urlpatterns = [
    path("", include(router.urls)),
    path("notifications/stream/", csrf_exempt(notification_sse_view), name="notification-stream"),
    path("health/", health_check, name="health-check"),
]
