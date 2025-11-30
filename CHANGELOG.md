# Changelog

## Latest Updates

### Fixed Issues
- **MangaSee 404 Error**: Fixed the search index endpoint that was returning 404 errors. The scraper now properly fetches manga data from the search and directory pages.

### New Features

#### Enhanced NHentai Integration
- Integrated official `nhentai-api` package for better reliability
- Added API-first approach with automatic fallback to web scraping
- Improved error handling and data formatting
- Better metadata extraction (tags, artists, parodies, characters, etc.)

#### New Manga Source: Manganato
- Added Manganato scraper with full support for:
  - Search functionality
  - Popular manga
  - Latest updates
  - Chapter reading
  - High-quality images

#### Performance & Security Improvements
- Added `helmet` middleware for security headers
- Added `compression` middleware for response compression
- Improved caching strategy across all scrapers

#### Image Viewer Libraries
Added modern image viewing libraries for enhanced reading experience:
- **swiper**: Modern touch slider for smooth page navigation
- **keen-slider**: Lightweight, performant slider
- **react-photo-view**: Beautiful image viewer with zoom and pan
- **react-medium-image-zoom**: Medium-style image zoom
- **react-zoom-pan-pinch**: Advanced zoom, pan, and pinch controls

### Available Sources

#### Regular Manga
1. **MangaDex** (Official API) - Most reliable, high quality
2. **MangaSee** - Fast, good quality scans
3. **Manganato** - Large library, fast updates
4. **MangaKakalot** - Large library (disabled by default, often blocked)

#### Adult Content
1. **NHentai** - Adult doujinshi (disabled by default)

### Installation

Install the new dependencies:
```bash
npm install
```

### Usage

#### Enable/Disable Sources
Sources can be enabled/disabled through the API:
```javascript
POST /api/sources/:id/toggle
{
  "enabled": true
}
```

#### Search with Adult Content
```javascript
GET /api/manga/search?q=query&adult=true
```

#### Available Image Viewer Components
- Use `Swiper` for smooth page-by-page navigation
- Use `PhotoView` for lightbox-style viewing
- Use `TransformWrapper` from react-zoom-pan-pinch for advanced controls

### Configuration

Adult content is disabled by default. To enable:
1. Set `adult=true` in API requests
2. Enable nhentai source via the sources API

### Technical Details

#### Scraper Architecture
All scrapers extend `BaseScraper` class with:
- Automatic retry logic
- Request timeout handling
- User-agent rotation
- Error logging

#### Caching
- Search results cached for 5 minutes
- Manga details cached for 5 minutes
- Chapter lists cached for 5 minutes
- MangaSee directory cached for 10 minutes

### API Endpoints

- `GET /api/sources` - List available sources
- `POST /api/sources/:id/toggle` - Enable/disable source
- `GET /api/tags` - Get all available tags
- `GET /api/manga/search` - Search manga
- `GET /api/manga/popular` - Get popular manga
- `GET /api/manga/latest` - Get latest updates
- `GET /api/manga/:id` - Get manga details
- `GET /api/chapters/:mangaId` - Get chapter list
- `GET /api/pages/:mangaId/:chapterId` - Get chapter pages

### Notes

- MangaSee now uses the search/directory page instead of the deprecated `_search.php` endpoint
- NHentai uses official API with web scraping fallback for reliability
- All scrapers include proper error handling and logging
- Image URLs are properly formatted for direct access
