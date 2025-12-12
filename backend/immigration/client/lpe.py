from django.db import models
from rest_framework.viewsets import ModelViewSet
from rest_framework.serializers import ModelSerializer
from immigration import permissions


class LPE(models.Model):
    name = models.CharField(max_length=100)
    validity_term = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'lpe'

    def __str__(self):
        return self.name


class LPESerializer(ModelSerializer):
    class Meta:
        model = LPE
        fields = '__all__'


class LPEViewSet(ModelViewSet):
    queryset = LPE.objects.all()
    serializer_class = LPESerializer
    permission_classes = [permissions.IsAdminOrReadOnly]




