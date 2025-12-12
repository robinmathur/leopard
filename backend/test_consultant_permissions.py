#!/usr/bin/env python
"""
Test that CONSULTANT users can access the permissions endpoint.
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import AccessToken
from immigration.api.v1.views.users import UserViewSet

User = get_user_model()


def test_consultant_permissions_access():
    """Test that CONSULTANT can access my_permissions endpoint."""
    print("=" * 70)
    print("TEST: CONSULTANT Access to Permissions Endpoint")
    print("=" * 70)
    
    # Get a CONSULTANT user
    consultant = User.objects.filter(role='CONSULTANT').first()
    if not consultant:
        print("\n✗ FAIL: No CONSULTANT user found in database")
        return
    
    print(f"\nTesting with user: {consultant.username}")
    print(f"Role: {consultant.role}")
    print(f"Groups: {[g.name for g in consultant.groups.all()]}")
    
    # Create a request
    factory = APIRequestFactory()
    request = factory.get('/api/v1/users/me/permissions/')
    request.user = consultant
    
    # Get the view
    view = UserViewSet.as_view({'get': 'my_permissions'})
    
    # Execute the request
    try:
        response = view(request)
        print(f"\nResponse status: {response.status_code}")
        
        if response.status_code == 200:
            print("✓ PASS: CONSULTANT can access permissions endpoint")
            print(f"\nResponse data keys: {list(response.data.keys())}")
            print(f"Role in response: {response.data.get('role')}")
            print(f"Permissions count: {len(response.data.get('permissions', []))}")
            print(f"\nSample permissions:")
            for perm in response.data.get('permissions', [])[:5]:
                print(f"  - {perm['codename']}: {perm['name']}")
        else:
            print(f"✗ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.data if hasattr(response, 'data') else 'No data'}")
    
    except Exception as e:
        print(f"✗ FAIL: Exception occurred: {e}")
        import traceback
        traceback.print_exc()


def test_permission_class_check():
    """Test the permission class logic."""
    print("\n" + "=" * 70)
    print("TEST: Permission Class Verification")
    print("=" * 70)
    
    # Get users of different roles
    consultant = User.objects.filter(role='CONSULTANT').first()
    branch_admin = User.objects.filter(role='BRANCH_ADMIN').first()
    
    if consultant:
        print(f"\nCONSULTANT ({consultant.username}):")
        print(f"  Can create users: {consultant.has_perm('immigration.add_user')}")
        print(f"  Can view client: {consultant.has_perm('immigration.view_client')}")
        print(f"  Permission count: {len(consultant.get_all_permissions_list())}")
    
    if branch_admin:
        print(f"\nBRANCH_ADMIN ({branch_admin.username}):")
        print(f"  Can create users: {branch_admin.has_perm('immigration.add_user')}")
        print(f"  Can view client: {branch_admin.has_perm('immigration.view_client')}")
        print(f"  Permission count: {len(branch_admin.get_all_permissions_list())}")


def main():
    print("\n")
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 15 + "CONSULTANT PERMISSIONS ACCESS TEST" + " " * 19 + "║")
    print("╚" + "═" * 68 + "╝")
    
    test_permission_class_check()
    test_consultant_permissions_access()
    
    print("\n" + "=" * 70)
    print("TEST COMPLETED")
    print("=" * 70)
    print("\nNote: CONSULTANT users should now be able to access:")
    print("  GET /api/v1/users/me/permissions/")
    print("\nBut should NOT be able to access:")
    print("  GET /api/v1/users/ (list users)")
    print("  POST /api/v1/users/ (create user)")
    print("\n")


if __name__ == '__main__':
    main()

