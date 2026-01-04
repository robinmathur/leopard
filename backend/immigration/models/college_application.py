"""
College application models for immigration CRM system.

Includes ApplicationType, Stage, and CollegeApplication models.
Provides dynamic workflow management with configurable stages for different application types.
"""

from django.db import models
from django.db.models import Max
from immigration.models.base import LifeCycleModel, SoftDeletionModel
from immigration.constants import CURRENCY_CHOICES


class ApplicationType(LifeCycleModel, SoftDeletionModel):
    """
    Configuration for different types of college applications.

    Examples: Undergraduate, Postgraduate, Short Course, Foundation Program

    Each application type has its own workflow stages, currency settings, and tax configuration.
    Stages can be added, reordered, and customized per application type.
    """

    title = models.CharField(
        max_length=255,
        help_text="Application type name (e.g., 'Undergraduate', 'Postgraduate')"
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='USD',
        help_text="Default currency for fees and costs"
    )
    tax_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Tax label (e.g., 'GST', 'VAT', 'Sales Tax')"
    )
    tax_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Tax percentage to apply (e.g., 10.00 for 10%)"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of this application type"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this application type is currently in use"
    )

    class Meta:
        db_table = 'immigration_applicationtype'
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['is_active', 'deleted_at']),
        ]
        ordering = ['title']
        verbose_name = 'Application Type'
        verbose_name_plural = 'Application Types'

    def __str__(self):
        return self.title

    @property
    def has_applications(self):
        """
        Check if any college applications use this type.

        Returns:
            bool: True if applications exist, False otherwise
        """
        return self.college_applications.filter(deleted_at__isnull=True).exists()

    @property
    def stages_count(self):
        """
        Get count of stages for this application type.

        Returns:
            int: Number of stages
        """
        return self.stages.count()


class Stage(LifeCycleModel):
    """
    Workflow stage for an application type.

    Stages define the workflow steps for college applications.
    They are ordered by position and can be reordered via drag-and-drop.

    Note: Stages use hard delete (not soft delete) to avoid position conflicts.

    Position Rules:
    - Position starts at 1 (not 0)
    - Position 1 = first stage (auto-assigned to new applications)
    - Highest position = final stage (used for dashboard statistics)
    - Positions are unique per application_type
    - Positions are automatically managed when stages are added/removed/reordered

    Examples:
    - Application Received (position 1)
    - Documents Verified (position 2)
    - Submitted to Institute (position 3)
    - Offer Received (position 4)
    - Enrolled (position 5) <- Final stage
    """

    application_type = models.ForeignKey(
        'ApplicationType',
        on_delete=models.CASCADE,
        related_name='stages',
        help_text="Parent application type"
    )
    stage_name = models.CharField(
        max_length=100,
        help_text="Stage display name"
    )
    position = models.PositiveIntegerField(
        help_text="Display order (1-based, auto-managed)"
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description of what happens in this stage"
    )

    class Meta:
        db_table = 'immigration_stage'
        unique_together = [['application_type', 'position']]
        indexes = [
            models.Index(fields=['application_type', 'position']),
        ]
        ordering = ['application_type', 'position']
        verbose_name = 'Stage'
        verbose_name_plural = 'Stages'

    def __str__(self):
        return f"{self.application_type.title} - {self.stage_name} (Position {self.position})"

    @property
    def is_final_stage(self):
        """
        Check if this is the final (highest position) stage for its application type.

        Final stage is used for dashboard statistics - only applications in final stage
        are counted when grouping by intake date.

        Returns:
            bool: True if this stage has the highest position number
        """
        max_position_result = Stage.objects.filter(
            application_type=self.application_type
        ).aggregate(max_position=Max('position'))

        max_position = max_position_result['max_position']
        return self.position == max_position if max_position is not None else False


