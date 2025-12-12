from django.db import models
from django_softdelete.models import SoftDeleteModel
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration import constants
from immigration.models import LifeCycleModel
from immigration.serializer import DeleteAwareSerializer, HumanReadableIdAwareSerializer, LifeCycleAwareSerializer, \
    ForeignKeySerializer
from immigration.views import LifeCycleViewSet
from django_countries.fields import CountryField


class Institute(LifeCycleModel, SoftDeleteModel):
    name = models.CharField(max_length=100)
    short_name = models.CharField(max_length=20)
    phone = models.CharField(max_length=15, blank=True)
    website = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = "institute"

    def __str__(self):
        return self.name


class InstituteSerializer(LifeCycleAwareSerializer, DeleteAwareSerializer, HumanReadableIdAwareSerializer):
    class Meta(DeleteAwareSerializer.Meta, LifeCycleAwareSerializer.Meta):
        model = Institute

    def get_entity_initial(self):
        return constants.IdPrefix.INSTITUTE


class InstituteViewSet(LifeCycleViewSet):
    serializer_class = InstituteSerializer
    queryset = Institute.objects.all()


#  Institute Location
class InstituteLocation(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE)
    street_name = models.CharField(max_length=100, blank=True)
    suburb = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=50)
    postcode = models.CharField(max_length=20, blank=True)
    country = CountryField()
    phone_number = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)

    class Meta:
        verbose_name = "institute location"

    def __str__(self):
        return self.state


# TODO: make institute as non-modifiable field
class InstituteLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstituteLocation
        fields = "__all__"
        required_fields = ["state"]


class InstituteLocationViewSet(viewsets.ModelViewSet):
    serializer_class = InstituteLocationSerializer
    queryset = InstituteLocation.objects.all()
    filterset_fields = ['institute']


#  Institute Intake
class InstituteIntake(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE)
    intake_date = models.DateField()
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "institute intake"

    def __str__(self):
        return str(self.intake_date)


class InstituteIntakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstituteIntake
        fields = "__all__"


class InstituteIntakeViewSet(viewsets.ModelViewSet):
    serializer_class = InstituteIntakeSerializer
    queryset = InstituteIntake.objects.all()
    filterset_fields = ['institute']


#  Course level
class CourseLevel(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name = "course level"

    def __str__(self):
        return self.name


class CourseLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseLevel
        fields = "__all__"


class CourseLevelViewSet(viewsets.ModelViewSet):
    serializer_class = CourseLevelSerializer
    queryset = CourseLevel.objects.all()


# Broad field
class BroadField(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name = "broad field"

    def __str__(self):
        return self.name


class BroadFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = BroadField
        fields = "__all__"


class BroadFieldViewSet(viewsets.ModelViewSet):
    serializer_class = BroadFieldSerializer
    queryset = BroadField.objects.all()

    @action(detail=True, methods=['get'], url_path='narrow-fields')
    def get_narrow_fields(self, request, pk=None):
        # Filter narrow fields by the given Broad field ID (pk)
        barrow_fields = NarrowField.objects.filter(broad_field_id=pk)
        serializer = NarrowFieldSubSerializer(barrow_fields, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


#  Narrow field
class NarrowField(models.Model):
    name = models.CharField(max_length=100)
    broad_field = models.ForeignKey(BroadField, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "narrow field"

    def __str__(self):
        return self.name


class NarrowFieldSubSerializer(serializers.ModelSerializer):
    class Meta:
        model = NarrowField
        fields = ['id', 'name']


class NarrowFieldSerializer(serializers.ModelSerializer):
    broad_field = ForeignKeySerializer(queryset=BroadField.objects.all())

    class Meta:
        model = NarrowField
        fields = "__all__"


class NarrowFieldViewSet(viewsets.ModelViewSet):
    serializer_class = NarrowFieldSerializer
    queryset = NarrowField.objects.all()
    filterset_fields = ['broad_field']


# Course
class Course(models.Model):
    name = models.CharField(max_length=100)
    level = models.ForeignKey(CourseLevel, on_delete=models.PROTECT)
    total_tuition_fee = models.DecimalField(max_digits=100, decimal_places=2)
    coe_fee = models.DecimalField(max_digits=100, decimal_places=2)
    broad_field = models.ForeignKey(BroadField, on_delete=models.PROTECT)
    narrow_field = models.ForeignKey(NarrowField, on_delete=models.PROTECT)
    description = models.TextField(blank=True)
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "course"

    def __str__(self):
        return self.name


class CourseSerializer(serializers.ModelSerializer):
    level = ForeignKeySerializer(queryset=CourseLevel.objects.all())
    broad_field = ForeignKeySerializer(queryset=BroadField.objects.all())
    narrow_field = ForeignKeySerializer(queryset=NarrowField.objects.all())
    institute = ForeignKeySerializer(queryset=Institute.objects.all())

    class Meta:
        model = Course
        fields = "__all__"


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    queryset = Course.objects.all()
    filterset_fields = ['institute']
