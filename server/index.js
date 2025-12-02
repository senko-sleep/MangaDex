import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import scrapers from './scrapers/index.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Simple logger with timestamps and colors
const log = {
  info: (msg, data = {}) => console.log(`\x1b[36m[INFO]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(data).length ? data : ''),
  warn: (msg, data = {}) => console.log(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(data).length ? data : ''),
  error: (msg, data = {}) => console.log(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(data).length ? data : ''),
  debug: (msg, data = {}) => console.log(`\x1b[35m[DEBUG]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(data).length ? data : ''),
  api: (method, path, status, duration, extra = {}) => {
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}[API]\x1b[0m ${new Date().toISOString()} ${method} ${path} ${status} ${duration}ms`, Object.keys(extra).length ? extra : '');
  },
};

// In-memory cache for proxied images
const imageCache = new Map();
const CACHE_MAX_SIZE = 500; // Max cached images (increased for better performance)
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Configure helmet to allow cross-origin image loading
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// Configure CORS to allow all origins for the image proxy
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(express.json());

// Get appropriate referer for image URL
function getRefererForUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('nhentai') || hostname.includes('nhentaimg')) return 'https://nhentai.xxx/';
    if (hostname.includes('e-hentai') || hostname.includes('hath.network')) return 'https://e-hentai.org/';
    if (hostname.includes('imhentai')) return 'https://imhentai.xxx/';
    if (hostname.includes('hitomi')) return 'https://hitomi.la/';
    if (hostname.includes('mangadex')) return 'https://mangadex.org/';
    if (hostname.includes('mangakakalot') || hostname.includes('manganato')) return 'https://manganato.com/';
    if (hostname.includes('mangasee')) return 'https://mangasee123.com/';
    // Default: use the origin of the image URL itself
    return new URL(url).origin + '/';
  } catch {
    return 'https://mangadex.org/';
  }
}

// Image proxy endpoint - bypasses hotlink protection
app.get('/api/proxy/image', async (req, res) => {
  const imageUrl = req.query.url;
  
  if (!imageUrl) {
    log.warn('Image proxy missing URL parameter');
    return res.status(400).send('Missing url parameter');
  }

  // Set CORS headers explicitly for image responses
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');

  try {
    // Check cache first
    const cached = imageCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=86400'); // Browser cache 24h
      res.set('X-Cache', 'HIT');
      return res.send(cached.data);
    }

    // Get the appropriate referer for this image source
    const referer = getRefererForUrl(imageUrl);

    // Fetch with proper headers to bypass hotlink protection
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': referer.replace(/\/$/, ''),
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      // Extract source from URL for better debugging
      const source = new URL(imageUrl).hostname.split('.').slice(-2, -1)[0] || 'unknown';
      log.error('Image proxy fetch failed', { 
        status: response.status, 
        source,
        url: imageUrl.substring(0, 100) 
      });
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
    const source = imageUrl ? new URL(imageUrl).hostname : 'unknown';
    log.error('Image proxy error', { error: e.message, source, url: imageUrl?.substring(0, 100) });
    res.status(500).send('Proxy error');
  }
});

// Get available sources
app.get('/api/sources', (req, res) => {
  const includeAdult = req.query.adult === 'true';
  const allSources = scrapers.getSources(includeAdult);
  
  // Build content types list from sources
  const contentTypeSet = new Set();
  allSources.forEach(s => {
    (s.contentTypes || ['manga']).forEach(t => contentTypeSet.add(t));
  });
  
  const contentTypes = [
    { id: 'manga', name: 'Manga', description: 'Japanese comics' },
    { id: 'manhwa', name: 'Manhwa', description: 'Korean comics' },
    { id: 'manhua', name: 'Manhua', description: 'Chinese comics' },
    { id: 'doujinshi', name: 'Doujinshi', description: 'Fan-made/indie works' },
    { id: 'artistcg', name: 'Artist CG', description: 'Artist illustrations/CG sets' },
    { id: 'gamecg', name: 'Game CG', description: 'Game CG/illustrations' },
    { id: 'western', name: 'Western', description: 'Western comics/art' },
    { id: 'imageset', name: 'Image Set', description: 'Image collections' },
    { id: 'cosplay', name: 'Cosplay', description: 'Cosplay photo sets' },
    { id: 'comic', name: 'Comic', description: 'General comics' },
    { id: 'oneshot', name: 'One-shot', description: 'Single chapter works' },
  ].filter(t => contentTypeSet.has(t.id));
  
  res.json({
    sources: allSources,
    enabled: scrapers.getEnabledSources(includeAdult).map(s => s.id),
    contentTypes,
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
  const startTime = Date.now();
  try {
    const { 
      q = '', 
      sources: sourceIds,
      adult = 'false',
      status,
      sort = 'popular',
      page = '1',
      tags,
      exclude,
    } = req.query;

    // adult=false → safe only, adult=true → all, adult=only → 18+ only
    const isAdultOnly = adult === 'only';
    const includeAdult = adult === 'true' || isAdultOnly;
    
    const options = {
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult,
      adultOnly: isAdultOnly,
      page: parseInt(page, 10),
      tags: tags ? tags.split(',') : [],
      excludeTags: exclude ? exclude.split(',') : [],
    };

    log.debug('Search request', { query: q, sources: sourceIds, adult, status, sort, page });

    let data = q 
      ? await scrapers.search(q, options)
      : await scrapers.getPopular(options);

    // Filter by status if specified
    if (status && status !== 'all') {
      const beforeFilter = data.length;
      data = data.filter(m => {
        const mangaStatus = (m.status || '').toLowerCase();
        return mangaStatus === status.toLowerCase() || 
               mangaStatus.includes(status.toLowerCase());
      });
      log.debug(`Status filter applied`, { status, before: beforeFilter, after: data.length });
    }

    // Sort results
    if (sort === 'latest') {
      data.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    } else if (sort === 'updated') {
      data.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    } else if (sort === 'title') {
      data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const duration = Date.now() - startTime;
    
    if (data.length === 0) {
      log.warn('Search returned no results', { query: q, sources: sourceIds, adult, duration });
    } else {
      log.api('GET', '/api/manga/search', 200, duration, { results: data.length, query: q || '(popular)' });
    }

    res.json({ data, total: data.length });
  } catch (e) {
    const duration = Date.now() - startTime;
    log.error('Search failed', { error: e.message, stack: e.stack, duration });
    res.json({ data: [], total: 0, error: e.message });
  }
});

// Get popular
app.get('/api/manga/popular', async (req, res) => {
  const startTime = Date.now();
  try {
    const { sources: sourceIds, adult = 'false', page = '1', tags, exclude } = req.query;
    const data = await scrapers.getPopular({
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
      tags: tags ? tags.split(',') : [],
      excludeTags: exclude ? exclude.split(',') : [],
    });
    const duration = Date.now() - startTime;
    if (data.length === 0) {
      log.warn('Popular returned no results', { sources: sourceIds, adult, page, duration });
    } else {
      log.api('GET', '/api/manga/popular', 200, duration, { results: data.length });
    }
    res.json({ data });
  } catch (e) {
    log.error('Popular failed', { error: e.message });
    res.json({ data: [], error: e.message });
  }
});

// Get latest
app.get('/api/manga/latest', async (req, res) => {
  const startTime = Date.now();
  try {
    const { sources: sourceIds, adult = 'false', page = '1' } = req.query;
    const data = await scrapers.getLatest({
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
    });
    const duration = Date.now() - startTime;
    if (data.length === 0) {
      log.warn('Latest returned no results', { sources: sourceIds, adult, page, duration });
    } else {
      log.api('GET', '/api/manga/latest', 200, duration, { results: data.length });
    }
    res.json({ data });
  } catch (e) {
    log.error('Latest failed', { error: e.message });
    res.json({ data: [], error: e.message });
  }
});

// Get newly added manga
app.get('/api/manga/new', async (req, res) => {
  const startTime = Date.now();
  try {
    const { sources: sourceIds, adult = 'false', page = '1' } = req.query;
    const data = await scrapers.getNewlyAdded({
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
    });
    const duration = Date.now() - startTime;
    if (data.length === 0) {
      log.warn('NewlyAdded returned no results', { sources: sourceIds, adult, page, duration });
    }
    res.json({ data });
  } catch (e) {
    log.error('NewlyAdded failed', { error: e.message });
    res.json({ data: [], error: e.message });
  }
});

// Get top rated manga
app.get('/api/manga/top-rated', async (req, res) => {
  const startTime = Date.now();
  try {
    const { sources: sourceIds, adult = 'false', page = '1' } = req.query;
    const data = await scrapers.getTopRated({
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
    });
    const duration = Date.now() - startTime;
    if (data.length === 0) {
      log.warn('TopRated returned no results', { sources: sourceIds, adult, page, duration });
    }
    res.json({ data });
  } catch (e) {
    log.error('TopRated failed', { error: e.message });
    res.json({ data: [], error: e.message });
  }
});

// Get manga details
app.get('/api/manga/:id(*)', async (req, res) => {
  const startTime = Date.now();
  const id = req.params.id;
  try {
    const data = await scrapers.getMangaDetails(id);
    const duration = Date.now() - startTime;
    
    if (!data) {
      log.warn('Manga not found', { id, duration });
      return res.status(404).json({ error: 'Not found', id });
    }
    
    log.api('GET', `/api/manga/${id}`, 200, duration, { title: data.title?.substring(0, 30) });
    res.json(data);
  } catch (e) {
    const duration = Date.now() - startTime;
    log.error('Manga details failed', { id, error: e.message, duration });
    res.status(500).json({ error: 'Failed to fetch manga', id, details: e.message });
  }
});

// Get chapters
app.get('/api/chapters/:mangaId(*)', async (req, res) => {
  const startTime = Date.now();
  const mangaId = req.params.mangaId;
  try {
    const data = await scrapers.getChapters(mangaId);
    const duration = Date.now() - startTime;
    
    if (!data || data.length === 0) {
      log.warn('No chapters found', { mangaId, duration });
    } else {
      log.api('GET', `/api/chapters/${mangaId}`, 200, duration, { chapters: data.length });
    }
    res.json({ data });
  } catch (e) {
    log.error('Chapters failed', { mangaId, error: e.message });
    res.json({ data: [], error: e.message });
  }
});

// Get chapter pages
app.get('/api/pages/:mangaId(*)/:chapterId', async (req, res) => {
  const startTime = Date.now();
  const { mangaId, chapterId } = req.params;
  try {
    const pages = await scrapers.getChapterPages(chapterId, mangaId);
    const duration = Date.now() - startTime;
    
    if (!pages || pages.length === 0) {
      log.warn('No pages found', { mangaId, chapterId, duration });
    } else {
      log.api('GET', `/api/pages/${mangaId}/${chapterId}`, 200, duration, { pages: pages.length });
    }
    res.json({ pages });
  } catch (e) {
    log.error('Pages failed', { mangaId, chapterId, error: e.message });
    res.json({ pages: [], error: e.message });
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

app.listen(PORT, () => {
  log.info(`API server started`, { port: PORT, url: `http://localhost:${PORT}` });
  log.info('Available sources:', Object.keys(scrapers.sources || {}).join(', '));
});
