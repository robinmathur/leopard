"""
Client profile and supporting data models.

This module contains refactored models for client-related supporting
information such as passports, qualifications, and language proficiency
records. Models use the shared lifecycle base for audit tracking and
expose tenant/branch helpers for consistent scoping.
"""

from django.db import models
from django_countries.fields import CountryField

from immigration.models.base import LifeCycleModel


class LPE(models.Model):
    """
    Language proficiency exam master data (e.g., IELTS, PTE).
    """

    name = models.CharField(max_length=100, unique=True)
    validity_term = models.PositiveSmallIntegerField(
        default=0,
        help_text="Validity window for results in years",
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = "immigration_lpe"
        ordering = ["name"]
        verbose_name = "language proficiency exam"
        verbose_name_plural = "language proficiency exams"

    def __str__(self) -> str:  # pragma: no cover - simple display helper
        return self.name


class Proficiency(LifeCycleModel):
    """
    Individual language proficiency result for a client.
    """

    client = models.ForeignKey(
        "Client",
        on_delete=models.CASCADE,
        related_name="proficiencies",
    )
    test_name = models.ForeignKey(
        LPE,
        on_delete=models.PROTECT,
        related_name="proficiencies",
        help_text="Exam type used for this scorecard",
        null=True,
        blank=True,
    )
    overall_score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    speaking_score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    reading_score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    listening_score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    writing_score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    test_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "immigration_proficiency"
        ordering = ["-test_date", "client_id"]
        indexes = [
            models.Index(fields=["client", "test_date"]),
            models.Index(fields=["test_name"]),
        ]
        verbose_name = "language proficiency"

    def __str__(self) -> str:  # pragma: no cover - simple display helper
        return f"{self.test_name} ({self.overall_score or 'N/A'})"

    @property
    def branch(self):
        """Expose branch for scoping."""
        return self.client.branch if self.client else None

    @property
    def tenant(self):
        """Expose tenant for scoping."""
        if self.client and self.client.branch:
            return self.client.branch.tenant
        return None


class Qualification(LifeCycleModel):
    """
    Educational qualification linked to a client.
    """

    client = models.ForeignKey(
        "Client",
        on_delete=models.CASCADE,
        related_name="qualifications",
    )
    course = models.CharField(max_length=100)
    institute = models.CharField(max_length=100, blank=True)
    degree = models.CharField(max_length=100, blank=True)
    field_of_study = models.CharField(max_length=100, blank=True)
    enroll_date = models.DateField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    country = CountryField(blank=True)

    class Meta:
        db_table = "immigration_qualification"
        ordering = ["-completion_date", "course"]
        indexes = [
            models.Index(fields=["client", "completion_date"]),
        ]
        verbose_name = "qualification"

    def __str__(self) -> str:  # pragma: no cover - simple display helper
        return self.course

    @property
    def branch(self):
        """Expose branch for scoping."""
        return self.client.branch if self.client else None

    @property
    def tenant(self):
        """Expose tenant for scoping."""
        if self.client and self.client.branch:
            return self.client.branch.tenant
        return None


class Passport(LifeCycleModel):
    """
    Passport details for a client (one-to-one).
    """

    client = models.OneToOneField(
        "Client",
        on_delete=models.CASCADE,
        related_name="passport",
        primary_key=True,
        db_column="id",  # Preserve existing primary key column
    )
    passport_no = models.CharField(max_length=20)
    passport_country = CountryField()
    date_of_issue = models.DateField(null=True, blank=True)
    date_of_expiry = models.DateField(null=True, blank=True)
    place_of_issue = models.CharField(max_length=100, blank=True)
    country_of_birth = CountryField()
    nationality = CountryField()

    class Meta:
        db_table = "immigration_passport"
        verbose_name = "passport"

    def __str__(self) -> str:  # pragma: no cover - simple display helper
        return self.passport_no

    @property
    def branch(self):
        """Expose branch for scoping."""
        return self.client.branch if self.client else None

    @property
    def tenant(self):
        """Expose tenant for scoping."""
        if self.client and self.client.branch:
            return self.client.branch.tenant
        return None


class Employment(LifeCycleModel):
    """
    Employment history for a client.
    """

    client = models.ForeignKey(
        "Client",
        on_delete=models.CASCADE,
        related_name="employments",
    )
    employer_name = models.CharField(max_length=200)
    position = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    country = CountryField()

    class Meta:
        db_table = "immigration_employment"
        ordering = ["-end_date", "-start_date"]
        indexes = [
            models.Index(fields=["client", "end_date"]),
        ]
        verbose_name = "employment"

    def __str__(self) -> str:  # pragma: no cover - simple display helper
        return f"{self.employer_name} - {self.position}"

    @property
    def branch(self):
        """Expose branch for scoping."""
        return self.client.branch if self.client else None

    @property
    def tenant(self):
        """Expose tenant for scoping."""
        if self.client and self.client.branch:
            return self.client.branch.tenant
        return None

