# MangaDex - Complete Manga Website System

A production-ready manga reading platform built with Next.js 14, MongoDB, and modern web technologies.

## 🚀 Features

### Public Website
- **Homepage**: Browse latest manga updates with pagination
- **Search & Filter**: Fuzzy search with genre filters, hentai toggle, and status filters
- **Manga Detail Page**: View manga information, chapters, tags, and statistics
- **Chapter Reader**: Beautiful image viewer with navigation controls
- **Responsive Design**: Mobile-friendly UI with dark theme support
- **SEO Optimized**: Server-side rendering with proper metadata

### Admin Panel
- **Secure Authentication**: NextAuth.js with JWT-based sessions
- **Manga Management**: Create, edit, and delete manga entries
- **Chapter Upload**: ZIP/CBZ file upload with automatic image extraction
- **Dashboard**: View statistics (manga count, chapter count, total views)
- **Image Optimization**: Automatic image compression and optimization
- **Dual Storage**: Local filesystem + Cloudinary fallback

### REST API
- `GET /api/bootstrap` - Get homepage data (sources, popular, latest, new manga)
- `GET /api/manga/search` - Search manga with filters
- `GET /api/manga/popular` - Get popular manga
- `GET /api/manga/latest` - Get latest updates
- `GET /api/manga/new` - Get newly added manga
- `GET /api/manga/top-rated` - Get top rated manga
- `GET /api/manga/:id` - Get manga details
- `GET /api/chapters/:mangaId` - Get chapters for a manga
- `GET /api/pages/:mangaId/:chapterId` - Get chapter pages
- `GET /api/sources` - Get available sources
- `POST /api/sources/:id/toggle` - Toggle source on/off
- `GET /api/tags` - Get available tags
- `GET /api/proxy/image` - Proxy images with CORS
- `POST /api/report/image-fail` - Report failed image loads
- `GET /api/og/:mangaId` - Get OG meta data for social sharing

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **UI Components**: Lucide icons, custom components
- **Backend**: Express.js, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Image Processing**: Sharp for optimization
- **Image Storage**: Local filesystem + Cloudinary
- **Scraping System**: Custom scrapers for multiple manga sources
- **Caching**: In-memory caching with startup cache
- **TypeScript**: Full type safety (converted to JavaScript for this version)

## 📁 Project Structure

```
MangaDex-2/
├── server/                     # Express.js backend server
│   ├── index.js               # Main server file with API routes
│   ├── scrapers/              # Manga source scrapers
│   │   ├── index.js          # Scraper manager
│   │   ├── mangadex.js       # MangaDex scraper
│   │   ├── nhentai.js        # NHentai scraper
│   │   ├── imhentai.js       # IMHentai scraper
│   │   └── ...               # Other scrapers
│   └── package.json          # Server dependencies
├── src/                       # React frontend
│   ├── components/           # React components
│   │   ├── ui/              # UI components
│   │   └── ...              # Other components
│   ├── pages/                # Page components
│   │   ├── HomePage.jsx      # Homepage
│   │   ├── MangaPage.jsx     # Manga details
│   │   ├── ChapterReaderPage.jsx # Chapter reader
│   │   └── ...               # Other pages
│   ├── lib/                  # Utilities and helpers
│   │   ├── api.js           # API helper functions
│   │   ├── mangadex.js      # MangaDex API client
│   │   └── ...              # Other utilities
│   ├── hooks/                # Custom React hooks
│   └── main.jsx             # App entry point
├── public/                   # Static assets
├── tests/                    # Test files
├── .env                     # Environment variables
├── package.json              # Frontend dependencies
├── vite.config.js           # Vite configuration
└── tailwind.config.js       # TailwindCSS configuration
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account or local MongoDB
- Cloudinary account (optional, for image backup)

### Environment Variables

Create or update `.env` file:

```env
# API Configuration
VITE_API_URL=http://localhost:3002
PORT=3002

# MongoDB Configuration
MONGO_URL=your-mongo

