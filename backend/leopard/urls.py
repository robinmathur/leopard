from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
# below two required for nginx
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

admin.site.site_header = 'Upright India'  # default: "Django Administration"
admin.site.index_title = 'Features area'  # default: "Site administration"
admin.site.site_title = 'Upright India'  # default: "Django site admin"

urlpatterns = [
    path('admin/', admin.site.urls),
    # JWT Authentication endpoints (CSRF exempt)
    path('api/token/', csrf_exempt(TokenObtainPairView.as_view()), name='token_obtain_pair'),
    path('api/token/refresh/', csrf_exempt(TokenRefreshView.as_view()), name='token_refresh'),
    # API endpoints
    path('api/v1/', include('immigration.api.v1.urls')),
    # OpenAPI schema and documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# required for nginx
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_URL)

# Temporarily disabled during refactoring
websocket_urlpatterns = []
