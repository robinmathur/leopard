from rest_framework import serializers

from immigration.constants import RESOURCE_MAPPING
from immigration.utils.utils import ModelUtils


# [ABSTRACT] Delete Serializer
class DeleteAwareSerializer(serializers.ModelSerializer):
    class Meta:
        exclude = ["deleted_at", "restored_at"]


# [ABSTRACT] LifeCycle Serializer
class LifeCycleAwareSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(default=serializers.CurrentUserDefault(), read_only=True,
                                                required=False)
    updated_by = serializers.StringRelatedField(default=serializers.CurrentUserDefault(), read_only=True,
                                                required=False)

    class Meta:
        abstract = True
        read_only_fields = ["created_by", "updated_by", "updated_at", "created_at"]


# [ABSTRACT] Unique Humanreadble id Serializer
class HumanReadableIdAwareSerializer(serializers.ModelSerializer):
    display_id = serializers.SerializerMethodField()

    class Meta:
        abstract = True

    def get_entity_initial(self):
        raise NotImplementedError("Please Implement this method")

    def get_display_id(self, obj):
        return f'{self.get_entity_initial().value}{obj.id}'


class ForeignKeySerializer(serializers.RelatedField):

    def to_representation(self, model_obj):
        obj = {
            "id": model_obj.id,
            "name": str(model_obj),
            "type": RESOURCE_MAPPING.get_forward(type(model_obj).__name__)
        }
        return obj

    def to_internal_value(self, data):
        # Accept both formats: integer (pk) or object with 'id' key
        if isinstance(data, int):
            pk = data
        elif isinstance(data, dict) and 'id' in data:
            pk = data['id']
        else:
            raise serializers.ValidationError(
                f"Invalid format. Expected integer or object with 'id' key, got {type(data).__name__}"
            )
        return self.get_queryset().get(pk=pk)
