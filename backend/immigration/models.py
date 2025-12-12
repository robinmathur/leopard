from django.db import models
from django.conf import settings


class LifeCycleModel(models.Model):
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   related_name="%(class)s_created_by", blank=True, null=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   related_name="%(class)s_updated_by", blank=True, null=True, editable=False)

    class Meta:
        abstract = True
