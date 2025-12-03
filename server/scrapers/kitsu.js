import BaseScraper from './base.js';
import MangaDexScraper from './mangadex.js';

// API base URL for proxy
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// MangaDex instance for cross-referencing chapters
const mangadex = new MangaDexScraper();

// Kitsu - Anime/Manga database with reliable JSON API
export class KitsuScraper extends BaseScraper {
  constructor() {
    super('Kitsu', 'https://kitsu.io/api/edge', false);
    this.client.defaults.headers['Accept'] = 'application/vnd.api+json';
    this.client.defaults.headers['Content-Type'] = 'application/vnd.api+json';
  }

  proxyUrl(url) {
    if (!url) return '';
    const base = API_BASE || '';
    return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;
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
      cover: cover ? this.proxyUrl(cover) : null,
      description: attrs.synopsis || attrs.description || '',
      status: attrs.status === 'finished' ? 'completed' : (attrs.status === 'current' ? 'ongoing' : attrs.status),
      year: attrs.startDate ? new Date(attrs.startDate).getFullYear() : null,
      rating: attrs.averageRating ? parseFloat(attrs.averageRating) / 10 : null,
      genres: [],
      isAdult: attrs.ageRating === 'R18',
      sourceId: 'kitsu',
      chapterCount: attrs.chapterCount,
      volumeCount: attrs.volumeCount,
      subtype: attrs.subtype,
      // Store for MangaDex cross-reference
      _searchTitle: title,
    };
  }

  // Cache for MangaDex ID lookups
  mangadexIdCache = new Map();

  async findMangaDexId(title) {
    if (this.mangadexIdCache.has(title)) {
      return this.mangadexIdCache.get(title);
    }
    
    try {
      // Search MangaDex for this title
      const results = await mangadex.search(title, 1, true);
      if (results.length > 0) {
        // Find best match (exact or close title match)
        const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = results.find(r => {
          const normalizedResult = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalizedResult === normalizedTitle || 
                 normalizedResult.includes(normalizedTitle) ||
                 normalizedTitle.includes(normalizedResult);
        }) || results[0];
        
        const mangadexId = match.id;
        this.mangadexIdCache.set(title, mangadexId);
        return mangadexId;
      }
    } catch (e) {
      console.error('[Kitsu] MangaDex lookup error:', e.message);
    }
    
    this.mangadexIdCache.set(title, null);
    return null;
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = [], status = null) {
    try {
      const offset = (page - 1) * 20;
      const params = new URLSearchParams({
        'page[limit]': '20',
        'page[offset]': String(offset),
        'include': 'genres,categories',
      });
      
      if (query) {
        params.set('filter[text]', query);
      }
      
      // Map status to Kitsu's status values
      if (status) {
        const statusMap = {
          'ongoing': 'current',
          'completed': 'finished',
          'hiatus': 'tba',
        };
        params.set('filter[status]', statusMap[status] || status);
      }
      
      // Add genre filter if tags provided
      if (tags.length > 0) {
        params.set('filter[genres]', tags.join(','));
      }

      const data = await this.fetchJson(`${this.baseUrl}/manga?${params}`);
      if (!data?.data) return [];

      return data.data.map(item => this.formatManga(item));
    } catch (e) {
      console.error('[Kitsu] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, tags = [], excludeTags = [], status = null) {
    try {
      const offset = (page - 1) * 20;
      const params = new URLSearchParams({
        'page[limit]': '20',
        'page[offset]': String(offset),
        'sort': '-userCount',
        'include': 'genres',
      });
      
      // Map status to Kitsu's status values
      if (status) {
        const statusMap = {
          'ongoing': 'current',
          'completed': 'finished',
          'hiatus': 'tba',
        };
        params.set('filter[status]', statusMap[status] || status);
      }
      
      // Add genre filter if tags provided
      if (tags.length > 0) {
        params.set('filter[genres]', tags.join(','));
      }

      const data = await this.fetchJson(`${this.baseUrl}/manga?${params}`);
      if (!data?.data) return [];

      return data.data.map(item => this.formatManga(item));
    } catch (e) {
      console.error('[Kitsu] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true, tags = [], excludeTags = [], status = null) {
    try {
      const offset = (page - 1) * 20;
      const params = new URLSearchParams({
        'page[limit]': '20',
        'page[offset]': String(offset),
        'sort': '-updatedAt',
        'include': 'genres',
      });
      
      // Map status to Kitsu's status values
      if (status) {
        const statusMap = {
          'ongoing': 'current',
          'completed': 'finished',
          'hiatus': 'tba',
        };
        params.set('filter[status]', statusMap[status] || status);
      }
      
      // Add genre filter if tags provided
      if (tags.length > 0) {
        params.set('filter[genres]', tags.join(','));
      }

      const data = await this.fetchJson(`${this.baseUrl}/manga?${params}`);
      if (!data?.data) return [];

      return data.data.map(item => this.formatManga(item));
    } catch (e) {
      console.error('[Kitsu] Latest error:', e.message);
      return [];
    }
  }

  async getNewlyAdded(page = 1, includeAdult = true) {
    try {
      const offset = (page - 1) * 20;
      const params = new URLSearchParams({
        'page[limit]': '20',
        'page[offset]': String(offset),
        'sort': '-createdAt',
        'include': 'genres',
      });

      const data = await this.fetchJson(`${this.baseUrl}/manga?${params}`);
      if (!data?.data) return [];

      return data.data.map(item => this.formatManga(item));
    } catch (e) {
      console.error('[Kitsu] NewlyAdded error:', e.message);
      return [];
    }
  }

  async getTopRated(page = 1, includeAdult = true) {
    try {
      const offset = (page - 1) * 20;
      const params = new URLSearchParams({
        'page[limit]': '20',
        'page[offset]': String(offset),
        'sort': '-averageRating',
        'include': 'genres',
      });

      const data = await this.fetchJson(`${this.baseUrl}/manga?${params}`);
      if (!data?.data) return [];

      return data.data.map(item => this.formatManga(item));
    } catch (e) {
      console.error('[Kitsu] TopRated error:', e.message);
      return [];
    }
  }

  async getMangaDetails(id) {
    try {
      const kitsuId = id.replace('kitsu:', '');
      const params = new URLSearchParams({
        'include': 'genres,categories,mangaCharacters.character',
      });

      const data = await this.fetchJson(`${this.baseUrl}/manga/${kitsuId}?${params}`);
      if (!data?.data) return null;

      const manga = this.formatManga(data.data);
      
      // Extract genres from included data
      if (data.included) {
        manga.genres = data.included
          .filter(inc => inc.type === 'genres' || inc.type === 'categories')
          .map(g => g.attributes?.name || g.attributes?.title)
          .filter(Boolean);
      }

      return manga;
    } catch (e) {
      console.error('[Kitsu] Details error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    try {
      // First get the manga details to get the title
      const details = await this.getMangaDetails(mangaId);
      if (!details) return [];
      
      // Try to find on MangaDex using the title
      const mangadexId = await this.findMangaDexId(details.title);
      if (mangadexId) {
        console.log(`[Kitsu] Found MangaDex match for "${details.title}": ${mangadexId}`);
        const chapters = await mangadex.getChapters(mangadexId);
        // Mark chapters as coming from MangaDex
        return chapters.map(ch => ({
          ...ch,
          _mangadexId: mangadexId,
          _source: 'mangadex',
        }));
      }
      
      console.log(`[Kitsu] No MangaDex match found for "${details.title}"`);
      return [];
    } catch (e) {
      console.error('[Kitsu] Chapters error:', e.message);
      return [];
    }
  }

  async getChapterPages(chapterId, mangaId) {
    try {
      // Chapters come from MangaDex, so use MangaDex to get pages
      return await mangadex.getChapterPages(chapterId, mangaId);
    } catch (e) {
      console.error('[Kitsu] Chapter pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    try {
      // Fetch genres from Kitsu
      const params = new URLSearchParams({
        'page[limit]': '100',
        'sort': 'name',
      });

      const data = await this.fetchJson(`${this.baseUrl}/genres?${params}`);
      if (!data?.data) return [];

      return data.data.map(g => g.attributes?.name).filter(Boolean).sort();
    } catch (e) {
      console.error('[Kitsu] Tags error:', e.message);
      return [];
    }
  }
}

export default KitsuScraper;
