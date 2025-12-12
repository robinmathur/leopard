#!/usr/bin/env python
"""
Test script to verify role-to-group mapping and permissions endpoint.

Usage:
    python test_permissions.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()


def test_role_group_sync():
    """Test that users are properly synced to groups based on roles."""
    print("=" * 70)
    print("TEST 1: Role-to-Group Synchronization")
    print("=" * 70)
    
    # Get a sample of users with different roles
    roles_to_check = ['SUPER_SUPER_ADMIN', 'BRANCH_ADMIN', 'CONSULTANT']
    
    for role in roles_to_check:
        try:
            user = User.objects.filter(role=role).first()
            if user:
                groups = user.groups.all()
                print(f"\nUser: {user.username}")
                print(f"  Role: {user.role}")
                print(f"  Groups: {[g.name for g in groups]}")
                print(f"  Expected: User should be in group '{role}'")
                print(f"  ✓ PASS" if any(g.name == role for g in groups) else "  ✗ FAIL")
        except Exception as e:
            print(f"\nError checking role {role}: {e}")


def test_permissions_count():
    """Test that users have permissions based on their role."""
    print("\n" + "=" * 70)
    print("TEST 2: Permission Assignment by Role")
    print("=" * 70)
    
    # Expected permission counts (approximate)
    expected_counts = {
        'SUPER_SUPER_ADMIN': 32,
        'SUPER_ADMIN': 31,
        'COUNTRY_MANAGER': 28,
        'REGION_MANAGER': 21,
        'BRANCH_ADMIN': 17,
        'CONSULTANT': 10,
    }
    
    for role, expected in expected_counts.items():
        try:
            user = User.objects.filter(role=role).first()
            if user:
                perms = user.get_all_permissions_list()
                print(f"\nRole: {role}")
                print(f"  User: {user.username}")
                print(f"  Permission count: {len(perms)}")
                print(f"  Expected: ~{expected}")
                print(f"  Sample permissions:")
                for perm in perms[:3]:
                    print(f"    - {perm}")
        except Exception as e:
            print(f"\nError checking role {role}: {e}")


def test_group_creation():
    """Test that all role groups were created."""
    print("\n" + "=" * 70)
    print("TEST 3: Role Groups Creation")
    print("=" * 70)
    
    expected_groups = [
        'SUPER_SUPER_ADMIN',
        'SUPER_ADMIN',
        'COUNTRY_MANAGER',
        'REGION_MANAGER',
        'BRANCH_ADMIN',
        'CONSULTANT',
    ]
    
    for group_name in expected_groups:
        exists = Group.objects.filter(name=group_name).exists()
        status = "✓ PASS" if exists else "✗ FAIL"
        print(f"\nGroup: {group_name}")
        print(f"  Exists: {exists}")
        print(f"  {status}")
        
        if exists:
            group = Group.objects.get(name=group_name)
            perm_count = group.permissions.count()
            user_count = group.user_set.count()
            print(f"  Permissions: {perm_count}")
            print(f"  Users in group: {user_count}")


def test_specific_permissions():
    """Test specific permission checks."""
    print("\n" + "=" * 70)
    print("TEST 4: Specific Permission Checks")
    print("=" * 70)
    
    # Test that CONSULTANT has view but not delete
    consultant = User.objects.filter(role='CONSULTANT').first()
    if consultant:
        print(f"\nUser: {consultant.username} (CONSULTANT)")
        print(f"  Can view client: {consultant.has_perm('immigration.view_client')}")
        print(f"  Can add client: {consultant.has_perm('immigration.add_client')}")
        print(f"  Can delete client: {consultant.has_perm('immigration.delete_client')}")
        print(f"  Expected: view=True, add=True, delete=False")
    
    # Test that BRANCH_ADMIN has all CRUD
    branch_admin = User.objects.filter(role='BRANCH_ADMIN').first()
    if branch_admin:
        print(f"\nUser: {branch_admin.username} (BRANCH_ADMIN)")
        print(f"  Can view client: {branch_admin.has_perm('immigration.view_client')}")
        print(f"  Can add client: {branch_admin.has_perm('immigration.add_client')}")
        print(f"  Can change client: {branch_admin.has_perm('immigration.change_client')}")
        print(f"  Can delete client: {branch_admin.has_perm('immigration.delete_client')}")
        print(f"  Expected: All True")


def main():
    """Run all tests."""
    print("\n")
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 10 + "ROLE-TO-GROUP MAPPING & PERMISSIONS TEST" + " " * 17 + "║")
    print("╚" + "═" * 68 + "╝")
    
    test_group_creation()
    test_role_group_sync()
    test_permissions_count()
    test_specific_permissions()
    
    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETED")
    print("=" * 70)
    print("\nEndpoint available at: GET /api/v1/users/me/permissions/")
    print("OpenAPI docs: http://localhost:8000/api/schema/swagger-ui/")
    print("\n")


if __name__ == '__main__':
    main()

