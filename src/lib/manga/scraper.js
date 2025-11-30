/**
 * Manga Scraper & Update System
 * Automatically fetches and updates manga from all sources
 */

import { createLogger } from '@/lib/logger';
import * as sources from './sources/index';
import * as db from './database';
import * as imageCache from './imageCache';

const log = createLogger('SCRAPER');

// Scraper state
let isRunning = false;
let lastRun = null;
let scrapeStats = {
  totalScraped: 0,
  newManga: 0,
  updatedManga: 0,
  newChapters: 0,
  errors: 0
};

/**
 * Initialize scraper
 */
export async function initialize() {
  log.info('Initializing scraper...');
  await sources.initializeSources();
  log.info('Scraper initialized');
}

/**
 * Run full scrape of all sources
 */
export async function runFullScrape(options = {}) {
  if (isRunning) {
    log.warn('Scrape already in progress');
    return { error: 'Scrape already running' };
  }
  
  const { 
    includeAdult = true,
    limit = 100,
    updateChapters = true
  } = options;
  
  isRunning = true;
  lastRun = new Date();
  scrapeStats = { totalScraped: 0, newManga: 0, updatedManga: 0, newChapters: 0, errors: 0 };
  
  log.info('Starting full scrape...', { includeAdult, limit });
  
  try {
    // Get popular manga from all sources
    const popularManga = await sources.getPopularManga({ limit, includeAdult });
    log.info(`Found ${popularManga.length} popular manga`);
    
    for (const manga of popularManga) {
      await processManga(manga, updateChapters);
    }
    
    // Get latest updates
    const latestManga = await sources.getLatestUpdates({ limit, includeAdult });
    log.info(`Found ${latestManga.length} latest updates`);
    
    for (const manga of latestManga) {
      await processManga(manga, updateChapters);
    }
    
    db.updateScrapeTime();
    
    log.info('Full scrape completed', scrapeStats);
    return { success: true, stats: scrapeStats };
  } catch (error) {
    log.error('Scrape failed', null, error);
    return { error: error.message, stats: scrapeStats };
  } finally {
    isRunning = false;
  }
}

/**
 * Scrape specific manga by search
 */
export async function scrapeMangaBySearch(query, options = {}) {
  const { limit = 24, includeAdult = true, updateChapters = true } = options;
  
  log.info(`Scraping manga matching: ${query}`);
  
  try {
    const results = await sources.searchAllSources(query, { limit, includeAdult });
    
    const processed = [];
    for (const manga of results) {
      const saved = await processManga(manga, updateChapters);
      if (saved) processed.push(saved);
    }
    
    log.info(`Scraped ${processed.length} manga for query: ${query}`);
    return processed;
  } catch (error) {
    log.error(`Search scrape failed for: ${query}`, null, error);
    return [];
  }
}

/**
 * Update existing manga
 */
export async function updateExistingManga(options = {}) {
  const { limit = 50, olderThan = 24 * 60 * 60 * 1000 } = options; // Default: 24 hours
  
  const allIds = db.getAllMangaIds();
  const cutoff = Date.now() - olderThan;
  
  const toUpdate = allIds
    .map(id => db.getManga(id))
    .filter(manga => {
      const updatedAt = new Date(manga.updatedAt || 0).getTime();
      return updatedAt < cutoff;
    })
    .slice(0, limit);
  
  log.info(`Updating ${toUpdate.length} manga...`);
  
  let updated = 0;
  for (const manga of toUpdate) {
    try {
      await updateMangaFromSource(manga);
      updated++;
    } catch (error) {
      log.warn(`Failed to update ${manga.id}: ${error.message}`);
    }
  }
  
  log.info(`Updated ${updated} manga`);
  return { updated };
}

/**
 * Process a single manga
 */
