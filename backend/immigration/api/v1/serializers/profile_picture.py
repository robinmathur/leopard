"""
ProfilePicture serializers for API layer.

These serializers handle JSON serialization/deserialization for profile picture endpoints.
File upload uses multipart/form-data, handled separately in views.
"""

from rest_framework import serializers
from immigration.models import ProfilePicture


class ProfilePictureOutput(serializers.ModelSerializer):
    """
    Serializer for profile picture output (GET requests).
    
    Returns profile picture data including file URL and uploader information.
    """
    
    # Computed fields for better UX
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProfilePicture
        fields = [
            'id',
            'client',
            'file',
            'file_url',
            'file_size',
            'file_type',
            'uploaded_by',
            'uploaded_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = '__all__'  # All fields are read-only in output
    
    def get_uploaded_by_name(self, obj):
        """Get uploader's full name if exists."""
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip() or obj.uploaded_by.username
        return None
    
    def get_file_url(self, obj):
        """Get absolute URL to the file."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
