from django.db import models
from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration.client.client import Client
from immigration.client.lpe import LPE
from immigration.serializer import ForeignKeySerializer


class Proficiency(models.Model):
    overall_score = models.FloatField(blank=True, null=True)
    speaking_score = models.FloatField(blank=True, null=True)
    reading_score = models.FloatField(blank=True, null=True)
    listening_score = models.FloatField(blank=True, null=True)
    writing_score = models.FloatField(blank=True, null=True)
    test_date = models.DateField(blank=True, null=True)
    test_name = models.ForeignKey(LPE, on_delete=models.DO_NOTHING, blank=True, null=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE)

    class Meta:
        verbose_name = 'proficiency'


class ProficiencySerializer(serializers.ModelSerializer):
    test_name = ForeignKeySerializer(queryset=LPE.objects.all())

    class Meta:
        model = Proficiency
        fields = '__all__'


class ProficiencyViewSet(viewsets.ModelViewSet):
    queryset = Proficiency.objects.all()
    serializer_class = ProficiencySerializer
    filterset_fields = ['client', 'test_name']

    @action(detail=True, methods=['get'])
    def get_proficiencies_for_client(self, request, pk=None):
        # Filter proficiencies by the given client ID (pk)
        proficiencies = self.queryset.filter(client_id=pk)
        serializer = self.get_serializer(proficiencies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
