import BaseScraper from './base.js';
import MangaDexScraper from './mangadex.js';

// API base URL for proxy
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// MangaDex instance for cross-referencing chapters
const mangadex = new MangaDexScraper();

// MangaUpdates - Comprehensive manga database with good API
export class MangaUpdatesScraper extends BaseScraper {
  constructor() {
    super('MangaUpdates', 'https://api.mangaupdates.com/v1', false);
  }

  // Cache for MangaDex ID lookups
  mangadexIdCache = new Map();

  proxyUrl(url) {
    if (!url) return '';
    const base = API_BASE || '';
    return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  async findMangaDexId(title) {
    if (this.mangadexIdCache.has(title)) {
      return this.mangadexIdCache.get(title);
    }
    
    try {
      const results = await mangadex.search(title, 1, true);
      if (results.length > 0) {
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
      console.error('[MangaUpdates] MangaDex lookup error:', e.message);
    }
    
    this.mangadexIdCache.set(title, null);
    return null;
  }

  formatManga(record) {
    const cover = record.image?.url?.original || record.image?.url?.thumb;
    const title = record.title || 'Unknown';
    
    return {
      id: `mangaupdates:${record.series_id}`,
      title,
      altTitles: [],
      cover: cover ? this.proxyUrl(cover) : null,
      description: record.description || '',
      status: record.completed ? 'completed' : (record.status || 'ongoing'),
      year: record.year ? parseInt(record.year) : null,
      rating: record.bayesian_rating ? parseFloat(record.bayesian_rating) : null,
      genres: (record.genres || []).map(g => g.genre).filter(Boolean),
      isAdult: record.genres?.some(g => g.genre === 'Adult' || g.genre === 'Hentai') || false,
      sourceId: 'mangaupdates',
      type: record.type?.toLowerCase() || 'manga',
      url: record.url,
      _searchTitle: title,
    };
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = []) {
    try {
      const perPage = 24;
      
      const body = {
        search: query,
        page: page,
        perpage: perPage,
      };

      // Add genre filter if tags provided
      if (tags.length > 0) {
        body.include_genre = tags;
      }
      if (excludeTags.length > 0) {
        body.exclude_genre = excludeTags;
      }

      const res = await this.client.post(`${this.baseUrl}/series/search`, body);
      if (!res.data?.results) return [];

      let results = res.data.results.map(r => this.formatManga(r.record));
      
      // Filter adult content if needed
      if (!includeAdult) {
        results = results.filter(m => !m.isAdult);
      }

      return results;
    } catch (e) {
      console.error('[MangaUpdates] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true) {
    try {
      const body = {
        page: page,
        perpage: 24,
        orderby: 'rating',
      };

      const res = await this.client.post(`${this.baseUrl}/series/search`, body);
      if (!res.data?.results) return [];

      let results = res.data.results.map(r => this.formatManga(r.record));
      
      if (!includeAdult) {
        results = results.filter(m => !m.isAdult);
      }

      return results;
    } catch (e) {
      console.error('[MangaUpdates] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true) {
    try {
      const body = {
        page: page,
        perpage: 24,
        orderby: 'year', // Sort by newest
      };

      const res = await this.client.post(`${this.baseUrl}/series/search`, body);
      if (!res.data?.results) return [];

      let results = res.data.results.map(r => this.formatManga(r.record));
      
      if (!includeAdult) {
        results = results.filter(m => !m.isAdult);
      }

      return results;
    } catch (e) {
      console.error('[MangaUpdates] Latest error:', e.message);
      return [];
    }
  }

  async getNewlyAdded(page = 1, includeAdult = true) {
    return this.getLatest(page, includeAdult);
  }

  async getTopRated(page = 1, includeAdult = true) {
    return this.getPopular(page, includeAdult);
  }

  async getMangaDetails(id) {
    try {
      const seriesId = id.replace('mangaupdates:', '');
      const res = await this.client.get(`${this.baseUrl}/series/${seriesId}`);
      
      if (!res.data) return null;

      const record = res.data;
      const cover = record.image?.url?.original || record.image?.url?.thumb;

      return {
        id: `mangaupdates:${record.series_id}`,
        title: record.title || 'Unknown',
        altTitles: (record.associated || []).map(a => a.title).filter(Boolean),
        cover: cover ? this.proxyUrl(cover) : null,
        description: record.description || '',
        status: record.completed ? 'completed' : (record.status || 'ongoing'),
        year: record.year ? parseInt(record.year) : null,
        rating: record.bayesian_rating ? parseFloat(record.bayesian_rating) : null,
        genres: (record.genres || []).map(g => g.genre).filter(Boolean),
        isAdult: record.genres?.some(g => g.genre === 'Adult' || g.genre === 'Hentai') || false,
        sourceId: 'mangaupdates',
        type: record.type?.toLowerCase() || 'manga',
        url: record.url,
        authors: (record.authors || []).map(a => a.name).filter(Boolean),
        artists: (record.artists || []).map(a => a.name).filter(Boolean),
      };
    } catch (e) {
      console.error('[MangaUpdates] Details error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    try {
      // Get the manga details to get the title
      const details = await this.getMangaDetails(mangaId);
      if (!details) return [];
      
      // Try to find on MangaDex using the title
      const mangadexId = await this.findMangaDexId(details.title);
      if (mangadexId) {
        console.log(`[MangaUpdates] Found MangaDex match for "${details.title}": ${mangadexId}`);
        const chapters = await mangadex.getChapters(mangadexId);
        return chapters.map(ch => ({
          ...ch,
          _mangadexId: mangadexId,
          _source: 'mangadex',
        }));
      }
      
      console.log(`[MangaUpdates] No MangaDex match found for "${details.title}"`);
      return [];
    } catch (e) {
      console.error('[MangaUpdates] Chapters error:', e.message);
      return [];
    }
  }

  async getChapterPages(chapterId, mangaId) {
    try {
      // Chapters come from MangaDex, so use MangaDex to get pages
      return await mangadex.getChapterPages(chapterId, mangaId);
    } catch (e) {
      console.error('[MangaUpdates] Chapter pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    try {
      const res = await this.client.get(`${this.baseUrl}/genres`);
      if (!res.data) return [];

      return res.data.map(g => g.genre).filter(Boolean).sort();
    } catch (e) {
      console.error('[MangaUpdates] Tags error:', e.message);
      // Return common genres as fallback
      return [
        'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
        'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life',
        'Sports', 'Supernatural', 'Thriller', 'Tragedy',
        'Shounen', 'Shoujo', 'Seinen', 'Josei',
      ];
    }
  }
}

export default MangaUpdatesScraper;
