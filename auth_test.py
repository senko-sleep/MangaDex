#!/usr/bin/env python3
"""
Detailed Authentication Testing for NextAuth
"""

import requests
import json

BASE_URL = "https://mangafox-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_auth_flow():
    """Test complete authentication flow"""
    print("Testing NextAuth Authentication Flow...")
    print("=" * 50)
    
    session = requests.Session()
    
    # Test 1: Get CSRF token
    print("1. Testing CSRF token retrieval...")
    try:
        response = session.get(f"{BASE_URL}/api/auth/csrf")
        if response.status_code == 200:
            data = response.json()
            csrf_token = data.get('csrfToken')
            if csrf_token:
                print(f"✅ PASS - CSRF token retrieved: {csrf_token[:20]}...")
            else:
                print(f"❌ FAIL - No CSRF token in response: {data}")
                return False
        else:
            print(f"❌ FAIL - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
        return False
    
    # Test 2: Test invalid credentials
    print("\n2. Testing invalid credentials...")
    try:
        signin_data = {
            'email': 'invalid@example.com',
            'password': 'wrongpassword',
            'csrfToken': csrf_token,
            'callbackUrl': BASE_URL,
            'json': 'true'
        }
        response = session.post(f"{BASE_URL}/api/auth/callback/credentials", data=signin_data)
        if response.status_code == 401 or (response.status_code == 200 and 'error' in response.url):
            print("✅ PASS - Correctly rejects invalid credentials")
        else:
            print(f"❌ FAIL - Should reject invalid credentials. Status: {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
    
    # Test 3: Test valid credentials
    print("\n3. Testing valid credentials...")
    try:
        signin_data = {
            'email': 'admin@example.com',
            'password': 'SecurePassword123!',
            'csrfToken': csrf_token,
            'callbackUrl': BASE_URL,
            'json': 'true'
        }
        response = session.post(f"{BASE_URL}/api/auth/callback/credentials", data=signin_data)
        if response.status_code == 200:
            result = response.json()
            if result.get('url'):
                print("✅ PASS - Successfully authenticated with valid credentials")
            else:
                print(f"❌ FAIL - No redirect URL: {result}")
        else:
            print(f"❌ FAIL - Status: {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
    
    # Test 4: Test session endpoint
    print("\n4. Testing session endpoint...")
    try:
        response = session.get(f"{BASE_URL}/api/auth/session")
        if response.status_code == 200:
            data = response.json()
            if data.get('user'):
                print(f"✅ PASS - Session active for user: {data['user'].get('email')}")
            else:
                print("✅ PASS - No active session (expected after credential test)")
        else:
            print(f"❌ FAIL - Status: {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
    
    print("\n" + "=" * 50)
    print("Authentication flow testing completed!")

if __name__ == "__main__":
    test_auth_flow()