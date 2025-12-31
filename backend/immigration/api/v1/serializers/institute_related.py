"""
Serializers for institute-related models (locations, intakes, courses, etc.).

These serializers handle JSON serialization/deserialization for institute
sub-entities and related models.
"""

from rest_framework import serializers
from immigration.models import (
    InstituteLocation,
    InstituteIntake,
    InstituteContactPerson,
    InstituteRequirement,
    CourseLevel,
    BroadField,
    NarrowField,
    Course,
)


# Institute Location Serializers

class InstituteLocationSerializer(serializers.ModelSerializer):
    """Serializer for institute locations."""

    class Meta:
        model = InstituteLocation
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_at']


# Institute Intake Serializers

class InstituteIntakeSerializer(serializers.ModelSerializer):
    """Serializer for institute intakes."""

    class Meta:
        model = InstituteIntake
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_at']


# Institute Contact Person Serializers

class InstituteContactPersonSerializer(serializers.ModelSerializer):
    """Serializer for institute contact persons."""

    class Meta:
        model = InstituteContactPerson
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_at']


# Institute Requirements Serializers

class InstituteRequirementSerializer(serializers.ModelSerializer):
    """Serializer for institute requirements."""

    class Meta:
        model = InstituteRequirement
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_at']


# Course Level Serializers

class CourseLevelSerializer(serializers.ModelSerializer):
    """Serializer for course levels."""

    class Meta:
        model = CourseLevel
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_at']


# Broad Field Serializers

class BroadFieldSerializer(serializers.ModelSerializer):
    """Serializer for broad fields of study."""

    class Meta:
        model = BroadField
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_at']


# Narrow Field Serializers

class NarrowFieldSubSerializer(serializers.ModelSerializer):
    """Minimal serializer for narrow fields (used in nested contexts)."""

    class Meta:
        model = NarrowField
        fields = ['id', 'name']


class NarrowFieldSerializer(serializers.ModelSerializer):
    """Full serializer for narrow fields."""

    broad_field_name = serializers.CharField(source='broad_field.name', read_only=True)

    class Meta:
        model = NarrowField
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_at']


# Course Serializers

class CourseSerializer(serializers.ModelSerializer):
    """Serializer for courses."""

    level_name = serializers.CharField(source='level.name', read_only=True)
    broad_field_name = serializers.CharField(source='broad_field.name', read_only=True)
    narrow_field_name = serializers.CharField(source='narrow_field.name', read_only=True)
    institute_name = serializers.CharField(source='institute.name', read_only=True)

    class Meta:
        model = Course
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_at']
