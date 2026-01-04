"""
Task services for business logic.

These services handle task operations and business rules.
Business logic lives here - not in views or serializers.
"""

from typing import Optional, List
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.db.models import Q
from django.core.exceptions import ValidationError

from immigration.models.task import Task
from immigration.services.notifications import notification_create
from immigration.services.comments import parse_mentions
from immigration.constants import TaskPriority, TaskStatus, NotificationType

User = get_user_model()


def task_create(
    title: str,
    detail: str,
    due_date: timezone.datetime,
    priority: str = TaskPriority.MEDIUM.value,
    tags: Optional[List[str]] = None,
    assigned_to: Optional[User] = None,
    branch_id: Optional[int] = None,
    created_by: Optional[User] = None,
    assigned_by: Optional[User] = None,
    content_type: Optional[int] = None,
    object_id: Optional[int] = None,
) -> Task:
    """
    Create a new task and send assignment notification if assigned.

    Args:
        title: Task title
        detail: Task detail
        due_date: When the task should be completed
        priority: Task priority
        tags: Optional tags
        assigned_to: User to assign the task to (optional, mutually exclusive with branch_id)
        branch_id: Branch ID to assign the task to (optional, mutually exclusive with assigned_to)
        created_by: User creating the task
        assigned_by: User who assigned the task
        content_type: ContentType ID for generic FK
        object_id: Entity ID for generic FK

    Returns:
        Created Task instance
        
    Raises:
        ValidationError: If both assigned_to and branch_id are provided
    """
    # Validate: either assigned_to OR branch_id, not both
    if assigned_to and branch_id:
        raise ValidationError("Task cannot be assigned to both a user and a branch.")
    
    # Handle generic FK
    content_type_obj = None
    if content_type:
        try:
            content_type_obj = ContentType.objects.get(id=content_type)
        except ContentType.DoesNotExist:
            pass
    
    # Handle branch assignment
    branch_obj = None
    if branch_id:
        from immigration.models.branch import Branch
        try:
            branch_obj = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            raise ValidationError(f"Branch with ID {branch_id} does not exist.")
    
    # Use created_by as assigned_by if not provided
    if not assigned_by and created_by:
        assigned_by = created_by
    
    task = Task.objects.create(
        title=title,
        detail=detail,
        assigned_to=assigned_to,
        branch=branch_obj,
        assigned_by=assigned_by,
        due_date=due_date,
        priority=priority,
        tags=tags or [],
        content_type=content_type_obj,
        object_id=object_id,
        created_by=created_by,
    )
    
    # Send task assignment notification only if task is assigned to a user
    if assigned_to:
        notification_create(
            notification_type=NotificationType.TASK_ASSIGNED.value,
            assigned_to=assigned_to,
            title=f'New Task Assigned: {title}',
            message=f'A new {priority.lower()} priority task has been assigned to you.',
            due_date=due_date,
            meta_info={'task_id': task.id, 'priority': priority},
            created_by=created_by,
        )
    # TODO: If assigned to branch, could notify all branch members
    # For now, branch members will see tasks when they query their branch tasks
    
    return task


def task_get(task_id: int) -> Optional[Task]:
    """
    Get a task by ID.

    Args:
        task_id: Task ID

    Returns:
        Task instance or None
    """
    try:
        return Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return None


def task_list(
    user: User,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    include_overdue: bool = True,
) -> List[Task]:
    """
    List tasks for a user.

    Args:
        user: User to get tasks for
        status: Filter by status
        priority: Filter by priority
        include_overdue: Whether to include overdue tasks

    Returns:
        List of Task instances
    """
    queryset = Task.objects.filter(assigned_to=user)

    if status:
        queryset = queryset.filter(status=status)

    if priority:
        queryset = queryset.filter(priority=priority)

    if not include_overdue:
        now = timezone.now()
        queryset = queryset.filter(
            Q(due_date__gte=now) | Q(status__in=[TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value])
        )

    return list(queryset.order_by('-due_date'))


