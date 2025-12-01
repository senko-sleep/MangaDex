/**
 * Comick Source
 * Large mainstream manga aggregator with comprehensive API
 * Aggregates from multiple sources with high-quality chapters
 * Supports manga, manhwa, manhua with excellent search
 */

import BaseSource from './base';

// Comick content types
export const COMICK_TYPES = {
  ALL: 'all',
  MANGA: 'manga',
  MANHWA: 'manhwa',
  MANHUA: 'manhua',
  COMIC: 'comic'
};

// Sort options
export const COMICK_SORT = {
  FOLLOW: 'follow',
  VIEW: 'view',
  RATING: 'rating',
  UPLOADED: 'uploaded',
  CREATED: 'created_at'
};

class ComickSource extends BaseSource {
  constructor() {
    super({
      name: 'Comick',
      baseUrl: 'https://comick.io',
      apiUrl: 'https://api.comick.io',
      adult: false,
      features: [
        'search', 'popular', 'latest', 'tags', 
        'manga', 'manhwa', 'manhua',
        'api', 'high-quality', 'multi-language', 'chapters'
      ],
      rateLimit: 200
    });
    
    this.types = COMICK_TYPES;
    this.imageServer = 'https://meo.comick.pictures';
  }

  async search(query, options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      type = 'all',
      tachiyomi = true
    } = options;
    
