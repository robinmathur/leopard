"""
Selectors for client supporting data (passport, qualifications, proficiency).
"""

from typing import Any, Dict, Optional

from django.db.models import QuerySet

from immigration.models import (
    LPE,
    Passport,
    Proficiency,
    Qualification,
    Employment,
)
from immigration.selectors.clients import client_get
from immigration.constants import (
    GROUP_CONSULTANT,
    GROUP_BRANCH_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_SUPER_ADMIN,
)


def _scope_by_user(qs: QuerySet, user) -> QuerySet:
    """
    Apply branch/region/tenant scoping using the client relationship.
    """
    if user.is_in_group(GROUP_CONSULTANT) or user.is_in_group(GROUP_BRANCH_ADMIN):
        # Filter to clients in the same branches
        user_branches = user.branches.all()
        if user_branches.exists():
            return qs.filter(client__assigned_to__branches__in=user_branches)
        return qs.none()

    if user.is_in_group(GROUP_REGION_MANAGER):
        # Filter to clients in the same regions
        user_regions = user.regions.all()
        if user_regions.exists():
            return qs.filter(client__assigned_to__regions__in=user_regions)
        return qs.none()

    # REMOVED: SUPER_ADMIN tenant filtering (schema provides isolation)
    # if user.is_in_group(GROUP_SUPER_ADMIN):
    #     if user.tenant:
    #         return qs.filter(client__assigned_to__tenant=user.tenant)
    #     return qs.none()
    
    # SUPER_ADMIN sees all in current tenant schema (automatic)

    # SUPER_SUPER_ADMIN sees everything (no additional filter)
    return qs


def language_exam_list(*, filters: Optional[Dict[str, Any]] = None) -> QuerySet[LPE]:
    """
    Return master list of language proficiency exams.
    """
    filters = filters or {}
    qs = LPE.objects.all().order_by("name")

    if filters.get("name"):
        qs = qs.filter(name__icontains=filters["name"])

    return qs


def proficiency_list(*, user, filters: Optional[Dict[str, Any]] = None) -> QuerySet[Proficiency]:
    """
    List proficiencies scoped to the requesting user's visibility.
    """
    filters = filters or {}
    qs = Proficiency.objects.select_related("client__branch", "test_name")
    qs = _scope_by_user(qs, user)

    if client_id := filters.get("client_id"):
        qs = qs.filter(client_id=client_id)

    if test_name_id := filters.get("test_name_id"):
        qs = qs.filter(test_name_id=test_name_id)

    if filters.get("test_date"):
        qs = qs.filter(test_date=filters["test_date"])

    return qs


def proficiency_get(*, user, proficiency_id: int) -> Proficiency:
    """
    Retrieve a single proficiency entry with scope validation.
    """
    qs = proficiency_list(user=user)
    try:
        return qs.get(id=proficiency_id)
    except Proficiency.DoesNotExist:
        # Determine if it's missing due to scoping vs missing record
        if Proficiency.objects.filter(id=proficiency_id).exists():
            raise PermissionError("You do not have access to this proficiency record")
        raise


def qualification_list(*, user, filters: Optional[Dict[str, Any]] = None) -> QuerySet[Qualification]:
    """
    List qualifications scoped to the requesting user's visibility.
    """
    filters = filters or {}
    qs = Qualification.objects.select_related("client__branch")
    qs = _scope_by_user(qs, user)

    if client_id := filters.get("client_id"):
        qs = qs.filter(client_id=client_id)

    return qs


def qualification_get(*, user, qualification_id: int) -> Qualification:
    """
    Retrieve a qualification with scope validation.
    """
    qs = qualification_list(user=user)
    try:
        return qs.get(id=qualification_id)
    except Qualification.DoesNotExist:
        if Qualification.objects.filter(id=qualification_id).exists():
            raise PermissionError("You do not have access to this qualification")
        raise


def passport_list(*, user, filters: Optional[Dict[str, Any]] = None) -> QuerySet[Passport]:
    """
    List passports scoped by client visibility.
    """
    filters = filters or {}
    qs = Passport.objects.select_related("client__branch")
    qs = _scope_by_user(qs, user)

    if client_id := filters.get("client_id"):
        qs = qs.filter(client_id=client_id)

    return qs


def passport_get(*, user, client_id: int) -> Passport:
    """
    Retrieve a passport for a client the user can access.
    """
    # Validate client access first to return clearer errors
    client_get(user=user, client_id=client_id)

    try:
        return passport_list(user=user).get(client_id=client_id)
    except Passport.DoesNotExist:
        raise Passport.DoesNotExist(f"Passport for client id={client_id} does not exist")


def employment_list(*, user, filters: Optional[Dict[str, Any]] = None) -> QuerySet[Employment]:
    """
    List employment records scoped by client visibility.
    """
    filters = filters or {}
    qs = Employment.objects.select_related("client__branch")
    qs = _scope_by_user(qs, user)

    if client_id := filters.get("client_id"):
        qs = qs.filter(client_id=client_id)

    return qs


def employment_get(*, user, employment_id: int) -> Employment:
    """
    Retrieve an employment record with scope validation.
    """
    qs = employment_list(user=user)
    try:
        return qs.get(id=employment_id)
    except Employment.DoesNotExist:
        if Employment.objects.filter(id=employment_id).exists():
            raise PermissionError("You do not have access to this employment record")
        raise