def task_update(
    task_id: int,
    user: User,
    **updates
) -> Optional[Task]:
    """
    Update a task.

    Any authenticated user can update any task.

    Args:
        task_id: Task ID
        user: User making the update
        updates: Fields to update

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if not task:
        return None

    # Handle assignment fields specially to ensure mutual exclusivity
    # Process branch first, then assigned_to, so that if both are provided, assigned_to wins
    # But if only branch is provided, we need to clear assigned_to
    if 'branch' in updates:
        branch = updates.pop('branch')
        task.branch = branch
        # When assigning to a branch, clear user assignment
        if branch is not None:
            task.assigned_to = None
    
    if 'assigned_to' in updates:
        assigned_to = updates.pop('assigned_to')
        task.assigned_to = assigned_to
        # When assigning to a user, clear branch assignment
        if assigned_to is not None:
            task.branch = None
    
    # Apply remaining updates
    for field, value in updates.items():
        if hasattr(task, field):
            setattr(task, field, value)

    task.updated_by = user
    task.save()
    return task


def task_mark_completed(task_id: int, user: User) -> Optional[Task]:
    """
    Mark a task as completed.

    Allows the assigned user or the user who assigned the task to complete it.

    Args:
        task_id: Task ID
        user: User marking as completed

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if not task:
        return None
    
    # Allow assigned user or the user who assigned the task to complete it
    can_complete = (
        task.assigned_to == user or
        (task.assigned_by and task.assigned_by == user)
    )
    
    if can_complete:
        task.mark_completed(user=user)
        return task
    return None


def task_mark_cancelled(task_id: int, user: User) -> Optional[Task]:
    """
    Mark a task as cancelled.

    Allows the assigned user or the user who assigned the task to cancel it.

    Args:
        task_id: Task ID
        user: User marking as cancelled

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if not task:
        return None
    
    # Allow assigned user or the user who assigned the task to cancel it
    can_cancel = (
        task.assigned_to == user or
        (task.assigned_by and task.assigned_by == user)
    )
    
    if can_cancel:
        task.mark_cancelled(user=user)
        return task
    return None


def task_add_comment(task_id: int, user: User, comment_text: str) -> Optional[Task]:
    """
    Add a comment to a task with @mention support.

    Allows the assigned user, branch members, or the user who assigned the task to add comments.
    Parses @mentions and sends notifications to mentioned users.

    Args:
        task_id: Task ID
        user: User adding the comment
        comment_text: Comment text (may contain @mentions)

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if not task:
        return None
    
    # Allow assigned user, branch members, or the user who assigned the task to add comments
    can_comment = (
        task.assigned_to == user or
        (task.assigned_by and task.assigned_by == user) or
        (task.branch and user.branches.filter(id=task.branch.id).exists())
    )
    
    if not can_comment:
        return None
    
    # Parse @mentions from comment text
    mentions = parse_mentions(comment_text)
    
    # Add comment with mentions
    task.add_comment(user, comment_text, mentions)
    
    # Send notifications to mentioned users
    if mentions:
        for mention in mentions:
            mentioned_user = User.objects.get(id=mention['user_id'])
            notification_create(
                notification_type=NotificationType.TASK_MENTIONED.value,
                assigned_to=mentioned_user,
                title=f'You were mentioned in a task comment',
                message=f'{user.username} mentioned you in a comment on task: {task.title}',
                due_date=task.due_date,
                meta_info={
                    'task_id': task.id,
                    'comment_text': comment_text,
                    'mentioned_by': user.id,
                },
                created_by=user,
            )
    
    return task


