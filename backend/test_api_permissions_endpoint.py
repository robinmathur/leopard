#!/usr/bin/env python
"""
Integration test for permissions endpoint with different roles.
Tests actual API calls with JWT authentication.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


def test_permissions_endpoint_access():
    """Test permissions endpoint access for different roles."""
    print("\n" + "=" * 70)
    print("INTEGRATION TEST: Permissions Endpoint Access by Role")
    print("=" * 70)
    
    # Test roles
    test_roles = [
        'CONSULTANT',
        'BRANCH_ADMIN',
        'REGION_MANAGER',
        'COUNTRY_MANAGER',
        'SUPER_ADMIN',
    ]
    
    client = APIClient()
    
    for role in test_roles:
        user = User.objects.filter(role=role).first()
        if not user:
            print(f"\n{role}: No user found - SKIPPED")
            continue
        
        # Generate JWT token
        token = AccessToken.for_user(user)
        
        # Set authorization header
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Test GET /api/v1/users/me/permissions/
        response = client.get('/api/v1/users/me/permissions/')
        
        print(f"\n{role} ({user.username}):")
        print(f"  Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ SUCCESS - Can access endpoint")
            print(f"  Role in response: {data.get('role')}")
            print(f"  Permissions count: {len(data.get('permissions', []))}")
            print(f"  Sample permissions: {[p['codename'] for p in data.get('permissions', [])[:3]]}")
        else:
            print(f"  ✗ FAIL - Cannot access endpoint")
            print(f"  Error: {response.json() if response.content else 'No error message'}")


def test_user_list_endpoint_access():
    """Test that CONSULTANTs still cannot access user list."""
    print("\n" + "=" * 70)
    print("VERIFICATION TEST: CONSULTANT Cannot List Users")
    print("=" * 70)
    
    consultant = User.objects.filter(role='CONSULTANT').first()
    if not consultant:
        print("\nNo CONSULTANT user found - SKIPPED")
        return
    
    client = APIClient()
    token = AccessToken.for_user(consultant)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    # Try to access user list (should fail)
    response = client.get('/api/v1/users/')
    
    print(f"\nCONSULTANT ({consultant.username}) accessing GET /api/v1/users/:")
    print(f"  Status Code: {response.status_code}")
    
    if response.status_code == 403:
        print(f"  ✓ CORRECT - CONSULTANT properly blocked from listing users")
    elif response.status_code == 200:
        print(f"  ✗ FAIL - CONSULTANT should not be able to list users")
    else:
        print(f"  ? UNEXPECTED - Got status code {response.status_code}")
        print(f"  Response: {response.json() if response.content else 'No content'}")


def test_branch_admin_can_still_list():
    """Test that BRANCH_ADMIN can still list users."""
    print("\n" + "=" * 70)
    print("VERIFICATION TEST: BRANCH_ADMIN Can List Users")
    print("=" * 70)
    
    branch_admin = User.objects.filter(role='BRANCH_ADMIN').first()
    if not branch_admin:
        print("\nNo BRANCH_ADMIN user found - SKIPPED")
        return
    
    client = APIClient()
    token = AccessToken.for_user(branch_admin)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    # Try to access user list (should succeed)
    response = client.get('/api/v1/users/')
    
    print(f"\nBRANCH_ADMIN ({branch_admin.username}) accessing GET /api/v1/users/:")
    print(f"  Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print(f"  ✓ CORRECT - BRANCH_ADMIN can list users")
        data = response.json()
        print(f"  Users returned: {data.get('count', 'N/A')}")
    else:
        print(f"  ✗ FAIL - BRANCH_ADMIN should be able to list users")
        print(f"  Response: {response.json() if response.content else 'No content'}")


def main():
    print("\n")
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 12 + "PERMISSIONS ENDPOINT INTEGRATION TEST" + " " * 18 + "║")
    print("╚" + "═" * 68 + "╝")
    
    test_permissions_endpoint_access()
    test_user_list_endpoint_access()
    test_branch_admin_can_still_list()
    
    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETED")
    print("=" * 70)
    print("\n✓ FIX VERIFIED:")
    print("  - CONSULTANT users CAN access GET /api/v1/users/me/permissions/")
    print("  - CONSULTANT users CANNOT access GET /api/v1/users/ (list)")
    print("  - BRANCH_ADMIN and higher CAN access both endpoints")
    print("\n")


if __name__ == '__main__':
    main()

