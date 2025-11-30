/**
 * Universal Manga Source Aggregator
 * Aggregates manga from multiple sources for comprehensive coverage
 */

import { createLogger } from '@/lib/logger';
import MangaDexSource from './mangadex';
import MangaKakalotSource from './mangakakalot';
import MangaSeeSource from './mangasee';
import MangaParkSource from './mangapark';
import NHentaiSource from './nhentai';
import HentaiReadSource from './hentairead';

const log = createLogger('SOURCES');

// All available sources
const SOURCES = {
  mangadex: MangaDexSource,
  mangakakalot: MangaKakalotSource,
  mangasee: MangaSeeSource,
  mangapark: MangaParkSource,
  nhentai: NHentaiSource,
  hentairead: HentaiReadSource,
};

// Source status cache - pre-initialize all sources as available
const sourceStatus = {
  mangadex: { name: 'MangaDex', available: true, lastCheck: Date.now(), adult: false },
  mangakakalot: { name: 'MangaKakalot', available: true, lastCheck: Date.now(), adult: false },
  mangasee: { name: 'MangaSee', available: true, lastCheck: Date.now(), adult: false },
  mangapark: { name: 'MangaPark', available: true, lastCheck: Date.now(), adult: false },
  nhentai: { name: 'nhentai', available: true, lastCheck: Date.now(), adult: true },
  hentairead: { name: 'HentaiRead', available: true, lastCheck: Date.now(), adult: true },
};

let initialized = false;

// Initialize all sources (runs in background)
export async function initializeSources() {
  if (initialized) return sourceStatus;
  initialized = true;
  
  log.info('Initializing sources in background...');
  
  // Don't await - let it run in background
  Promise.allSettled(
    Object.entries(SOURCES).map(async ([name, source]) => {
      try {
        const available = await source.checkConnectivity();
        sourceStatus[name] = {
          name: source.name,
          url: source.baseUrl,
          available,
          lastCheck: Date.now(),
          features: source.features || [],
          adult: source.adult || false
        };
      } catch (error) {
        sourceStatus[name].available = false;
      }
    })
  );
  
  return sourceStatus;
}

// Get all source statuses
export function getSourceStatus() {
  return { ...sourceStatus };
}

// Get available sources - always return all sources
export function getAvailableSources(includeAdult = true) {
  return Object.keys(SOURCES).filter(name => {
    const status = sourceStatus[name];
    return includeAdult || !status?.adult;
  });
}

// Check connectivity for a specific source
export async function checkSourceConnectivity(sourceName) {
  const source = SOURCES[sourceName];
  if (!source) return false;
  
  try {
    const available = await source.checkConnectivity();
    sourceStatus[sourceName] = {
      ...sourceStatus[sourceName],
      available,
      lastCheck: Date.now()
    };
    return available;
  } catch {
    return false;
  }
}

// Search across all sources - fast parallel search
export async function searchAllSources(query, options = {}) {
  const { 
    sources = null,
    includeAdult = true,
    limit = 24,
    timeout = 5000  // Reduced timeout for speed
  } = options;
  
  const targetSources = sources || getAvailableSources(includeAdult);
  
  // Prioritize MangaDex for speed - it's most reliable
  const prioritySources = ['mangadex'];
  const otherSources = targetSources.filter(s => !prioritySources.includes(s));
  
  const allResults = [];
  const seenTitles = new Set();
  
  // First, get results from priority sources (fast)
  const priorityResults = await Promise.race([
    Promise.all(
      prioritySources.map(async (sourceName) => {
        const source = SOURCES[sourceName];
        if (!source) return [];
        try {
          const results = await source.search(query, { limit });
          return results.map(r => ({ ...r, sourceId: sourceName }));
        } catch {
          return [];
        }
      })
    ),
    new Promise(resolve => setTimeout(() => resolve([[]]), 3000)) // 3s max for priority
  ]);
  
  // Add priority results immediately
  for (const results of priorityResults) {
    for (const manga of results) {
      const normalizedTitle = normalizeTitle(manga.title);
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        allResults.push(manga);
      }
    }
  }
  
  // Then search other sources in background (don't wait if we have results)
  if (allResults.length < limit) {
    const otherResults = await Promise.race([
      Promise.allSettled(
        otherSources.slice(0, 3).map(async (sourceName) => { // Limit to 3 other sources
          const source = SOURCES[sourceName];
          if (!source) return [];
          try {
            const results = await source.search(query, { limit: Math.ceil(limit / 2) });
            return results.map(r => ({ ...r, sourceId: sourceName }));
          } catch {
            return [];
          }
        })
      ),
      new Promise(resolve => setTimeout(() => resolve([]), timeout))
    ]);
    
    if (Array.isArray(otherResults)) {
      for (const result of otherResults) {
        const results = result.status === 'fulfilled' ? result.value : [];
        for (const manga of results) {
          const normalizedTitle = normalizeTitle(manga.title);
          if (!seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            allResults.push(manga);
          }
        }
      }
    }
  }
  
  log.info(`Search complete: ${allResults.length} results`);
  return allResults.slice(0, limit);
}

