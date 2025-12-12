from immigration.apps import ImmigrationConfig
from immigration.constants import RESOURCE_MAPPING
from django.apps import apps


class ModelUtils:

    auth_models = ['User']

    # @staticmethod
    # def get_display_id_from_model(model):
    #     return f'{model_prefix_mapping.get_reverse(model.__class__.__name__)}{model.id}'
    #
    # @staticmethod
    # def get_id_from_display_id(display_id):
    #     return int(display_id[2:])

    # @staticmethod
    # def get_model_from_display_id(display_id):
    #     # Extract the prefix and the actual ID
    #     prefix = display_id[:2]
    #     object_id = display_id[2:]
    #
    #     # Get the model name from the prefix
    #     model_name = model_prefix_mapping.get_forward(prefix)
    #
    #     if not model_name:
    #         raise ValueError(f"No model found for prefix '{prefix}'")
    #
    #     # Get the model class
    #     if model_name in ModelUtils.auth_models:
    #         app_name = "auth"
    #     else:
    #         app_name = ImmigrationConfig.name
    #     try:
    #         model = apps.get_model(app_name, model_name)
    #     except LookupError:
    #         raise ValueError(f"Model '{model_name}' not found")
    #
    #     # Retrieve the model instance by ID
    #     return model.objects.get(id=object_id)



    @staticmethod
    def get_model(model_name: str, object_id: int):

        if not model_name:
            raise ValueError(f"No model provide")

        # Get the model class
        if model_name in ModelUtils.auth_models:
            app_name = "auth"
        else:
            app_name = ImmigrationConfig.name
        try:
            model = apps.get_model(app_name, model_name)
        except LookupError:
            raise ValueError(f"Model '{model_name}' not found")

        # Retrieve the model instance by ID
        return model.objects.get(id=object_id)

    @staticmethod
    def get_model_composite_key(model_id):
        return ModelUtils.get_model(model_name=RESOURCE_MAPPING.get_reverse(model_id.get('type')), object_id=model_id.get('id'))
