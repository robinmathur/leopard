"""
Immigration app models.

This package contains all model definitions organized by domain.
"""

from immigration.models.base import (
    SoftDeletionManager,
    SoftDeletionModel,
    LifeCycleModel,
)
from immigration.models.tenant import Tenant
from immigration.models.region import Region
from immigration.models.branch import Branch
from immigration.models.user import User
from immigration.models.agent import Agent
from immigration.models.client import Client
from immigration.models.visa import VisaCategory, VisaType, VisaApplication
from immigration.models.notification import Notification
from immigration.models.task import Task
from immigration.models.profile import LPE, Proficiency, Qualification, Passport
from immigration.models.note import Note
from immigration.models.client_activity import ClientActivity
from immigration.models.profile_picture import ProfilePicture
from immigration.reminder.reminder import Reminder

__all__ = [
    'SoftDeletionManager',
    'SoftDeletionModel',
    'LifeCycleModel',
    'Tenant',
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
    'Note',
    'ClientActivity',
    'ProfilePicture',
    'Reminder',
]
