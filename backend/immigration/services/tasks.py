"""
Task services for business logic.

These services handle task operations and business rules.
Business logic lives here - not in views or serializers.
"""

from typing import Optional, List
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q

from immigration.models.task import Task
from immigration.services.notifications import notification_create
from immigration.constants import TaskPriority, TaskStatus, NotificationType

User = get_user_model()


def task_create(
    title: str,
    detail: str,
    assigned_to: User,
    due_date: timezone.datetime,
    priority: str = TaskPriority.MEDIUM.value,
    tags: Optional[List[str]] = None,
    client_id: Optional[int] = None,
    visa_application_id: Optional[int] = None,
    created_by: Optional[User] = None,
) -> Task:
    """
    Create a new task and send assignment notification.

    Args:
        title: Task title
        detail: Task detail
        assigned_to: User to assign the task to
        due_date: When the task should be completed
        priority: Task priority
        tags: Optional tags
        client_id: Related client ID
        visa_application_id: Related visa application ID
        created_by: User creating the task

    Returns:
        Created Task instance
    """
    task = Task.objects.create(
        title=title,
        detail=detail,
        assigned_to=assigned_to,
        due_date=due_date,
        priority=priority,
        tags=tags or [],
        client_id=client_id,
        visa_application_id=visa_application_id,
        created_by=created_by,
    )
    
    # Send task assignment notification
    notification_create(
        notification_type=NotificationType.TASK_ASSIGNED.value,
        assigned_to=assigned_to,
        title=f'New Task Assigned: {title}',
        message=f'A new {priority.lower()} priority task has been assigned to you.',
        due_date=due_date,
        meta_info={'task_id': task.id, 'priority': priority},
        created_by=created_by,
    )
    
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

    Args:
        task_id: Task ID
        user: User making the update
        updates: Fields to update

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if not task or task.assigned_to != user:
        return None

    for field, value in updates.items():
        if hasattr(task, field):
            setattr(task, field, value)

    task.updated_by = user
    task.save()
    return task


def task_mark_completed(task_id: int, user: User) -> Optional[Task]:
    """
    Mark a task as completed.

    Args:
        task_id: Task ID
        user: User marking as completed

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if task and task.assigned_to == user:
        task.mark_completed()
        return task
    return None


def task_mark_cancelled(task_id: int, user: User) -> Optional[Task]:
    """
    Mark a task as cancelled.

    Args:
        task_id: Task ID
        user: User marking as cancelled

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if task and task.assigned_to == user:
        task.mark_cancelled()
        return task
    return None


def task_add_comment(task_id: int, user: User, comment_text: str) -> Optional[Task]:
    """
    Add a comment to a task.

    Args:
        task_id: Task ID
        user: User adding the comment
        comment_text: Comment text

    Returns:
        Updated Task instance or None
    """
    task = task_get(task_id)
    if task and task.assigned_to == user:
        task.add_comment(user, comment_text)
        return task
    return None


def task_delete(task_id: int, user: User) -> bool:
    """
    Delete a task (soft delete).

    Args:
        task_id: Task ID
        user: User requesting deletion

    Returns:
        True if deleted, False otherwise
    """
    task = task_get(task_id)
    if task and task.assigned_to == user:
        task.delete()  # Soft delete via SoftDeletionModel
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
    task.updated_by = assigned_by
    task.save(update_fields=['assigned_to', 'updated_by', 'updated_at'])

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