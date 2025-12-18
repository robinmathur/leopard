"""
Agent serializers for API layer.

These serializers handle JSON serialization/deserialization for agent endpoints.
They are thin wrappers - business logic lives in services.
"""

from rest_framework import serializers
from immigration.models.agent import Agent


class AgentOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for agent output (GET requests).
    
    Returns complete agent data including related objects.
    """
    
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    agent_type_display = serializers.CharField(source='get_agent_type_display', read_only=True)
    
    class Meta:
        model = Agent
        fields = [
            'id',
            'agent_name',
            'agent_type',
            'agent_type_display',
            'phone_number',
            'email',
            'website',
            'invoice_to',
            'street',
            'suburb',
            'state',
            'postcode',
            'country',
            'description',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_by',
            'updated_by_name',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
        ]
    
    def get_created_by_name(self, obj):
        """Get creator name if exists."""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None
    
    def get_updated_by_name(self, obj):
        """Get updater name if exists."""
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.username
        return None


class AgentCreateSerializer(serializers.Serializer):
    """
    Serializer for agent creation (POST requests).
    
    Validates input and passes to agent_create service.
    """
    
    agent_name = serializers.CharField(max_length=100)
    agent_type = serializers.ChoiceField(choices=['SUPER_AGENT', 'SUB_AGENT'])
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    website = serializers.URLField(max_length=100, required=False, allow_blank=True)
    invoice_to = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Address fields
    street = serializers.CharField(max_length=100, required=False, allow_blank=True)
    suburb = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postcode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    country = serializers.CharField(max_length=2, required=False, allow_blank=True)
    
    description = serializers.CharField(required=False, allow_blank=True)


class AgentUpdateSerializer(serializers.Serializer):
    """
    Serializer for agent updates (PUT/PATCH requests).
    
    All fields optional - only provided fields are updated.
    """
    
    agent_name = serializers.CharField(max_length=100, required=False)
    agent_type = serializers.ChoiceField(choices=['SUPER_AGENT', 'SUB_AGENT'], required=False)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    website = serializers.URLField(max_length=100, required=False, allow_blank=True)
    invoice_to = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Address fields
    street = serializers.CharField(max_length=100, required=False, allow_blank=True)
    suburb = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postcode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    country = serializers.CharField(max_length=2, required=False, allow_blank=True)
    
    description = serializers.CharField(required=False, allow_blank=True)