    try {
      let url = `${this.apiUrl}/v1.0/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`;
      
      if (type !== 'all') {
        url += `&type=${type}`;
      }
      
      if (tachiyomi) {
        url += '&tachiyomi=true';
      }
      
      const data = await this.fetchJson(url);
      
      if (Array.isArray(data)) {
        return data.map(item => this.formatApiManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Comick search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24, page = 1, type = 'all' } = options;
    
    try {
      let url = `${this.apiUrl}/v1.0/search?sort=follow&limit=${limit}&page=${page}&tachiyomi=true`;
      
      if (type !== 'all') {
        url += `&type=${type}`;
      }
      
      const data = await this.fetchJson(url);
      
      if (Array.isArray(data)) {
        return data.map(item => this.formatApiManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Comick popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24, page = 1, type = 'all' } = options;
    
    try {
      let url = `${this.apiUrl}/v1.0/search?sort=uploaded&limit=${limit}&page=${page}&tachiyomi=true`;
      
      if (type !== 'all') {
        url += `&type=${type}`;
      }
      
      const data = await this.fetchJson(url);
      
      if (Array.isArray(data)) {
        return data.map(item => this.formatApiManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Comick latest failed', { error: error.message });
      return [];
    }
  }

  async getByType(type, options = {}) {
    return this.getLatest({ ...options, type });
  }

  async getManga(options = {}) {
    return this.getByType('manga', options);
  }

  async getManhwa(options = {}) {
    return this.getByType('manhwa', options);
  }

  async getManhua(options = {}) {
    return this.getByType('manhua', options);
  }

  async getTopRated(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.apiUrl}/v1.0/search?sort=rating&limit=${limit}&page=${page}&tachiyomi=true`;
      const data = await this.fetchJson(url);
      
      if (Array.isArray(data)) {
        return data.map(item => this.formatApiManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Comick top rated failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      // mangaId can be slug or hid
      const url = `${this.apiUrl}/comic/${mangaId}?tachiyomi=true`;
      const data = await this.fetchJson(url);
      
      if (data.comic) {
        return this.formatApiMangaDetails(data.comic, data);
      }
      
      throw new Error('Manga not found');
    } catch (error) {
      this.log.warn('Comick details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId, options = {}) {
    const { limit = 300, page = 1, language = 'en' } = options;
    
    try {
      const url = `${this.apiUrl}/comic/${mangaId}/chapters?lang=${language}&limit=${limit}&page=${page}&tachiyomi=true`;
      const data = await this.fetchJson(url);
      
      if (data.chapters && Array.isArray(data.chapters)) {
        return data.chapters.map(ch => this.formatChapterData(ch, mangaId));
      }
      
      return [];
    } catch (error) {
      this.log.warn('Comick chapters failed', { mangaId, error: error.message });
      return [];
    }
  }

  async getChapterPages(chapterId) {
    try {
      const url = `${this.apiUrl}/chapter/${chapterId}?tachiyomi=true`;
      const data = await this.fetchJson(url);
      
      if (data.chapter?.images && Array.isArray(data.chapter.images)) {
        return data.chapter.images.map((img, index) => ({
          index: index + 1,
          url: img.url || `${this.imageServer}/${img.b2key}`,
          width: img.w,
          height: img.h
        }));
      }
      
      return [];
    } catch (error) {
      this.log.warn('Comick pages failed', { chapterId, error: error.message });
      throw error;
    }
  }

  formatApiManga(item) {
    const manga = item.md_comics || item.comic || item;
    
    // Build cover URL
    let coverUrl = '';
    if (manga.md_covers && manga.md_covers.length > 0) {
      coverUrl = `${this.imageServer}/${manga.md_covers[0].b2key}`;
    } else if (manga.cover_url) {
      coverUrl = manga.cover_url;
    }
    
    // Extract genres/tags
    const genres = manga.genres?.map(g => g.name || g) || [];
    const tags = manga.md_comic_md_genres?.map(g => g.md_genres?.name || g.name) || [];
    
    return this.formatManga({
      id: manga.slug || manga.hid,
      title: manga.title || 'Unknown',
      altTitles: manga.md_titles?.map(t => t.title) || [],
      description: manga.desc || manga.description || '',
      coverUrl,
      author: manga.authors?.map(a => a.name || a).join(', ') || 'Unknown',
      artist: manga.artists?.map(a => a.name || a).join(', ') || 'Unknown',
      status: this.normalizeStatus(manga.status?.toString()),
      tags: [...genres, ...tags].filter(Boolean),
      genres,
      type: this.getContentType(manga.country || manga.content_rating),
      rating: manga.rating ? parseFloat(manga.rating) / 2 : null, // Comick uses 10-scale
      views: manga.view_count || manga.follow_count || 0,
      lastChapter: manga.last_chapter || null,
      adult: manga.hentai || manga.content_rating === 'erotica',
      updatedAt: manga.uploaded_at || manga.updated_at || null
    });
  }

  formatApiMangaDetails(manga, fullData = {}) {
    // Build cover URL
    let coverUrl = '';
    if (manga.md_covers && manga.md_covers.length > 0) {
      coverUrl = `${this.imageServer}/${manga.md_covers[0].b2key}`;
    } else if (manga.cover_url) {
      coverUrl = manga.cover_url;
    }
    
    // Extract all metadata
    const genres = manga.md_comic_md_genres?.map(g => g.md_genres?.name).filter(Boolean) || [];
    const authors = fullData.authors?.map(a => a.name) || manga.authors?.map(a => a.name || a) || [];
    const artists = fullData.artists?.map(a => a.name) || manga.artists?.map(a => a.name || a) || [];
    const altTitles = manga.md_titles?.map(t => t.title) || [];
    
    // Related manga
    const related = fullData.comic_related?.map(r => ({
      id: r.slug,
      title: r.title,
      relation: r.relate_type
    })) || [];
    
    return this.formatManga({
      id: manga.slug || manga.hid,
      title: manga.title || 'Unknown',
      altTitles,
      description: manga.desc || manga.description || '',
      coverUrl,
      bannerUrl: manga.banner_url || '',
      author: authors.join(', ') || 'Unknown',
      artist: artists.join(', ') || 'Unknown',
      authors,
      artists,
      status: this.normalizeStatus(manga.status?.toString()),
      tags: genres,
      genres,
      type: this.getContentType(manga.country),
      country: manga.country,
      rating: manga.rating ? parseFloat(manga.rating) / 2 : null,
      bayesianRating: manga.bayesian_rating ? parseFloat(manga.bayesian_rating) / 2 : null,
      views: manga.view_count || 0,
      follows: manga.follow_count || 0,
      chapters: manga.chapter_count || 0,
      lastChapter: manga.last_chapter || null,
      adult: manga.hentai || manga.content_rating === 'erotica',
      related,
      links: manga.links || {},
      year: manga.year,
      updatedAt: manga.uploaded_at || manga.updated_at || null,
      createdAt: manga.created_at || null
    });
  }

  formatChapterData(chapter, mangaId) {
    return this.formatChapter({
      id: chapter.hid,
      mangaId,
      chapter: chapter.chap || '0',
      title: chapter.title || '',
      volume: chapter.vol || null,
      pages: chapter.images?.length || 0,
      language: chapter.lang || 'en',
      scanlator: chapter.group_name?.join(', ') || chapter.md_groups?.map(g => g.title).join(', ') || '',
      publishedAt: chapter.created_at || chapter.updated_at || null
    });
  }

  getContentType(country) {
    if (!country) return 'manga';
    const c = country.toLowerCase();
    if (c === 'kr' || c === 'korea') return 'manhwa';
    if (c === 'cn' || c === 'china') return 'manhua';
    if (c === 'jp' || c === 'japan') return 'manga';
    return 'comic';
  }

  normalizeStatus(status) {
    if (!status) return 'unknown';
    const s = status.toLowerCase();
    if (s === '1' || s.includes('ongoing')) return 'ongoing';
    if (s === '2' || s.includes('complete')) return 'completed';
    if (s === '3' || s.includes('hiatus')) return 'hiatus';
    if (s === '4' || s.includes('cancel')) return 'cancelled';
    return 'unknown';
  }

  async getRecentlyAdded(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.apiUrl}/v1.0/search?sort=created_at&limit=${limit}&page=${page}&tachiyomi=true`;
      const data = await this.fetchJson(url);
      
      if (Array.isArray(data)) {
        return data.map(item => this.formatApiManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Comick recently added failed', { error: error.message });
      return [];
    }
  }

  async searchByTag(tag, options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.apiUrl}/v1.0/search?genres=${encodeURIComponent(tag)}&limit=${limit}&page=${page}&tachiyomi=true`;
      const data = await this.fetchJson(url);
      
      if (Array.isArray(data)) {
        return data.map(item => this.formatApiManga(item)).slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.log.warn('Comick tag search failed', { tag, error: error.message });
      return [];
    }
  }

  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await this.fetch(`${this.apiUrl}/v1.0/search?limit=1`, { signal: controller.signal });
      clearTimeout(timeout);
      
      return true;
    } catch {
      return false;
    }
  }
}

const comickSource = new ComickSource();

export default comickSource;
export { comickSource, COMICK_TYPES, COMICK_SORT };
