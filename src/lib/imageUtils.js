// Utility for manga cover images with Anilist API and placeholders
import { getAnilistCover, PLACEHOLDER_COVER } from './anilist';
import { API_URL } from './api';

// Cache for resolved cover URLs
const resolvedCoverCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Normalizes cover URL - transforms relative proxy URLs to use full backend URL
 */
export function normalizeCoverUrl(url) {
  if (!url) return null;
  
  // Transform relative proxy URLs to use full backend URL
  // This is needed because on Firebase hosting, /api/proxy/image won't work
  if (url.startsWith('/api/')) {
    return `${API_URL}${url}`;
  }
  
  // For direct MangaDex URLs, fix wrong domains
  if (url.includes('mangadex.org/covers/') && !url.includes('uploads.mangadex.org')) {
    url = url.replace('mangadex.org/covers/', 'uploads.mangadex.org/covers/');
  }
  
  return url;
}

/**
 * Get cover URL with fallback to existing sources
 */
export function getCoverUrl(manga) {
  const url = manga?.coverUrl || manga?.thumbnail || manga?.cover;
  return normalizeCoverUrl(url);
}

/**
 * Get cover URL using Anilist API with fallback to MangaDex and placeholder
 * This is an async function that fetches from Anilist if no cover is available
 * @param {Object} manga - Manga object with title and optional coverUrl
 * @returns {Promise<string>} Cover URL or placeholder
 */
export async function getAnilistCoverUrl(manga) {
  if (!manga) return PLACEHOLDER_COVER;
  
  const title = manga.title || '';
  const cacheKey = manga.id || title;
  
  // Check cache first
  const cached = resolvedCoverCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url;
  }
  
  // Try existing MangaDex cover first
  const existingCover = getCoverUrl(manga);
  if (existingCover) {
    resolvedCoverCache.set(cacheKey, { url: existingCover, timestamp: Date.now() });
    return existingCover;
  }
  
  // Try Anilist API
  if (title) {
    try {
      const anilistResult = await getAnilistCover(title);
      if (anilistResult?.coverUrl) {
        resolvedCoverCache.set(cacheKey, { url: anilistResult.coverUrl, timestamp: Date.now() });
        return anilistResult.coverUrl;
      }
    } catch (error) {
      console.warn('[ImageUtils] Anilist fetch failed:', error.message);
    }
  }
  
  // Return placeholder if nothing found
  resolvedCoverCache.set(cacheKey, { url: PLACEHOLDER_COVER, timestamp: Date.now() });
  return PLACEHOLDER_COVER;
}

/**
 * Get banner image from Anilist (for hero backgrounds)
 * @param {Object} manga - Manga object with title
 * @returns {Promise<string|null>} Banner URL or null
 */
export async function getAnilistBannerUrl(manga) {
  if (!manga?.title) return null;
  
  try {
    const result = await getAnilistCover(manga.title);
    return result?.bannerUrl || null;
  } catch (error) {
    console.warn('[ImageUtils] Anilist banner fetch failed:', error.message);
    return null;
  }
}

// Export placeholder for components that need it directly
export { PLACEHOLDER_COVER };
