"""
Institute models for immigration CRM system.

Represents educational institutions, their locations, intakes, courses,
and related metadata for immigration applications.
"""

from django.db import models
from django_countries.fields import CountryField
from immigration.models.base import LifeCycleModel, SoftDeletionModel


class Institute(LifeCycleModel, SoftDeletionModel):
    """
    Represents an educational institution.

    Institutions offer courses and have locations, intakes, and contact persons.
    Supports soft deletion for data recovery.
    """

    # Core identification
    name = models.CharField(max_length=100, help_text="Full name of the institution")
    short_name = models.CharField(max_length=20, help_text="Abbreviated name")

    # Contact information
    phone = models.CharField(max_length=15, blank=True)
    website = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'immigration_institute'
        verbose_name = "institute"
        verbose_name_plural = "institutes"
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['deleted_at']),  # For soft deletion queries
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class InstituteContactPerson(LifeCycleModel, SoftDeletionModel):
    """
    Represents a contact person at an educational institution.

    Contact persons are the points of contact for communication
    with the institution regarding applications and courses.
    """

    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name='contact_persons',
        help_text="Institution this contact person belongs to"
    )
    name = models.CharField(max_length=100)
    gender = models.CharField(
        max_length=10,
        choices=[
            ('MALE', 'Male'),
            ('FEMALE', 'Female'),
            ('OTHER', 'Other'),
        ],
        blank=True
    )
    position = models.CharField(max_length=100, blank=True, help_text="Job title or position")
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)

    class Meta:
        db_table = 'immigration_institute_contact_person'
        verbose_name = "institute contact person"
        verbose_name_plural = "institute contact persons"
        indexes = [
            models.Index(fields=['institute']),
            models.Index(fields=['email']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.institute.name}"


class InstituteRequirement(LifeCycleModel, SoftDeletionModel):
    """
    Represents admission or enrollment requirements for an institution.

    Requirements can be academic, language proficiency, financial,
    documentation, or other types.
    """

    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name='requirements',
        help_text="Institution this requirement belongs to"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    requirement_type = models.CharField(
        max_length=50,
        choices=[
            ('ACADEMIC', 'Academic'),
            ('LANGUAGE', 'Language'),
            ('FINANCIAL', 'Financial'),
            ('DOCUMENT', 'Document'),
            ('OTHER', 'Other'),
        ],
        default='OTHER'
    )

    class Meta:
        db_table = 'immigration_institute_requirement'
        verbose_name = "institute requirement"
        verbose_name_plural = "institute requirements"
        indexes = [
            models.Index(fields=['institute']),
            models.Index(fields=['requirement_type']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['requirement_type', 'title']

    def __str__(self):
        return f"{self.title} - {self.institute.name}"


class InstituteLocation(LifeCycleModel, SoftDeletionModel):
    """
    Represents a physical location/campus of an institution.

    Institutions can have multiple campuses in different cities or countries.
    """

    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name='locations',
        help_text="Institution this location belongs to"
    )

    # Address
    street_name = models.CharField(max_length=100, blank=True)
    suburb = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=50)
    postcode = models.CharField(max_length=20, blank=True)
    country = CountryField()

    # Contact information
    phone_number = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)

    class Meta:
        db_table = 'immigration_institute_location'
        verbose_name = "institute location"
        verbose_name_plural = "institute locations"
        indexes = [
            models.Index(fields=['institute']),
            models.Index(fields=['country']),
            models.Index(fields=['state']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['country', 'state']

    def __str__(self):
        return f"{self.state}, {self.country.name} - {self.institute.name}"


class InstituteIntake(LifeCycleModel, SoftDeletionModel):
    """
    Represents an enrollment period/intake for an institution.

    Intakes define when students can begin their studies at the institution.
    """

    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name='intakes',
        help_text="Institution this intake belongs to"
    )
    intake_date = models.DateField(help_text="Start date of this intake period")
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'immigration_institute_intake'
        verbose_name = "institute intake"
        verbose_name_plural = "institute intakes"
        indexes = [
            models.Index(fields=['institute']),
            models.Index(fields=['intake_date']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['-intake_date']

    def __str__(self):
        return f"{self.intake_date} - {self.institute.name}"


class CourseLevel(LifeCycleModel, SoftDeletionModel):
    """
    Represents the educational level of a course.

    Examples: Certificate, Diploma, Bachelor's, Master's, PhD
    """

    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'immigration_course_level'
        verbose_name = "course level"
        verbose_name_plural = "course levels"
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['name']

    def __str__(self):
        return self.name


class BroadField(LifeCycleModel, SoftDeletionModel):
    """
    Represents a broad field of study.

    Examples: Engineering, Business, Health Sciences
    """

    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'immigration_broad_field'
        verbose_name = "broad field"
        verbose_name_plural = "broad fields"
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['name']

    def __str__(self):
        return self.name


class NarrowField(LifeCycleModel, SoftDeletionModel):
    """
    Represents a narrow/specific field of study within a broad field.

    Examples: Computer Science (under Engineering), Accounting (under Business)
    """

    name = models.CharField(max_length=100)
    broad_field = models.ForeignKey(
        BroadField,
        on_delete=models.CASCADE,
        related_name='narrow_fields',
        help_text="Broad field this narrow field belongs to"
    )

    class Meta:
        db_table = 'immigration_narrow_field'
        verbose_name = "narrow field"
        verbose_name_plural = "narrow fields"
        indexes = [
            models.Index(fields=['broad_field']),
            models.Index(fields=['name']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['broad_field', 'name']

    def __str__(self):
        return f"{self.name} ({self.broad_field.name})"


class Course(LifeCycleModel, SoftDeletionModel):
    """
    Represents a course offered by an institution.

    Courses have levels, fields of study, and associated fees.
    """

    name = models.CharField(max_length=100)
    institute = models.ForeignKey(
        Institute,
        on_delete=models.CASCADE,
        related_name='courses',
        help_text="Institution offering this course"
    )

    # Course classification
    level = models.ForeignKey(
        CourseLevel,
        on_delete=models.PROTECT,
        related_name='courses',
        help_text="Educational level of the course"
    )
    broad_field = models.ForeignKey(
        BroadField,
        on_delete=models.PROTECT,
        related_name='courses',
        help_text="Broad field of study"
    )
    narrow_field = models.ForeignKey(
        NarrowField,
        on_delete=models.PROTECT,
        related_name='courses',
        help_text="Specific field of study"
    )

    # Financial information
    total_tuition_fee = models.DecimalField(
        max_digits=100,
        decimal_places=2,
        help_text="Total tuition fee for the course"
    )
    coe_fee = models.DecimalField(
        max_digits=100,
        decimal_places=2,
        help_text="Confirmation of Enrollment fee"
    )

    # Additional details
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'immigration_course'
        verbose_name = "course"
        verbose_name_plural = "courses"
        indexes = [
            models.Index(fields=['institute']),
            models.Index(fields=['level']),
            models.Index(fields=['broad_field']),
            models.Index(fields=['narrow_field']),
            models.Index(fields=['name']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['institute', 'name']

    def __str__(self):
        return f"{self.name} - {self.institute.name}"
