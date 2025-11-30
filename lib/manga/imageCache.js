/**
 * Local Image Download & Caching System
 * Downloads manga images locally for offline reading and faster access
 */

import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const CACHE_DIR = path.join(process.cwd(), 'public', 'cache', 'manga');
const MAX_CACHE_SIZE_MB = 5000; // 5GB max cache
const MAX_CACHE_SIZE = MAX_CACHE_SIZE_MB * 1024 * 1024;

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(subPath = '') {
  const fullPath = path.join(CACHE_DIR, subPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

/**
 * Get cache file path for an image
 */
function getCachePath(mangaId, chapterId, pageIndex, extension = 'jpg') {
  return path.join(CACHE_DIR, mangaId, chapterId, `${pageIndex}.${extension}`);
}

/**
 * Check if image is cached locally
 */
export function isImageCached(mangaId, chapterId, pageIndex) {
  const cachePath = getCachePath(mangaId, chapterId, pageIndex);
  return fs.existsSync(cachePath);
}

/**
 * Get cached image URL (returns local path if cached, remote URL otherwise)
 */
export function getCachedImageUrl(mangaId, chapterId, pageIndex, remoteUrl) {
  if (isImageCached(mangaId, chapterId, pageIndex)) {
    return `/cache/manga/${mangaId}/${chapterId}/${pageIndex}.jpg`;
  }
  return remoteUrl;
}

/**
 * Download and cache a single image
 */
export async function downloadImage(mangaId, chapterId, pageIndex, imageUrl) {
  const cacheDir = ensureCacheDir(path.join(mangaId, chapterId));
  const cachePath = getCachePath(mangaId, chapterId, pageIndex);

  // Skip if already cached
  if (fs.existsSync(cachePath)) {
    return { cached: true, path: cachePath };
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'MangaDex-Reader/1.0',
        'Referer': 'https://mangadex.org/'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }

    // Stream to file
    const fileStream = fs.createWriteStream(cachePath);
    await pipeline(Readable.fromWeb(response.body), fileStream);

    return { cached: false, path: cachePath, size: fs.statSync(cachePath).size };
  } catch (error) {
    console.error(`Failed to download image ${pageIndex}:`, error.message);
    // Clean up partial file
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
    throw error;
  }
}

/**
 * Download all images for a chapter
 */
export async function downloadChapter(mangaId, chapterId, pages, options = {}) {
  const { onProgress, dataSaver = false } = options;
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    totalSize: 0
  };

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const imageUrl = dataSaver ? page.dataSaverUrl : page.url;

    try {
      const result = await downloadImage(mangaId, chapterId, page.index, imageUrl);
      
      if (result.cached) {
        results.skipped++;
      } else {
        results.success++;
        results.totalSize += result.size || 0;
      }
    } catch (error) {
      results.failed++;
    }

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: pages.length,
        ...results
      });
    }
  }

  return results;
}

/**
 * Get current cache size in bytes
 */
export function getCacheSize() {
  if (!fs.existsSync(CACHE_DIR)) {
    return 0;
  }

  let totalSize = 0;
  
  function walkDir(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else {
          totalSize += stat.size;
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  walkDir(CACHE_DIR);
  return totalSize;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const size = getCacheSize();
  
  let mangaCount = 0;
  let chapterCount = 0;
  let imageCount = 0;

  if (fs.existsSync(CACHE_DIR)) {
    try {
      const mangaDirs = fs.readdirSync(CACHE_DIR);
      mangaCount = mangaDirs.length;

      for (const mangaDir of mangaDirs) {
        const mangaPath = path.join(CACHE_DIR, mangaDir);
        const stat = fs.statSync(mangaPath);
        if (stat.isDirectory()) {
          const chapters = fs.readdirSync(mangaPath);
          chapterCount += chapters.length;

          for (const chapter of chapters) {
            const chapterPath = path.join(mangaPath, chapter);
            const chapterStat = fs.statSync(chapterPath);
            if (chapterStat.isDirectory()) {
              const images = fs.readdirSync(chapterPath);
              imageCount += images.length;
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  return {
    size,
    sizeFormatted: formatBytes(size),
    maxSize: MAX_CACHE_SIZE,
    maxSizeFormatted: formatBytes(MAX_CACHE_SIZE),
    usagePercent: Math.round((size / MAX_CACHE_SIZE) * 100),
    mangaCount,
    chapterCount,
    imageCount
  };
}

/**
 * Clear cache for a specific manga
 */
export function clearMangaCache(mangaId) {
  const mangaPath = path.join(CACHE_DIR, mangaId);
  if (fs.existsSync(mangaPath)) {
    fs.rmSync(mangaPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * Clear cache for a specific chapter
 */
export function clearChapterCache(mangaId, chapterId) {
  const chapterPath = path.join(CACHE_DIR, mangaId, chapterId);
  if (fs.existsSync(chapterPath)) {
    fs.rmSync(chapterPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * Clear entire cache
 */
export function clearAllCache() {
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    ensureCacheDir();
    return true;
  }
  return false;
}

/**
 * Clean old cache entries when exceeding max size
 * Uses LRU-like strategy based on access time
 */
export async function cleanCache() {
  const currentSize = getCacheSize();
  
  if (currentSize <= MAX_CACHE_SIZE * 0.9) {
    return { cleaned: false, freedSpace: 0 };
  }

  const targetSize = MAX_CACHE_SIZE * 0.7; // Clean down to 70%
  let freedSpace = 0;

  // Get all manga directories with their access times
  const mangaDirs = [];
  if (fs.existsSync(CACHE_DIR)) {
    for (const dir of fs.readdirSync(CACHE_DIR)) {
      const dirPath = path.join(CACHE_DIR, dir);
      const stat = fs.statSync(dirPath);
      if (stat.isDirectory()) {
        mangaDirs.push({
          path: dirPath,
          atime: stat.atime.getTime(),
          size: getDirSize(dirPath)
        });
      }
    }
  }

  // Sort by access time (oldest first)
  mangaDirs.sort((a, b) => a.atime - b.atime);

  // Remove oldest until under target
  let currentCacheSize = currentSize;
  for (const dir of mangaDirs) {
    if (currentCacheSize <= targetSize) break;
    
    fs.rmSync(dir.path, { recursive: true, force: true });
    currentCacheSize -= dir.size;
    freedSpace += dir.size;
  }

  return { cleaned: true, freedSpace, freedFormatted: formatBytes(freedSpace) };
}

/**
 * Get directory size recursively
 */
function getDirSize(dir) {
  let size = 0;
  try {
    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stat.size;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return size;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
  isImageCached,
  getCachedImageUrl,
  downloadImage,
  downloadChapter,
  getCacheSize,
  getCacheStats,
  clearMangaCache,
  clearChapterCache,
  clearAllCache,
  cleanCache
};
