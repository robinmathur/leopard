"""
Client serializers for API layer.

These serializers handle JSON serialization/deserialization for client endpoints.
They are thin wrappers - business logic lives in services.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from immigration.models import Client


class ClientOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for client output (GET requests).
    
    Returns complete client data including related objects.
    """
    
    visa_category_name = serializers.CharField(
        source='visa_category.name', 
        read_only=True,
        allow_null=True
    )
    agent_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = [
            'id',
            'first_name',
            'middle_name',
            'last_name',
            'gender',
            'dob',
            'phone_number',
            'email',
            'referred_by',
            'street',
            'suburb',
            'state',
            'postcode',
            'country',
            'visa_category',
            'visa_category_name',
            'agent',
            'agent_name',
            'description',
            'assigned_to',
            'assigned_to_name',
            'stage',
            'active',
            'branch',
            'branch_name',
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
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_agent_name(self, obj):
        """Get agent name if exists."""
        if obj.agent:
            return str(obj.agent)
        return None
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_assigned_to_name(self, obj):
        """Get assigned user name if exists."""
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
        return None
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by_name(self, obj):
        """Get creator name if exists."""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_branch_name(self, obj):
        """Get branch name if exists."""
        if obj.branch:
            return obj.branch.name
        return None


class ClientCreateSerializer(serializers.Serializer):
    """
    Serializer for client creation (POST requests).
    
    Validates input and passes to client_create service.
    """
    
    first_name = serializers.CharField(max_length=100)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    gender = serializers.ChoiceField(choices=['MALE', 'FEMALE', 'OTHER'])
    dob = serializers.DateField(required=False, allow_null=True)
    country = serializers.CharField(max_length=2)
    
    # Address fields
    street = serializers.CharField(max_length=20, required=False, allow_blank=True)
    suburb = serializers.CharField(max_length=20, required=False, allow_blank=True)
    state = serializers.CharField(max_length=20, required=False, allow_blank=True)
    postcode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Business fields
    visa_category_id = serializers.IntegerField(required=False, allow_null=True)
    agent_id = serializers.IntegerField(required=False, allow_null=True)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    stage = serializers.ChoiceField(
        choices=['LEAD', 'FOLLOW_UP', 'CLIENT', 'CLOSE'],
        required=False,
        allow_blank=True
    )
    referred_by = serializers.CharField(max_length=20, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    active = serializers.BooleanField(default=False)


class ClientUpdateSerializer(serializers.Serializer):
    """
    Serializer for client updates (PUT/PATCH requests).
    
    All fields optional - only provided fields are updated.
    """
    
    first_name = serializers.CharField(max_length=100, required=False)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    gender = serializers.ChoiceField(choices=['MALE', 'FEMALE', 'OTHER'], required=False)
    dob = serializers.DateField(required=False, allow_null=True)
    country = serializers.CharField(max_length=2, required=False)
    
    # Address fields
    street = serializers.CharField(max_length=20, required=False, allow_blank=True)
    suburb = serializers.CharField(max_length=20, required=False, allow_blank=True)
    state = serializers.CharField(max_length=20, required=False, allow_blank=True)
    postcode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Business fields
    visa_category_id = serializers.IntegerField(required=False, allow_null=True)
    agent_id = serializers.IntegerField(required=False, allow_null=True)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    stage = serializers.ChoiceField(
        choices=['LEAD', 'FOLLOW_UP', 'CLIENT', 'CLOSE'],
        required=False,
        allow_blank=True
    )
    referred_by = serializers.CharField(max_length=20, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    active = serializers.BooleanField(required=False)


class ClientStageCountSerializer(serializers.Serializer):
    """
    Serializer for client stage count response.
    
    Returns counts of clients grouped by stage, respecting role-based filtering.
    
    Stage values: LE (Lead), FU (Follow Up), CT (Client), CL (Close)
    """
    
    LEAD = serializers.IntegerField(read_only=True, default=0, help_text="Lead count")
    FOLLOW_UP = serializers.IntegerField(read_only=True, default=0, help_text="Follow Up count")
    CLIENT = serializers.IntegerField(read_only=True, default=0, help_text="Client count")
    CLOSE = serializers.IntegerField(read_only=True, default=0, help_text="Close count")
    TOTAL = serializers.IntegerField(read_only=True, default=0, help_text="Total client count")
