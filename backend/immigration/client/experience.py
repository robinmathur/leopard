from django.db import models
from django_countries.fields import CountryField
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration.client.client import Client


class Experience(models.Model):
    employer_name = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    country_of_employment = CountryField()
    client = models.ForeignKey(Client, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "experience"

    def __str__(self):
        return self.employer_name


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = '__all__'


class ExperienceViewSet(viewsets.ModelViewSet):
    queryset = Experience.objects.all()
    serializer_class = ExperienceSerializer
    filterset_fields = ['client']

    @action(detail=True, methods=['get'])
    def get_experiences_for_client(self, request, pk=None):
        # Filter experiences by the given client ID (pk)
        experiences = self.queryset.filter(client_id=pk)
        serializer = self.get_serializer(experiences, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
