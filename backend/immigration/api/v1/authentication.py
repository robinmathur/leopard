"""
Custom authentication classes for API endpoints.

Supports JWT authentication via both Authorization header and query parameter.
Query parameter support is needed for SSE since EventSource doesn't support custom headers.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class JWTQueryParamAuthentication(JWTAuthentication):
    """
    JWT authentication that also checks query parameters for token.
    
    This is needed for SSE (EventSource) which doesn't support custom headers in browsers.
    
    Usage:
        GET /api/v1/notifications/stream/?token=<jwt_token>
    """
    
    def authenticate(self, request):
        # First try the standard Authorization header
        header_auth = super().authenticate(request)
        if header_auth is not None:
            return header_auth
        
        # If no header, try query parameter
        # Handle both DRF (query_params) and plain Django (GET) requests
        if hasattr(request, 'query_params'):
            token = request.query_params.get('token')
        else:
            token = request.GET.get('token')
            
        if token is None:
            return None
            
        # Validate the token
        validated_token = self.get_validated_token(token)
        return self.get_user(validated_token), validated_token

