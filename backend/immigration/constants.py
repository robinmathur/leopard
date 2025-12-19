"""
Application-wide constants and enumerations.

This module defines all constants used across the immigration CRM application,
with a focus on role-based access control (RBAC) for multi-tenant architecture.

Role Constants Usage Examples:
------------------------------

1. Check if a role can create another role:
   >>> from immigration.constants import UserRole
   >>> UserRole.can_create_role('BRANCH_ADMIN', 'CONSULTANT')
   True
   >>> UserRole.can_create_role('BRANCH_ADMIN', 'REGION_MANAGER')
   False

2. Check if a role can manage another role:
   >>> UserRole.can_manage_role('COUNTRY_MANAGER', 'BRANCH_ADMIN')
   True
   >>> UserRole.can_manage_role('CONSULTANT', 'BRANCH_ADMIN')
   False

3. Get role hierarchy level:
   >>> UserRole.get_level('SUPER_SUPER_ADMIN')
   6
   >>> UserRole.get_level('CONSULTANT')
   1

4. Check scope requirements:
   >>> UserRole.requires_branch('CONSULTANT')
   True
   >>> UserRole.requires_region('REGION_MANAGER')
   True
   >>> UserRole.get_scope_type('COUNTRY_MANAGER')
   'tenant'

5. Using in Django models:
   >>> from django.db import models
   >>> from immigration.constants import ROLE_CHOICES
   >>> role = models.CharField(max_length=30, choices=ROLE_CHOICES)

6. Validating roles:
   >>> from immigration.constants import ALL_ROLES
   >>> user_input_role = 'BRANCH_ADMIN'
   >>> if user_input_role in ALL_ROLES:
   ...     print("Valid role")
"""

import enum

from immigration.utils.twowaymapper import TwoWayMapping


class BaseEnum(enum.Enum):
    @classmethod
    def choices(cls):
        return [(choice.value, choice.name.replace("_", " ").title()) for choice in cls]

    @classmethod
    def values(cls):
        return [choice.value for choice in cls]

    def __str__(self):
        return self.name.replace("_", " ").title()


class IdPrefix(enum.Enum):
    AGENT = 'AG'
    CLIENT = 'CL'
    INSTITUTE = 'IN'
    APPLICATION = 'AP'
    APPLICATION_TYPE = 'AT'
    VISA_CATEGORY = 'VC'
    VISA_APPLICATIONS = 'VA'
    VISA_TYPE = 'VT'
    BRANCH = 'BR'
    USER = 'US'


RESOURCE_MAPPING = TwoWayMapping({
    "Agent": "AGENT",
    "Client": "CLIENT",
    "Institute": "INSTITUTE",
    "Visa": "VISA",
    "User": "USER",
    "VisaCategory": "VISA_CATEGORY",
    "LPE": "LPE",
    "BroadField": "BROAD_FIELD",
    "NarrowField": "NARROW_FIELD",
    "CourseLevel": "COURSE_LEVEL",
    "Course": "COURSE",
    'Experience': 'EXPERIENCE',
    'Proficiency': 'PROFICIENCY',
    'Qualification': 'QUALIFICATION',
    'ApplicationType': 'APPLICATION_TYPE',
    'ApplicationStage': 'APPLICATION_STAGE',
    'Application': 'APPLICATION',
    'InstituteIntake': 'INSTITUTE_INTAKE',
    'InstituteLocation': 'INSTITUTE_LOCATION',
    'VisaApplication': 'VISA_APPLICATION',
    'VisaType': 'VISA_TYPE',
})


class ClientStage(BaseEnum):
    LEAD = "LEAD"
    FOLLOW_UP = "FOLLOW_UP"
    CLIENT = "CLIENT"
    CLOSE = "CLOSE"


class TaskPriority(BaseEnum):
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    URGENT = 'URGENT'


class TaskStatus(BaseEnum):
    PENDING = 'PENDING'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'
    OVERDUE = 'OVERDUE'


class AgentType(BaseEnum):
    SUPER_AGENT = "SUPER_AGENT"
    SUB_AGENT = "SUB_AGENT"


