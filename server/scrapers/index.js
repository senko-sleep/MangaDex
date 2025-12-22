import NodeCache from 'node-cache';
import MangaDexScraper from './mangadex.js';
import { KitsuScraper } from './kitsu.js';
import NHentaiScraper from './nhentai.js';
import { EHentaiScraper } from './ehentai.js';
import { IMHentaiScraper } from './imhentai.js';
import { BatoScraper } from './bato.js';

// Fast cache - 5 min for results, check every 60s for cleanup
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

// Request timeout - fail fast
const REQUEST_TIMEOUT = 8000;

// Wrap scraper call with timeout
const withTimeout = (promise, ms = REQUEST_TIMEOUT) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

// Get appropriate timeout for source
const getTimeoutForSource = (sourceId) => {
  return REQUEST_TIMEOUT;
};

// Deduplicate results by ID to prevent React key warnings
const dedupeResults = (results) => {
  const seen = new Set();
  return results.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

// Initialize scrapers - only working ones
const scrapers = {
  // Mainstream manga sources
  mangadex: new MangaDexScraper(),
  kitsu: new KitsuScraper(),
  // mangaupdates: new MangaUpdatesScraper(), // Removed - slow
  // Adult content sources (using direct APIs)
  nhentai: new NHentaiScraper(),
  ehentai: new EHentaiScraper(),
  imhentai: new IMHentaiScraper(),
  bato: new BatoScraper(),
};

// Source metadata with content types and supported filters
export const sources = {
  // Mainstream manga sources
  mangadex: {
    id: 'mangadex',
    name: 'MangaDex',
    icon: '🔷',
    isAdult: null,
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
  // mangaupdates removed - slow API
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
  bato: {
    id: 'bato',
    name: 'Bato.to',
    icon: '📚',
    isAdult: false,
    enabled: true,
    description: 'Manga reader with multiple sources',
    contentTypes: ['manga', 'manhwa', 'manhua', 'webtoon'],
    filters: {
      tags: true,
      status: true,
      language: true,
      languages: ['all', 'english', 'japanese', 'korean', 'chinese'],
      sort: ['popular', 'latest', 'updated', 'rating'],
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

// Parse smart search query for tags, artists, etc.
// Supports: artist:name, tag:name, parody:name, group:name, language:lang, -tag:name (exclude)
const parseSmartQuery = (query) => {
  const result = {
    cleanQuery: '',
    artist: null,
    group: null,
    parody: null,
    language: null,
    tags: [],
    excludeTags: [],
  };

  if (!query) return result;

  // Match patterns like artist:name, tag:name, -tag:name, etc.
  // Supports quoted values: artist:"name with spaces"
  const patterns = [
    { regex: /artist:(?:"([^"]+)"|(\S+))/gi, field: 'artist' },
    { regex: /circle:(?:"([^"]+)"|(\S+))/gi, field: 'group' },
    { regex: /group:(?:"([^"]+)"|(\S+))/gi, field: 'group' },
    { regex: /parody:(?:"([^"]+)"|(\S+))/gi, field: 'parody' },
    { regex: /series:(?:"([^"]+)"|(\S+))/gi, field: 'parody' },
    { regex: /language:(?:"([^"]+)"|(\S+))/gi, field: 'language' },
    { regex: /lang:(?:"([^"]+)"|(\S+))/gi, field: 'language' },
    { regex: /-tag:(?:"([^"]+)"|(\S+))/gi, field: 'excludeTag' },
    { regex: /tag:(?:"([^"]+)"|(\S+))/gi, field: 'tag' },
    { regex: /character:(?:"([^"]+)"|(\S+))/gi, field: 'tag' },
    { regex: /female:(?:"([^"]+)"|(\S+))/gi, field: 'tag', prefix: 'female:' },
    { regex: /male:(?:"([^"]+)"|(\S+))/gi, field: 'tag', prefix: 'male:' },
  ];

  let cleanQuery = query;

  for (const { regex, field, prefix = '' } of patterns) {
    let match;
    while ((match = regex.exec(query)) !== null) {
      const value = (match[1] || match[2]).trim();
      cleanQuery = cleanQuery.replace(match[0], '').trim();

      if (field === 'tag') {
        result.tags.push(prefix + value);
      } else if (field === 'excludeTag') {
        result.excludeTags.push(value);
      } else if (field === 'artist' || field === 'group' || field === 'parody' || field === 'language') {
        result[field] = value;
      }
    }
  }

  // Clean up extra spaces
  result.cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

  return result;
};

// Search across sources - optimized with timeouts
export async function search(query, options = {}) {
  const {
    sourceIds = null,
    includeAdult = false,
    adultOnly = false,
    page = 1,
    tags = [],
    excludeTags = [],
    status = null,
    sort = 'popular',
  } = options;

  // Parse smart query for artist, tags, etc.
  const parsed = parseSmartQuery(query);
  const effectiveTags = [...tags, ...parsed.tags];
  const effectiveExcludeTags = [...excludeTags, ...parsed.excludeTags];

  // Add artist/group/parody as tags for sources that support them
  if (parsed.artist) effectiveTags.push(`artist:${parsed.artist}`);
  if (parsed.group) effectiveTags.push(`group:${parsed.group}`);
  if (parsed.parody) effectiveTags.push(`parody:${parsed.parody}`);

  const cacheKey = `search:${query}:${page}:${sort}:${adultOnly}:${sourceIds?.join(',') || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult || adultOnly, adultOnly).map(s => s.id);

  // Run all scrapers in parallel with individual timeouts
  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      const scraper = scrapers[sourceId];
      if (!scraper) return [];
      try {
        // Pass parsed query and tags to scraper
        const data = await withTimeout(
          scraper.search(
            parsed.cleanQuery,
            page,
            includeAdult || adultOnly,
            effectiveTags,
            effectiveExcludeTags,
            status,
            adultOnly,
            parsed.language, // Pass language for sources that support it
            sort // Pass sort option to scraper
          ),
          getTimeoutForSource(sourceId)
        );
        return (data || []).map(m => ({ ...m, sourceId }));
      } catch (e) {
        // Silent fail - don't log timeouts
        return [];
      }
    })
  );

  const allResults = dedupeResults(
    results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
  );

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get popular manga - optimized
export async function getPopular(options = {}) {
  const { sourceIds = null, includeAdult = false, adultOnly = false, page = 1, sort = 'popular' } = options;

  const cacheKey = `popular:${page}:${sort}:${adultOnly}:${sourceIds?.join(',') || 'all'}`;
  console.log(`[Scrapers] getPopular cacheKey: ${cacheKey}, targetSources will be:`, sourceIds || 'all enabled');
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[Scrapers] Cache hit for ${cacheKey}: ${cached.length} results`);
    return cached;
  }
  console.log(`[Scrapers] Cache miss for ${cacheKey}, fetching...`);

  const targetSources = sourceIds
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult || adultOnly, adultOnly).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      const scraper = scrapers[sourceId];
      if (!scraper) {
        console.log(`[Scrapers] No scraper found for: ${sourceId}`);
        return [];
      }
      try {
        // Pass options object to scraper for proper sort handling
        const scraperOptions = { page, sort, includeAdult: includeAdult || adultOnly, adultOnly };
        console.log(`[Scrapers] Calling getPopular for ${sourceId}`, scraperOptions);
        const data = await withTimeout(scraper.getPopular(scraperOptions), getTimeoutForSource(sourceId));
        // Handle both array and object responses
        const results = Array.isArray(data) ? data : (data?.results || []);
        console.log(`[Scrapers] ${sourceId} returned ${results.length} results`);
        return results.map(m => ({ ...m, sourceId }));
      } catch (e) {
        console.error(`[Scrapers] ${sourceId} getPopular error:`, e.message);
        return [];
      }
    })
  );

  const allResults = dedupeResults(
    results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
  );

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get latest updates - optimized
export async function getLatest(options = {}) {
  const { sourceIds = null, includeAdult = false, adultOnly = false, page = 1 } = options;

  const cacheKey = `latest:${page}:${adultOnly}:${sourceIds?.join(',') || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult || adultOnly, adultOnly).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      const scraper = scrapers[sourceId];
      if (!scraper) return [];
      try {
        // Pass options object to scraper for proper handling
        const scraperOptions = { page, sort: 'latest', includeAdult: includeAdult || adultOnly, adultOnly };
        const data = await withTimeout(scraper.getLatest(scraperOptions), getTimeoutForSource(sourceId));
        // Handle both array and object responses
        const results = Array.isArray(data) ? data : (data?.results || []);
        return results.map(m => ({ ...m, sourceId }));
      } catch (e) {
        return [];
      }
    })
  );

  const allResults = dedupeResults(
    results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
  );

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get newly added manga
export async function getNewlyAdded(options = {}) {
  const { sourceIds = null, includeAdult = false, adultOnly = false, page = 1 } = options;

  const cacheKey = `newlyAdded:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult || adultOnly, adultOnly).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      try {
        const scraper = scrapers[sourceId];
        const data = await scraper.getNewlyAdded(page, includeAdult || adultOnly, adultOnly);
        return data.map(m => ({ ...m, sourceId }));
      } catch (e) {
        console.error(`[${sourceId}] NewlyAdded error:`, e.message);
        return [];
      }
    })
  );

  const allResults = dedupeResults(
    results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
  );

  cache.set(cacheKey, allResults);
  return allResults;
}

// Get top rated manga
export async function getTopRated(options = {}) {
  const { sourceIds = null, includeAdult = false, adultOnly = false, page = 1 } = options;

  const cacheKey = `topRated:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const targetSources = sourceIds
    ? sourceIds.filter(id => scrapers[id])
    : getEnabledSources(includeAdult || adultOnly, adultOnly).map(s => s.id);

  const results = await Promise.allSettled(
    targetSources.map(async (sourceId) => {
      try {
        const scraper = scrapers[sourceId];
        const data = await scraper.getTopRated(page, includeAdult || adultOnly, adultOnly);
        return data.map(m => ({ ...m, sourceId }));
      } catch (e) {
        console.error(`[${sourceId}] TopRated error:`, e.message);
        return [];
      }
    })
  );

  const allResults = dedupeResults(
    results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
  );

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
