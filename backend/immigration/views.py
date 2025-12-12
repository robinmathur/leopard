from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated


class LifeCycleViewSet(ModelViewSet):
    permission_classes = (IsAuthenticated,)

    class Meta:
        abstract = True

    def perform_create(self, serializer_obj):
        serializer_obj.validated_data['created_by'] = self.request.user
        super().perform_create(serializer_obj)

    def perform_update(self, serializer_obj):
        serializer_obj.validated_data['updated_by'] = self.request.user
        super().perform_update(serializer_obj)
