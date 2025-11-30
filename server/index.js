import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import scrapers from './scrapers/index.js';

const app = express();
const PORT = process.env.PORT || 3002;

// In-memory cache for proxied images
const imageCache = new Map();
const CACHE_MAX_SIZE = 500; // Max cached images (increased for better performance)
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());

// Image proxy endpoint - bypasses hotlink protection
app.get('/api/proxy/image', async (req, res) => {
  const imageUrl = req.query.url;
  
  if (!imageUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    // Check cache first
    const cached = imageCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=86400'); // Browser cache 24h
      res.set('X-Cache', 'HIT');
      return res.send(cached.data);
    }

    // Fetch with proper headers to bypass hotlink protection
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://mangadex.org/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    });

    if (!response.ok) {
      console.error(`[Proxy] Failed to fetch: ${response.status} ${imageUrl}`);
      return res.status(response.status).send('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Cache the image
    if (imageCache.size >= CACHE_MAX_SIZE) {
      // Remove oldest entries
      const oldest = [...imageCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 20);
      oldest.forEach(([key]) => imageCache.delete(key));
    }
    
    imageCache.set(imageUrl, {
      data: buffer,
      contentType,
      timestamp: Date.now(),
    });

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Cache', 'MISS');
    res.send(buffer);
  } catch (e) {
    console.error('[Proxy] Error:', e.message);
    res.status(500).send('Proxy error');
  }
});

// Get available sources
app.get('/api/sources', (req, res) => {
  const includeAdult = req.query.adult === 'true';
  res.json({
    sources: scrapers.getSources(includeAdult),
    enabled: scrapers.getEnabledSources(includeAdult).map(s => s.id),
  });
});

// Toggle source
app.post('/api/sources/:id/toggle', (req, res) => {
  const { enabled } = req.body;
  const success = scrapers.toggleSource(req.params.id, enabled);
  res.json({ success });
});

// Get all tags
app.get('/api/tags', async (req, res) => {
  const includeAdult = req.query.adult === 'true';
  const tags = await scrapers.getAllTags(includeAdult);
  res.json(tags);
});

// Search manga
app.get('/api/manga/search', async (req, res) => {
  try {
    const { 
      q = '', 
      sources: sourceIds,
      adult = 'false',
      page = '1',
      tags,
      exclude,
    } = req.query;

    const options = {
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
      tags: tags ? tags.split(',') : [],
      excludeTags: exclude ? exclude.split(',') : [],
    };

    const data = q 
      ? await scrapers.search(q, options)
      : await scrapers.getPopular(options);

    res.json({ data, total: data.length });
  } catch (e) {
    console.error('Search error:', e);
    res.json({ data: [], total: 0 });
  }
});

// Get popular
app.get('/api/manga/popular', async (req, res) => {
  try {
    const { sources: sourceIds, adult = 'false', page = '1', tags, exclude } = req.query;
    const data = await scrapers.getPopular({
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
      tags: tags ? tags.split(',') : [],
      excludeTags: exclude ? exclude.split(',') : [],
    });
    res.json({ data });
  } catch (e) {
    console.error('Popular error:', e);
    res.json({ data: [] });
  }
});

// Get latest
app.get('/api/manga/latest', async (req, res) => {
  try {
    const { sources: sourceIds, adult = 'false', page = '1' } = req.query;
    const data = await scrapers.getLatest({
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
    });
    res.json({ data });
  } catch (e) {
    console.error('Latest error:', e);
    res.json({ data: [] });
  }
});

// Get manga details
app.get('/api/manga/:id(*)', async (req, res) => {
  try {
    const id = req.params.id;
    const data = await scrapers.getMangaDetails(id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) {
    console.error('Detail error:', e);
    res.status(500).json({ error: 'Failed to fetch manga' });
  }
});

// Get chapters
app.get('/api/chapters/:mangaId(*)', async (req, res) => {
  try {
    const data = await scrapers.getChapters(req.params.mangaId);
    res.json({ data });
  } catch (e) {
    console.error('Chapters error:', e);
    res.json({ data: [] });
  }
});

// Get chapter pages
app.get('/api/pages/:mangaId(*)/:chapterId', async (req, res) => {
  try {
    const { mangaId, chapterId } = req.params;
    const pages = await scrapers.getChapterPages(chapterId, mangaId);
    res.json({ pages });
  } catch (e) {
    console.error('Pages error:', e);
    res.json({ pages: [] });
  }
});

// OG Meta endpoint for Discord/social embeds
app.get('/api/og/:mangaId(*)', async (req, res) => {
  try {
    const manga = await scrapers.getMangaDetails(req.params.mangaId);
    if (!manga) {
      return res.json({
        title: 'MangaFox - Read Manga Online',
        description: 'Read your favorite manga online for free.',
        image: '/og-image.png',
      });
    }
    
    res.json({
      title: `${manga.title} - MangaFox`,
      description: manga.description?.slice(0, 200) || `Read ${manga.title} online for free on MangaFox.`,
      image: manga.cover,
      type: 'article',
    });
  } catch (e) {
    res.json({
      title: 'MangaFox - Read Manga Online',
      description: 'Read your favorite manga online for free.',
      image: '/og-image.png',
    });
  }
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
