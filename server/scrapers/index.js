import NodeCache from 'node-cache';
import MangaDexScraper from './mangadex.js';
import { KitsuScraper } from './kitsu.js';
import { MangaUpdatesScraper } from './mangaupdates.js';
import NHentaiScraper from './nhentai.js';
import { EHentaiScraper } from './ehentai.js';
import { IMHentaiScraper } from './imhentai.js';

// Cache results for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

// Initialize scrapers - only working ones
const scrapers = {
  // Mainstream manga sources
  mangadex: new MangaDexScraper(),
  kitsu: new KitsuScraper(),
  mangaupdates: new MangaUpdatesScraper(),
  // Adult content sources (using direct APIs)
  nhentai: new NHentaiScraper(),
  ehentai: new EHentaiScraper(),
  imhentai: new IMHentaiScraper(),
};

// Source metadata with content types and supported filters
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
    filters: {
      tags: true,
      status: true,
      sort: ['popular', 'latest', 'updated', 'rating'],
    },
  },
  kitsu: {
    id: 'kitsu',
    name: 'Kitsu',
    icon: '🦊',
    isAdult: false,
    enabled: true,
    description: 'Anime/Manga database',
    contentTypes: ['manga', 'manhwa', 'manhua'],
    filters: {
      tags: true,
      status: true,
      sort: ['popular', 'latest', 'rating'],
    },
  },
  mangaupdates: {
    id: 'mangaupdates',
    name: 'MangaUpdates',
    icon: '📚',
    isAdult: null,  // Has both SFW and NSFW content - show in both modes
    enabled: true,
    description: 'Comprehensive manga database',
    contentTypes: ['manga', 'manhwa', 'manhua', 'doujinshi'],
    filters: {
      tags: true,
      status: true,
      sort: ['popular', 'latest'],
    },
  },
  // Adult content sources
  nhentai: {
    id: 'nhentai',
    name: 'nhentai',
    icon: '🔞',
    isAdult: true,
    enabled: true,
    description: 'Doujinshi library',
    contentTypes: ['doujinshi', 'manga'],
    filters: {
      tags: true,
      status: false,
      language: true,  // Supports language filter (english, japanese, chinese)
      languages: ['all', 'english', 'japanese', 'chinese'],
      sort: ['popular', 'latest'],
    },
  },
  ehentai: {
    id: 'ehentai',
    name: 'E-Hentai',
    icon: '🐼',
    isAdult: true,
    enabled: true,
    description: 'Largest doujinshi archive',
    contentTypes: ['doujinshi', 'manga', 'artistcg', 'gamecg', 'western', 'imageset', 'cosplay'],
    filters: {
      tags: true,
      status: false,
      language: true,
      languages: ['all', 'english', 'japanese', 'chinese'],
      sort: ['popular'],
    },
  },
  imhentai: {
    id: 'imhentai',
    name: 'IMHentai',
    icon: '🎨',
    isAdult: true,
    enabled: true,
    description: 'Large adult content library',
    contentTypes: ['doujinshi', 'manga', 'artistcg', 'gamecg', 'western', 'imageset'],
    filters: {
      tags: true,
      status: false,
      language: true,
      languages: ['all', 'english', 'japanese', 'chinese'],
      sort: ['popular', 'latest'],
    },
  },
};

// Get all available sources
// includeAdult: show adult sources alongside SFW
// adultOnly: show ONLY adult sources (for 18+ mode)
// isAdult: true = NSFW only, false = SFW only, null = show in both modes
export function getSources(includeAdult = false, adultOnly = false) {
  return Object.values(sources).filter(s => {
    if (s.isAdult === null) return true;  // Show in both modes
    if (adultOnly) return s.isAdult;       // Only show adult sources
    if (includeAdult) return true;         // Show all sources
    return !s.isAdult;                     // Only show SFW sources
  });
}

// Get enabled sources
export function getEnabledSources(includeAdult = false, adultOnly = false) {
  return Object.values(sources).filter(s => {
    if (!s.enabled) return false;
    if (s.isAdult === null) return true;  // Show in both modes
    if (adultOnly) return s.isAdult;
    if (includeAdult) return true;
    return !s.isAdult;
  });
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
    status = null,
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
        // Pass all filter options to scrapers
        const data = await scraper.search(query, page, includeAdult || adultOnly, tags, excludeTags, status);
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
  const { sourceIds = null, includeAdult = false, adultOnly = false, page = 1, tags = [], excludeTags = [], status = null } = options;

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
        // Pass all filter options to scrapers
        const data = await scraper.getPopular(page, includeAdult || adultOnly, tags, excludeTags, status);
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
  const { sourceIds = null, includeAdult = false, page = 1, tags = [], excludeTags = [], status = null } = options;

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
        // Pass all filter options to scrapers
        const data = await scraper.getLatest(page, includeAdult, tags, excludeTags, status);
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

// Get tags for specific sources (cached for 1 hour)
export async function getTagsForSources(sourceIds = null, includeAdult = false) {
  // If no specific sources, get all enabled sources
  const targetSourceIds = sourceIds && sourceIds.length > 0 
    ? sourceIds 
    : getEnabledSources(includeAdult).map(s => s.id);
  
  const cacheKey = `tags:${targetSourceIds.sort().join(',')}:${includeAdult}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const tagsBySource = {};
  const allTagsSet = new Set();
  
  for (const sourceId of targetSourceIds) {
    const scraper = scrapers[sourceId];
    const source = sources[sourceId];
    
    if (!scraper || !source) continue;
    if (!includeAdult && source.isAdult) continue;
    
    try {
      const tags = await scraper.getTags();
      if (Array.isArray(tags)) {
        tagsBySource[sourceId] = tags.sort();
        tags.forEach(t => allTagsSet.add(t));
      }
    } catch (e) {
      console.error(`[${sourceId}] Tags error:`, e.message);
      tagsBySource[sourceId] = [];
    }
  }

  const result = {
    // All unique tags across selected sources
    tags: Array.from(allTagsSet).sort(),
    // Tags organized by source
    bySource: tagsBySource,
    // Total count for UI decisions
    totalCount: allTagsSet.size,
  };

  // Cache for longer (1 hour) since tags don't change often
  cache.set(cacheKey, result, 3600);
  return result;
}

// Legacy function for backward compatibility
export async function getAllTags(includeAdult = false) {
  return getTagsForSources(null, includeAdult);
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
  getTagsForSources,
};