// Get manga details from best source
export async function getMangaDetails(mangaId, sourceId = null) {
  // If source specified, use that
  if (sourceId && SOURCES[sourceId]) {
    try {
      return await SOURCES[sourceId].getMangaDetails(mangaId);
    } catch (error) {
      log.warn(`Failed to get details from ${sourceId}, trying others...`);
    }
  }
  
  // Try all available sources
  for (const [name, source] of Object.entries(SOURCES)) {
    if (sourceStatus[name]?.available) {
      try {
        const details = await source.getMangaDetails(mangaId);
        if (details) {
          log.debug(`Got details for ${mangaId} from ${name}`);
          return { ...details, sourceId: name };
        }
      } catch {
        continue;
      }
    }
  }
  
  throw new Error(`Could not find manga ${mangaId} in any source`);
}

// Get chapters from all sources for a manga
export async function getChaptersFromAllSources(mangaId, title, options = {}) {
  const { includeAdult = true } = options;
  const targetSources = getAvailableSources(includeAdult);
  
  const allChapters = [];
  
  await Promise.allSettled(
    targetSources.map(async (sourceName) => {
      const source = SOURCES[sourceName];
      try {
        // Try by ID first, then by title
        let chapters = await source.getChapters(mangaId).catch(() => null);
        if (!chapters && title) {
          chapters = await source.searchChaptersByTitle(title).catch(() => null);
        }
        
        if (chapters && chapters.length > 0) {
          allChapters.push(...chapters.map(ch => ({ ...ch, sourceId: sourceName })));
          log.scrape(sourceName, `Found ${chapters.length} chapters`);
        }
      } catch {
        // Silently continue
      }
    })
  );
  
  // Deduplicate by chapter number, keep best quality
  const chapterMap = new Map();
  for (const chapter of allChapters) {
    const key = `${chapter.chapter || chapter.number}`;
    const existing = chapterMap.get(key);
    if (!existing || chapter.pages > (existing.pages || 0)) {
      chapterMap.set(key, chapter);
    }
  }
  
  return Array.from(chapterMap.values()).sort((a, b) => {
    const numA = parseFloat(a.chapter || a.number || 0);
    const numB = parseFloat(b.chapter || b.number || 0);
    return numA - numB;
  });
}

// Get chapter pages from source
export async function getChapterPages(chapterId, sourceId) {
  const source = SOURCES[sourceId];
  if (!source) {
    throw new Error(`Unknown source: ${sourceId}`);
  }
  
  try {
    const pages = await source.getChapterPages(chapterId);
    log.debug(`Got ${pages.length} pages for chapter ${chapterId} from ${sourceId}`);
    return pages;
  } catch (error) {
    log.error(`Failed to get pages from ${sourceId}`, { chapterId }, error);
    throw error;
  }
}

// Normalize title for comparison
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Get popular manga - fast, prioritize MangaDex
export async function getPopularManga(options = {}) {
  const { limit = 24, includeAdult = true } = options;
  
  // Get from MangaDex first (fastest and most reliable)
  try {
    const mangadex = SOURCES.mangadex;
    const results = await Promise.race([
      mangadex.getPopular({ limit }),
      new Promise(resolve => setTimeout(() => resolve([]), 3000))
    ]);
    
    if (results && results.length > 0) {
      return results.map(m => ({ ...m, sourceId: 'mangadex' }));
    }
  } catch (e) {
    log.warn('MangaDex popular failed, trying others');
  }
  
  // Fallback to other sources
  const otherSources = ['mangakakalot', 'mangasee'].filter(s => 
    includeAdult || !sourceStatus[s]?.adult
  );
  
  const results = await Promise.race([
    Promise.allSettled(
      otherSources.map(async (sourceName) => {
        const source = SOURCES[sourceName];
        try {
          const popular = await source.getPopular?.({ limit });
          return popular?.map(m => ({ ...m, sourceId: sourceName })) || [];
        } catch {
          return [];
        }
      })
    ),
    new Promise(resolve => setTimeout(() => resolve([]), 5000))
  ]);
  
  const allResults = Array.isArray(results) 
    ? results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
    : [];
  
  return allResults.slice(0, limit);
}

// Get latest updates from all sources
export async function getLatestUpdates(options = {}) {
  const { limit = 24, includeAdult = true } = options;
  const targetSources = getAvailableSources(includeAdult);
  
  const results = await Promise.allSettled(
    targetSources.map(async (sourceName) => {
      const source = SOURCES[sourceName];
      try {
        const latest = await source.getLatest?.({ limit: Math.ceil(limit / targetSources.length) });
        return latest?.map(m => ({ ...m, sourceId: sourceName })) || [];
      } catch {
        return [];
      }
    })
  );
  
  const allResults = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
  
  // Sort by update time
  return allResults
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, limit);
}

export default {
  initializeSources,
  getSourceStatus,
  getAvailableSources,
  checkSourceConnectivity,
  searchAllSources,
  getMangaDetails,
  getChaptersFromAllSources,
  getChapterPages,
  getPopularManga,
  getLatestUpdates,
  SOURCES
};
