"""
Client model for immigration CRM system.

Represents individuals seeking immigration services from agencies.
"""

from django.db import models
from django_countries.fields import CountryField
from immigration.models.base import LifeCycleModel, SoftDeletionModel
from immigration.constants import ClientStage


class Client(LifeCycleModel, SoftDeletionModel):
    """
    Represents an individual client seeking immigration services.
    
    Clients are scoped to a specific branch within a tenant, ensuring
    data isolation. Supports soft deletion for data recovery.
    
    Stage workflow: LEAD → FOLLOW_UP → CLIENT → CLOSE
    """
    
    # Core identification
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[
            ('MALE', 'Male'),
            ('FEMALE', 'Female'),
            ('OTHER', 'Other'),
        ],
        blank=True
    )
    dob = models.DateField(null=True, blank=True, verbose_name="Date of Birth")
    
    # Contact information
    phone_number = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    
    # Address
    street = models.CharField(max_length=100, blank=True)
    suburb = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    country = CountryField()
    
    # Organizational relationships
    branch = models.ForeignKey(
        'Branch',
        on_delete=models.PROTECT,
        related_name='clients',
        null=True,  # Temporarily nullable for migration
        blank=True,
        help_text="Branch managing this client"
    )
    
    # Business relationships
    visa_category = models.ForeignKey(
        'VisaCategory',
        on_delete=models.SET_NULL,
        related_name='interested_clients',
        null=True,
        blank=True,
        help_text="Primary visa category of interest"
    )
    agent = models.ForeignKey(
        'Agent',
        on_delete=models.SET_NULL,
        related_name='referred_clients',
        null=True,
        blank=True,
        help_text="Referring agent (if applicable)"
    )
    assigned_to = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        related_name='assigned_clients',
        null=True,
        blank=True,
        help_text="Consultant assigned to this client"
    )
    
    # Client status
    stage = models.CharField(
        max_length=20,
        choices=ClientStage.choices(),
        blank=True,
        help_text="Current stage in client workflow"
    )
    active = models.BooleanField(
        default=False,
        help_text="Whether client is actively being serviced"
    )
    
    # Additional information
    description = models.TextField(blank=True)
    referred_by = models.CharField(
        max_length=100,
        blank=True,
        help_text="Referral source"
    )
    
    class Meta:
        db_table = 'immigration_client'
        indexes = [
            models.Index(fields=['branch', 'active']),
            models.Index(fields=['branch', 'stage']),
            models.Index(fields=['email']),
            models.Index(fields=['deleted_at']),  # For soft deletion queries
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip() or f"Client #{self.id}"
    
    @property
    def full_name(self):
        """Return full name of client."""
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p).strip()
    
    @property
    def tenant(self):
        """Get tenant through branch relationship."""
        return self.branch.tenant if self.branch else None

