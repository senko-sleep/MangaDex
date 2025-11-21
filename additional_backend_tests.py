#!/usr/bin/env python3
"""
Additional Backend API Tests for Edge Cases and Error Handling
"""

import requests
import json

BASE_URL = "https://mangafox-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_error_handling():
    """Test various error conditions"""
    print("Testing Error Handling and Edge Cases...")
    print("=" * 50)
    
    session = requests.Session()
    
    # Test 1: POST manga without required title
    print("1. Testing POST /api/manga without title...")
    try:
        response = session.post(f"{API_BASE}/manga", data={'description': 'test'})
        if response.status_code == 400:
            data = response.json()
            if not data.get('success') and 'Title is required' in data.get('error', ''):
                print("✅ PASS - Correctly validates required title field")
            else:
                print(f"❌ FAIL - Wrong error message: {data}")
        else:
            print(f"❌ FAIL - Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
    
    # Test 2: Upload chapter to non-existent manga
    print("\n2. Testing POST /api/manga/invalid-id/chapters...")
    try:
        files = {'zipFile': ('test.zip', b'fake zip data', 'application/zip')}
        data = {'chapterNumber': '1', 'title': 'Test'}
        response = session.post(f"{API_BASE}/manga/invalid-id/chapters", data=data, files=files)
        if response.status_code == 404:
            result = response.json()
            if not result.get('success') and 'Manga not found' in result.get('error', ''):
                print("✅ PASS - Correctly handles non-existent manga")
            else:
                print(f"❌ FAIL - Wrong error message: {result}")
        else:
            print(f"❌ FAIL - Expected 404, got {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
    
    # Test 3: Get chapter with invalid IDs
    print("\n3. Testing GET /api/manga/invalid/chapters/invalid...")
    try:
        response = session.get(f"{API_BASE}/manga/invalid/chapters/invalid")
        if response.status_code == 404:
            data = response.json()
            if not data.get('success'):
                print("✅ PASS - Correctly handles invalid chapter request")
            else:
                print(f"❌ FAIL - Should return error: {data}")
        else:
            print(f"❌ FAIL - Expected 404, got {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
    
    # Test 4: Test invalid route
    print("\n4. Testing invalid route /api/invalid...")
    try:
        response = session.get(f"{API_BASE}/invalid")
        if response.status_code == 404:
            data = response.json()
            if not data.get('success') and 'Route not found' in data.get('error', ''):
                print("✅ PASS - Correctly handles invalid routes")
            else:
                print(f"❌ FAIL - Wrong error message: {data}")
        else:
            print(f"❌ FAIL - Expected 404, got {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
    
    # Test 5: Test POST to invalid route
    print("\n5. Testing POST to invalid route...")
    try:
        response = session.post(f"{API_BASE}/invalid")
        if response.status_code == 404:
            data = response.json()
            if not data.get('success'):
                print("✅ PASS - Correctly handles invalid POST routes")
            else:
                print(f"❌ FAIL - Should return error: {data}")
        else:
            print(f"❌ FAIL - Expected 404, got {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL - Error: {e}")
    
    print("\n" + "=" * 50)
    print("Additional error handling tests completed!")

if __name__ == "__main__":
    test_error_handling()