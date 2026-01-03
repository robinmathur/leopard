"""
API v1 URL configuration.

Includes all ViewSets via a shared router.
Note: SSE endpoint is registered in leopard/urls.py to bypass DRF content negotiation.
"""

from django.urls import include, path

from immigration.api.v1.routers import router

urlpatterns = [
    path("", include(router.urls)),
]
