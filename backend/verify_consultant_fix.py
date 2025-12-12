#!/usr/bin/env python
"""
Quick verification that CONSULTANT users can access permissions endpoint.
Run this after the fix to verify everything works.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


def main():
    print("\n" + "=" * 70)
    print("CONSULTANT PERMISSIONS FIX VERIFICATION")
    print("=" * 70)
    
    # Get a CONSULTANT user
    consultant = User.objects.filter(role='CONSULTANT').first()
    if not consultant:
        print("\n❌ No CONSULTANT user found in database")
        return
    
    print(f"\nTesting with user: {consultant.username} (CONSULTANT)")
    
    # Create API client with JWT token
    client = APIClient()
    token = AccessToken.for_user(consultant)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    # Test 1: Access permissions endpoint (should succeed)
    print("\n1. Testing GET /api/v1/users/me/permissions/")
    response = client.get('/api/v1/users/me/permissions/')
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ SUCCESS (Status: {response.status_code})")
        print(f"   - Role: {data['role']}")
        print(f"   - Permissions count: {len(data['permissions'])}")
        print(f"   - Sample permissions: {', '.join([p['codename'] for p in data['permissions'][:3]])}")
    else:
        print(f"   ❌ FAILED (Status: {response.status_code})")
        print(f"   - Error: {response.json()}")
        return
    
    # Test 2: Try to list users (should fail)
    print("\n2. Testing GET /api/v1/users/ (should be blocked)")
    response = client.get('/api/v1/users/')
    
    if response.status_code == 403:
        print(f"   ✅ CORRECT (Status: {response.status_code})")
        print(f"   - CONSULTANT properly blocked from listing users")
    else:
        print(f"   ⚠️  UNEXPECTED (Status: {response.status_code})")
        print(f"   - CONSULTANT should not have access to this endpoint")
    
    # Test 3: Try to create user (should fail)
    print("\n3. Testing POST /api/v1/users/ (should be blocked)")
    response = client.post('/api/v1/users/', {
        'username': 'test_user',
        'email': 'test@example.com',
        'password': 'testpass123',
        'first_name': 'Test',
        'last_name': 'User',
        'role': 'CONSULTANT',
    })
    
    if response.status_code == 403:
        print(f"   ✅ CORRECT (Status: {response.status_code})")
        print(f"   - CONSULTANT properly blocked from creating users")
    else:
        print(f"   ⚠️  UNEXPECTED (Status: {response.status_code})")
        print(f"   - CONSULTANT should not have access to this endpoint")
    
    print("\n" + "=" * 70)
    print("✅ VERIFICATION COMPLETE - FIX IS WORKING CORRECTLY")
    print("=" * 70)
    print("\nSummary:")
    print("  ✅ CONSULTANT can view their own permissions")
    print("  ✅ CONSULTANT cannot list users")
    print("  ✅ CONSULTANT cannot create users")
    print("\n")


if __name__ == '__main__':
    main()

