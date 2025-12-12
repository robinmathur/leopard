"""
Note services for business logic.

These services handle note CRUD operations and business rules.
Business logic lives here - not in views or serializers.
"""

from typing import Optional, List
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db.models import QuerySet

from immigration.models import Note, Client

User = get_user_model()


def note_list(client_id: Optional[int] = None, author_id: Optional[int] = None, user: Optional[User] = None) -> QuerySet[Note]:
    """
    List notes with optional filtering.
    
    Args:
        client_id: Filter by client ID
        author_id: Filter by author ID
        user: User making the request (for permission checks)
        
    Returns:
        QuerySet of notes
    """
    queryset = Note.objects.select_related('client', 'author').all()
    
    # Filter by client if provided
    if client_id:
        queryset = queryset.filter(client_id=client_id)
    
    # Filter by author if provided
    if author_id:
        queryset = queryset.filter(author_id=author_id)
    
    # Order by created_at descending (newest first)
    queryset = queryset.order_by('-created_at')
    
    return queryset


def note_create(client_id: int, content: str, author: User) -> Note:
    """
    Create a new note for a client.
    
    Args:
        client_id: Client ID to attach note to
        content: Note content
        author: User creating the note
        
    Returns:
        Created Note instance
        
    Raises:
        ValidationError: If validation fails
        Client.DoesNotExist: If client not found
    """
    # Validate content
    if not content or not content.strip():
        raise ValidationError({'content': 'Note content cannot be empty'})
    
    if len(content) > 10000:
        raise ValidationError({'content': 'Note content cannot exceed 10,000 characters'})
    
    # Get client (will raise DoesNotExist if not found)
    client = Client.objects.get(id=client_id)
    
    # Create note
    note = Note.objects.create(
        client=client,
        author=author,
        content=content.strip()
    )
    
    return note


def note_update(note_id: int, content: str, user: User) -> Note:
    """
    Update an existing note.
    
    Args:
        note_id: Note ID to update
        content: New content
        user: User performing the update
        
    Returns:
        Updated Note instance
        
    Raises:
        ValidationError: If validation fails
        Note.DoesNotExist: If note not found
        PermissionDenied: If user lacks permission
    """
    # Get note (will raise DoesNotExist if not found)
    note = Note.objects.select_related('author').get(id=note_id)
    
    # Permission check: user must be author or have change_note permission
    if note.author != user and not user.has_perm('immigration.change_note'):
        raise PermissionDenied('You do not have permission to edit this note')
    
    # Validate content
    if not content or not content.strip():
        raise ValidationError({'content': 'Note content cannot be empty'})
    
    if len(content) > 10000:
        raise ValidationError({'content': 'Note content cannot exceed 10,000 characters'})
    
    # Update note
    note.content = content.strip()
    note.save(update_fields=['content', 'updated_at'])
    
    return note


def note_delete(note_id: int, user: User) -> None:
    """
    Delete a note (hard delete).
    
    Args:
        note_id: Note ID to delete
        user: User performing the deletion
        
    Raises:
        Note.DoesNotExist: If note not found
        PermissionDenied: If user lacks permission
    """
    # Get note (will raise DoesNotExist if not found)
    note = Note.objects.select_related('author').get(id=note_id)
    
    # Permission check: user must be author or have delete_note permission
    if note.author != user and not user.has_perm('immigration.delete_note'):
        raise PermissionDenied('You do not have permission to delete this note')
    
    # Hard delete the note
    note.delete()


def note_get(note_id: int) -> Note:
    """
    Get a single note by ID.
    
    Args:
        note_id: Note ID
        
    Returns:
        Note instance
        
    Raises:
        Note.DoesNotExist: If note not found
    """
    return Note.objects.select_related('client', 'author').get(id=note_id)
