"""
Health check endpoint for Docker container monitoring.

This endpoint is used by Docker health checks and load balancers to verify
that the application is running and can connect to the database.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from django.core.cache import cache
import time


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint that verifies:
    - Application is running
    - Database connection is working
    - (Optional) Cache connection is working

    Returns:
        200 OK: If all checks pass
        503 Service Unavailable: If any check fails

    This endpoint is exempt from authentication to allow Docker health checks
    and load balancers to access it without credentials.
    """
    health_status = {
        'status': 'healthy',
        'timestamp': time.time(),
        'checks': {}
    }

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            if row and row[0] == 1:
                health_status['checks']['database'] = 'connected'
            else:
                health_status['checks']['database'] = 'error'
                health_status['status'] = 'unhealthy'
    except Exception as e:
        health_status['checks']['database'] = f'error: {str(e)}'
        health_status['status'] = 'unhealthy'

    # Check cache connection (optional, only if cache is configured)
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            health_status['checks']['cache'] = 'connected'
        else:
            health_status['checks']['cache'] = 'warning'
    except Exception as e:
        # Cache is optional, don't mark as unhealthy
        health_status['checks']['cache'] = f'not configured: {str(e)}'

    # Return appropriate status code
    if health_status['status'] == 'unhealthy':
        return Response(health_status, status=503)

    return Response(health_status, status=200)
