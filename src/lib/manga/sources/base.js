/**
 * Base Source Class
 * All manga sources extend this class
 */

import { createLogger } from '@/lib/logger';

export default class BaseSource {
  constructor(config = {}) {
    this.name = config.name || 'Unknown';
    this.baseUrl = config.baseUrl || '';
    this.apiUrl = config.apiUrl || '';
    this.adult = config.adult || false;
    this.features = config.features || [];
    this.rateLimit = config.rateLimit || 100; // Fast by default
    this.lastRequest = 0;
  }

  // Rate limiting - minimal delay
  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, Math.min(this.rateLimit - elapsed, 50)));
    }
    this.lastRequest = Date.now();
  }

  // Make HTTP request with error handling
  async fetch(url, options = {}) {
    await this.waitForRateLimit();
    
    const defaultOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      this.log.warn(`Request failed: ${url}`, { error: error.message });
      throw error;
    }
  }

  // Fetch JSON
  async fetchJson(url, options = {}) {
    const response = await this.fetch(url, {
      ...options,
      headers: { 'Accept': 'application/json', ...options.headers }
    });
    return response.json();
  }

  // Fetch HTML
  async fetchHtml(url, options = {}) {
    const response = await this.fetch(url, options);
    return response.text();
  }

  // Check if source is available
  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await this.fetch(this.baseUrl, { signal: controller.signal, method: 'HEAD' });
      clearTimeout(timeout);
      
      return true;
    } catch {
      return false;
    }
  }

  // Search manga - override in subclass
  async search(query, options = {}) {
    throw new Error('search() not implemented');
  }

  // Get popular manga - override in subclass
  async getPopular(options = {}) {
    throw new Error('getPopular() not implemented');
  }

  // Get latest updates - override in subclass
  async getLatest(options = {}) {
    throw new Error('getLatest() not implemented');
  }

  // Get manga details - override in subclass
  async getMangaDetails(mangaId) {
    throw new Error('getMangaDetails() not implemented');
  }

  // Get chapters - override in subclass
  async getChapters(mangaId) {
    throw new Error('getChapters() not implemented');
  }

  // Get chapter pages - override in subclass
  async getChapterPages(chapterId) {
    throw new Error('getChapterPages() not implemented');
  }

  // Search by title for chapters - optional override
  async searchChaptersByTitle(title) {
    const results = await this.search(title, { limit: 1 });
    if (results.length > 0) {
      return this.getChapters(results[0].id);
    }
    return [];
  }

  // Format manga data to standard format
  formatManga(data) {
    return {
      id: data.id || '',
      title: data.title || 'Unknown',
      altTitles: data.altTitles || [],
      description: data.description || '',
      coverUrl: data.coverUrl || data.cover || data.thumbnail || '',
      author: data.author || 'Unknown',
      artist: data.artist || data.author || 'Unknown',
      status: this.normalizeStatus(data.status),
      tags: data.tags || [],
      genres: data.genres || [],
      rating: data.rating || null,
      views: data.views || 0,
      chapters: data.chapters || 0,
      lastChapter: data.lastChapter || null,
      updatedAt: data.updatedAt || null,
      adult: data.adult || this.adult
    };
  }

  // Format chapter data to standard format
  formatChapter(data) {
    return {
      id: data.id || '',
      mangaId: data.mangaId || '',
      chapter: data.chapter || data.number || '0',
      title: data.title || '',
      volume: data.volume || null,
      pages: data.pages || 0,
      language: data.language || 'en',
      scanlator: data.scanlator || '',
      publishedAt: data.publishedAt || data.date || null
    };
  }

  // Normalize status across sources
  normalizeStatus(status) {
    if (!status) return 'unknown';
    const s = status.toLowerCase();
    if (s.includes('ongoing') || s.includes('releasing')) return 'ongoing';
    if (s.includes('complete') || s.includes('finished')) return 'completed';
    if (s.includes('hiatus')) return 'hiatus';
    if (s.includes('cancel')) return 'cancelled';
    return 'unknown';
  }

  // Parse simple HTML (without cheerio dependency)
  parseSimpleHtml(html, selector) {
    // Basic extraction - for complex parsing, use cheerio
    const matches = [];
    const regex = new RegExp(`<[^>]*class="[^"]*${selector}[^"]*"[^>]*>([\\s\\S]*?)<\\/`, 'gi');
    let match;
    while ((match = regex.exec(html)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }
}
