"""
Central router registration for API v1.

This module ensures all ViewSets are registered with a single DRF DefaultRouter.
"""

from rest_framework.routers import DefaultRouter

from immigration.api.v1.views.clients import ClientViewSet
from immigration.api.v1.views.agents import AgentViewSet
from immigration.api.v1.views.branches import BranchViewSet
from immigration.api.v1.views.regions import RegionViewSet
from immigration.api.v1.views.visa import VisaApplicationViewSet
from immigration.api.v1.views.visa_type import VisaTypeViewSet, VisaCategoryViewSet
from immigration.api.v1.views.users import UserViewSet
from immigration.api.v1.views.groups import GroupViewSet, PermissionViewSet
from immigration.api.v1.views.notifications import NotificationViewSet
from immigration.api.v1.views.tasks import TaskViewSet
from immigration.api.v1.views.notes import NoteViewSet
from immigration.api.v1.views.client_profiles import (
    LanguageExamViewSet,
    PassportViewSet,
    ProficiencyViewSet,
    QualificationViewSet,
    EmploymentViewSet,
)
from immigration.reminder.reminder import ReminderViewSet
from immigration.api.v1.views.institutes import InstituteViewSet
from immigration.api.v1.views.institute_related import (
    InstituteLocationViewSet,
    InstituteIntakeViewSet,
    InstituteContactPersonViewSet,
    InstituteRequirementViewSet,
    CourseLevelViewSet,
    BroadFieldViewSet,
    NarrowFieldViewSet,
    CourseViewSet,
)
from immigration.api.v1.views.college_application import (
    ApplicationTypeViewSet,
    StageViewSet,
    CollegeApplicationViewSet,
)

router = DefaultRouter()
router.register(r"clients", ClientViewSet, basename="client")
router.register(r"agents", AgentViewSet, basename="agent")
router.register(r"branches", BranchViewSet, basename="branch")
router.register(r"regions", RegionViewSet, basename="region")
router.register(r"visa-applications", VisaApplicationViewSet, basename="visa-application")
router.register(r"visa-types", VisaTypeViewSet, basename="visa-type")
router.register(r"visa-categories", VisaCategoryViewSet, basename="visa-category")
router.register(r"users", UserViewSet, basename="user")
router.register(r"groups", GroupViewSet, basename="group")
router.register(r"permissions", PermissionViewSet, basename="permission")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"notes", NoteViewSet, basename="note")
router.register(r"reminders", ReminderViewSet, basename="reminder")
router.register(r"language-exams", LanguageExamViewSet, basename="language-exam")
router.register(r"language-proficiencies", ProficiencyViewSet, basename="language-proficiency")
router.register(r"qualifications", QualificationViewSet, basename="qualification")
router.register(r"passports", PassportViewSet, basename="passport")
router.register(r"employments", EmploymentViewSet, basename="employment")
router.register(r"institutes", InstituteViewSet, basename="institute")
router.register(r"institute-locations", InstituteLocationViewSet, basename="institute-location")
router.register(r"institute-intakes", InstituteIntakeViewSet, basename="institute-intake")
router.register(r"institute-contact-persons", InstituteContactPersonViewSet, basename="institute-contact-person")
router.register(r"institute-requirements", InstituteRequirementViewSet, basename="institute-requirement")
router.register(r"course-levels", CourseLevelViewSet, basename="course-level")
router.register(r"broad-fields", BroadFieldViewSet, basename="broad-field")
router.register(r"narrow-fields", NarrowFieldViewSet, basename="narrow-field")
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"application-types", ApplicationTypeViewSet, basename="application-type")
router.register(r"stages", StageViewSet, basename="stage")
router.register(r"college-applications", CollegeApplicationViewSet, basename="college-application")

__all__ = ["router"]
