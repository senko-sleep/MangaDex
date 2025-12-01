import NodeCache from 'node-cache';
import MangaDexScraper from './mangadex.js';
import NHentaiScraper from './nhentai.js';
import { EHentaiScraper } from './ehentai.js';
import { IMHentaiScraper } from './imhentai.js';

// Cache results for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

// Initialize scrapers - only working ones
const scrapers = {
  // Mainstream manga sources (MangaDex API is reliable)
  mangadex: new MangaDexScraper(),
  // Adult content sources (using direct APIs)
  nhentai: new NHentaiScraper(),
  ehentai: new EHentaiScraper(),
  imhentai: new IMHentaiScraper(),
};

// Source metadata with content types
export const sources = {
  // Mainstream manga sources
  mangadex: {
    id: 'mangadex',
    name: 'MangaDex',
    icon: '🔷',
    isAdult: false,
    enabled: true,
    description: 'Official API, reliable',
    contentTypes: ['manga', 'manhwa', 'manhua', 'oneshot'],
  },
  // Adult content sources
  nhentai: {
    id: 'nhentai',
    name: 'nhentai',
    icon: '🔞',
    isAdult: true,
    enabled: true,
    description: 'Doujinshi library (API)',
    contentTypes: ['doujinshi', 'manga'],
  },
  ehentai: {
    id: 'ehentai',
    name: 'E-Hentai',
    icon: '🐼',
    isAdult: true,
    enabled: true,
    description: 'Largest doujinshi archive',
    contentTypes: ['doujinshi', 'manga', 'artistcg', 'gamecg', 'western', 'imageset', 'cosplay'],
  },
  imhentai: {
    id: 'imhentai',
    name: 'IMHentai',
    icon: '🎨',
    isAdult: true,
    enabled: true,
    description: 'Large adult content library',
    contentTypes: ['doujinshi', 'manga', 'artistcg', 'gamecg', 'western', 'imageset'],
  },
};

// Get all available sources
export function getSources(includeAdult = false) {
  return Object.values(sources).filter(s => includeAdult || !s.isAdult);
}

// Get enabled sources
export function getEnabledSources(includeAdult = false) {
  return Object.values(sources).filter(s => s.enabled && (includeAdult || !s.isAdult));
}

// Toggle source
export function toggleSource(sourceId, enabled) {
  if (sources[sourceId]) {
    sources[sourceId].enabled = enabled;
    return true;
  }
  return false;
}

// Search across sources
export async function search(query, options = {}) {
  const { 
    sourceIds = null, 
    includeAdult = false, 
    adultOnly = false,
    page = 1,
    tags = [],
    excludeTags = [],
  } = options;

  const cacheKey = `search:${query}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds 
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult || adultOnly).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      try {
        const scraper = scrapers[sourceId];
        // Pass tags and adultOnly to scrapers that support native filtering (like MangaDex)
        const data = await scraper.search(query, page, includeAdult || adultOnly, tags, excludeTags, adultOnly);
        return data.map(m => ({ ...m, sourceId }));
      } catch (e) {
        console.error(`[${sourceId}] Search error:`, e.message);
        return [];
      }
    })
  );

  const allResults = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get popular manga
export async function getPopular(options = {}) {
  const { sourceIds = null, includeAdult = false, adultOnly = false, page = 1, tags = [], excludeTags = [] } = options;

  const cacheKey = `popular:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds 
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult || adultOnly).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      try {
        const scraper = scrapers[sourceId];
        // Pass tags and adultOnly to scrapers that support native filtering
        const data = await scraper.getPopular(page, includeAdult || adultOnly, tags, excludeTags, adultOnly);
        return data.map(m => ({ ...m, sourceId }));
      } catch (e) {
        console.error(`[${sourceId}] Popular error:`, e.message);
        return [];
      }
    })
  );

  const allResults = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get latest updates
export async function getLatest(options = {}) {
  const { sourceIds = null, includeAdult = false, page = 1 } = options;

  const cacheKey = `latest:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds 
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      try {
        const scraper = scrapers[sourceId];
        // Pass includeAdult to scrapers that support it
        const data = await scraper.getLatest(page, includeAdult);
        return data.map(m => ({ ...m, sourceId }));
      } catch (e) {
        console.error(`[${sourceId}] Latest error:`, e.message);
        return [];
      }
    })
  );

  const allResults = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get newly added manga
export async function getNewlyAdded(options = {}) {
  const { sourceIds = null, includeAdult = false, page = 1 } = options;

  const cacheKey = `newlyAdded:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds 
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      try {
        const scraper = scrapers[sourceId];
        const data = await scraper.getNewlyAdded(page, includeAdult);
        return data.map(m => ({ ...m, sourceId }));
      } catch (e) {
        console.error(`[${sourceId}] NewlyAdded error:`, e.message);
        return [];
      }
    })
  );

  const allResults = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get top rated manga
export async function getTopRated(options = {}) {
  const { sourceIds = null, includeAdult = false, page = 1 } = options;

  const cacheKey = `topRated:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds 
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      try {
        const scraper = scrapers[sourceId];
        const data = await scraper.getTopRated(page, includeAdult);
        return data.map(m => ({ ...m, sourceId }));
      } catch (e) {
        console.error(`[${sourceId}] TopRated error:`, e.message);
        return [];
      }
    })
  );

  const allResults = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get manga details
export async function getMangaDetails(id) {
  const cacheKey = `manga:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Parse source from ID (format: source:slug)
  const [sourceId] = id.split(':');
  const scraper = scrapers[sourceId];
  
  if (!scraper) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const details = await scraper.getMangaDetails(id);
  if (details) {
    cache.set(cacheKey, details);
  }
  return details;
}

// Get chapters
export async function getChapters(mangaId) {
  const cacheKey = `chapters:${mangaId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [sourceId] = mangaId.split(':');
  const scraper = scrapers[sourceId];
  
  if (!scraper) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const chapters = await scraper.getChapters(mangaId);
  cache.set(cacheKey, chapters);
  return chapters;
}

// Get chapter pages
export async function getChapterPages(chapterId, mangaId) {
  const cacheKey = `pages:${mangaId}:${chapterId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const [sourceId] = mangaId.split(':');
  const scraper = scrapers[sourceId];
  
  if (!scraper) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const pages = await scraper.getChapterPages(chapterId, mangaId);
  cache.set(cacheKey, pages);
  return pages;
}

// Get all tags from all sources (cached for 1 hour)
export async function getAllTags(includeAdult = false) {
  const cacheKey = `tags:${includeAdult}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const allTags = new Set();
  const adultTags = new Set();
  
  for (const [sourceId, scraper] of Object.entries(scrapers)) {
    try {
      const source = sources[sourceId];
      const tags = await scraper.getTags();
      
      if (Array.isArray(tags)) {
        if (source.isAdult) {
          tags.forEach(t => adultTags.add(t));
        } else {
          tags.forEach(t => allTags.add(t));
        }
      }
    } catch (e) {
      console.error(`[${sourceId}] Tags error:`, e.message);
    }
  }

  const result = {
    tags: Array.from(allTags).sort(),
    adultTags: includeAdult ? Array.from(adultTags).sort() : [],
  };

  // Cache for longer (1 hour) since tags don't change often
  cache.set(cacheKey, result, 3600);
  return result;
}

export default {
  sources,
  getSources,
  getEnabledSources,
  toggleSource,
  search,
  getPopular,
  getLatest,
  getNewlyAdded,
  getTopRated,
  getMangaDetails,
  getChapters,
  getChapterPages,
  getAllTags,
};
