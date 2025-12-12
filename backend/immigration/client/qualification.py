from django.db import models
from django_countries.fields import CountryField
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration.client.client import Client


class Qualification(models.Model):
    course = models.CharField(max_length=100)
    institute = models.CharField(max_length=100, blank=True)
    enroll_date = models.DateField(blank=True, null=True)
    completion_date = models.DateField(blank=True, null=True)
    country = CountryField()
    client = models.ForeignKey(Client, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "qualification"

    def __str__(self):
        return self.course


class QualificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Qualification
        fields = '__all__'


class QualificationViewSet(viewsets.ModelViewSet):
    queryset = Qualification.objects.all()
    serializer_class = QualificationSerializer
    filterset_fields = ['client']

    @action(detail=True, methods=['get'])
    def get_qualifications_for_client(self, request, pk=None):
        # Filter qualifications by the given client ID (pk)
        qualifications = self.queryset.filter(client_id=pk)
        serializer = self.get_serializer(qualifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)