# Cloudinary Configuration (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS Configuration
CORS_ORIGINS=*
```

### Installation Steps

1. **Install Dependencies**
```bash
# Install frontend dependencies
yarn install

# Install server dependencies
cd server
yarn install
cd ..
```

2. **Start Development Servers**
```bash
# Start backend server (in one terminal)
cd server
yarn start

# Start frontend dev server (in another terminal)
yarn dev
```

3. **Build for Production**
```bash
# Build frontend
yarn build

# Start production server
cd server
yarn start
```

## � How to Use

This is a manga aggregation platform that fetches content from multiple sources. Users can:

1. **Browse Homepage**: View popular, latest, and newly added manga
2. **Search**: Find manga by title, tags, or filters
3. **Read**: Read chapters online with the built-in reader
4. **Filter Content**: Toggle SFW/Adult content, filter by sources

### Supported Manga Sources

The platform supports multiple manga sources including:
- **MangaDex** - Primary source for manga
- **NHentai** - Adult content (18+)
- **IMHentai** - Adult content (18+)
- **Hitomi.la** - Adult content (18+)
- And more...

### Reading Features

- **Multiple Reading Modes**: Auto, Scroll, Single Page, Double Page
- **Direction Support**: Left-to-right and Right-to-left
- **Image Fit Options**: Width, Height, Contain, Original
- **Touch Gestures**: Swipe navigation and tap zones
- **Keyboard Shortcuts**: Arrow keys, Space, F for fullscreen
- **Preloading**: Automatic page preloading for smooth reading
- **Error Reporting**: Automatic reporting of failed images

## 🗄️ Data Flow & Architecture

This is an aggregation platform that doesn't store manga content directly. Instead, it:

1. **Scrapes** content from multiple manga sources
2. **Caches** metadata and image URLs temporarily
3. **Proxies** images through the server to bypass hotlink protection
4. **Aggregates** content from different sources in one interface

### Data Models

#### Manga Metadata (Cached)
```javascript
{
  id: String,           // Composite ID (source:itemId)
  title: String,
  altTitles: [String],
  description: String,
  cover: String,       // Image URL
  author: String,
  artist: String,
  status: String,      // ongoing, completed, etc.
  isHentai: Boolean,
  tags: [String],
  source: String,      // Source identifier
  sourceId: String,    // Original ID from source
  views: Number,
  rating: Number,
  chapterCount: Number,
  updatedAt: Date
}
```

#### Chapter Metadata (Cached)
```javascript
{
  id: String,
  mangaId: String,
  chapterNumber: Number,
  title: String,
  language: String,
  pages: Number,
  views: Number,
  source: String,
  sourceId: String,
  updatedAt: Date
}
```

#### Page Data (Generated on-demand)
```javascript
{
  url: String,         // Proxied image URL
  index: Number,       // Page number
  width: Number,
  height: Number
}
```

## 🚀 Deployment

### Local Development

For local development, run both frontend and backend:

```bash
# Terminal 1: Start backend
cd server
yarn start

# Terminal 2: Start frontend
yarn dev
```

### Production Deployment

#### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy and install backend dependencies
COPY server/package*.json ./server/
RUN cd server && yarn install --frozen-lockfile

# Copy and install frontend dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
RUN yarn build

# Expose port
EXPOSE 3002

# Start server
CMD ["cd", "server", "&&", "yarn", "start"]
```

#### Using PM2 (Recommended for production)

```bash
# Install PM2
npm install -g pm2

# Start the application
cd server
pm2 start index.js --name "mangadx"

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Environment Setup for Production

```env
# Production .env
VITE_API_URL=https://your-domain.com
PORT=3002
NODE_ENV=production

