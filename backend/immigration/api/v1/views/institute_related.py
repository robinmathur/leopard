"""
ViewSets for institute-related models (locations, intakes, courses, etc.).

These viewsets provide CRUD operations for institute sub-entities
and related models.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from immigration.authentication import TenantJWTAuthentication

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
from immigration.api.v1.serializers.institute_related import (
    InstituteLocationSerializer,
    InstituteIntakeSerializer,
    InstituteContactPersonSerializer,
    InstituteRequirementSerializer,
    CourseLevelSerializer,
    BroadFieldSerializer,
    NarrowFieldSerializer,
    NarrowFieldSubSerializer,
    CourseSerializer,
)


class InstituteLocationViewSet(viewsets.ModelViewSet):
    """ViewSet for institute locations."""

    authentication_classes = [TenantJWTAuthentication]
    serializer_class = InstituteLocationSerializer
    queryset = InstituteLocation.objects.all()
    filterset_fields = ['institute']


class InstituteIntakeViewSet(viewsets.ModelViewSet):
    """ViewSet for institute intakes."""

    authentication_classes = [TenantJWTAuthentication]
    serializer_class = InstituteIntakeSerializer
    queryset = InstituteIntake.objects.all()
    filterset_fields = ['institute']


class InstituteContactPersonViewSet(viewsets.ModelViewSet):
    """ViewSet for institute contact persons."""

    authentication_classes = [TenantJWTAuthentication]
    serializer_class = InstituteContactPersonSerializer
    queryset = InstituteContactPerson.objects.all()
    filterset_fields = ['institute']


class InstituteRequirementViewSet(viewsets.ModelViewSet):
    """ViewSet for institute requirements."""

    authentication_classes = [TenantJWTAuthentication]
    serializer_class = InstituteRequirementSerializer
    queryset = InstituteRequirement.objects.all()
    filterset_fields = ['institute']


class CourseLevelViewSet(viewsets.ModelViewSet):
    """ViewSet for course levels."""

    authentication_classes = [TenantJWTAuthentication]
    serializer_class = CourseLevelSerializer
    queryset = CourseLevel.objects.all()


class BroadFieldViewSet(viewsets.ModelViewSet):
    """ViewSet for broad fields of study."""

    authentication_classes = [TenantJWTAuthentication]
    serializer_class = BroadFieldSerializer
    queryset = BroadField.objects.all()

    @action(detail=True, methods=['get'], url_path='narrow-fields')
    def get_narrow_fields(self, request, pk=None):
        """Get narrow fields for a specific broad field."""
        narrow_fields = NarrowField.objects.filter(broad_field_id=pk)
        serializer = NarrowFieldSubSerializer(narrow_fields, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NarrowFieldViewSet(viewsets.ModelViewSet):
    """ViewSet for narrow fields of study."""

    authentication_classes = [TenantJWTAuthentication]
    serializer_class = NarrowFieldSerializer
    queryset = NarrowField.objects.all()
    filterset_fields = ['broad_field']


class CourseViewSet(viewsets.ModelViewSet):
    """ViewSet for courses."""

    authentication_classes = [TenantJWTAuthentication]
    serializer_class = CourseSerializer
    queryset = Course.objects.all()
    filterset_fields = ['institute', 'level', 'broad_field', 'narrow_field']
