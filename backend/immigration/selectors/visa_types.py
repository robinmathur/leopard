"""
Visa type selectors for read operations.

This module implements the selector pattern for visa type queries.
"""

from django.db.models import QuerySet
from typing import Optional, Dict, Any

from immigration.models.visa import VisaType, VisaCategory


def visa_type_list(
    *, 
    filters: Optional[Dict[str, Any]] = None
) -> QuerySet[VisaType]:
    """
    Get all visa types with optional filtering.
    
    Visa types are master data accessible to all users.
    
    Args:
        filters: Optional dict of additional filters (visa_category_id, search, etc.)
    
    Returns:
        QuerySet of VisaType objects
    """
    filters = filters or {}
    
    # Start with base queryset with optimized joins
    qs = VisaType.objects.select_related('visa_category').all()
    
    # Apply filters
    if 'visa_category_id' in filters and filters['visa_category_id']:
        qs = qs.filter(visa_category_id=filters['visa_category_id'])
    
    if 'search' in filters and filters['search']:
        search_term = filters['search']
        qs = qs.filter(name__icontains=search_term) | qs.filter(code__icontains=search_term)
    
    return qs.order_by('visa_category__name', 'name')


def visa_type_get(*, visa_type_id: int) -> VisaType:
    """
    Get a specific visa type by ID.
    
    Args:
        visa_type_id: ID of the visa type to retrieve
    
    Returns:
        VisaType instance
    
    Raises:
        VisaType.DoesNotExist: If visa type doesn't exist
    """
    return VisaType.objects.select_related('visa_category').get(id=visa_type_id)


def visa_category_list() -> QuerySet[VisaCategory]:
    """
    Get all visa categories.
    
    Returns:
        QuerySet of VisaCategory objects
    """
    return VisaCategory.objects.all().order_by('name')


def visa_category_get(*, visa_category_id: int) -> VisaCategory:
    """
    Get a specific visa category by ID.
    
    Args:
        visa_category_id: ID of the visa category to retrieve
    
    Returns:
        VisaCategory instance
    
    Raises:
        VisaCategory.DoesNotExist: If visa category doesn't exist
    """
    return VisaCategory.objects.get(id=visa_category_id)