class CollegeApplication(LifeCycleModel, SoftDeletionModel):
    """
    College/university application for a client.

    Tracks the entire application lifecycle from initial submission through to
    final enrollment. Applications follow the workflow defined by their application_type's stages.

    Stage Management:
    - Stage is automatically set to position 1 on creation
    - Stage is not visible to users during creation (auto-assigned)
    - Users can change stage later via update

    Institute Relationships:
    - Course, Location, and Start Date must all belong to the selected Institute
    - This ensures data integrity and prevents mismatched references
    - Validated in service layer during create/update

    Agent Types:
    - super_agent: Must have agent_type = 'SUPER_AGENT'
    - sub_agent: Must have agent_type = 'SUB_AGENT'
    - Validated in service layer
    """

    # Core relationships
    application_type = models.ForeignKey(
        'ApplicationType',
        on_delete=models.PROTECT,
        related_name='college_applications',
        help_text="Type of application (determines workflow stages)"
    )
    stage = models.ForeignKey(
        'Stage',
        on_delete=models.PROTECT,
        related_name='college_applications',
        help_text="Current workflow stage (auto-set to position 1 on create)"
    )
    client = models.ForeignKey(
        'Client',
        on_delete=models.CASCADE,
        related_name='college_applications',
        help_text="Client submitting application"
    )

    # Institute and course details
    institute = models.ForeignKey(
        'Institute',
        on_delete=models.PROTECT,
        related_name='college_applications',
        help_text="Educational institution"
    )
    course = models.ForeignKey(
        'Course',
        on_delete=models.PROTECT,
        related_name='college_applications',
        help_text="Course being applied for (must belong to selected Institute)"
    )
    start_date = models.ForeignKey(
        'InstituteIntake',
        on_delete=models.PROTECT,
        related_name='college_applications',
        help_text="Intake/start date (must belong to selected Institute)"
    )
    location = models.ForeignKey(
        'InstituteLocation',
        on_delete=models.PROTECT,
        related_name='college_applications',
        help_text="Campus location (must belong to selected Institute)"
    )

    # Application details
    finish_date = models.DateField(
        null=True,
        blank=True,
        help_text="Expected course completion date"
    )
    total_tuition_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total tuition fee for the course"
    )
    student_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Student ID assigned by institution (once enrolled)"
    )

    # Agent relationships
    super_agent = models.ForeignKey(
        'Agent',
        related_name='super_agent_college_applications',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'agent_type': 'SUPER_AGENT'},
        help_text="Super agent (if applicable)"
    )
    sub_agent = models.ForeignKey(
        'Agent',
        related_name='sub_agent_college_applications',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'agent_type': 'SUB_AGENT'},
        help_text="Sub agent (if applicable)"
    )

    # Assignment
    assigned_to = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        related_name='assigned_college_applications',
        null=True,
        blank=True,
        help_text="Consultant handling this application"
    )

    # Additional information
    notes = models.TextField(
        blank=True,
        help_text="Internal notes and comments"
    )

    class Meta:
        db_table = 'immigration_collegeapplication'
        indexes = [
            models.Index(fields=['client', 'stage']),
            models.Index(fields=['application_type', 'stage']),
            models.Index(fields=['institute']),
            models.Index(fields=['start_date']),  # Critical for dashboard grouping by intake date
            models.Index(fields=['assigned_to']),
            models.Index(fields=['deleted_at']),
        ]
        ordering = ['-created_at']
        verbose_name = 'College Application'
        verbose_name_plural = 'College Applications'

    def __str__(self):
        client_name = f"{self.client.first_name} {self.client.last_name}" if self.client else "Unknown"
        course_name = self.course.name if self.course else "Unknown Course"
        institute_name = self.institute.name if self.institute else "Unknown Institute"
        return f"{client_name} - {course_name} ({institute_name})"

    @property
    def tenant(self):
        """
        Get tenant through client's branch relationship.

        Multi-tenancy is enforced via the client → branch → tenant hierarchy.

        Returns:
            Tenant: The tenant this application belongs to
        """
        if self.client and self.client.branch:
            return self.client.branch.tenant
        return None

    @property
    def branch(self):
        """
        Get branch through client relationship.

        Used for role-based filtering (e.g., BRANCH_ADMIN sees only their branch).

        Returns:
            Branch: The branch this application belongs to
        """
        return self.client.branch if self.client else None

    @property
    def is_final_stage(self):
        """
        Check if application is in the final stage.

        Final stage is the stage with the highest position number for this application's type.
        Used by dashboard statistics to count only completed/final applications.

        Returns:
            bool: True if in final stage, False otherwise
        """
        return self.stage.is_final_stage if self.stage else False
