"""
Visa application serializers for API layer.

These serializers handle JSON serialization/deserialization for visa application endpoints.
They are thin wrappers - business logic lives in services.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from immigration.models import VisaApplication


class VisaApplicationOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for visa application output (GET requests).
    
    Returns complete application data including related objects.
    """
    
    client_name = serializers.SerializerMethodField()
    visa_type_name = serializers.CharField(source='visa_type.name', read_only=True)
    visa_category_name = serializers.CharField(
        source='visa_type.visa_category.name',
        read_only=True
    )
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = VisaApplication
        fields = [
            'id',
            'client',
            'client_name',
            'visa_type',
            'visa_type_name',
            'visa_category_name',
            'transaction_reference_no',
            'immigration_fee',
            'immigration_fee_currency',
            'service_fee',
            'service_fee_currency',
            'dependent',
            'notes',
            'assigned_to',
            'assigned_to_name',
            'required_documents',
            'expiry_date',
            'date_applied',
            'date_opened',
            'final_date',
            'date_granted',
            'date_rejected',
            'date_withdrawn',
            'status',
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
    def get_client_name(self, obj):
        """Get client full name."""
        if obj.client:
            return f"{obj.client.first_name} {obj.client.last_name}"
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


class VisaApplicationCreateSerializer(serializers.Serializer):
    """
    Serializer for visa application creation (POST requests).
    
    Validates input and passes to visa_application_create service.
    """
    
    client_id = serializers.IntegerField()
    visa_type_id = serializers.IntegerField()
    
    # Financial fields
    immigration_fee = serializers.DecimalField(max_digits=10, decimal_places=2)
    immigration_fee_currency = serializers.CharField(max_length=3, default='USD')
    service_fee = serializers.DecimalField(max_digits=10, decimal_places=2)
    service_fee_currency = serializers.CharField(max_length=3, default='USD')
    
    # Application details
    transaction_reference_no = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True
    )
    dependent = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    required_documents = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    
    # Status and dates
    status = serializers.ChoiceField(
        choices=[
            'TO_BE_APPLIED',
            'VISA_APPLIED',
            'CASE_OPENED',
            'GRANTED',
            'REJECTED',
            'WITHDRAWN'
        ],
        default='TO_BE_APPLIED'
    )
    expiry_date = serializers.DateField(required=False, allow_null=True)
    date_applied = serializers.DateField(required=False, allow_null=True)
    date_opened = serializers.DateField(required=False, allow_null=True)
    final_date = serializers.DateField(required=False, allow_null=True)
    date_granted = serializers.DateField(required=False, allow_null=True)
    date_rejected = serializers.DateField(required=False, allow_null=True)
    date_withdrawn = serializers.DateField(required=False, allow_null=True)


class VisaApplicationUpdateSerializer(serializers.Serializer):
    """
    Serializer for visa application updates (PUT/PATCH requests).
    
    All fields optional - only provided fields are updated.
    """
    
    visa_type_id = serializers.IntegerField(required=False)
    
    # Financial fields
    immigration_fee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False
    )
    immigration_fee_currency = serializers.CharField(max_length=3, required=False)
    service_fee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False
    )
    service_fee_currency = serializers.CharField(max_length=3, required=False)
    
    # Application details
    transaction_reference_no = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True
    )
    dependent = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    required_documents = serializers.JSONField(required=False)
    
    # Status and dates
    status = serializers.ChoiceField(
        choices=[
            'TO_BE_APPLIED',
            'VISA_APPLIED',
            'CASE_OPENED',
            'GRANTED',
            'REJECTED',
            'WITHDRAWN'
        ],
        required=False
    )
    expiry_date = serializers.DateField(required=False, allow_null=True)
    date_applied = serializers.DateField(required=False, allow_null=True)
    date_opened = serializers.DateField(required=False, allow_null=True)
    final_date = serializers.DateField(required=False, allow_null=True)
    date_granted = serializers.DateField(required=False, allow_null=True)
    date_rejected = serializers.DateField(required=False, allow_null=True)
    date_withdrawn = serializers.DateField(required=False, allow_null=True)