class Gender(BaseEnum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class NotificationType(BaseEnum):
    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_DUE_SOON = "TASK_DUE_SOON"
    TASK_OVERDUE = "TASK_OVERDUE"
    VISA_APPROVED = "VISA_APPROVED"
    VISA_REJECTED = "VISA_REJECTED"
    VISA_STATUS_UPDATE = "VISA_STATUS_UPDATE"
    CLIENT_ASSIGNED = "CLIENT_ASSIGNED"
    CLIENT_STAGE_CHANGED = "CLIENT_STAGE_CHANGED"
    REMINDER_DUE = "REMINDER_DUE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    # Legacy/custom event types still used by signals/manager
    LEAD_ASSIGNED = "LEAD_ASSIGNED"
    APPLICATION_ASSIGNED = "APPLICATION_ASSIGNED"
    VISA_APPLICATION_ASSIGNED = "VISA_APPLICATION_ASSIGNED"
    REMINDER = "REMINDER"


class NotificationChannel(BaseEnum):
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"
    IN_APP = "IN_APP"


# Group names (Django Groups) - SIMPLIFIED
GROUP_SUPER_SUPER_ADMIN = 'SUPER_SUPER_ADMIN'
GROUP_SUPER_ADMIN = 'SUPER_ADMIN'
GROUP_REGION_MANAGER = 'REGION_MANAGER'
GROUP_BRANCH_ADMIN = 'BRANCH_ADMIN'
GROUP_CONSULTANT = 'CONSULTANT'

# All valid groups
ALL_GROUPS = [
    GROUP_SUPER_SUPER_ADMIN,
    GROUP_SUPER_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_BRANCH_ADMIN,
    GROUP_CONSULTANT,
]

# Group display names
GROUP_DISPLAY_NAMES = {
    GROUP_SUPER_SUPER_ADMIN: 'Super Super Admin',
    GROUP_SUPER_ADMIN: 'Super Admin',
    GROUP_REGION_MANAGER: 'Region Manager',
    GROUP_BRANCH_ADMIN: 'Branch Admin',
    GROUP_CONSULTANT: 'Consultant',
}


MODEL_NOTIFICATION_MAPPING = {
    NotificationType.LEAD_ASSIGNED.value: {
        'meta_info': lambda instance: {
            "linked": [
                {
                    'id': instance.id,
                    'type': RESOURCE_MAPPING.get_forward(type(instance).__name__),
                    'name': str(instance)
                }
            ]
        },
        'due_date': lambda instance: None
    },
    NotificationType.VISA_APPLICATION_ASSIGNED.value: {
        'meta_info': lambda instance: {
            "linked": [
                {
                    'id': instance.id,
                    'type': RESOURCE_MAPPING.get_forward(type(instance).__name__),
                    'name': str(instance),
                },
                {
                    'id': instance.client.id,
                    'type': RESOURCE_MAPPING.get_forward(type(instance.client).__name__),
                    'name': str(instance.client),
                }
            ]
        },
        'due_date': lambda instance: None
    },
    NotificationType.APPLICATION_ASSIGNED.value: {
        'meta_info': lambda instance: {
            "linked": [
                {
                    'id': instance.id,
                    'type': RESOURCE_MAPPING.get_forward(type(instance).__name__),
                    'name': str(instance),
                },
                {
                    'id': instance.client.id,
                    'type': RESOURCE_MAPPING.get_forward(type(instance.client).__name__),
                    'name': str(instance.client),
                }
            ]
        },
        'due_date': lambda instance: None
    },
    NotificationType.TASK_ASSIGNED.value: {
        'meta_info': lambda instance: {
            'detail': f"Detail about AnotherModelType: {instance.some_field}",
            'more_details': instance.more_details,
        },
        'due_date': lambda instance: None
    }
    # Add more mappings as needed
}

CURRENCY_CHOICES = [
    ('USD', 'US Dollar'),
    ('EUR', 'Euro'),
    ('GBP', 'British Pound'),
    ('JPY', 'Japanese Yen'),
    # Add more currencies as needed
]