def task_delete(task_id: int, user: User) -> bool:
    """
    Delete a task (hard delete).

    Allows the task creator or branch admins (and above) to delete tasks.

    Args:
        task_id: Task ID
        user: User requesting deletion

    Returns:
        True if deleted, False otherwise
    """
    from immigration.constants import GROUP_BRANCH_ADMIN, GROUP_REGION_MANAGER, GROUP_SUPER_ADMIN

    task = task_get(task_id)
    if not task:
        return False

    # Allow task creator or branch admins (and above) to delete tasks
    is_creator = task.created_by == user
    is_admin = user.groups.filter(name__in=[
        GROUP_BRANCH_ADMIN,
        GROUP_REGION_MANAGER,
        GROUP_SUPER_ADMIN,
    ]).exists()

    can_delete = is_creator or is_admin

    if can_delete:
        task.delete()  # Hard delete (Task doesn't use SoftDeletionModel)
        return True
    return False


def task_get_overdue(user: User) -> List[Task]:
    """
    Get overdue tasks for a user.

    Args:
        user: User to check

    Returns:
        List of overdue tasks
    """
    return list(Task.objects.filter(
        assigned_to=user,
        status__in=[TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value]
    ).filter(
        due_date__lt=timezone.now()
    ).order_by('due_date'))


def task_get_due_soon(user: User, days: int = 3) -> List[Task]:
    """
    Get tasks due soon for a user.

    Args:
        user: User to check
        days: Number of days to consider as "soon"

    Returns:
        List of tasks due soon
    """
    now = timezone.now()
    due_before = now + timezone.timedelta(days=days)

    return list(Task.objects.filter(
        assigned_to=user,
        status__in=[TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value],
        due_date__gte=now,
        due_date__lte=due_before
    ).order_by('due_date'))


def task_assign(
    task_id: int,
    assigned_to: User,
    assigned_by: User,
) -> Optional[Task]:
    """
    Assign or reassign a task to a user and send notification.

    Args:
        task_id: Task ID to assign
        assigned_to: User to assign task to
        assigned_by: User performing the assignment

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if not task:
        return None

    # Update assignment
    task.assigned_to = assigned_to
    task.assigned_by = assigned_by
    task.updated_by = assigned_by
    task.save(update_fields=['assigned_to', 'assigned_by', 'updated_by', 'updated_at'])

    # Send assignment notification
    notification_create(
        notification_type=NotificationType.TASK_ASSIGNED.value,
        assigned_to=assigned_to,
        title=f'Task Assigned: {task.title}',
        message=f'A {task.get_priority_display().lower()} priority task has been assigned to you.',
        due_date=task.due_date,
        meta_info={'task_id': task.id, 'priority': task.priority},
        created_by=assigned_by,
    )

    return task


def task_claim_from_branch(task_id: int, user: User) -> Optional[Task]:
    """
    Claim a branch-assigned task for the current user.
    
    When a task is assigned to a branch, any branch member can claim it.
    Claiming sets assigned_to to the claiming user and clears branch assignment.
    
    Args:
        task_id: Task ID to claim
        user: User claiming the task
        
    Returns:
        Updated Task instance or None
        
    Raises:
        ValidationError: If task is not assigned to a branch or user is not a branch member
    """
    task = task_get(task_id)
    if not task:
        return None
    
    # Task must be assigned to a branch
    if not task.branch:
        raise ValidationError("Task is not assigned to a branch and cannot be claimed.")
    
    # User must be a member of the branch
    if not user.branches.filter(id=task.branch.id).exists():
        raise ValidationError("You are not a member of the branch this task is assigned to.")
    
    # Store branch name before clearing
    branch_name = task.branch.name
    
    # Claim the task: set assigned_to to user, clear branch
    task.assigned_to = user
    task.branch = None
    task.assigned_by = task.assigned_by or user  # Set assigned_by if not already set
    task.updated_by = user
    task.save(update_fields=['assigned_to', 'branch', 'assigned_by', 'updated_by', 'updated_at'])
    
    # Send notification to the user who claimed it
    notification_create(
        notification_type=NotificationType.TASK_ASSIGNED.value,
        assigned_to=user,
        title=f'Task Claimed: {task.title}',
        message=f'You have claimed a task from {branch_name}.',
        due_date=task.due_date,
        meta_info={'task_id': task.id, 'priority': task.priority},
        created_by=user,
    )
    
    return task