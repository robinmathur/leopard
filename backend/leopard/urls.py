from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
# below two required for nginx
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenRefreshView
from immigration.api.v1.auth_views import TenantTokenObtainPairView

admin.site.site_header = 'Upright India'  # default: "Django Administration"
admin.site.index_title = 'Features area'  # default: "Site administration"
admin.site.site_title = 'Upright India'  # default: "Django site admin"

# Simple health check view that bypasses tenant middleware
def simple_health_check(request):
    """Simple health check for Docker and monitoring - bypasses tenant middleware"""
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "healthy", "service": "leopard-backend"})
    except Exception as e:
        return JsonResponse({"status": "unhealthy", "error": str(e)}, status=503)

urlpatterns = [
    # Public health check (no tenant required) - for Docker health checks
    path('health/', simple_health_check, name='simple-health-check'),
    path('admin/', admin.site.urls),
    # JWT Authentication endpoints (CSRF exempt) - TENANT-BOUND TOKENS
    path('api/token/', csrf_exempt(TenantTokenObtainPairView.as_view()), name='token_obtain_pair'),
    path('api/token/refresh/', csrf_exempt(TokenRefreshView.as_view()), name='token_refresh'),
    # API endpoints (tenant-specific)
    path('api/v1/', include('immigration.api.v1.urls')),
    # OpenAPI schema and documentation (tenant-specific)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # Public endpoints (no tenant required)
    # path('public/', include('tenants.urls')),
]

# required for nginx
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_URL)

# Temporarily disabled during refactoring
websocket_urlpatterns = []
