from django.db import models

from immigration import constants
from immigration.constants import CURRENCY_CHOICES
from immigration.models import LifeCycleModel
from immigration.serializer import LifeCycleAwareSerializer, HumanReadableIdAwareSerializer
from immigration.views import LifeCycleViewSet


class ApplicationType(LifeCycleModel):
    title = models.CharField(max_length=255)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, blank=True, null=True)
    tax_name = models.CharField(max_length=100, blank=True)
    tax_percentage = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.title


class ApplicationTypeSerializer(LifeCycleAwareSerializer, HumanReadableIdAwareSerializer):
    class Meta(LifeCycleAwareSerializer.Meta):
        model = ApplicationType
        fields = '__all__'

    def get_entity_initial(self):
        return constants.IdPrefix.APPLICATION_TYPE


class ApplicationTypeViewSet(LifeCycleViewSet):
    queryset = ApplicationType.objects.all()
    serializer_class = ApplicationTypeSerializer
