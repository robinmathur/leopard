"""
College application statistics selectors for dashboard and tracker.

This module provides statistics and aggregations for:
- Dashboard statistics (grouped by intake date, final stage only)
- Tracker stage counts (for tab badges)
"""

from django.db.models import Count, Q, Max, Subquery, OuterRef, F
from django.utils import timezone
from datetime import timedelta
from typing import Dict, Any, Optional

from immigration.models import CollegeApplication, Stage
from immigration.selectors.college_applications import college_application_list


def college_application_stage_counts(
    *,
    user,
    application_type_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Get counts of applications by stage (for tab badges in tracker).

    If application_type_id is provided, filter by that type.
    Otherwise, return counts across all application types.

    Args:
        user: Authenticated user
        application_type_id: Optional filter by application type

    Returns:
        Dict with 'total' and 'by_stage' (list of stage counts)

    Example return:
    {
        'total': 150,
        'by_stage': [
            {'stage_id': 1, 'stage_name': 'Application Received', 'position': 1, 'count': 45},
            {'stage_id': 2, 'stage_name': 'Documents Verified', 'position': 2, 'count': 30},
            ...
        ]
    }
    """
    qs = college_application_list(user=user)

    # Filter by application_type if provided
    if application_type_id:
        qs = qs.filter(application_type_id=application_type_id)

    # Count by stage
    stage_counts = qs.values(
        'stage__id',
        'stage__stage_name',
        'stage__position'
    ).annotate(
        count=Count('id')
    ).order_by('stage__position')

    result = {
        'total': qs.count(),
        'by_stage': [
            {
                'stage_id': item['stage__id'],
                'stage_name': item['stage__stage_name'],
                'position': item['stage__position'],
                'count': item['count']
            }
            for item in stage_counts
        ]
    }

    return result


def college_application_dashboard_statistics(
    *,
    user,
    time_filter: str = 'all'  # 'today', 'this_week', 'this_month', 'all'
) -> Dict[str, Any]:
    """
    Get dashboard statistics for college applications.

    CRITICAL BUSINESS REQUIREMENT:
    - Group applications by start_date.intake_date (intake start date)
    - Count ONLY applications in FINAL STAGE (highest position)
    - Time filters apply to intake date, NOT created_at

    Args:
        user: Authenticated user
        time_filter: Time range filter ('today', 'this_week', 'this_month', 'all')

    Returns:
        Dict with comprehensive dashboard statistics

    Example return:
    {
        'total_applications': 500,
        'final_stage_count': 120,
        'time_filter': 'this_month',
        'intake_breakdown': [
            {'start_date__intake_date': '2025-02-01', 'count': 15},
            ...
        ],
        'application_type_breakdown': [
            {'application_type__id': 1, 'application_type__title': 'Undergraduate', 'count': 200},
            ...
        ],
        'institute_breakdown': [
            {'institute__id': 1, 'institute__name': 'Harvard University', 'count': 50},
            ...
        ],
        'recent_applications': [...],
        'pending_assignments': 45
    }
    """
    # Get base queryset
    qs = college_application_list(user=user)

    # Calculate time ranges for filtering
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())  # Monday
    month_start = today_start.replace(day=1)

    # ==============================================================================
    # CRITICAL: Filter for FINAL STAGE applications only (for dashboard counting)
    # ==============================================================================
    # Get max position per application_type using subquery
    # Note: Stage model uses hard delete (no deleted_at field)
    max_position_subquery = Stage.objects.filter(
        application_type_id=OuterRef('application_type_id')
    ).values('application_type').annotate(
        max_pos=Max('position')
    ).values('max_pos')[:1]

    # Filter applications where stage.position = max position for their application_type
    final_stage_applications = qs.annotate(
        max_stage_position=Subquery(max_position_subquery)
    ).filter(
        stage__position=F('max_stage_position')
    )

    # ==============================================================================
    # Apply time filter to intake date (start_date.intake_date)
    # ==============================================================================
    if time_filter == 'today':
        final_stage_applications = final_stage_applications.filter(
            start_date__intake_date__gte=today_start.date()
        )
    elif time_filter == 'this_week':
        final_stage_applications = final_stage_applications.filter(
            start_date__intake_date__gte=week_start.date()
        )
    elif time_filter == 'this_month':
        final_stage_applications = final_stage_applications.filter(
            start_date__intake_date__gte=month_start.date()
        )
    # 'all' = no time filter

    # ==============================================================================
    # Breakdown by intake date (top 10 upcoming intakes)
    # ==============================================================================
    intake_breakdown = list(
        final_stage_applications.values('start_date__intake_date')
        .annotate(count=Count('id'))
        .order_by('-start_date__intake_date')[:10]
    )

    # ==============================================================================
    # Breakdown by application type (top 5)
    # ==============================================================================
    application_type_breakdown = list(
        qs.values('application_type__id', 'application_type__title')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # ==============================================================================
    # Breakdown by institute (top 5)
    # ==============================================================================
    institute_breakdown = list(
        qs.values('institute__id', 'institute__name')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # ==============================================================================
    # Recent applications (last 10, all stages)
    # ==============================================================================
    recent_applications = list(
        qs.select_related('client', 'institute', 'course', 'stage', 'start_date')
        .order_by('-created_at')[:10]
        .values(
            'id',
            'client__first_name',
            'client__last_name',
            'institute__name',
            'course__name',
            'stage__stage_name',
            'start_date__intake_date',
            'created_at'
        )
    )

    # ==============================================================================
    # Compile statistics
    # ==============================================================================
    return {
        'total_applications': qs.count(),
        'final_stage_count': final_stage_applications.count(),
        'time_filter': time_filter,
        'intake_breakdown': intake_breakdown,
        'application_type_breakdown': application_type_breakdown,
        'institute_breakdown': institute_breakdown,
        'recent_applications': recent_applications,
        'pending_assignments': qs.filter(assigned_to__isnull=True).count()
    }
