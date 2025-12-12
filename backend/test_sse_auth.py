#!/usr/bin/env python
"""
Debug script to test SSE authentication.

Usage:
    python test_sse_auth.py <jwt_token>
"""

import sys
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')
django.setup()

from immigration.api.v1.authentication import JWTQueryParamAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

def test_token(token):
    """Test if a JWT token is valid."""
    print(f"\n🔍 Testing JWT Token")
    print(f"Token: {token[:20]}...{token[-20:]}\n")
    
    auth = JWTQueryParamAuthentication()
    
    try:
        # Step 1: Validate token
        print("Step 1: Validating token...")
        validated_token = auth.get_validated_token(token)
        print(f"✅ Token validated successfully")
        print(f"   Token type: {validated_token.get('token_type')}")
        print(f"   User ID: {validated_token.get('user_id')}")
        print(f"   Expires: {validated_token.get('exp')}")
        print(f"   Issued at: {validated_token.get('iat')}")
        
        # Step 2: Get user
        print("\nStep 2: Getting user from token...")
        user = auth.get_user(validated_token)
        if user:
            print(f"✅ User found: {user.username} (ID: {user.id})")
            print(f"   Is active: {user.is_active}")
            print(f"   Is staff: {user.is_staff}")
            return True
        else:
            print(f"❌ User not found or inactive")
            return False
            
    except InvalidToken as e:
        print(f"❌ Invalid Token: {e}")
        return False
    except TokenError as e:
        print(f"❌ Token Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python test_sse_auth.py <jwt_token>")
        print("\nExample:")
        print('python test_sse_auth.py "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."')
        sys.exit(1)
    
    token = sys.argv[1]
    success = test_token(token)
    
    if success:
        print("\n✅ Authentication would succeed!")
        print("\nYou can now test with curl:")
        print(f'curl -N "http://localhost:8000/api/v1/notifications/stream/?token={token}"')
    else:
        print("\n❌ Authentication would fail!")
        print("\nYou need to get a fresh token:")
        print('curl -X POST http://localhost:8000/api/token/ \\')
        print('  -H "Content-Type: application/json" \\')
        print('  -d \'{"username":"your_username","password":"your_password"}\'')
    
    sys.exit(0 if success else 1)

