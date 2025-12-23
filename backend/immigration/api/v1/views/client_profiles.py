"""
API endpoints for client supporting resources.
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet
from immigration.authentication import TenantJWTAuthentication

from immigration.api.v1.permissions import CanManageClients
from immigration.api.v1.serializers.client_profiles import (
    LPECreateUpdateSerializer,
    LPESerializer,
    PassportCreateUpdateSerializer,
    PassportOutputSerializer,
    ProficiencyCreateUpdateSerializer,
    ProficiencyOutputSerializer,
    QualificationCreateUpdateSerializer,
    QualificationOutputSerializer,
    EmploymentCreateUpdateSerializer,
    EmploymentOutputSerializer,
)
from immigration.pagination import StandardResultsSetPagination
from immigration.selectors.client_profiles import (
    language_exam_list,
    passport_get,
    passport_list,
    proficiency_get,
    proficiency_list,
    qualification_get,
    qualification_list,
    employment_get,
    employment_list,
)
from immigration.services.client_profiles import (
    LPEInput,
    PassportInput,
    ProficiencyInput,
    QualificationInput,
    EmploymentInput,
    lpe_create,
    lpe_delete,
    lpe_update,
    passport_upsert,
    proficiency_create,
    proficiency_delete,
    proficiency_update,
    qualification_create,
    qualification_delete,
    qualification_update,
    employment_create,
    employment_delete,
    employment_update,
)
from immigration.models import LPE, Passport, Proficiency, Qualification, Employment


class LanguageExamViewSet(ViewSet):
    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageClients]
    pagination_class = StandardResultsSetPagination

    def list(self, request):
        exams = language_exam_list(filters=request.query_params)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(exams, request)
        serializer = LPESerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            exam = language_exam_list().get(id=pk)
        except LPE.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = LPESerializer(exam)
        return Response(serializer.data)

    def create(self, request):
        serializer = LPECreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = LPEInput(**serializer.validated_data)
        exam = lpe_create(data=input_data, user=request.user)
        return Response(LPESerializer(exam).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            exam = language_exam_list().get(id=pk)
        except LPE.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = LPECreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = LPEInput(**serializer.validated_data)
        exam = lpe_update(exam=exam, data=input_data, user=request.user)
        return Response(LPESerializer(exam).data)

    def partial_update(self, request, pk=None):
        # Treat partial updates the same as full updates (fields are optional)
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        try:
            exam = language_exam_list().get(id=pk)
        except LPE.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        lpe_delete(exam=exam, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProficiencyViewSet(ViewSet):
    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageClients]
    pagination_class = StandardResultsSetPagination

    def list(self, request):
        filters = {
            "client_id": request.query_params.get("client_id"),
            "test_name_id": request.query_params.get("test_name_id"),
            "test_date": request.query_params.get("test_date"),
        }
        proficiencies = proficiency_list(user=request.user, filters=filters)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(proficiencies, request)
        serializer = ProficiencyOutputSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            proficiency = proficiency_get(user=request.user, proficiency_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Proficiency.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(ProficiencyOutputSerializer(proficiency).data)

    def create(self, request):
        serializer = ProficiencyCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = ProficiencyInput(**serializer.validated_data)
        proficiency = proficiency_create(data=input_data, user=request.user)
        return Response(ProficiencyOutputSerializer(proficiency).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            proficiency = proficiency_get(user=request.user, proficiency_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Proficiency.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProficiencyCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = ProficiencyInput(**serializer.validated_data)
        proficiency = proficiency_update(proficiency=proficiency, data=input_data, user=request.user)
        return Response(ProficiencyOutputSerializer(proficiency).data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        try:
            proficiency = proficiency_get(user=request.user, proficiency_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Proficiency.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        proficiency_delete(proficiency=proficiency, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class QualificationViewSet(ViewSet):
    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageClients]
    pagination_class = StandardResultsSetPagination

    def list(self, request):
        filters = {
            "client_id": request.query_params.get("client_id"),
        }
        qualifications = qualification_list(user=request.user, filters=filters)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qualifications, request)
        serializer = QualificationOutputSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            qualification = qualification_get(user=request.user, qualification_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Qualification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(QualificationOutputSerializer(qualification).data)

    def create(self, request):
        serializer = QualificationCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = QualificationInput(**serializer.validated_data)
        qualification = qualification_create(data=input_data, user=request.user)
        return Response(QualificationOutputSerializer(qualification).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            qualification = qualification_get(user=request.user, qualification_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Qualification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = QualificationCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = QualificationInput(**serializer.validated_data)
        qualification = qualification_update(qualification=qualification, data=input_data, user=request.user)
        return Response(QualificationOutputSerializer(qualification).data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        try:
            qualification = qualification_get(user=request.user, qualification_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Qualification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        qualification_delete(qualification=qualification, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PassportViewSet(ViewSet):
    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageClients]
    lookup_field = "client_id"

    def list(self, request):
        filters = {
            "client_id": request.query_params.get("client_id"),
        }
        passports = passport_list(user=request.user, filters=filters)
        serializer = PassportOutputSerializer(passports, many=True)
        return Response(serializer.data)

    def retrieve(self, request, client_id=None):
        try:
            passport = passport_get(user=request.user, client_id=client_id)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Passport.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(PassportOutputSerializer(passport).data)

    @action(detail=False, methods=["post"], url_path="upsert")
    def upsert(self, request):
        """
        Create or update a passport in a single endpoint.
        """
        serializer = PassportCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = PassportInput(**serializer.validated_data)
        passport = passport_upsert(data=input_data, user=request.user)
        return Response(PassportOutputSerializer(passport).data, status=status.HTTP_200_OK)

    def create(self, request):
        return self.upsert(request)

    def update(self, request, client_id=None):
        return self.upsert(request)

    def partial_update(self, request, client_id=None):
        return self.upsert(request)

    def destroy(self, request, client_id=None):
        try:
            passport = passport_get(user=request.user, client_id=client_id)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Passport.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        passport.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmploymentViewSet(ViewSet):
    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageClients]
    pagination_class = StandardResultsSetPagination

    def list(self, request):
        filters = {
            "client_id": request.query_params.get("client_id"),
        }
        employments = employment_list(user=request.user, filters=filters)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(employments, request)
        serializer = EmploymentOutputSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            employment = employment_get(user=request.user, employment_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Employment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(EmploymentOutputSerializer(employment).data)

    def create(self, request):
        serializer = EmploymentCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = EmploymentInput(**serializer.validated_data)
        employment = employment_create(data=input_data, user=request.user)
        return Response(EmploymentOutputSerializer(employment).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            employment = employment_get(user=request.user, employment_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Employment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmploymentCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = EmploymentInput(**serializer.validated_data)
        employment = employment_update(employment=employment, data=input_data, user=request.user)
        return Response(EmploymentOutputSerializer(employment).data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        try:
            employment = employment_get(user=request.user, employment_id=pk)
        except PermissionError:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        except Employment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        employment_delete(employment=employment, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

