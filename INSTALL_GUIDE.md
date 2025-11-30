# Installation & Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- **Backend**: express, axios, cheerio, nhentai-api, compression, helmet
- **Frontend**: react, swiper, react-photo-view, react-zoom-pan-pinch
- **Manga APIs**: mangadex-full-api, nhentai-api

### 2. Start Development Server

```bash
npm run dev
```

This starts both the client (Vite) and server (Express) concurrently.

### 3. Access the Application

- **Frontend**: http://localhost:5173 (Vite default)
- **Backend API**: http://localhost:3002

## Available Sources

### Regular Manga (SFW)
✅ **MangaDex** - Enabled by default
✅ **MangaSee** - Enabled by default  
✅ **Manganato** - Enabled by default
❌ **MangaKakalot** - Disabled (often blocked)

### Adult Content (NSFW)
❌ **NHentai** - Disabled by default

## Enabling Adult Content

### Method 1: Via API
```bash
curl -X POST http://localhost:3002/api/sources/nhentai/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### Method 2: In Code
Edit `server/scrapers/index.js`:
```javascript
nhentai: {
  id: 'nhentai',
  name: 'NHentai',
  icon: '🔞',
  isAdult: true,
  enabled: true,  // Change to true
  description: 'Adult doujinshi',
},
```

## Testing the API

### Search Manga
```bash
# Regular search
curl "http://localhost:3002/api/manga/search?q=naruto"

# Search with adult content
curl "http://localhost:3002/api/manga/search?q=query&adult=true"

# Search specific sources
curl "http://localhost:3002/api/manga/search?q=naruto&sources=mangadex,mangasee"
```

### Get Popular Manga
```bash
curl "http://localhost:3002/api/manga/popular?page=1"
```

### Get Latest Updates
```bash
curl "http://localhost:3002/api/manga/latest?page=1"
```

### Get Manga Details
```bash
curl "http://localhost:3002/api/manga/mangadex:MANGA_ID"
```

### Get Chapters
```bash
curl "http://localhost:3002/api/chapters/mangadex:MANGA_ID"
```

### Get Chapter Pages
```bash
curl "http://localhost:3002/api/pages/mangadex:MANGA_ID/CHAPTER_ID"
```

## Image Viewer Components

### Swiper (Recommended for Chapter Reading)
```jsx
import { Swiper, SwiperSlide } from 'swiper';
import 'swiper/css';

<Swiper spaceBetween={0} slidesPerView={1}>
  {pages.map(page => (
    <SwiperSlide key={page.page}>
      <img src={page.url} alt={`Page ${page.page}`} />
    </SwiperSlide>
  ))}
</Swiper>
```

### PhotoView (Lightbox Style)
```jsx
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

<PhotoProvider>
  {pages.map(page => (
    <PhotoView key={page.page} src={page.url}>
      <img src={page.url} alt={`Page ${page.page}`} />
    </PhotoView>
  ))}
</PhotoProvider>
```

### React Zoom Pan Pinch (Advanced Controls)
```jsx
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

<TransformWrapper>
  <TransformComponent>
    <img src={page.url} alt={`Page ${page.page}`} />
  </TransformComponent>
</TransformWrapper>
```

## Troubleshooting

### MangaSee 404 Errors
✅ **Fixed!** The scraper now uses the correct endpoints.

### NHentai Not Working
- Check if the source is enabled
- Verify adult content is enabled in requests (`adult=true`)
- The scraper will automatically fallback to web scraping if API fails

### CORS Issues
The server has CORS enabled for all origins. If you still face issues:
```javascript
// server/index.js
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Image Loading Issues
Some sources require specific headers. The scrapers handle this automatically with:
- User-Agent spoofing
- Referer headers
- Accept headers

## Production Deployment

### Build Frontend
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Environment Variables
Create a `.env` file:
```env
PORT=3002
NODE_ENV=production
```

## Security Notes

1. **Helmet** is enabled for security headers
2. **Compression** is enabled for response optimization
3. Adult content requires explicit opt-in
4. All scrapers respect rate limits and timeouts

## Performance Tips

1. Results are cached for 5 minutes
2. Use pagination to avoid loading too much data
3. Enable compression for faster responses
4. Consider using a CDN for images in production

## Additional Resources

- [MangaDex API Docs](https://api.mangadex.org/docs/)
- [NHentai API Docs](https://github.com/NHMoeDev/NHentai-API)
- [Swiper Documentation](https://swiperjs.com/react)
- [React Photo View](https://github.com/MinJieLiu/react-photo-view)
