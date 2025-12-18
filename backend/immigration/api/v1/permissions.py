"""
Custom DRF permission classes - SIMPLIFIED.

Uses Django's built-in permission system only.
No role-based checks - pure permission checks.
"""

from rest_framework.permissions import BasePermission


class RoleBasedPermission(BasePermission):
    """
    SIMPLIFIED permission class.
    
    Just checks Django permissions - no role logic.
    Subclass and define required_permission.
    """
    
    required_permission = None  # Override in subclass
    
    def has_permission(self, request, view):
        """
        Check if user has permission to access this view.
        """
        user = request.user
        
        if not user or not user.is_authenticated:
            return False
        
        # Check Django permission if specified
        if self.required_permission:
            return user.has_perm(self.required_permission)
        
        return True


class CanManageClients(RoleBasedPermission):
    """
    Permission for client management operations.
    Requires 'view_client' permission.
    """
    required_permission = 'immigration.view_client'


class CanCreateUsers(RoleBasedPermission):
    """
    Permission for user creation.
    Requires 'add_user' permission (only SUPER_SUPER_ADMIN and SUPER_ADMIN).
    """
    required_permission = 'immigration.add_user'


class CanManageApplications(RoleBasedPermission):
    """
    Permission for visa application management.
    Requires 'view_visaapplication' permission.
    """
    required_permission = 'immigration.view_visaapplication'


class CanManageAgents(RoleBasedPermission):
    """
    Permission for agent management operations.
    Requires 'view_agent' permission.
    """
    required_permission = 'immigration.view_agent'
