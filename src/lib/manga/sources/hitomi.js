/**
 * Hitomi.la Source
 * Adult content source - manga, doujinshi, CG sets, anime
 * 
 * NOTE: This source routes all requests through the backend API
 * because Hitomi.la requires a headless browser (Playwright) to scrape,
 * which cannot run in the browser. The backend handles all scraping.
 */

import BaseSource from './base';
import { API_URL } from '@/lib/api';

// Hitomi content types
export const HITOMI_TYPES = {
  ALL: 'all',
  DOUJINSHI: 'doujinshi',
  MANGA: 'manga',
  ARTISTCG: 'artistcg',
  GAMECG: 'gamecg',
  ANIME: 'anime',
  IMAGESET: 'imageset'
};

// Language options
export const HITOMI_LANGUAGES = {
  ALL: 'all',
  JAPANESE: 'japanese',
  ENGLISH: 'english',
  CHINESE: 'chinese',
  KOREAN: 'korean',
  SPANISH: 'spanish',
  RUSSIAN: 'russian'
};

class HitomiSource extends BaseSource {
  constructor() {
    super({
      name: 'Hitomi.la',
      baseUrl: 'https://hitomi.la',
      adult: true,
      features: [
        'search', 'popular', 'latest', 'tags', 
        'doujinshi', 'manga', 'artistcg', 'gamecg', 'anime',
        'high-quality', 'multi-language', 'type-filter'
      ],
      rateLimit: 100
    });
    
    // Content types available
    this.contentTypes = HITOMI_TYPES;
    this.languages = HITOMI_LANGUAGES;
  }

  /**
   * Get API base URL - uses environment variable in production
   */
  getApiUrl() {
    return API_URL || '';
  }

  /**
   * Search via backend API
   */
  async search(query, options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const params = new URLSearchParams({
        q: query,
        sources: 'hitomi',
        adult: 'true',
        page: String(page)
      });
      
      const response = await fetch(`${this.getApiUrl()}/api/manga/search?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      return (result.data || []).slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  /**
   * Get popular via backend API
   */
  async getPopular(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const params = new URLSearchParams({
        sources: 'hitomi',
        adult: 'true',
        page: String(page)
      });
      
      const response = await fetch(`${this.getApiUrl()}/api/manga/popular?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      return (result.data || []).slice(0, limit);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get latest via backend API
   */
  async getLatest(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const params = new URLSearchParams({
        sources: 'hitomi',
        adult: 'true',
        page: String(page)
      });
      
      const response = await fetch(`${this.getApiUrl()}/api/manga/latest?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      return (result.data || []).slice(0, limit);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get manga details via backend API
   */
  async getMangaDetails(mangaId) {
    try {
      // Ensure ID has hitomi: prefix
      const id = mangaId.startsWith('hitomi:') ? mangaId : `hitomi:${mangaId}`;
      
      const response = await fetch(`${this.getApiUrl()}/api/manga/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      this.log.warn('Get manga details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  /**
   * Get chapters via backend API
   */
  async getChapters(mangaId) {
    try {
      // Ensure ID has hitomi: prefix
      const id = mangaId.startsWith('hitomi:') ? mangaId : `hitomi:${mangaId}`;
      
      const response = await fetch(`${this.getApiUrl()}/api/chapters/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      this.log.warn('Get chapters failed', { mangaId, error: error.message });
      return [];
    }
  }

  /**
   * Get chapter pages via backend API
   */
  async getChapterPages(chapterId, mangaId) {
    try {
      // Ensure mangaId has hitomi: prefix
      const id = mangaId?.startsWith('hitomi:') ? mangaId : `hitomi:${mangaId || chapterId}`;
      
      const response = await fetch(`${this.getApiUrl()}/api/pages/${encodeURIComponent(id)}/${encodeURIComponent(chapterId)}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.pages || [];
    } catch (error) {
      this.log.warn('Get pages failed', { chapterId, mangaId, error: error.message });
      return [];
    }
  }

  /**
   * Check connectivity by pinging the backend API
   */
  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.getApiUrl()}/api/sources?adult=true`, { 
        signal: controller.signal 
      });
      clearTimeout(timeout);
      
      if (!response.ok) return false;
      
      const data = await response.json();
      // Check if hitomi is in the enabled sources
      return data.enabled?.includes('hitomi') || false;
    } catch {
      return false;
    }
  }
}

const hitomiSource = new HitomiSource();

export default hitomiSource;
export { hitomiSource, HITOMI_TYPES, HITOMI_LANGUAGES };
