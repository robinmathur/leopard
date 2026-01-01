"""
Immigration app models.

This package contains all model definitions organized by domain.

Note: Tenant model has been moved to tenants app (tenants.models.Tenant)
for schema-per-tenant multi-tenancy support.
"""

from immigration.models.base import (
    SoftDeletionManager,
    SoftDeletionModel,
    LifeCycleModel,
)
# REMOVED: Tenant import (now in tenants app)
# from immigration.models.tenant import Tenant
from immigration.models.region import Region
from immigration.models.branch import Branch
from immigration.models.user import User
from immigration.models.agent import Agent
from immigration.models.client import Client
from immigration.models.visa import VisaCategory, VisaType, VisaApplication
from immigration.models.notification import Notification
from immigration.models.task import Task
from immigration.models.profile import LPE, Proficiency, Qualification, Passport, Employment
from immigration.models.note import Note
from immigration.models.client_activity import ClientActivity
from immigration.models.profile_picture import ProfilePicture
from immigration.reminder.reminder import Reminder
from immigration.models.institute import (
    Institute,
    InstituteContactPerson,
    InstituteRequirement,
    InstituteLocation,
    InstituteIntake,
    CourseLevel,
    BroadField,
    NarrowField,
    Course,
)
from immigration.models.college_application import (
    ApplicationType,
    Stage,
    CollegeApplication,
)

__all__ = [
    'SoftDeletionManager',
    'SoftDeletionModel',
    'LifeCycleModel',
    # REMOVED: 'Tenant' (now in tenants app)
    'Region',
    'Branch',
    'User',
    'Agent',
    'Client',
    'VisaCategory',
    'VisaType',
    'VisaApplication',
    'Notification',
    'Task',
    'LPE',
    'Proficiency',
    'Qualification',
    'Passport',
    'Employment',
    'Note',
    'ClientActivity',
    'ProfilePicture',
    'Reminder',
    'Institute',
    'InstituteContactPerson',
    'InstituteRequirement',
    'InstituteLocation',
    'InstituteIntake',
    'CourseLevel',
    'BroadField',
    'NarrowField',
    'Course',
    'ApplicationType',
    'Stage',
    'CollegeApplication',
]
