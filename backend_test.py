#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for MangaDx Platform
Tests all API endpoints including authentication, CRUD operations, and file uploads
"""

import requests
import json
import os
import zipfile
import tempfile
from io import BytesIO
from PIL import Image
import time

# Configuration
BASE_URL = "https://mangafox-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "SecurePassword123!"

class MangaDxAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_manga_id = None
        self.test_chapter_id = None
        self.auth_token = None
        
    def log_test(self, test_name, success, message="", data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        if data and not success:
            print(f"   Response: {data}")
        print()
        
    def create_test_image(self, width=800, height=600):
        """Create a test image for uploads"""
        img = Image.new('RGB', (width, height), color='red')
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        buffer.seek(0)
        return buffer.getvalue()
        
    def create_test_zip(self, num_pages=3):
        """Create a test ZIP file with mock manga pages"""
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
            for i in range(1, num_pages + 1):
                img_data = self.create_test_image()
                zip_file.writestr(f"page_{i:03d}.jpg", img_data)
        zip_buffer.seek(0)
        return zip_buffer.getvalue()
        
    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{API_BASE}")
            if response.status_code == 200:
                self.log_test("Basic API Connectivity", True, "API is accessible")
                return True
            else:
                self.log_test("Basic API Connectivity", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Basic API Connectivity", False, f"Connection error: {str(e)}")
            return False
            
    def test_stats_endpoint(self):
        """Test GET /api/stats"""
        try:
            response = self.session.get(f"{API_BASE}/stats")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'data' in data:
                    stats = data['data']
                    required_fields = ['mangaCount', 'chapterCount', 'totalViews']
                    if all(field in stats for field in required_fields):
                        self.log_test("GET /api/stats", True, f"Stats: {stats}")
                        return True
                    else:
                        self.log_test("GET /api/stats", False, "Missing required fields", data)
                        return False
                else:
                    self.log_test("GET /api/stats", False, "Invalid response format", data)
                    return False
            else:
                self.log_test("GET /api/stats", False, f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("GET /api/stats", False, f"Error: {str(e)}")
            return False
            
    def test_manga_list_endpoint(self):
        """Test GET /api/manga with various parameters"""
        test_cases = [
            {"params": {}, "name": "Default listing"},
            {"params": {"page": "1", "limit": "10"}, "name": "With pagination"},
            {"params": {"sortBy": "title", "order": "asc"}, "name": "With sorting"},
            {"params": {"includeHentai": "false"}, "name": "Exclude hentai"},
            {"params": {"status": "ongoing"}, "name": "Filter by status"},
        ]
        
        all_passed = True
        for test_case in test_cases:
            try:
                response = self.session.get(f"{API_BASE}/manga", params=test_case["params"])
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and 'data' in data and 'pagination' in data:
                        pagination = data['pagination']
                        required_fields = ['page', 'limit', 'total', 'pages']
                        if all(field in pagination for field in required_fields):
                            self.log_test(f"GET /api/manga - {test_case['name']}", True, 
                                        f"Found {len(data['data'])} manga, Total: {pagination['total']}")
                        else:
                            self.log_test(f"GET /api/manga - {test_case['name']}", False, 
                                        "Missing pagination fields", data)
                            all_passed = False
                    else:
                        self.log_test(f"GET /api/manga - {test_case['name']}", False, 
                                    "Invalid response format", data)
                        all_passed = False
                else:
                    self.log_test(f"GET /api/manga - {test_case['name']}", False, 
                                f"Status: {response.status_code}", response.text)
                    all_passed = False
            except Exception as e:
                self.log_test(f"GET /api/manga - {test_case['name']}", False, f"Error: {str(e)}")
                all_passed = False
                
        return all_passed
        
    def test_search_endpoint(self):
        """Test GET /api/search"""
        test_cases = [
            {"q": "", "name": "Empty search"},
            {"q": "naruto", "name": "Text search"},
            {"q": "action", "name": "Genre search"},
            {"q": "test", "includeHentai": "false", "name": "Search with filter"},
        ]
        
        all_passed = True
        for test_case in test_cases:
            try:
                params = {k: v for k, v in test_case.items() if k not in ['name']}
                response = self.session.get(f"{API_BASE}/search", params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and 'data' in data:
                        self.log_test(f"GET /api/search - {test_case['name']}", True, 
                                    f"Found {len(data['data'])} results")
                    else:
                        self.log_test(f"GET /api/search - {test_case['name']}", False, 
                                    "Invalid response format", data)
                        all_passed = False
                else:
                    self.log_test(f"GET /api/search - {test_case['name']}", False, 
                                f"Status: {response.status_code}", response.text)
                    all_passed = False
            except Exception as e:
                self.log_test(f"GET /api/search - {test_case['name']}", False, f"Error: {str(e)}")
                all_passed = False
                
        return all_passed
        
    def test_create_manga(self):
        """Test POST /api/manga"""
        try:
            # Create test cover image
            cover_image = self.create_test_image(400, 600)
            
            # Prepare form data
            files = {
                'cover': ('cover.jpg', cover_image, 'image/jpeg')
            }
            
            data = {
                'title': 'Test Manga for API Testing',
                'description': 'This is a test manga created by the API testing script',
                'tags': 'test,api,automation',
                'genres': 'action,adventure',
                'isHentai': 'false',
                'status': 'ongoing',
                'author': 'Test Author',
                'artist': 'Test Artist'
            }
            
            response = self.session.post(f"{API_BASE}/manga", data=data, files=files)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and 'data' in result:
                    manga_data = result['data']
                    self.test_manga_id = manga_data.get('id')
                    self.log_test("POST /api/manga", True, 
                                f"Created manga with ID: {self.test_manga_id}")
                    return True
                else:
                    self.log_test("POST /api/manga", False, "Invalid response format", result)
                    return False
            else:
                self.log_test("POST /api/manga", False, 
                            f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("POST /api/manga", False, f"Error: {str(e)}")
            return False
            
    def test_get_manga_by_id(self):
        """Test GET /api/manga/:id"""
        if not self.test_manga_id:
            self.log_test("GET /api/manga/:id", False, "No test manga ID available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/manga/{self.test_manga_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'data' in data:
                    manga = data['data']
                    if manga.get('id') == self.test_manga_id:
                        self.log_test("GET /api/manga/:id", True, 
                                    f"Retrieved manga: {manga.get('title')}")
                        return True
                    else:
                        self.log_test("GET /api/manga/:id", False, "ID mismatch", data)
                        return False
                else:
                    self.log_test("GET /api/manga/:id", False, "Invalid response format", data)
                    return False
            else:
                self.log_test("GET /api/manga/:id", False, 
                            f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("GET /api/manga/:id", False, f"Error: {str(e)}")
            return False
            
    def test_get_manga_by_invalid_id(self):
        """Test GET /api/manga/:id with invalid ID"""
        try:
            response = self.session.get(f"{API_BASE}/manga/invalid-id-12345")
            
            if response.status_code == 404:
                data = response.json()
                if not data.get('success'):
                    self.log_test("GET /api/manga/:id (invalid)", True, "Correctly returned 404")
                    return True
                else:
                    self.log_test("GET /api/manga/:id (invalid)", False, "Should return error", data)
                    return False
            else:
                self.log_test("GET /api/manga/:id (invalid)", False, 
                            f"Expected 404, got {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("GET /api/manga/:id (invalid)", False, f"Error: {str(e)}")
            return False
            
    def test_upload_chapter(self):
        """Test POST /api/manga/:id/chapters"""
        if not self.test_manga_id:
            self.log_test("POST /api/manga/:id/chapters", False, "No test manga ID available")
            return False
            
        try:
            # Create test ZIP file with manga pages
            zip_data = self.create_test_zip(5)
            
            files = {
                'zipFile': ('chapter.zip', zip_data, 'application/zip')
            }
            
            data = {
                'chapterNumber': '1',
                'title': 'Test Chapter 1'
            }
            
            response = self.session.post(f"{API_BASE}/manga/{self.test_manga_id}/chapters", 
                                       data=data, files=files)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and 'data' in result:
                    chapter_data = result['data']
                    self.test_chapter_id = chapter_data.get('id')
                    self.log_test("POST /api/manga/:id/chapters", True, 
                                f"Uploaded chapter with ID: {self.test_chapter_id}, Pages: {chapter_data.get('pageCount')}")
                    return True
                else:
                    self.log_test("POST /api/manga/:id/chapters", False, "Invalid response format", result)
                    return False
            else:
                self.log_test("POST /api/manga/:id/chapters", False, 
                            f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("POST /api/manga/:id/chapters", False, f"Error: {str(e)}")
            return False
            
    def test_get_manga_chapters(self):
        """Test GET /api/manga/:id/chapters"""
        if not self.test_manga_id:
            self.log_test("GET /api/manga/:id/chapters", False, "No test manga ID available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/manga/{self.test_manga_id}/chapters")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'data' in data:
                    chapters = data['data']
                    self.log_test("GET /api/manga/:id/chapters", True, 
                                f"Found {len(chapters)} chapters")
                    return True
                else:
                    self.log_test("GET /api/manga/:id/chapters", False, "Invalid response format", data)
                    return False
            else:
                self.log_test("GET /api/manga/:id/chapters", False, 
                            f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("GET /api/manga/:id/chapters", False, f"Error: {str(e)}")
            return False
            
    def test_get_chapter_by_id(self):
        """Test GET /api/manga/:mangaId/chapters/:chapterId"""
        if not self.test_manga_id or not self.test_chapter_id:
            self.log_test("GET /api/manga/:mangaId/chapters/:chapterId", False, 
                        "No test manga or chapter ID available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/manga/{self.test_manga_id}/chapters/{self.test_chapter_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'data' in data:
                    chapter = data['data']
                    if 'pages' in chapter and len(chapter['pages']) > 0:
                        self.log_test("GET /api/manga/:mangaId/chapters/:chapterId", True, 
                                    f"Retrieved chapter with {len(chapter['pages'])} pages")
                        return True
                    else:
                        self.log_test("GET /api/manga/:mangaId/chapters/:chapterId", False, 
                                    "No pages found in chapter", data)
                        return False
                else:
                    self.log_test("GET /api/manga/:mangaId/chapters/:chapterId", False, 
                                "Invalid response format", data)
                    return False
            else:
                self.log_test("GET /api/manga/:mangaId/chapters/:chapterId", False, 
                            f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("GET /api/manga/:mangaId/chapters/:chapterId", False, f"Error: {str(e)}")
            return False
            
    def test_nextauth_signin(self):
        """Test NextAuth signin endpoint"""
        try:
            # First, get CSRF token
            csrf_response = self.session.get(f"{BASE_URL}/api/auth/csrf")
            if csrf_response.status_code != 200:
                self.log_test("NextAuth CSRF Token", False, f"Status: {csrf_response.status_code}")
                return False
                
            csrf_data = csrf_response.json()
            csrf_token = csrf_data.get('csrfToken')
            
            if not csrf_token:
                self.log_test("NextAuth CSRF Token", False, "No CSRF token received")
                return False
                
            # Now attempt signin
            signin_data = {
                'email': ADMIN_EMAIL,
                'password': ADMIN_PASSWORD,
                'csrfToken': csrf_token,
                'callbackUrl': BASE_URL,
                'json': 'true'
            }
            
            response = self.session.post(f"{BASE_URL}/api/auth/callback/credentials", 
                                       data=signin_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('url'):
                    self.log_test("NextAuth Signin", True, "Successfully authenticated")
                    return True
                else:
                    self.log_test("NextAuth Signin", False, "No redirect URL in response", result)
                    return False
            else:
                self.log_test("NextAuth Signin", False, 
                            f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("NextAuth Signin", False, f"Error: {str(e)}")
            return False
            
    def test_delete_manga(self):
        """Test DELETE /api/manga/:id"""
        if not self.test_manga_id:
            self.log_test("DELETE /api/manga/:id", False, "No test manga ID available")
            return False
            
        try:
            response = self.session.delete(f"{API_BASE}/manga/{self.test_manga_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test("DELETE /api/manga/:id", True, "Successfully deleted manga")
                    return True
                else:
                    self.log_test("DELETE /api/manga/:id", False, "Delete failed", data)
                    return False
            else:
                self.log_test("DELETE /api/manga/:id", False, 
                            f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("DELETE /api/manga/:id", False, f"Error: {str(e)}")
            return False
            
    def run_all_tests(self):
        """Run all API tests"""
        print("=" * 60)
        print("MANGADX BACKEND API TESTING")
        print("=" * 60)
        print()
        
        test_results = {}
        
        # Basic connectivity
        test_results['connectivity'] = self.test_basic_connectivity()
        
        # Stats endpoint (good for testing DB connection)
        test_results['stats'] = self.test_stats_endpoint()
        
        # Manga listing and search
        test_results['manga_list'] = self.test_manga_list_endpoint()
        test_results['search'] = self.test_search_endpoint()
        
        # CRUD operations
        test_results['create_manga'] = self.test_create_manga()
        test_results['get_manga'] = self.test_get_manga_by_id()
        test_results['get_manga_invalid'] = self.test_get_manga_by_invalid_id()
        
        # Chapter operations
        test_results['upload_chapter'] = self.test_upload_chapter()
        test_results['get_chapters'] = self.test_get_manga_chapters()
        test_results['get_chapter'] = self.test_get_chapter_by_id()
        
        # Authentication
        test_results['auth'] = self.test_nextauth_signin()
        
        # Cleanup
        test_results['delete_manga'] = self.test_delete_manga()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
            
        print()
        print(f"OVERALL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the detailed output above.")
            
        return test_results

if __name__ == "__main__":
    tester = MangaDxAPITester()
    results = tester.run_all_tests()