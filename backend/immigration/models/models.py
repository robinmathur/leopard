# immigration/models.py

from django.db import models


class ViewingAccess(models.Model):
    """
    A placeholder model used solely to define generic, non-model-specific
    permissions for data classification (Sensitive/Highly Sensitive).
    """

    class Meta:
        # 1. Define the app label and model name for the ContentType table
        app_label = 'immigration'

        # 2. Define the permissions here
        permissions = [
            ("view_sensitive_data", "Can view data classified as sensitive"),
            ("view_highly_sensitive_data", "Can view data classified as highly sensitive"),
        ]

        # 3. Prevent database table creation, as this model is only for permissions
        managed = False

        # 4. Set a verbose name for clarity in the Django Admin
        verbose_name = "Generic Viewing Access Permission Holder"

    def __str__(self):
        return "Generic Viewing Access"