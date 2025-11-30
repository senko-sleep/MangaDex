import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import MangaDexScraper from './scrapers/mangadex.js';
import NodeCache from 'node-cache';

const app = express();

// In-memory cache for proxied images
const imageCache = new Map();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Cache for API results
const cache = new NodeCache({ stdTTL: 300 });

// Initialize scraper
const mangadex = new MangaDexScraper();

app.use(cors({ origin: true }));
app.use(express.json());

// Image proxy endpoint
app.get('/api/proxy/image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Missing url parameter');

  try {
    const cached = imageCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(cached.data);
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://mangadex.org/',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) return res.status(response.status).send('Failed to fetch');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    if (imageCache.size >= CACHE_MAX_SIZE) {
      const oldest = [...imageCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp).slice(0, 20);
      oldest.forEach(([key]) => imageCache.delete(key));
    }
    
    imageCache.set(imageUrl, { data: buffer, contentType, timestamp: Date.now() });
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    res.status(500).send('Proxy error');
  }
});

// Get sources
app.get('/api/sources', (req, res) => {
  res.json({
    sources: [{ id: 'mangadex', name: 'MangaDex', icon: '🔷', isAdult: false, enabled: true }],
    enabled: ['mangadex'],
  });
});

// Get tags
app.get('/api/tags', async (req, res) => {
  const cacheKey = 'tags';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const tags = await mangadex.getTags();
  const result = { tags, adultTags: [] };
  cache.set(cacheKey, result, 3600);
  res.json(result);
});

// Search manga
app.get('/api/manga/search', async (req, res) => {
  try {
    const { q = '', adult = 'false', page = '1', tags, exclude } = req.query;
    const data = await mangadex.search(
      q, 
      parseInt(page), 
      adult === 'true',
      tags ? tags.split(',') : [],
      exclude ? exclude.split(',') : []
    );
    res.json({ data, total: data.length });
  } catch (e) {
    res.json({ data: [], total: 0 });
  }
});

// Get popular
app.get('/api/manga/popular', async (req, res) => {
  try {
    const { adult = 'false', page = '1', tags, exclude } = req.query;
    const data = await mangadex.getPopular(
      parseInt(page), 
      adult === 'true',
      tags ? tags.split(',') : [],
      exclude ? exclude.split(',') : []
    );
    res.json({ data });
  } catch (e) {
    res.json({ data: [] });
  }
});

// Get manga details
app.get('/api/manga/:id(*)', async (req, res) => {
  try {
    const data = await mangadex.getMangaDetails(req.params.id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// Get chapters
app.get('/api/chapters/:mangaId(*)', async (req, res) => {
  try {
    const data = await mangadex.getChapters(req.params.mangaId);
    res.json({ data });
  } catch (e) {
    res.json({ data: [] });
  }
});

// Get chapter pages
app.get('/api/pages/:mangaId(*)/:chapterId', async (req, res) => {
  try {
    const pages = await mangadex.getChapterPages(req.params.chapterId, req.params.mangaId);
    res.json({ pages });
  } catch (e) {
    res.json({ pages: [] });
  }
});

// Export the Express app as a Firebase Function
export const api = onRequest({ 
  cors: true,
  memory: '512MiB',
  timeoutSeconds: 60,
}, app);
