/**
 * Local Manga Database
 * Stores manga, chapters, and image references locally
 * Uses file-based storage for portability (no MongoDB required)
 */

import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';

const log = createLogger('DATABASE');
const DATA_DIR = path.join(process.cwd(), 'data', 'manga');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// In-memory cache
let mangaIndex = null;
let statsCache = null;
let lastIndexLoad = 0;
const CACHE_TTL = 60000; // 1 minute

// Ensure directories exist
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    log.info('Created data directory');
  }
}

// Load manga index
function loadIndex() {
  if (mangaIndex && Date.now() - lastIndexLoad < CACHE_TTL) {
    return mangaIndex;
  }
  
  ensureDataDir();
  
  if (fs.existsSync(INDEX_FILE)) {
    try {
      mangaIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
      lastIndexLoad = Date.now();
    } catch (error) {
      log.error('Failed to load index', null, error);
      mangaIndex = { manga: {}, lastUpdated: null };
    }
  } else {
    mangaIndex = { manga: {}, lastUpdated: null };
  }
  
  return mangaIndex;
}

// Save manga index
function saveIndex() {
  ensureDataDir();
  mangaIndex.lastUpdated = new Date().toISOString();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(mangaIndex, null, 2));
  log.db('Index saved');
}

// Load stats
function loadStats() {
  ensureDataDir();
  
  if (fs.existsSync(STATS_FILE)) {
    try {
      statsCache = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    } catch {
      statsCache = createEmptyStats();
    }
  } else {
    statsCache = createEmptyStats();
  }
  
  return statsCache;
}

// Save stats
function saveStats() {
  ensureDataDir();
  statsCache.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATS_FILE, JSON.stringify(statsCache, null, 2));
}

function createEmptyStats() {
  return {
    totalManga: 0,
    totalChapters: 0,
    totalImages: 0,
    totalSize: 0,
    sourceCounts: {},
    lastUpdated: null,
    lastScrape: null
  };
}

// ============ MANGA OPERATIONS ============

/**
 * Save manga to database
 */
export function saveManga(manga) {
  const index = loadIndex();
  
  const existing = index.manga[manga.id];
  const isNew = !existing;
  
  // Merge with existing data
  index.manga[manga.id] = {
    ...existing,
    ...manga,
    localId: manga.id,
    savedAt: existing?.savedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewCount: existing?.viewCount || 0
  };
  
  saveIndex();
  
  // Update stats
  if (isNew) {
    const stats = loadStats();
    stats.totalManga++;
    stats.sourceCounts[manga.sourceId] = (stats.sourceCounts[manga.sourceId] || 0) + 1;
    saveStats();
  }
  
  log.db(`Saved manga: ${manga.title}`, { id: manga.id, isNew });
  return index.manga[manga.id];
}

/**
 * Get manga by ID
 */
export function getManga(mangaId) {
  const index = loadIndex();
  return index.manga[mangaId] || null;
}

/**
 * Search manga in local database
 */
export function searchLocalManga(query, options = {}) {
  const { limit = 24, offset = 0, adult = true } = options;
  const index = loadIndex();
  
  const queryLower = query.toLowerCase();
  const results = Object.values(index.manga)
    .filter(manga => {
      if (!adult && manga.adult) return false;
      
      const titleMatch = manga.title?.toLowerCase().includes(queryLower);
      const altMatch = manga.altTitles?.some(t => t.toLowerCase().includes(queryLower));
      const tagMatch = manga.tags?.some(t => t.toLowerCase().includes(queryLower));
      
      return titleMatch || altMatch || tagMatch;
    })
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  
  return {
    results: results.slice(offset, offset + limit),
    total: results.length,
    hasMore: offset + limit < results.length
  };
}

/**
 * Get popular manga from local database
 */
export function getPopularLocalManga(options = {}) {
  const { limit = 24, adult = true } = options;
  const index = loadIndex();
  
  return Object.values(index.manga)
    .filter(m => adult || !m.adult)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, limit);
}

/**
 * Get latest manga from local database
 */
export function getLatestLocalManga(options = {}) {
  const { limit = 24, adult = true } = options;
  const index = loadIndex();
  
  return Object.values(index.manga)
    .filter(m => adult || !m.adult)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, limit);
}

/**
 * Increment view count
 */
export function incrementViews(mangaId) {
  const index = loadIndex();
  if (index.manga[mangaId]) {
    index.manga[mangaId].viewCount = (index.manga[mangaId].viewCount || 0) + 1;
    saveIndex();
  }
}

/**
 * Delete manga from database
 */
export function deleteManga(mangaId) {
  const index = loadIndex();
  const manga = index.manga[mangaId];
  
  if (manga) {
    delete index.manga[mangaId];
    saveIndex();
    
    // Update stats
    const stats = loadStats();
    stats.totalManga--;
    if (manga.sourceId && stats.sourceCounts[manga.sourceId]) {
      stats.sourceCounts[manga.sourceId]--;
    }
    saveStats();
    
    // Delete associated files
    const mangaDir = path.join(DATA_DIR, mangaId);
    if (fs.existsSync(mangaDir)) {
      fs.rmSync(mangaDir, { recursive: true, force: true });
    }
    
    log.db(`Deleted manga: ${mangaId}`);
    return true;
  }
  
  return false;
}

