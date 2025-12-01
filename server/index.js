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
    if (hostname.includes('nhentai')) return 'https://nhentai.net/';
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

    console.log(`[Search] Options:`, { query: q, adult, isAdultOnly, status, sort, page });

    let data = q 
      ? await scrapers.search(q, options)
      : await scrapers.getPopular(options);

    console.log(`[Search] Got ${data.length} results from scrapers`);

    // Filter by status if specified
    if (status && status !== 'all') {
      data = data.filter(m => {
        const mangaStatus = (m.status || '').toLowerCase();
        return mangaStatus === status.toLowerCase() || 
               mangaStatus.includes(status.toLowerCase());
      });
      console.log(`[Search] Status filter (${status}): ${data.length} results`);
    }

    // Sort results
    if (sort === 'latest') {
      data.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    } else if (sort === 'updated') {
      data.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    } else if (sort === 'title') {
      data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    // 'popular' is default from scrapers

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

// Get newly added manga
app.get('/api/manga/new', async (req, res) => {
  try {
    const { sources: sourceIds, adult = 'false', page = '1' } = req.query;
    const data = await scrapers.getNewlyAdded({
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
    });
    res.json({ data });
  } catch (e) {
    console.error('NewlyAdded error:', e);
    res.json({ data: [] });
  }
});

// Get top rated manga
app.get('/api/manga/top-rated', async (req, res) => {
  try {
    const { sources: sourceIds, adult = 'false', page = '1' } = req.query;
    const data = await scrapers.getTopRated({
      sourceIds: sourceIds ? sourceIds.split(',') : null,
      includeAdult: adult === 'true',
      page: parseInt(page, 10),
    });
    res.json({ data });
  } catch (e) {
    console.error('TopRated error:', e);
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
