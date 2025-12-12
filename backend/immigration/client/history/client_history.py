from django.db import models
from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration.client.client import Client


class ClientHistory(models.Model):
    client = models.OneToOneField(Client, related_name='history', on_delete=models.CASCADE)
    entries = models.JSONField(default=list)  # Stores history as a list of JSON objects


class ClientHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientHistory
        fields = ['entries']


class ClientHistoryViewSet(viewsets.ModelViewSet):
    queryset = ClientHistory.objects.all()
    serializer_class = ClientHistorySerializer

    @action(detail=True, methods=['get'])
    def get_history_for_client(self, request, pk=None):
        # Filter visas by the given client ID (pk)
        client_history_entries = self.queryset.get(pk=pk)
        serializer = self.get_serializer(client_history_entries)
        return Response(serializer.data, status=status.HTTP_200_OK)

