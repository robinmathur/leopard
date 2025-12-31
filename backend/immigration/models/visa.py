"""
Visa-related models for immigration CRM system.

Includes VisaCategory, VisaType, and VisaApplication models.
"""

from django.db import models
from djmoney.models.fields import MoneyField
from immigration.models.base import LifeCycleModel


class VisaCategory(models.Model):
    """
    High-level visa categories (e.g., Work Visa, Student Visa, Permanent Residence).
    
    This is master data shared across all tenants. Categories rarely change
    and provide a way to organize specific visa types.
    """
    
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'immigration_visacategory'
        verbose_name_plural = 'Visa Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class VisaType(models.Model):
    """
    Specific visa types under categories (e.g., "Subclass 482" under Work Visa).
    
    Each visa type has a checklist of required documents stored as JSON.
    Master data shared across all tenants.
    """
    
    visa_category = models.ForeignKey(
        VisaCategory,
        on_delete=models.CASCADE,
        related_name='visa_types',
        help_text="Parent visa category"
    )
    name = models.CharField(max_length=100, default="")
    code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Official visa code/subclass"
    )
    description = models.TextField(blank=True)
    checklist = models.JSONField(
        default=list,
        blank=True,
        help_text="List of required documents for this visa type"
    )
    
    class Meta:
        db_table = 'immigration_visatype'
        # Temporarily removed unique_together to handle migration
        # unique_together = [['visa_category', 'name']]
        ordering = ['visa_category', 'name']
    
    def __str__(self):
        if self.code:
            return f"{self.name} ({self.code})"
        return self.name


class VisaApplication(LifeCycleModel):
    """
    Formal visa application submitted for a client.
    
    Tracks the entire lifecycle of a visa application from submission
    to final decision (granted/rejected/withdrawn).
    """
    
    VISA_STATUS_CHOICES = [
        ('TO_BE_APPLIED', 'To be Applied'),
        ('VISA_APPLIED', 'Visa Applied'),
        ('CASE_OPENED', 'Case Opened'),
        ('GRANTED', 'Granted'),
        ('REJECTED', 'Rejected'),
        ('WITHDRAWN', 'Withdrawn'),
    ]
    
    # Core relationships
    client = models.ForeignKey(
        'Client',
        on_delete=models.CASCADE,
        related_name='visa_applications',
        help_text="Client submitting this visa application"
    )
    visa_type = models.ForeignKey(
        VisaType,
        on_delete=models.PROTECT,
        related_name='applications',
        help_text="Type of visa being applied for"
    )
    
    # Application details
    transaction_reference_no = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        help_text="Official government reference number"
    )
    immigration_fee = MoneyField(
        max_digits=10,
        decimal_places=2,
        default_currency='USD',
        help_text="Government immigration fee"
    )
    service_fee = MoneyField(
        max_digits=10,
        decimal_places=2,
        default_currency='USD',
        help_text="Agency service fee"
    )
    dependent = models.BooleanField(
        default=False,
        help_text="Whether this is a dependent application"
    )
    notes = models.TextField(blank=True, null=True)
    
    # Assignment
    assigned_to = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        related_name='assigned_visa_applications',
        null=True,
        blank=True,
        help_text="Consultant handling this application"
    )
    
    # Documents
    required_documents = models.JSONField(
        default=list,
        blank=True,
        help_text="Required documents checklist with received status. Format: [{'name': 'Document Name', 'received': bool}]"
    )
    
    # Important dates
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Visa expiry date (if granted)"
    )
    date_applied = models.DateField(
        null=True,
        blank=True,
        help_text="Date application was submitted"
    )
    date_opened = models.DateField(
        null=True,
        blank=True,
        help_text="Date case was opened by immigration"
    )
    final_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of final decision"
    )
    date_granted = models.DateField(
        null=True,
        blank=True,
        help_text="Date visa was granted"
    )
    date_rejected = models.DateField(
        null=True,
        blank=True,
        help_text="Date visa was rejected"
    )
    date_withdrawn = models.DateField(
        null=True,
        blank=True,
        help_text="Date application was withdrawn"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=VISA_STATUS_CHOICES,
        default='TO_BE_APPLIED'
    )
    
    class Meta:
        db_table = 'immigration_visaapplication'
        indexes = [
            models.Index(fields=['client', 'status']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['status', 'date_applied']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.client} - {self.visa_type} ({self.get_status_display()})"
    
    @property
    def tenant(self):
        """Get tenant through client's branch relationship."""
        return self.client.branch.tenant if self.client and self.client.branch else None
    
    @property
    def branch(self):
        """Get branch through client relationship."""
        return self.client.branch if self.client else None

