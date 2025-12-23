"""
Visa type serializers for API layer.

These serializers handle JSON serialization/deserialization for visa type endpoints.
"""

from rest_framework import serializers
from immigration.models.visa import VisaType, VisaCategory


class VisaCategoryOutputSerializer(serializers.ModelSerializer):
    """Serializer for visa category output."""
    
    class Meta:
        model = VisaCategory
        fields = ['id', 'name', 'code', 'description']


class VisaTypeOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for visa type output (GET requests).
    
    Returns complete visa type data including related objects.
    """
    
    visa_category_name = serializers.CharField(source='visa_category.name', read_only=True)
    visa_category = VisaCategoryOutputSerializer(read_only=True)
    
    class Meta:
        model = VisaType
        fields = [
            'id',
            'visa_category',
            'visa_category_name',
            'name',
            'code',
            'description',
            'checklist',
        ]


class VisaTypeCreateSerializer(serializers.Serializer):
    """
    Serializer for visa type creation (POST requests).
    
    Validates input and passes to visa_type_create service.
    """
    
    visa_category_id = serializers.IntegerField()
    name = serializers.CharField(max_length=100)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    checklist = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class VisaTypeUpdateSerializer(serializers.Serializer):
    """
    Serializer for visa type updates (PUT/PATCH requests).
    
    All fields optional - only provided fields are updated.
    """
    
    visa_category_id = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=100, required=False)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    checklist = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
