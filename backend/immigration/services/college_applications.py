"""
College application services for write operations with business logic.

This module implements the service pattern for college application operations,
providing validation, scope checking, and transactional integrity for:
- ApplicationType management
- Stage management (including reordering)
- CollegeApplication CRUD operations
"""

from django.db import transaction
from django.db.models import Max, F
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from decimal import Decimal

from immigration.models import (
    ApplicationType,
    Stage,
    CollegeApplication,
    Client,
    Institute,
    Course,
    InstituteIntake,
    InstituteLocation,
    Agent,
    User,
    Branch,
)
from immigration.selectors.clients import client_get
from immigration.constants import (
    GROUP_CONSULTANT,
    GROUP_BRANCH_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_SUPER_ADMIN,
)


# ============================================================================
# APPLICATION TYPE SERVICES
# ============================================================================

class ApplicationTypeCreateInput(BaseModel):
    """Input model for application type creation with validation."""

    title: str = Field(..., min_length=1, max_length=255)
    currency: str = Field(default='USD', max_length=3)
    tax_name: Optional[str] = Field(None, max_length=100)
    tax_percentage: Decimal = Field(default=Decimal('0.00'), ge=0, le=100)
    description: Optional[str] = None

    class Config:
        str_strip_whitespace = True


class ApplicationTypeUpdateInput(BaseModel):
    """Input model for application type updates with validation."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    currency: Optional[str] = Field(None, max_length=3)
    tax_name: Optional[str] = None
    tax_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        str_strip_whitespace = True


@transaction.atomic
def application_type_create(
    *,
    data: ApplicationTypeCreateInput,
    user
) -> ApplicationType:
    """
    Create new application type.

    Args:
        data: Validated input data
        user: User creating the application type

    Returns:
        Created ApplicationType instance

    Raises:
        ValueError: If validation fails
    """
    application_type = ApplicationType(
        title=data.title,
        currency=data.currency,
        tax_name=data.tax_name or '',
        tax_percentage=data.tax_percentage,
        description=data.description or '',
        created_by=user,
        updated_by=user,
    )
    application_type.save()

    return application_type


@transaction.atomic
def application_type_update(
    *,
    application_type: ApplicationType,
    data: ApplicationTypeUpdateInput,
    user
) -> ApplicationType:
    """
    Update existing application type.

    Args:
        application_type: ApplicationType instance to update
        data: Validated input data
        user: User performing the update

    Returns:
        Updated ApplicationType instance
    """
    update_fields = ['updated_by', 'updated_at']

    if data.title is not None:
        application_type.title = data.title
        update_fields.append('title')

    if data.currency is not None:
        application_type.currency = data.currency
        update_fields.append('currency')

    if data.tax_name is not None:
        application_type.tax_name = data.tax_name
        update_fields.append('tax_name')

    if data.tax_percentage is not None:
        application_type.tax_percentage = data.tax_percentage
        update_fields.append('tax_percentage')

    if data.description is not None:
        application_type.description = data.description
        update_fields.append('description')

    if data.is_active is not None:
        application_type.is_active = data.is_active
        update_fields.append('is_active')

    application_type.updated_by = user
    application_type.save(update_fields=update_fields)

    return application_type


@transaction.atomic
def application_type_delete(
    *,
    application_type: ApplicationType,
    user
) -> None:
    """
    Delete application type (soft delete).

    Business Rule: Prevent deletion if any college applications exist.

    Args:
        application_type: ApplicationType instance to delete
        user: User performing the delete

    Raises:
        ValueError: If college applications exist for this type
    """
    if application_type.has_applications:
        applications_count = application_type.college_applications.filter(
            deleted_at__isnull=True
        ).count()

        raise ValueError(
            f"Cannot delete application type '{application_type.title}' "
            f"because it has {applications_count} associated application(s). "
            f"Please delete or reassign all applications first."
        )

    application_type.delete()  # Soft delete


# ============================================================================
# STAGE SERVICES
# ============================================================================

class StageCreateInput(BaseModel):
    """Input model for stage creation with validation."""

    application_type_id: int = Field(..., gt=0)
    stage_name: str = Field(..., min_length=1, max_length=100)
    position: Optional[int] = Field(None, gt=0)  # Auto-calculated if None
    description: Optional[str] = None

    class Config:
        str_strip_whitespace = True


class StageUpdateInput(BaseModel):
    """Input model for stage updates with validation."""

    stage_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None

    class Config:
        str_strip_whitespace = True


class StageReorderInput(BaseModel):
    """Input for reordering stages via drag-and-drop."""

    stage_id: int = Field(..., gt=0)
    new_position: int = Field(..., gt=0)


@transaction.atomic
def stage_create(
    *,
    data: StageCreateInput,
    user
) -> Stage:
    """
    Create new stage with automatic position assignment.

    If position is not provided, auto-assigns next available position (max + 1).
    If position is provided, shifts existing stages to make room.

    Args:
        data: Validated input data
        user: User creating the stage

    Returns:
        Created Stage instance

    Raises:
        ValueError: If application_type doesn't exist or validation fails
    """
    # Validate application_type exists
    try:
        application_type = ApplicationType.objects.get(
            id=data.application_type_id,
            deleted_at__isnull=True
        )
    except ApplicationType.DoesNotExist:
        raise ValueError(f"ApplicationType with id {data.application_type_id} not found")

    # Determine position
    if data.position is None:
        # Auto-assign next position
        max_position_result = Stage.objects.filter(
            application_type=application_type
        ).aggregate(max_position=Max('position'))

        max_position = max_position_result['max_position']
        position = 1 if max_position is None else max_position + 1
    else:
        # Use provided position and shift others
        position = data.position

        # Shift existing stages with position >= new position
        Stage.objects.filter(
            application_type=application_type,
            position__gte=position
        ).update(position=F('position') + 1)

    # Create stage
    stage = Stage(
        application_type=application_type,
        stage_name=data.stage_name,
        position=position,
        description=data.description or '',
        created_by=user,
        updated_by=user,
    )
    stage.save()

    return stage


@transaction.atomic
def stage_update(
    *,
    stage: Stage,
    data: StageUpdateInput,
    user
) -> Stage:
    """
    Update stage (name/description only, not position).

    Use stage_reorder for position changes.

    Args:
        stage: Stage instance to update
        data: Validated input data
        user: User performing the update

    Returns:
        Updated Stage instance
    """
    update_fields = ['updated_by', 'updated_at']

    if data.stage_name is not None:
        stage.stage_name = data.stage_name
        update_fields.append('stage_name')

    if data.description is not None:
        stage.description = data.description
        update_fields.append('description')

    stage.updated_by = user
    stage.save(update_fields=update_fields)

    return stage


@transaction.atomic
def stage_reorder(
    *,
    application_type_id: int,
    reorder_data: List[StageReorderInput],
    user
) -> List[Stage]:
    """
    Reorder stages after drag-and-drop.

    Updates all affected stages atomically. Position changes are committed
    together to maintain unique constraint.

    Args:
        application_type_id: ID of application type
        reorder_data: List of {stage_id, new_position} mappings
        user: User performing the reorder

    Returns:
        List of updated Stage instances ordered by position

    Raises:
        ValueError: If validation fails or stages don't belong to application_type
    """
    # Validate application_type exists
    try:
        application_type = ApplicationType.objects.get(
            id=application_type_id,
            deleted_at__isnull=True
        )
    except ApplicationType.DoesNotExist:
        raise ValueError(f"ApplicationType with id {application_type_id} not found")

    # Extract stage IDs and validate they belong to application_type
    stage_ids = [item.stage_id for item in reorder_data]
    stages = Stage.objects.filter(
        id__in=stage_ids,
        application_type=application_type
    )

    if stages.count() != len(stage_ids):
        raise ValueError("One or more stages not found or don't belong to this application type")

    # Create mapping of stage_id to new_position
    position_map = {item.stage_id: item.new_position for item in reorder_data}

    # Two-step update to avoid unique constraint violations:
    # Step 1: Set all stages to temporary high positions (10000+)
    # This avoids conflicts with existing low positions
    temp_updates = []
    for idx, stage in enumerate(stages):
        stage.position = 10000 + idx  # Use large numbers as temporary positions
        stage.updated_by = user
        temp_updates.append(stage)

    if temp_updates:
        Stage.objects.bulk_update(temp_updates, ['position', 'updated_by', 'updated_at'])

    # Step 2: Update to final positions
    final_updates = []
    for stage in stages:
        new_position = position_map.get(stage.id)
        if new_position:
            stage.position = new_position
            stage.updated_by = user
            final_updates.append(stage)

    if final_updates:
        Stage.objects.bulk_update(final_updates, ['position', 'updated_by', 'updated_at'])

    # Return updated stages ordered by position
    return list(
        Stage.objects.filter(
            application_type=application_type
        ).order_by('position')
    )


@transaction.atomic
def stage_delete(
    *,
    stage: Stage,
    user
) -> None:
    """
    Delete stage (hard delete) and reposition remaining stages.

    Business Rules:
    - Cannot delete if applications exist in this stage
    - Decrements position of stages with higher positions

    Args:
        stage: Stage instance to delete
        user: User performing the delete

    Raises:
        ValueError: If validation fails
    """
    # Check if applications exist in this stage
    applications_count = stage.college_applications.filter(
        deleted_at__isnull=True
    ).count()

    if applications_count > 0:
        raise ValueError(
            f"Cannot delete stage '{stage.stage_name}' because it has "
            f"{applications_count} application(s). "
            f"Move applications to another stage first."
        )

    # Store info before deletion
    deleted_position = stage.position
    application_type = stage.application_type

    # Hard delete the stage (removes from database, freeing up the position)
    stage.delete()

    # Decrement position of stages with higher positions
    # Since we hard deleted, the position is now free and we can safely shift
    Stage.objects.filter(
        application_type=application_type,
        position__gt=deleted_position
    ).update(
        position=F('position') - 1,
        updated_by=user
    )


# ============================================================================
# COLLEGE APPLICATION SERVICES
# ============================================================================

class CollegeApplicationCreateInput(BaseModel):
    """Input model for college application creation with validation."""

    application_type_id: int = Field(..., gt=0)
    client_id: int = Field(..., gt=0)
    institute_id: int = Field(..., gt=0)
    course_id: int = Field(..., gt=0)
    start_date_id: int = Field(..., gt=0)  # InstituteIntake ID
    location_id: int = Field(..., gt=0)

    finish_date: Optional[date] = None
    total_tuition_fee: Decimal = Field(..., ge=0, max_digits=12, decimal_places=2)
    student_id: Optional[str] = Field(None, max_length=100)

    super_agent_id: Optional[int] = Field(None, gt=0)
    sub_agent_id: Optional[int] = Field(None, gt=0)
    assigned_to_id: Optional[int] = Field(None, gt=0)
    notes: Optional[str] = None

    class Config:
        str_strip_whitespace = True


class CollegeApplicationUpdateInput(BaseModel):
    """Input model for college application updates with validation."""

    # Cannot change: application_type, client (immutable)
    stage_id: Optional[int] = Field(None, gt=0)
    institute_id: Optional[int] = None
    course_id: Optional[int] = None
    start_date_id: Optional[int] = None
    location_id: Optional[int] = None

    finish_date: Optional[date] = None
    total_tuition_fee: Optional[Decimal] = Field(None, ge=0)
    student_id: Optional[str] = None

    super_agent_id: Optional[int] = None
    sub_agent_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    notes: Optional[str] = None

    class Config:
        str_strip_whitespace = True


@transaction.atomic
def college_application_create(
    *,
    data: CollegeApplicationCreateInput,
    user
) -> CollegeApplication:
    """
    Create college application with comprehensive validation.

    Business Rules:
    - Client must exist and user must have access
    - Course, Location, Start Date must belong to selected Institute
    - Super Agent must have agent_type = SUPER_AGENT
    - Sub Agent must have agent_type = SUB_AGENT
    - Stage is auto-set to position 1 of application_type
    - Assigned user must be in scope (branch/region)

    Args:
        data: Validated input data
        user: User creating the application

    Returns:
        Created CollegeApplication instance

    Raises:
        ValueError: If validation fails
        PermissionError: If user lacks access to client or assigned user
    """
    # Validate client access using client selector
    client = client_get(user=user, client_id=data.client_id)

    # Validate application_type exists
    try:
        application_type = ApplicationType.objects.get(
            id=data.application_type_id,
            deleted_at__isnull=True
        )
    except ApplicationType.DoesNotExist:
        raise ValueError(f"ApplicationType with id {data.application_type_id} not found")

    # Validate institute exists
    try:
        institute = Institute.objects.get(
            id=data.institute_id,
            deleted_at__isnull=True
        )
    except Institute.DoesNotExist:
        raise ValueError(f"Institute with id {data.institute_id} not found")

    # Validate course belongs to institute
    try:
        course = Course.objects.get(
            id=data.course_id,
            institute=institute,
            deleted_at__isnull=True
        )
    except Course.DoesNotExist:
        raise ValueError(
            f"Course with id {data.course_id} not found or doesn't belong to "
            f"Institute '{institute.name}'"
        )

    # Validate location belongs to institute
    try:
        location = InstituteLocation.objects.get(
            id=data.location_id,
            institute=institute,
            deleted_at__isnull=True
        )
    except InstituteLocation.DoesNotExist:
        raise ValueError(
            f"Location with id {data.location_id} not found or doesn't belong to "
            f"Institute '{institute.name}'"
        )

    # Validate start_date (intake) belongs to institute
    try:
        start_date = InstituteIntake.objects.get(
            id=data.start_date_id,
            institute=institute,
            deleted_at__isnull=True
        )
    except InstituteIntake.DoesNotExist:
        raise ValueError(
            f"Intake date with id {data.start_date_id} not found or doesn't belong to "
            f"Institute '{institute.name}'"
        )

    # Validate agents if provided
    super_agent = None
    if data.super_agent_id:
        try:
            super_agent = Agent.objects.get(
                id=data.super_agent_id,
                deleted_at__isnull=True
            )
            if super_agent.agent_type != 'SUPER_AGENT':
                raise ValueError(
                    f"Agent '{super_agent.agent_name}' is not a Super Agent "
                    f"(type: {super_agent.agent_type})"
                )
        except Agent.DoesNotExist:
            raise ValueError(f"Super Agent with id {data.super_agent_id} not found")

    sub_agent = None
    if data.sub_agent_id:
        try:
            sub_agent = Agent.objects.get(
                id=data.sub_agent_id,
                deleted_at__isnull=True
            )
            if sub_agent.agent_type != 'SUB_AGENT':
                raise ValueError(
                    f"Agent '{sub_agent.agent_name}' is not a Sub Agent "
                    f"(type: {sub_agent.agent_type})"
                )
        except Agent.DoesNotExist:
            raise ValueError(f"Sub Agent with id {data.sub_agent_id} not found")

    # Validate assigned user scope (if provided)
    assigned_to = None
    if data.assigned_to_id:
        try:
            assigned_to = User.objects.get(id=data.assigned_to_id)

            # Scope validation (same as visa applications)
            if user.is_in_group(GROUP_BRANCH_ADMIN):
                # Can only assign to users in their branches
                user_branches = user.branches.all()
                assigned_branches = assigned_to.branches.all()
                if not user_branches.filter(id__in=assigned_branches.values_list('id', flat=True)).exists():
                    raise PermissionError(
                        f"Cannot assign to user '{assigned_to.get_full_name()}' - "
                        f"user is not in your branch"
                    )

            elif user.is_in_group(GROUP_REGION_MANAGER):
                # Can only assign to users in their regions
                user_regions = user.regions.all()
                assigned_regions = assigned_to.regions.all()
                if not user_regions.filter(id__in=assigned_regions.values_list('id', flat=True)).exists():
                    raise PermissionError(
                        f"Cannot assign to user '{assigned_to.get_full_name()}' - "
                        f"user is not in your region"
                    )

            # SUPER_ADMIN can assign to anyone in tenant (schema isolation)
            # SUPER_SUPER_ADMIN can assign to anyone

        except User.DoesNotExist:
            raise ValueError(f"User with id {data.assigned_to_id} not found")

    # Auto-assign stage to position 1
    try:
        stage = Stage.objects.filter(
            application_type=application_type,
            position=1
        ).first()

        if not stage:
            raise ValueError(
                f"No stages defined for Application Type '{application_type.title}'. "
                f"Please create at least one stage before creating applications."
            )
    except Exception as e:
        raise ValueError(f"Error auto-assigning stage: {str(e)}")

    # Create college application
    college_application = CollegeApplication(
        application_type=application_type,
        stage=stage,
        client=client,
        institute=institute,
        course=course,
        start_date=start_date,
        location=location,
        finish_date=data.finish_date,
        total_tuition_fee=data.total_tuition_fee,
        student_id=data.student_id or '',
        super_agent=super_agent,
        sub_agent=sub_agent,
        assigned_to=assigned_to,
        notes=data.notes or '',
        created_by=user,
        updated_by=user,
    )
    college_application.save()

    return college_application


@transaction.atomic
def college_application_update(
    *,
    application: CollegeApplication,
    data: CollegeApplicationUpdateInput,
    user
) -> CollegeApplication:
    """
    Update college application with validation.

    Args:
        application: CollegeApplication instance to update
        data: Validated input data
        user: User performing the update

    Returns:
        Updated CollegeApplication instance

    Raises:
        ValueError: If validation fails
        PermissionError: If scope validation fails
    """
    update_fields = ['updated_by', 'updated_at']

    # Validate stage belongs to application_type
    if data.stage_id is not None:
        try:
            stage = Stage.objects.get(
                id=data.stage_id,
                application_type=application.application_type
            )
            application.stage = stage
            update_fields.append('stage')
        except Stage.DoesNotExist:
            raise ValueError(
                f"Stage with id {data.stage_id} not found or doesn't belong to "
                f"Application Type '{application.application_type.title}'"
            )

    # If institute is being changed, validate all related fields
    new_institute = None
    if data.institute_id is not None:
        try:
            new_institute = Institute.objects.get(
                id=data.institute_id,
                deleted_at__isnull=True
            )
            application.institute = new_institute
            update_fields.append('institute')
        except Institute.DoesNotExist:
            raise ValueError(f"Institute with id {data.institute_id} not found")

    # Use current institute if not changed
    institute_for_validation = new_institute or application.institute

    # Validate course belongs to institute
    if data.course_id is not None:
        try:
            course = Course.objects.get(
                id=data.course_id,
                institute=institute_for_validation,
                deleted_at__isnull=True
            )
            application.course = course
            update_fields.append('course')
        except Course.DoesNotExist:
            raise ValueError(
                f"Course with id {data.course_id} not found or doesn't belong to "
                f"Institute '{institute_for_validation.name}'"
            )

    # Validate location belongs to institute
    if data.location_id is not None:
        try:
            location = InstituteLocation.objects.get(
                id=data.location_id,
                institute=institute_for_validation,
                deleted_at__isnull=True
            )
            application.location = location
            update_fields.append('location')
        except InstituteLocation.DoesNotExist:
            raise ValueError(
                f"Location with id {data.location_id} not found or doesn't belong to "
                f"Institute '{institute_for_validation.name}'"
            )

    # Validate start_date belongs to institute
    if data.start_date_id is not None:
        try:
            start_date = InstituteIntake.objects.get(
                id=data.start_date_id,
                institute=institute_for_validation,
                deleted_at__isnull=True
            )
            application.start_date = start_date
            update_fields.append('start_date')
        except InstituteIntake.DoesNotExist:
            raise ValueError(
                f"Intake date with id {data.start_date_id} not found or doesn't belong to "
                f"Institute '{institute_for_validation.name}'"
            )

    # Update simple fields
    if data.finish_date is not None:
        application.finish_date = data.finish_date
        update_fields.append('finish_date')

    if data.total_tuition_fee is not None:
        application.total_tuition_fee = data.total_tuition_fee
        update_fields.append('total_tuition_fee')

    if data.student_id is not None:
        application.student_id = data.student_id
        update_fields.append('student_id')

    if data.notes is not None:
        application.notes = data.notes
        update_fields.append('notes')

    # Validate and update agents
    if data.super_agent_id is not None:
        if data.super_agent_id == 0:
            # Clear super_agent
            application.super_agent = None
            update_fields.append('super_agent')
        else:
            try:
                super_agent = Agent.objects.get(
                    id=data.super_agent_id,
                    deleted_at__isnull=True
                )
                if super_agent.agent_type != 'SUPER_AGENT':
                    raise ValueError(
                        f"Agent '{super_agent.agent_name}' is not a Super Agent "
                        f"(type: {super_agent.agent_type})"
                    )
                application.super_agent = super_agent
                update_fields.append('super_agent')
            except Agent.DoesNotExist:
                raise ValueError(f"Super Agent with id {data.super_agent_id} not found")

    if data.sub_agent_id is not None:
        if data.sub_agent_id == 0:
            # Clear sub_agent
            application.sub_agent = None
            update_fields.append('sub_agent')
        else:
            try:
                sub_agent = Agent.objects.get(
                    id=data.sub_agent_id,
                    deleted_at__isnull=True
                )
                if sub_agent.agent_type != 'SUB_AGENT':
                    raise ValueError(
                        f"Agent '{sub_agent.agent_name}' is not a Sub Agent "
                        f"(type: {sub_agent.agent_type})"
                    )
                application.sub_agent = sub_agent
                update_fields.append('sub_agent')
            except Agent.DoesNotExist:
                raise ValueError(f"Sub Agent with id {data.sub_agent_id} not found")

    # Validate and update assigned_to
    if data.assigned_to_id is not None:
        if data.assigned_to_id == 0:
            # Clear assignment
            application.assigned_to = None
            update_fields.append('assigned_to')
        else:
            try:
                assigned_to = User.objects.get(id=data.assigned_to_id)

                # Scope validation (same as create)
                if user.is_in_group(GROUP_BRANCH_ADMIN):
                    user_branches = user.branches.all()
                    assigned_branches = assigned_to.branches.all()
                    if not user_branches.filter(id__in=assigned_branches.values_list('id', flat=True)).exists():
                        raise PermissionError(
                            f"Cannot assign to user '{assigned_to.get_full_name()}' - "
                            f"user is not in your branch"
                        )

                elif user.is_in_group(GROUP_REGION_MANAGER):
                    user_regions = user.regions.all()
                    assigned_regions = assigned_to.regions.all()
                    if not user_regions.filter(id__in=assigned_regions.values_list('id', flat=True)).exists():
                        raise PermissionError(
                            f"Cannot assign to user '{assigned_to.get_full_name()}' - "
                            f"user is not in your region"
                        )

                application.assigned_to = assigned_to
                update_fields.append('assigned_to')

            except User.DoesNotExist:
                raise ValueError(f"User with id {data.assigned_to_id} not found")

    # Update
    application.updated_by = user
    application.save(update_fields=update_fields)

    return application


@transaction.atomic
def college_application_delete(
    *,
    application: CollegeApplication,
    user
) -> None:
    """
    Delete college application (soft delete).

    Args:
        application: CollegeApplication instance to delete
        user: User performing the delete
    """
    application.delete()  # Soft delete
