"""
Visa application statistics selectors for read operations.

This module provides aggregated data for visa application dashboards and reports.
"""

from django.db.models import Count, Q, QuerySet
from django.utils import timezone
from datetime import timedelta
from typing import Dict, Any

from immigration.models import VisaApplication
from immigration.selectors.applications import visa_application_list


def visa_application_status_counts(*, user) -> Dict[str, int]:
    """
    Get counts of visa applications by status.
    
    Args:
        user: Authenticated user making the request
    
    Returns:
        Dict with status as key and count as value
    """
    # Use visa_application_list to get scoped queryset
    qs = visa_application_list(user=user)
    
    # Count by status
    status_counts = qs.values('status').annotate(count=Count('id'))
    
    # Convert to dict with status as key
    result = {item['status']: item['count'] for item in status_counts}
    
    # Add total count
    result['TOTAL'] = qs.count()
    
    # Ensure all statuses are present (even with 0 count)
    for status_choice, _ in VisaApplication.VISA_STATUS_CHOICES:
        if status_choice not in result:
            result[status_choice] = 0
    
    return result


def visa_application_dashboard_statistics(*, user) -> Dict[str, Any]:
    """
    Get comprehensive statistics for visa application dashboard.
    
    Includes:
    - Total applications count
    - Applications by status
    - Applications processed today/this week/this month
    - Applications by visa type (top 5)
    - Recent activity
    
    Args:
        user: Authenticated user making the request
    
    Returns:
        Dict with various statistics
    """
    # Use visa_application_list to get scoped queryset
    qs = visa_application_list(user=user)
    
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # Total counts
    total_applications = qs.count()
    
    # Status breakdown
    status_counts = {}
    for status_choice, display_name in VisaApplication.VISA_STATUS_CHOICES:
        status_counts[status_choice] = qs.filter(status=status_choice).count()
    
    # Time-based counts (based on created_at)
    applications_today = qs.filter(created_at__gte=today_start).count()
    applications_this_week = qs.filter(created_at__gte=week_start).count()
    applications_this_month = qs.filter(created_at__gte=month_start).count()
    
    # Granted counts (time-based on date_granted)
    granted_today = qs.filter(
        status='GRANTED',
        date_granted__gte=today_start.date()
    ).count()
    granted_this_week = qs.filter(
        status='GRANTED',
        date_granted__gte=week_start.date()
    ).count()
    granted_this_month = qs.filter(
        status='GRANTED',
        date_granted__gte=month_start.date()
    ).count()
    
    # Applications by visa type (top 5)
    visa_type_breakdown = list(
        qs.values('visa_type__name', 'visa_type__id')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )
    
    # Recent applications (last 5)
    recent_applications = list(
        qs.select_related('client', 'visa_type', 'assigned_to')
        .order_by('-created_at')[:5]
        .values(
            'id',
            'client__first_name',
            'client__last_name',
            'visa_type__name',
            'status',
            'created_at'
        )
    )
    
    # Pending assignments (no assigned_to)
    pending_assignments = qs.filter(assigned_to__isnull=True).count()
    
    return {
        'total_applications': total_applications,
        'status_breakdown': status_counts,
        'time_based_counts': {
            'today': applications_today,
            'this_week': applications_this_week,
            'this_month': applications_this_month,
        },
        'granted_counts': {
            'today': granted_today,
            'this_week': granted_this_week,
            'this_month': granted_this_month,
        },
        'visa_type_breakdown': visa_type_breakdown,
        'recent_applications': recent_applications,
        'pending_assignments': pending_assignments,
    }
