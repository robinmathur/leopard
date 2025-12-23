"""
Note serializers for API layer.

These serializers handle JSON serialization/deserialization for note endpoints.
They follow the pattern: CreateRequest, UpdateRequest, and Output serializers.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from immigration.models import Note


class NoteCreateRequest(serializers.Serializer):
    """
    Serializer for creating notes (POST requests).
    
    Validates input and passes to note service for creation.
    Author is set from request.user in the view/service layer.
    """
    
    client = serializers.IntegerField(
        help_text="Client ID this note belongs to"
    )
    
    content = serializers.CharField(
        min_length=1,
        max_length=10000,
        help_text="Note content (1-10,000 characters)"
    )
    
    def validate_content(self, value):
        """Validate note content is not empty after stripping whitespace."""
        if not value or not value.strip():
            raise serializers.ValidationError("Note content cannot be empty")
        return value


class NoteUpdateRequest(serializers.Serializer):
    """
    Serializer for updating notes (PUT/PATCH requests).
    
    Only content can be updated. Client and author are immutable.
    """
    
    content = serializers.CharField(
        min_length=1,
        max_length=10000,
        required=False,
        help_text="Note content (1-10,000 characters)"
    )
    
    def validate_content(self, value):
        """Validate note content is not empty after stripping whitespace."""
        if not value or not value.strip():
            raise serializers.ValidationError("Note content cannot be empty")
        return value


class NoteOutput(serializers.ModelSerializer):
    """
    Serializer for note output (GET requests).
    
    Returns complete note data including author information.
    """
    
    # Computed fields for better UX
    author_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Note
        fields = [
            'id',
            'client',
            'author',
            'author_name',
            'content',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'client',
            'author',
            'author_name',
            'created_at',
            'updated_at',
        ]
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_author_name(self, obj):
        """Get author's full name if exists."""
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.username
        return None