// ============ CHAPTER OPERATIONS ============

/**
 * Save chapters for a manga
 */
export function saveChapters(mangaId, chapters) {
  const chapterFile = path.join(DATA_DIR, mangaId, 'chapters.json');
  const mangaDir = path.dirname(chapterFile);
  
  if (!fs.existsSync(mangaDir)) {
    fs.mkdirSync(mangaDir, { recursive: true });
  }
  
  // Load existing chapters
  let existing = {};
  if (fs.existsSync(chapterFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(chapterFile, 'utf-8'));
    } catch {}
  }
  
  // Merge chapters
  for (const chapter of chapters) {
    const key = `ch_${chapter.chapter}`;
    existing[key] = {
      ...existing[key],
      ...chapter,
      savedAt: existing[key]?.savedAt || new Date().toISOString()
    };
  }
  
  fs.writeFileSync(chapterFile, JSON.stringify(existing, null, 2));
  
  // Update manga chapter count
  const index = loadIndex();
  if (index.manga[mangaId]) {
    index.manga[mangaId].chapterCount = Object.keys(existing).length;
    index.manga[mangaId].updatedAt = new Date().toISOString();
    saveIndex();
  }
  
  log.db(`Saved ${chapters.length} chapters for ${mangaId}`);
  return Object.values(existing);
}

/**
 * Get chapters for a manga
 */
export function getChapters(mangaId) {
  const chapterFile = path.join(DATA_DIR, mangaId, 'chapters.json');
  
  if (!fs.existsSync(chapterFile)) {
    return [];
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(chapterFile, 'utf-8'));
    return Object.values(data).sort((a, b) => {
      const numA = parseFloat(a.chapter || 0);
      const numB = parseFloat(b.chapter || 0);
      return numA - numB;
    });
  } catch {
    return [];
  }
}

/**
 * Get specific chapter
 */
export function getChapter(mangaId, chapterNum) {
  const chapters = getChapters(mangaId);
  return chapters.find(ch => ch.chapter === chapterNum) || null;
}

// ============ IMAGE OPERATIONS ============

/**
 * Save image reference
 */
export function saveImageRef(mangaId, chapterId, pageIndex, imageData) {
  const imagesFile = path.join(DATA_DIR, mangaId, 'images.json');
  const mangaDir = path.dirname(imagesFile);
  
  if (!fs.existsSync(mangaDir)) {
    fs.mkdirSync(mangaDir, { recursive: true });
  }
  
  let images = {};
  if (fs.existsSync(imagesFile)) {
    try {
      images = JSON.parse(fs.readFileSync(imagesFile, 'utf-8'));
    } catch {}
  }
  
  const key = `${chapterId}_${pageIndex}`;
  images[key] = {
    ...imageData,
    chapterId,
    pageIndex,
    savedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(imagesFile, JSON.stringify(images, null, 2));
  return images[key];
}

/**
 * Get image references for a chapter
 */
export function getChapterImages(mangaId, chapterId) {
  const imagesFile = path.join(DATA_DIR, mangaId, 'images.json');
  
  if (!fs.existsSync(imagesFile)) {
    return [];
  }
  
  try {
    const images = JSON.parse(fs.readFileSync(imagesFile, 'utf-8'));
    return Object.values(images)
      .filter(img => img.chapterId === chapterId)
      .sort((a, b) => a.pageIndex - b.pageIndex);
  } catch {
    return [];
  }
}

// ============ STATS & UTILITIES ============

/**
 * Get database statistics
 */
export function getStats() {
  const stats = loadStats();
  const index = loadIndex();
  
  // Recalculate if needed
  stats.totalManga = Object.keys(index.manga).length;
  
  return stats;
}

/**
 * Update scrape timestamp
 */
export function updateScrapeTime() {
  const stats = loadStats();
  stats.lastScrape = new Date().toISOString();
  saveStats();
}

/**
 * Get all manga IDs
 */
export function getAllMangaIds() {
  const index = loadIndex();
  return Object.keys(index.manga);
}

/**
 * Check if manga exists locally
 */
export function mangaExists(mangaId) {
  const index = loadIndex();
  return !!index.manga[mangaId];
}

/**
 * Clear database cache
 */
export function clearCache() {
  mangaIndex = null;
  statsCache = null;
  lastIndexLoad = 0;
}

/**
 * Export database
 */
export function exportDatabase() {
  const index = loadIndex();
  const stats = loadStats();
  
  return {
    index,
    stats,
    exportedAt: new Date().toISOString()
  };
}

/**
 * Import database
 */
export function importDatabase(data) {
  ensureDataDir();
  
  if (data.index) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(data.index, null, 2));
    mangaIndex = data.index;
  }
  
  if (data.stats) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(data.stats, null, 2));
    statsCache = data.stats;
  }
  
  log.info('Database imported successfully');
}

export default {
  saveManga,
  getManga,
  searchLocalManga,
  getPopularLocalManga,
  getLatestLocalManga,
  incrementViews,
  deleteManga,
  saveChapters,
  getChapters,
  getChapter,
  saveImageRef,
  getChapterImages,
  getStats,
  updateScrapeTime,
  getAllMangaIds,
  mangaExists,
  clearCache,
  exportDatabase,
  importDatabase
};
