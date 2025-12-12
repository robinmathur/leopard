from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration import constants
from immigration.models.agent import Agent
from immigration.application.application_stage import ApplicationStage
from immigration.application.application_type import ApplicationType
from immigration.client.client import Client
from django.contrib.auth import get_user_model

from immigration.institute import Institute, Course, InstituteLocation, InstituteIntake
from immigration.models import LifeCycleModel
from immigration.serializer import ForeignKeySerializer, LifeCycleAwareSerializer, HumanReadableIdAwareSerializer
from immigration.views import LifeCycleViewSet

User = get_user_model()


class Application(LifeCycleModel):
    application_type = models.ForeignKey(ApplicationType, on_delete=models.PROTECT)
    stage = models.ForeignKey(ApplicationStage, on_delete=models.PROTECT)
    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    institute = models.ForeignKey(Institute, on_delete=models.PROTECT)
    course = models.ForeignKey(Course, on_delete=models.PROTECT)
    start_date = models.ForeignKey(InstituteIntake, on_delete=models.PROTECT)
    location = models.ForeignKey(InstituteLocation, on_delete=models.PROTECT)
    finish_date = models.DateField(blank=True, null=True)
    total_tuition_fee = models.DecimalField(max_digits=50, decimal_places=2, default=0.00)
    student_id = models.CharField(max_length=200, blank=True)
    super_agent = models.ForeignKey(Agent, related_name='super_agent_applications', on_delete=models.PROTECT, null=True, blank=True)
    sub_agent = models.ForeignKey(Agent, related_name='sub_agent_applications', on_delete=models.PROTECT, null=True, blank=True)
    assigned_to = models.ForeignKey(User, related_name='assigned_applications', on_delete=models.PROTECT, null=True,
                                      blank=True)

    def __str__(self):
        return f"{self.client} - {self.course}"


class ApplicationSerializer(LifeCycleAwareSerializer, HumanReadableIdAwareSerializer):
    application_type = ForeignKeySerializer(queryset=ApplicationType.objects.all())
    client = ForeignKeySerializer(queryset=Client.objects.all())
    institute = ForeignKeySerializer(queryset=Institute.objects.all())
    course = ForeignKeySerializer(queryset=Course.objects.all())
    start_date = ForeignKeySerializer(queryset=InstituteIntake.objects.all())
    location = ForeignKeySerializer(queryset=InstituteLocation.objects.all())
    super_agent = ForeignKeySerializer(queryset=Agent.objects.all())
    sub_agent = ForeignKeySerializer(queryset=Agent.objects.all())
    assigned_to = ForeignKeySerializer(queryset=User.objects.all(), required=False)
    stage = ForeignKeySerializer(queryset=ApplicationStage.objects.all(), required=False)

    class Meta(LifeCycleAwareSerializer.Meta):
        model = Application
        fields = '__all__'

    def get_entity_initial(self):
        return constants.IdPrefix.APPLICATION

    def validate(self, data):
        if self.instance is None:
            institute = data.get('institute')
            stage = data.get('application_type').applicationstage_set.filter(position_index=1).first()
            if stage:
                data['stage'] = stage
            else:
                raise serializers.ValidationError(
                    f"No stage found for application type '{data['application_type'].title}'")

        else:
            institute = self.instance.institute

        for field_name in ['course', 'location', 'start_date']:
            field_instance = data.get(field_name, None)
            if field_instance and field_instance.institute != institute:
                raise serializers.ValidationError(
                    f"{field_name.capitalize()} should be from Institute '{institute.name}'"
                )
        super_agent = data.get('super_agent')
        sub_agent = data.get('sub_agent')
        if super_agent and super_agent.agent_type != constants.AgentType.SUPER_AGENT.value:
            raise serializers.ValidationError(f"{super_agent.agent_name.capitalize()} must have the correct agent type")
        if sub_agent and sub_agent.agent_type != constants.AgentType.SUB_AGENT.value:
            raise serializers.ValidationError(f"{sub_agent.agent_name.capitalize()} must have the correct agent type")
        return data


class ApplicationViewSet(LifeCycleViewSet):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer

    filter_backends = (filters.OrderingFilter, DjangoFilterBackend)
    filterset_fields = ['client', 'stage']

    # search_fields = ["first_name", "last_name", "email"]
    # ordering_fields = ["id", "created_at", "first_name", "active"]
    # ordering = ["-id"]

    @action(detail=True, methods=['get'])
    def get_applications_for_client(self, request, pk=None):
        # Filter applications by the given client ID (pk)
        applications = self.queryset.filter(client_id=pk)
        serializer = self.get_serializer(applications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
