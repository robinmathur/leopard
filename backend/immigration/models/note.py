"""
Note model for client-specific notes.

This model stores notes attached to clients, separate from the client description field.
Notes support full CRUD operations with permission-based access control.
"""

from django.db import models


class Note(models.Model):
    """
    Client-specific notes with authorship and timestamps.
    
    Notes are separate from the client.description field and support:
    - Multi-user authorship tracking
    - Timestamp tracking (created, updated)
    - Permission-based access control
    - Hard deletion (no soft delete - maintains data integrity)
    
    Fields:
        client: Foreign key to Client (CASCADE delete)
        author: Foreign key to User who created the note (SET_NULL on user delete)
        content: Note text content (max 10,000 characters)
        created_at: Auto-timestamp when note was created
        updated_at: Auto-timestamp when note was last updated
    
    Relationships:
        - Many-to-One with Client (client.notes)
        - Many-to-One with User (author.notes_created)
    
    Indexes:
        - (client, created_at) for chronological queries
        - (author, created_at) for user activity tracking
    
    Usage:
        note = Note.objects.create(
            client=client,
            author=request.user,
            content="Client requires document verification"
        )
    """
    
    client = models.ForeignKey(
        'immigration.Client',
        on_delete=models.CASCADE,
        related_name='notes',
        help_text="Client this note belongs to"
    )
    
    author = models.ForeignKey(
        'immigration.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='notes_created',
        help_text="User who created the note"
    )
    
    content = models.TextField(
        max_length=10000,
        help_text="Note content (max 10,000 characters)"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when note was created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when note was last updated"
    )
    
    class Meta:
        db_table = 'immigration_note'
        verbose_name = 'Note'
        verbose_name_plural = 'Notes'
        ordering = ['-created_at']  # Newest first by default
        indexes = [
            models.Index(fields=['client', '-created_at'], name='note_client_created_idx'),
            models.Index(fields=['author', '-created_at'], name='note_author_created_idx'),
        ]
    
    def __str__(self):
        return f"Note by {self.author} on {self.client} at {self.created_at}"
    
    def clean(self):
        """Validate note content."""
        from django.core.exceptions import ValidationError
        
        # Type checker doesn't understand that self.content is a string at runtime
        content_str = str(self.content) if self.content else ''
        
        if not content_str or not content_str.strip():
            raise ValidationError({'content': 'Note content cannot be empty'})
        
        if len(content_str) > 10000:
            raise ValidationError({'content': 'Note content cannot exceed 10,000 characters'})
