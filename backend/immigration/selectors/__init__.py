"""
Selectors package for read operations.

Selectors provide filtered querysets based on user permissions and scope.
"""

from immigration.selectors.clients import client_list, client_get
from immigration.selectors.applications import visa_application_list, visa_application_get
from immigration.selectors.users import user_list, user_get
from immigration.selectors.visa_types import (
    visa_type_list,
    visa_type_get,
    visa_category_list,
    visa_category_get,
)
from immigration.selectors.visa_statistics import (
    visa_application_status_counts,
    visa_application_dashboard_statistics,
)

__all__ = [
    'client_list',
    'client_get',
    'visa_application_list',
    'visa_application_get',
    'user_list',
    'user_get',
    'visa_type_list',
    'visa_type_get',
    'visa_category_list',
    'visa_category_get',
    'visa_application_status_counts',
    'visa_application_dashboard_statistics',
]
