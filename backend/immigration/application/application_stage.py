from django.db import models
from django.db.models import F
from rest_framework.response import Response

from immigration.application.application_type import ApplicationType
from immigration.models import LifeCycleModel
from immigration.serializer import LifeCycleAwareSerializer
from immigration.views import LifeCycleViewSet


class ApplicationStage(LifeCycleModel):
    stage_name = models.CharField(max_length=50)
    position_index = models.IntegerField()
    application_type = models.ForeignKey(ApplicationType, on_delete=models.CASCADE)

    def __str__(self):
        return self.stage_name


class ApplicationStageSerializer(LifeCycleAwareSerializer):
    class Meta:
        model = ApplicationStage
        fields = '__all__'


class ApplicationStageViewSet(LifeCycleViewSet):
    queryset = ApplicationStage.objects.all()
    serializer_class = ApplicationStageSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_position_index = instance.position_index
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        self.perform_update(serializer)

        application_type = instance.application_type

        new_position_index = serializer.validated_data.get('position_index', old_position_index)
        # Update position_index for other stages only if position_index is changed
        if new_position_index != old_position_index:
            ApplicationStage.objects.filter(position_index__gte=new_position_index,
                                            application_type=application_type).exclude(id=instance.id).update(
                position_index=F('position_index') + 1)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    # @action(detail=False, methods=['post'])
    # def bulk_create(self, request, *args, **kwargs):
    #     serializer = self.get_serializer(data=request.data, many=True)
    #     serializer.is_valid(raise_exception=True)
    #     created_instances = self.perform_bulk_create(serializer)
    #     response_serializer = self.get_serializer(created_instances, many=True)
    #     headers = self.get_success_headers(serializer.data)
    #     return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    #
    # def perform_bulk_create(self, serializer):
    #     # models = [ApplicationStage(**item) for item in serializer.validated_data]
    #     models = []
    #     for item in serializer.validated_data:
    #         model = ApplicationStage(**item)
    #         model.created_at = timezone.now()
    #         model.created_by = self.request.user
    #         models.append(model)
    #
    #     created_instances = ApplicationStage.objects.bulk_create(models)
    #
    #     # Refresh the instances to get their IDs
    #     for instance in created_instances:
    #         instance.refresh_from_db()
    #
    #     return created_instances
    #
    # @action(detail=False, methods=['put', 'patch'])
    # def bulk_update(self, request, *args, **kwargs):
    #     partial = kwargs.pop('partial', False)
    #     request_data = request.data
    #
    #     if not isinstance(request_data, list):
    #         raise serializers.ValidationError("Expected a list of items to update.")
    #
    #     for item in request_data:
    #         if 'id' not in item:
    #             raise serializers.ValidationError("ID field is required for bulk update.")
    #
    #     serializer = self.get_serializer(data=request.data, many=True, partial=partial)
    #     serializer.is_valid(raise_exception=True)
    #     updated_instances = self.perform_bulk_update(serializer, request_data)
    #     response_serializer = self.get_serializer(updated_instances, many=True)
    #     headers = self.get_success_headers(serializer.data)
    #     return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    #
    # def perform_bulk_update(self, serializer, request_data):
    #     ids = []
    #     for item in request_data:
    #         id = ApplicationStage.objects.filter(id=item['id']).update(position_index=item['position_index'], stage_name=item['stage_name'], updated_at=timezone.now(), updated_by=self.request.user)
    #         ids.append(id)
    #
    #     return ApplicationStage.objects.filter(pk__in=ids)
