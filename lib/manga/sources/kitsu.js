/**
 * Kitsu Source
 * Anime/Manga database with reliable JSON API
 */

import BaseSource from './base';

class KitsuSource extends BaseSource {
  constructor() {
    super({
      name: 'Kitsu',
      baseUrl: 'https://kitsu.io/api/edge',
      adult: false,
      features: ['search', 'popular', 'latest', 'status-filter'],
      rateLimit: 500
    });
    this.clientHeaders = {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    };
  }

  async fetch(url, options = {}) {
    await this.waitForRateLimit();
    
    const defaultOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...this.clientHeaders,
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

  async fetchJson(url, options = {}) {
    const response = await this.fetch(url, {
      ...options,
      headers: this.clientHeaders
    });
    return response.json();
  }

  formatManga(item) {
    const attrs = item.attributes || {};
    const posterImage = attrs.posterImage;
    const cover = posterImage?.large || posterImage?.medium || posterImage?.small || posterImage?.original;
    const title = attrs.canonicalTitle || attrs.titles?.en || attrs.titles?.en_jp || 'Unknown';
    
    return {
      id: `kitsu:${item.id}`,
      title,
      altTitles: Object.values(attrs.titles || {}).filter(Boolean),
      cover: cover || null,
      description: attrs.synopsis || attrs.description || '',
      status: attrs.status === 'finished' ? 'completed' : (attrs.status === 'current' ? 'ongoing' : attrs.status),
      year: attrs.startDate ? new Date(attrs.startDate).getFullYear() : null,
      rating: attrs.averageRating ? parseFloat(attrs.averageRating) / 10 : null,
      genres: attrs.genres || [],
      isAdult: attrs.ageRating === 'R18',
      sourceId: 'kitsu',
      chapterCount: attrs.chapterCount,
      volumeCount: attrs.volumeCount,
      subtype: attrs.subtype
    };
  }

  async search(query, options = {}) {
    const { limit = 24, page = 1, status = null } = options;
    
    try {
      const offset = (page - 1) * 20; // Kitsu max is 20
      let url = `${this.baseUrl}/manga?page[limit]=20&page[offset]=${offset}`;
      
      if (query) {
        url += `&filter[text]=${encodeURIComponent(query)}`;
      }
      
      // Map status to Kitsu's status values
      if (status) {
        const statusMap = {
          'ongoing': 'current',
          'completed': 'finished',
          'hiatus': 'tba',
        };
        url += `&filter[status]=${statusMap[status] || status}`;
      }
      
      const data = await this.fetchJson(url);
      
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(item => this.formatManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const offset = (page - 1) * 20;
      const url = `${this.baseUrl}/manga?page[limit]=20&page[offset]=${offset}&sort=-userCount`;
      
      const data = await this.fetchJson(url);
      
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(item => this.formatManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const offset = (page - 1) * 20;
      const url = `${this.baseUrl}/manga?page[limit]=20&page[offset]=${offset}&sort=-startDate`;
      
      const data = await this.fetchJson(url);
      
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(item => this.formatManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      // Clean ID - remove "kitsu:" prefix if present
      const id = mangaId.replace('kitsu:', '');
      const url = `${this.baseUrl}/manga/${id}`;
      
      const data = await this.fetchJson(url);
      
      if (data.data) {
        return this.formatManga(data.data);
      }
      
      throw new Error('No data returned');
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async checkConnectivity() {
    try {
      const response = await this.fetchJson(`${this.baseUrl}/manga?page[limit]=1`);
      return response.data !== undefined;
    } catch {
      return false;
    }
  }
}

export default new KitsuSource();