async function processManga(manga, updateChapters = true) {
  try {
    scrapeStats.totalScraped++;
    
    const existing = db.getManga(manga.id);
    const isNew = !existing;
    
    // Save manga
    const saved = db.saveManga(manga);
    
    if (isNew) {
      scrapeStats.newManga++;
      log.scrape(manga.sourceId || 'unknown', `New manga: ${manga.title}`);
    } else {
      scrapeStats.updatedManga++;
    }
    
    // Fetch and save chapters if requested
    if (updateChapters) {
      await updateMangaChapters(manga);
    }
    
    return saved;
  } catch (error) {
    scrapeStats.errors++;
    log.warn(`Failed to process manga ${manga.id}: ${error.message}`);
    return null;
  }
}

/**
 * Update manga chapters from source
 */
async function updateMangaChapters(manga) {
  try {
    const chapters = await sources.getChaptersFromAllSources(
      manga.id,
      manga.title,
      { includeAdult: manga.adult }
    );
    
    if (chapters.length > 0) {
      const existingChapters = db.getChapters(manga.id);
      const existingNums = new Set(existingChapters.map(ch => ch.chapter));
      
      const newChapters = chapters.filter(ch => !existingNums.has(ch.chapter));
      
      if (newChapters.length > 0) {
        db.saveChapters(manga.id, chapters);
        scrapeStats.newChapters += newChapters.length;
        log.scrape(manga.sourceId || 'unknown', `${newChapters.length} new chapters for ${manga.title}`);
      }
    }
  } catch (error) {
    log.warn(`Failed to update chapters for ${manga.id}: ${error.message}`);
  }
}

/**
 * Update manga from its original source
 */
async function updateMangaFromSource(manga) {
  if (!manga.sourceId) {
    throw new Error('No source ID');
  }
  
  try {
    const details = await sources.getMangaDetails(manga.id, manga.sourceId);
    db.saveManga({ ...manga, ...details });
    await updateMangaChapters(details);
  } catch (error) {
    throw error;
  }
}

/**
 * Pre-cache images for a chapter
 */
export async function cacheChapterImages(mangaId, chapterId, sourceId) {
  try {
    const pages = await sources.getChapterPages(chapterId, sourceId);
    
    log.info(`Caching ${pages.length} images for chapter ${chapterId}`);
    
    const results = await imageCache.downloadChapter(mangaId, chapterId, pages);
    
    // Save image references
    for (const page of pages) {
      db.saveImageRef(mangaId, chapterId, page.index, {
        url: page.url,
        cached: imageCache.isImageCached(mangaId, chapterId, page.index)
      });
    }
    
    log.info(`Cached chapter ${chapterId}:`, results);
    return results;
  } catch (error) {
    log.error(`Failed to cache chapter ${chapterId}`, null, error);
    throw error;
  }
}

/**
 * Get scraper status
 */
export function getStatus() {
  return {
    isRunning,
    lastRun: lastRun?.toISOString() || null,
    stats: scrapeStats,
    sources: sources.getSourceStatus()
  };
}

/**
 * Schedule periodic scraping
 */
let scrapeInterval = null;

export function startPeriodicScrape(intervalMs = 30 * 60 * 1000) { // Default: 30 minutes
  if (scrapeInterval) {
    clearInterval(scrapeInterval);
  }
  
  log.info(`Starting periodic scrape every ${intervalMs / 1000}s`);
  
  scrapeInterval = setInterval(async () => {
    if (!isRunning) {
      await runFullScrape({ limit: 50 });
    }
  }, intervalMs);
  
  // Run immediately
  if (!isRunning) {
    runFullScrape({ limit: 50 });
  }
}

export function stopPeriodicScrape() {
  if (scrapeInterval) {
    clearInterval(scrapeInterval);
    scrapeInterval = null;
    log.info('Stopped periodic scraping');
  }
}

export default {
  initialize,
  runFullScrape,
  scrapeMangaBySearch,
  updateExistingManga,
  cacheChapterImages,
  getStatus,
  startPeriodicScrape,
  stopPeriodicScrape
};
