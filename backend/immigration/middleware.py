import threading
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

_local = threading.local()


class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = None

        # Check if the request contains a JWT token
        if 'HTTP_AUTHORIZATION' in request.META and request.META['HTTP_AUTHORIZATION'].startswith('Bearer'):
            try:
                user, _ = JWTAuthentication().authenticate(request)
            except (InvalidToken, AuthenticationFailed):
                pass  # If JWT authentication fails, continue with other authentication methods

        # Fallback to the default authentication method (e.g., session-based)
        if user is None:
            user = request.user

        _local.user = user
        response = self.get_response(request)
        return response


def get_current_user():
    return getattr(_local, 'user', None)
