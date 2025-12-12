"""
Serializers for client supporting resources.
"""

from rest_framework import serializers

from immigration.models import LPE, Passport, Proficiency, Qualification


class LPESerializer(serializers.ModelSerializer):
    class Meta:
        model = LPE
        fields = ["id", "name", "validity_term", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class LPECreateUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    validity_term = serializers.IntegerField(min_value=0, max_value=100, required=False, default=0)
    description = serializers.CharField(allow_blank=True, required=False, default="")


class ProficiencyOutputSerializer(serializers.ModelSerializer):
    test_name_display = serializers.CharField(source="test_name.name", read_only=True)

    class Meta:
        model = Proficiency
        fields = [
            "id",
            "client_id",
            "test_name_id",
            "test_name_display",
            "overall_score",
            "speaking_score",
            "reading_score",
            "listening_score",
            "writing_score",
            "test_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "test_name_display", "created_at", "updated_at"]


class ProficiencyCreateUpdateSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    test_name_id = serializers.IntegerField()
    overall_score = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    speaking_score = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    reading_score = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    listening_score = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    writing_score = serializers.DecimalField(max_digits=4, decimal_places=1, required=False, allow_null=True)
    test_date = serializers.DateField(required=False, allow_null=True)


class QualificationOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Qualification
        fields = [
            "id",
            "client_id",
            "course",
            "institute",
            "degree",
            "field_of_study",
            "enroll_date",
            "completion_date",
            "country",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class QualificationCreateUpdateSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    course = serializers.CharField(max_length=100)
    institute = serializers.CharField(max_length=100, required=False, allow_blank=True)
    degree = serializers.CharField(max_length=100, required=False, allow_blank=True)
    field_of_study = serializers.CharField(max_length=100, required=False, allow_blank=True)
    enroll_date = serializers.DateField(required=False, allow_null=True)
    completion_date = serializers.DateField(required=False, allow_null=True)
    country = serializers.CharField(max_length=2, required=False, allow_blank=True)


class PassportOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passport
        fields = [
            "client_id",
            "passport_no",
            "passport_country",
            "date_of_issue",
            "date_of_expiry",
            "place_of_issue",
            "country_of_birth",
            "nationality",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["client_id", "created_at", "updated_at"]


class PassportCreateUpdateSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    passport_no = serializers.CharField(max_length=20)
    passport_country = serializers.CharField(max_length=2)
    date_of_issue = serializers.DateField(required=False, allow_null=True)
    date_of_expiry = serializers.DateField(required=False, allow_null=True)
    place_of_issue = serializers.CharField(max_length=100, required=False, allow_blank=True)
    country_of_birth = serializers.CharField(max_length=2)
    nationality = serializers.CharField(max_length=2)

