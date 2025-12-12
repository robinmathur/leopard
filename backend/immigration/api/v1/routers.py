"""
Central router registration for API v1.

This module ensures all ViewSets are registered with a single DRF DefaultRouter.
"""

from rest_framework.routers import DefaultRouter

from immigration.api.v1.views.clients import ClientViewSet
from immigration.api.v1.views.visa import VisaApplicationViewSet
from immigration.api.v1.views.users import UserViewSet
from immigration.api.v1.views.notifications import NotificationViewSet
from immigration.api.v1.views.tasks import TaskViewSet
from immigration.api.v1.views.notes import NoteViewSet
from immigration.api.v1.views.client_profiles import (
    LanguageExamViewSet,
    PassportViewSet,
    ProficiencyViewSet,
    QualificationViewSet,
)

router = DefaultRouter()
router.register(r"clients", ClientViewSet, basename="client")
router.register(r"visa-applications", VisaApplicationViewSet, basename="visa-application")
router.register(r"users", UserViewSet, basename="user")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"notes", NoteViewSet, basename="note")
router.register(r"language-exams", LanguageExamViewSet, basename="language-exam")
router.register(r"language-proficiencies", ProficiencyViewSet, basename="language-proficiency")
router.register(r"qualifications", QualificationViewSet, basename="qualification")
router.register(r"passports", PassportViewSet, basename="passport")

__all__ = ["router"]
