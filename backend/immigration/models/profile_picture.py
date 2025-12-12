"""
ProfilePicture model for client profile images.

This model stores client profile pictures with file metadata and validation.
One profile picture per client (OneToOne relationship).
"""

from django.db import models
from django.core.exceptions import ValidationError
import os


def validate_image_file(value):
    """
    Validate uploaded image file type and size.
    
    Accepts: JPEG, PNG, WebP
    Max size: 5MB
    """
    # Check file size (5MB = 5 * 1024 * 1024 bytes)
    max_size = 5 * 1024 * 1024  # 5MB
    if value.size > max_size:
        raise ValidationError(f'Image file size cannot exceed 5MB. Current size: {value.size / (1024 * 1024):.2f}MB')
    
    # Check file extension
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    if ext not in valid_extensions:
        raise ValidationError(f'Unsupported file type: {ext}. Allowed types: JPEG, PNG, WebP')
    
    # Check MIME type if available
    if hasattr(value, 'content_type'):
        valid_mimes = ['image/jpeg', 'image/png', 'image/webp']
        if value.content_type not in valid_mimes:
            raise ValidationError(f'Invalid MIME type: {value.content_type}. Allowed: JPEG, PNG, WebP')


def profile_picture_upload_path(instance, filename):
    """
    Generate upload path for profile pictures.
    
    Pattern: profile_pictures/<client_id>/<filename>
    """
    # Extract file extension
    ext = os.path.splitext(filename)[1]
    # Use client ID in path for organization
    return f'profile_pictures/client_{instance.client.id}/{instance.client.id}{ext}'


class ProfilePicture(models.Model):
    """
    Client profile picture with file metadata.
    
    Stores profile images for clients with:
    - File validation (type, size)
    - Metadata tracking (size, type, uploader)
    - OneToOne relationship (one picture per client)
    
    Fields:
        client: OneToOne field to Client (CASCADE delete)
        file: Image file field (JPEG, PNG, WebP, max 5MB)
        file_size: File size in bytes
        file_type: MIME type (image/jpeg, image/png, image/webp)
        uploaded_by: Foreign key to User who uploaded the picture (SET_NULL)
        created_at: Auto-timestamp when picture was uploaded
        updated_at: Auto-timestamp when picture was last updated
    
    Relationships:
        - OneToOne with Client (client.profile_picture)
        - ManyToOne with User (uploaded_by.profile_pictures_uploaded)
    
    Validation:
        - File types: JPEG, PNG, WebP only
        - File size: Max 5MB
        - One picture per client (enforced by OneToOne)
    
    Usage:
        picture = ProfilePicture.objects.create(
            client=client,
            file=uploaded_file,
            file_size=uploaded_file.size,
            file_type=uploaded_file.content_type,
            uploaded_by=request.user
        )
    """
    
    client = models.OneToOneField(
        'immigration.Client',
        on_delete=models.CASCADE,
        related_name='profile_picture',
        help_text="Client this picture belongs to"
    )
    
    file = models.ImageField(
        upload_to=profile_picture_upload_path,
        validators=[validate_image_file],
        help_text="Profile picture file (JPEG, PNG, WebP, max 5MB)"
    )
    
    file_size = models.IntegerField(
        help_text="File size in bytes"
    )
    
    file_type = models.CharField(
        max_length=20,
        help_text="MIME type (image/jpeg, image/png, image/webp)"
    )
    
    uploaded_by = models.ForeignKey(
        'immigration.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='profile_pictures_uploaded',
        help_text="User who uploaded the picture"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when picture was uploaded"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when picture was last updated"
    )
    
    class Meta:
        db_table = 'immigration_profilepicture'
        verbose_name = 'Profile Picture'
        verbose_name_plural = 'Profile Pictures'
    
    def __str__(self):
        return f"Profile picture for {self.client}"
    
    def save(self, *args, **kwargs):  # type: ignore
        """
        Override save to populate file metadata.
        """
        # Populate file_size and file_type from uploaded file
        if self.file:
            self.file_size = self.file.size  # type: ignore
            if hasattr(self.file, 'content_type'):
                self.file_type = self.file.content_type  # type: ignore
            else:
                # Infer MIME type from extension
                file_name = str(self.file.name) if self.file.name else ''
                ext = os.path.splitext(file_name)[1].lower()
                mime_map = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.webp': 'image/webp'
                }
                self.file_type = mime_map.get(ext, 'image/jpeg')
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):  # type: ignore
        """
        Override delete to remove file from storage when record is deleted.
        """
        # Delete the file from storage
        if self.file:
            self.file.delete(save=False)  # type: ignore
        
        return super().delete(*args, **kwargs)
