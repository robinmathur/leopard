"""
Agent model for external referral partners.
"""

from django.db import models
from django_countries.fields import CountryField
from immigration.models.base import LifeCycleModel, SoftDeletionModel


class Agent(LifeCycleModel, SoftDeletionModel):
    """
    Represents external agents/partners who refer clients.
    
    Agents can be super agents (full service) or sub-agents (limited service).
    """

    AGENT_TYPE_CHOICES = [
        ('SUPER_AGENT', 'Super Agent'),
        ('SUB_AGENT', 'Sub Agent'),
    ]

    agent_name = models.CharField(max_length=100)
    agent_type = models.CharField(
        max_length=20,
        choices=AGENT_TYPE_CHOICES,
        default='SUB_AGENT'
    )
    phone_number = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(max_length=100, blank=True)
    invoice_to = models.CharField(max_length=100, blank=True)
    street = models.CharField(max_length=100, blank=True)
    suburb = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    country = CountryField(blank=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'immigration_agent'
        verbose_name = 'agent'
        verbose_name_plural = 'agents'
        indexes = [
            models.Index(fields=['agent_type']),
            models.Index(fields=['email']),
            models.Index(fields=['deleted_at']),
        ]

    def __str__(self):
        return self.agent_name