# MongoDB
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/db
DB_NAME=mangadex

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (served from dist folder)
    location / {
        root /app/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firebase Deployment

The app can be deployed to Firebase:

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "server",
    "runtime": "nodejs18"
  }
}
```

## 🔒 Security Considerations

1. **Environment Variables**: Keep all secrets in `.env` files, never commit to git
2. **HTTPS**: Enable HTTPS for production deployment
3. **CORS**: Configure CORS properly for your domain
4. **Rate Limiting**: Implement rate limiting for API routes if needed
5. **Image Proxy**: The image proxy validates content to prevent malicious files
6. **Input Validation**: All user inputs are validated and sanitized
7. **Source Scraping**: Be respectful of source websites' terms of service
8. **Content Filtering**: Adult content is properly tagged and filtered

## 🎨 Customization

### Adding New Manga Sources

1. Create a new scraper in `server/scrapers/`
2. Implement required methods: `search`, `getMangaDetails`, `getChapters`, `getChapterPages`
3. Add source configuration to `server/scrapers/index.js`
4. Test the scraper with the test suite

### Modifying the Reader

The chapter reader is in `src/pages/ChapterReaderPage.jsx`. Key features:
- Reading modes (auto, scroll, page, double)
- Image fit options
- Touch gestures and keyboard shortcuts
- Settings persistence in localStorage
- Error handling and retry mechanisms

### Customizing UI

- **Colors**: Edit `tailwind.config.js` or `src/index.css`
- **Components**: Modify components in `src/components/`
- **Layout**: Update `src/App.jsx` for main layout
- **Reader Settings**: Modify settings panel in `ChapterReaderPage.jsx`

## 🐛 Troubleshooting

### Common Issues

#### Images Not Loading
- Check server logs for image proxy errors
- Verify source websites are accessible
- Check CORS headers in browser dev tools
- Try different image extensions (.webp, .jpg, .png)

#### Slow Loading
- Check cache status in server logs
- Verify MongoDB connection is working
- Monitor network requests in browser dev tools
- Consider reducing preload pages in reader settings

#### Search Not Working
- Check if sources are enabled (`/api/sources`)
- Verify scrapers are functioning correctly
- Check server logs for scraping errors
- Test individual source endpoints

#### Server Won't Start
- Verify all environment variables are set
- Check MongoDB connection string
- Ensure port 3002 is available
- Check Node.js version (requires 18+)

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

This will show detailed logs for:
- API requests/responses
- Scraping operations
- Cache hits/misses
- Image proxy operations

## 📊 Performance Optimization

### Caching Strategy
- **Startup Cache**: Popular/latest manga cached for 3 minutes
- **Image Cache**: Up to 500 images cached for 1 hour
- **API Responses**: Bootstrap API cached for instant homepage loads

### Image Optimization
- Automatic format detection (.webp, .jpg, .png, .gif)
- Extension fallback for failed requests
- Proper caching headers for browser caching
- Image validation to prevent malicious content

### Database Optimization
- Indexed queries for manga searches
- Efficient pagination for large result sets
- Connection pooling for MongoDB

## 📄 License

MIT License - Feel free to use this project for any purpose.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Adding New Features
- **New Sources**: Add scrapers for additional manga sites
- **Reader Features**: Enhance the reading experience
- **UI Improvements**: Better responsive design and accessibility
- **Performance**: Optimize caching and loading times
- **Mobile App**: Create mobile applications

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check existing issues for solutions
- Review server logs for error details
- Join our Discord community (link in repo)

---

**Built with ❤️ using React, Express.js, and modern web technologies**

## 📝 API Documentation

### Base URL
```
https://your-domain.com/api
```

### Authentication
- **Public APIs**: No authentication required
- **Admin APIs**: Require NextAuth.js session with admin role

### Core API Endpoints

#### Bootstrap API - Homepage Data
```http
GET /api/bootstrap?adult=false&adultOnly=false
```
**Response:**
```json
{
  "sources": [...],
  "enabledSources": [...],
  "contentTypes": [...],
  "popular": [...],
  "latest": [...],
  "newManga": [...]
}
```

#### Search Manga
```http
GET /api/manga/search?q=one%20piece&adult=false&page=1&sort=popular&sources=mangadex,nhentai&tags=action,romance
```
**Query Parameters:**
- `q` - Search query (optional)
- `adult` - `false` (SFW only), `true` (SFW + Adult), `only` (Adult only)
- `page` - Page number (default: 1)
- `sort` - `popular`, `latest`, `updated`, `title`
- `sources` - Comma-separated source IDs
- `tags` - Comma-separated tags
- `exclude` - Comma-separated tags to exclude
- `status` - `ongoing`, `completed`, `hiatus`, `cancelled`

**Response:**
```json
{
  "data": [
    {
      "id": "mangadex:abc123",
      "title": "One Piece",
      "description": "Adventure manga...",
      "cover": "https://...",
      "author": "Oda Eiichiro",
      "artist": "Oda Eiichiro",
      "status": "ongoing",
      "isHentai": false,
      "tags": ["action", "adventure"],
      "views": 1234567,
      "rating": 8.5,
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 50
}
```

#### Get Popular Manga
```http
GET /api/manga/popular?adult=false&page=1
```

#### Get Latest Updates
```http
GET /api/manga/latest?adult=false&page=1
```

#### Get Newly Added Manga
```http
GET /api/manga/new?adult=false&page=1
```

#### Get Top Rated Manga
```http
GET /api/manga/top-rated?adult=false&page=1
```

#### Get Manga Details
```http
GET /api/manga/:id
```
**Example:** `GET /api/manga/mangadex:1-2-3-4`

**Response:**
```json
{
  "id": "mangadex:abc123",
  "title": "One Piece",
  "altTitles": ["ワンピース"],
  "description": "Adventure manga about pirates...",
  "cover": "https://...",
  "author": "Oda Eiichiro",
  "artist": "Oda Eiichiro",
  "status": "ongoing",
  "isHentai": false,
  "tags": ["action", "adventure", "comedy"],
  "genres": ["shounen"],
  "views": 1234567,
  "rating": 8.5,
  "chapterCount": 1100,
  "createdAt": "2020-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Get Chapters
```http
GET /api/chapters/:mangaId
```
**Example:** `GET /api/chapters/mangadex:1-2-3-4`

**Response:**
```json
{
  "data": [
    {
      "id": "chapter-456",
      "mangaId": "mangadex:abc123",
      "chapterNumber": 1100,
      "title": "The Dawn of the New Era",
      "language": "en",
      "pages": 18,
      "views": 98765,
      "createdAt": "2024-01-15T08:00:00Z",
      "updatedAt": "2024-01-15T08:00:00Z"
    }
  ]
}
```

#### Get Chapter Pages
```http
GET /api/pages/:mangaId/:chapterId
```
**Example:** `GET /api/pages/mangadex:1-2-3-4/chapter-456`

**Response:**
```json
{
  "pages": [
    {
      "url": "/api/proxy/image?url=https://cdn.example.com/page1.jpg",
      "index": 0,
      "width": 1200,
      "height": 1800
    },
    {
      "url": "/api/proxy/image?url=https://cdn.example.com/page2.jpg", 
      "index": 1,
      "width": 1200,
      "height": 1800
    }
  ]
}
```

### Utility APIs

#### Get Available Sources
```http
GET /api/sources?adult=false
```
**Response:**
```json
{
  "sources": [
    {
      "id": "mangadex",
      "name": "MangaDex",
      "baseUrl": "https://mangadx.org",
      "icon": "📚",
      "contentTypes": ["manga"],
      "enabled": true
    }
  ],
  "enabled": ["mangadex", "nhentai"],
  "contentTypes": [
    {"id": "manga", "name": "Manga", "description": "Japanese comics"},
    {"id": "manhwa", "name": "Manhwa", "description": "Korean comics"}
  ]
}
```

#### Toggle Source
```http
POST /api/sources/:id/toggle
Content-Type: application/json

{
  "enabled": true
}
```

#### Get Tags
```http
GET /api/tags?adult=false&sources=mangadex,nhentai
```

#### Image Proxy
```http
GET /api/proxy/image?url=https://example.com/image.jpg
```
- Bypasses hotlink protection
- Adds proper CORS headers
- Supports extension fallback (.webp, .jpg, .png, .gif)
- Includes caching for performance

#### Report Image Error
```http
POST /api/report/image-fail
Content-Type: application/json

{
  "url": "https://cdn.example.com/page1.jpg",
  "mangaId": "mangadex:abc123",
  "chapterId": "chapter-456",
  "page": 1,
  "error": "load_error"
}
```

#### OG Meta Data (for social sharing)
```http
GET /api/og/:mangaId
```
**Response:**
```json
{
  "title": "One Piece - MangaFox",
  "description": "Adventure manga about pirates...",
  "image": "https://...",
  "type": "article"
}
```

### JavaScript/React Usage Examples

#### API Helper Setup
```javascript
// src/lib/api.js
export const API_URL = import.meta.env.VITE_API_URL || '';

export function apiUrl(path) {
  return `${API_URL}${path}`;
}
```

#### Fetching Chapter Pages
```javascript
import { apiUrl } from '../lib/api';

const fetchChapterPages = async (mangaId, chapterId) => {
  try {
    const response = await fetch(apiUrl(`/api/pages/${mangaId}/${chapterId}`));
    const data = await response.json();
    return data.pages || [];
  } catch (error) {
    console.error('Failed to fetch pages:', error);
    return [];
  }
};
```

#### Searching Manga
```javascript
const searchManga = async (query, options = {}) => {
  const params = new URLSearchParams({
    q: query,
    adult: options.includeAdult ? 'true' : 'false',
    page: options.page || '1',
    sort: options.sort || 'popular'
  });

  if (options.sources) {
    params.append('sources', options.sources.join(','));
  }

  const response = await fetch(apiUrl(`/api/manga/search?${params}`));
  const data = await response.json();
  return data.data || [];
};
```

#### Reporting Failed Images
```javascript
const reportImageError = async (url, mangaId, chapterId, pageIndex) => {
  try {
    await fetch(apiUrl('/api/report/image-fail'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        mangaId,
        chapterId,
        page: pageIndex + 1,
        error: 'load_error'
      })
    });
  } catch (error) {
    console.error('Failed to report image error:', error);
  }
};
```

### Error Handling

All APIs return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

Common HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (missing parameters)
- `404` - Not Found (manga/chapter doesn't exist)
- `422` - Unprocessable Entity (invalid image, etc.)
- `500` - Internal Server Error

### Rate Limiting & Caching

- **Bootstrap API**: Uses startup cache for instant responses
- **Popular/Latest**: Cached for 3 minutes
- **Image Proxy**: Cached for 1 hour (500 images max)
- **Search**: No caching (real-time results)

### cURL Examples

#### Get Homepage Data
```bash
curl "https://your-domain.com/api/bootstrap?adult=false"
```

#### Search with Filters
```bash
curl "https://your-domain.com/api/manga/search?q=naruto&adult=false&sort=popular&page=1&tags=action,adventure"
```

#### Get Manga Details
```bash
curl "https://your-domain.com/api/manga/mangadex:abc123"
```

#### Get Chapter Pages
```bash
curl "https://your-domain.com/api/pages/mangadex:abc123/chapter-456"
```

#### Proxy Image
```bash
curl -H "Origin: https://your-domain.com" \
     "https://your-domain.com/api/proxy/image?url=https://cdn.example.com/image.jpg"
```

## 🐛 Troubleshooting

### Images Not Loading
- Check file permissions on `/public/manga/` directory
- Verify Cloudinary credentials if using fallback
- Check browser console for 404 errors

### Upload Fails
- Ensure ZIP file contains only images
- Check file size limits (default: 50MB)
- Verify write permissions on public directory

### MongoDB Connection Issues
- Verify MONGO_URL is correct
- Check network connectivity to MongoDB Atlas
- Ensure database user has proper permissions

### NextAuth Errors
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Clear browser cookies and try again

## 📄 License

MIT License - Feel free to use this project for any purpose.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Built with ❤️ using Next.js, MongoDB, and modern web technologies**
# MangaDex
