"""
College application serializers for API layer.

These serializers handle JSON serialization/deserialization for college application endpoints.
They are thin wrappers - business logic lives in services.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from immigration.models import ApplicationType, Stage, CollegeApplication


# ==============================================================================
# APPLICATION TYPE SERIALIZERS
# ==============================================================================

class ApplicationTypeOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for application type output (GET requests).

    Returns complete application type data including computed fields.
    """

    stages_count = serializers.SerializerMethodField()
    has_applications = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationType
        fields = [
            'id',
            'title',
            'currency',
            'tax_name',
            'tax_percentage',
            'description',
            'is_active',
            'stages_count',
            'has_applications',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_by',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_stages_count(self, obj):
        """Get count of active stages."""
        return obj.stages_count

    @extend_schema_field(serializers.BooleanField())
    def get_has_applications(self, obj):
        """Check if applications exist."""
        return obj.has_applications

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by_name(self, obj):
        """Get creator name if exists."""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None


class ApplicationTypeCreateSerializer(serializers.Serializer):
    """
    Serializer for application type creation (POST requests).

    Validates input and passes to application_type_create service.
    """

    title = serializers.CharField(max_length=255)
    currency = serializers.CharField(max_length=3, default='USD')
    tax_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    tax_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True
    )


class ApplicationTypeUpdateSerializer(serializers.Serializer):
    """
    Serializer for application type updates (PATCH/PUT requests).

    All fields optional for partial updates.
    """

    title = serializers.CharField(max_length=255, required=False)
    currency = serializers.CharField(max_length=3, required=False)
    tax_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    tax_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True
    )
    is_active = serializers.BooleanField(required=False)


# ==============================================================================
# STAGE SERIALIZERS
# ==============================================================================

class StageOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for stage output (GET requests).

    Returns complete stage data including related information.
    """

    application_type_title = serializers.CharField(
        source='application_type.title',
        read_only=True
    )
    is_final_stage = serializers.SerializerMethodField()

    class Meta:
        model = Stage
        fields = [
            'id',
            'application_type',
            'application_type_title',
            'stage_name',
            'position',
            'description',
            'is_final_stage',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
        ]

    @extend_schema_field(serializers.BooleanField())
    def get_is_final_stage(self, obj):
        """Check if this is the final stage."""
        return obj.is_final_stage


class StageCreateSerializer(serializers.Serializer):
    """
    Serializer for stage creation (POST requests).

    Validates input and passes to stage_create service.
    """

    application_type_id = serializers.IntegerField()
    stage_name = serializers.CharField(max_length=100)
    position = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)


class StageUpdateSerializer(serializers.Serializer):
    """
    Serializer for stage updates (PATCH/PUT requests).

    All fields optional. Position changes use dedicated reorder endpoint.
    """

    stage_name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)


class StageReorderSerializer(serializers.Serializer):
    """
    Serializer for stage reordering (drag-and-drop).

    Expects list of {stage_id, new_position} mappings.
    """

    application_type_id = serializers.IntegerField()
    stages = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {stage_id: int, new_position: int} mappings"
    )


# ==============================================================================
# COLLEGE APPLICATION SERIALIZERS
# ==============================================================================

class CollegeApplicationOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for college application output (GET requests).

    Returns complete application data including all related objects.
    """

    # Client information
    client_name = serializers.SerializerMethodField()

    # Application Type & Stage information
    application_type_title = serializers.CharField(
        source='application_type.title',
        read_only=True
    )
    stage_name = serializers.CharField(
        source='stage.stage_name',
        read_only=True
    )
    stage_position = serializers.IntegerField(
        source='stage.position',
        read_only=True
    )

    # Institute & Course information
    institute_name = serializers.CharField(
        source='institute.name',
        read_only=True
    )
    course_name = serializers.CharField(
        source='course.name',
        read_only=True
    )
    location_display = serializers.SerializerMethodField()
    intake_date = serializers.DateField(
        source='start_date.intake_date',
        read_only=True
    )

    # Agent information
    super_agent_name = serializers.CharField(
        source='super_agent.agent_name',
        read_only=True,
        allow_null=True
    )
    sub_agent_name = serializers.CharField(
        source='sub_agent.agent_name',
        read_only=True,
        allow_null=True
    )

    # Assignment information
    assigned_to_name = serializers.SerializerMethodField()

    # Computed fields
    is_final_stage = serializers.SerializerMethodField()

    class Meta:
        model = CollegeApplication
        fields = [
            'id',
            # Application Type & Stage
            'application_type',
            'application_type_title',
            'stage',
            'stage_name',
            'stage_position',
            'is_final_stage',
            # Client
            'client',
            'client_name',
            # Institute & Course
            'institute',
            'institute_name',
            'course',
            'course_name',
            'start_date',
            'intake_date',
            'location',
            'location_display',
            # Application details
            'finish_date',
            'total_tuition_fee',
            'student_id',
            # Agents
            'super_agent',
            'super_agent_name',
            'sub_agent',
            'sub_agent_name',
            # Assignment
            'assigned_to',
            'assigned_to_name',
            # Notes
            'notes',
            # Audit fields
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_client_name(self, obj):
        """Get client full name."""
        if obj.client:
            return f"{obj.client.first_name} {obj.client.last_name}"
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_location_display(self, obj):
        """Get formatted location display."""
        if obj.location:
            country_name = obj.location.country.name if obj.location.country else ''
            state = obj.location.state or ''
            if state and country_name:
                return f"{state}, {country_name}"
            return state or country_name
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_assigned_to_name(self, obj):
        """Get assigned user name if exists."""
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
        return None

    @extend_schema_field(serializers.BooleanField())
    def get_is_final_stage(self, obj):
        """Check if application is in final stage."""
        return obj.is_final_stage


class CollegeApplicationCreateSerializer(serializers.Serializer):
    """
    Serializer for college application creation (POST requests).

    Validates input and passes to college_application_create service.
    """

    application_type_id = serializers.IntegerField()
    client_id = serializers.IntegerField()
    institute_id = serializers.IntegerField()
    course_id = serializers.IntegerField()
    start_date_id = serializers.IntegerField()  # InstituteIntake ID
    location_id = serializers.IntegerField()

    finish_date = serializers.DateField(required=False, allow_null=True)
    total_tuition_fee = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    student_id = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )

    super_agent_id = serializers.IntegerField(required=False, allow_null=True)
    sub_agent_id = serializers.IntegerField(required=False, allow_null=True)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class CollegeApplicationUpdateSerializer(serializers.Serializer):
    """
    Serializer for college application updates (PATCH/PUT requests).

    All fields optional for partial updates.
    Note: application_type and client are immutable (cannot be changed).
    """

    stage_id = serializers.IntegerField(required=False)
    institute_id = serializers.IntegerField(required=False)
    course_id = serializers.IntegerField(required=False)
    start_date_id = serializers.IntegerField(required=False)
    location_id = serializers.IntegerField(required=False)

    finish_date = serializers.DateField(required=False, allow_null=True)
    total_tuition_fee = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False
    )
    student_id = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )

    super_agent_id = serializers.IntegerField(required=False, allow_null=True)
    sub_agent_id = serializers.IntegerField(required=False, allow_null=True)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
