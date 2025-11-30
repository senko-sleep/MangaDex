/**
 * MangaDex Source
 * Official MangaDex API - safe content only
 */

import BaseSource from './base';

class MangaDexSource extends BaseSource {
  constructor() {
    super({
      name: 'MangaDex',
      baseUrl: 'https://mangadex.org',
      apiUrl: 'https://api.mangadex.org',
      adult: false,
      features: ['search', 'popular', 'latest', 'chapters', 'multilingual'],
      rateLimit: 100 // Faster rate limit
    });
  }

  async checkConnectivity() {
    try {
      const response = await this.fetchJson(`${this.apiUrl}/ping`);
      return true;
    } catch {
      return false;
    }
  }

  async search(query, options = {}) {
    const { limit = 24, offset = 0 } = options;
    
    try {
      const params = new URLSearchParams({
        title: query,
        limit: String(limit),
        offset: String(offset),
        'includes[]': 'cover_art',
        'order[relevance]': 'desc'
      });

      const data = await this.fetchJson(`${this.apiUrl}/manga?${params}`);
      
      return data.data.map(manga => this.formatMangaResponse(manga));
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        'includes[]': 'cover_art',
        'order[followedCount]': 'desc'
      });

      const data = await this.fetchJson(`${this.apiUrl}/manga?${params}`);
      return data.data.map(manga => this.formatMangaResponse(manga));
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        'includes[]': 'cover_art',
        'order[updatedAt]': 'desc'
      });

      const data = await this.fetchJson(`${this.apiUrl}/manga?${params}`);
      return data.data.map(manga => this.formatMangaResponse(manga));
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      const params = new URLSearchParams({
        'includes[]': 'cover_art',
        'includes[]': 'author',
        'includes[]': 'artist'
      });

      const data = await this.fetchJson(`${this.apiUrl}/manga/${mangaId}?${params}`);
      return this.formatMangaResponse(data.data);
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId, options = {}) {
    const { limit = 500, language = 'en' } = options;
    
    try {
      const params = new URLSearchParams({
        manga: mangaId,
        limit: String(limit),
        'translatedLanguage[]': language,
        'order[chapter]': 'asc'
      });

      const data = await this.fetchJson(`${this.apiUrl}/chapter?${params}`);
      
      return data.data.map(chapter => this.formatChapter({
        id: chapter.id,
        mangaId,
        chapter: chapter.attributes.chapter || '0',
        title: chapter.attributes.title || '',
        volume: chapter.attributes.volume,
        pages: chapter.attributes.pages || 0,
        language: chapter.attributes.translatedLanguage,
        publishedAt: chapter.attributes.publishAt
      }));
    } catch (error) {
      this.log.warn('Get chapters failed', { mangaId, error: error.message });
      return [];
    }
  }

  async getChapterPages(chapterId) {
    try {
      const data = await this.fetchJson(`${this.apiUrl}/at-home/server/${chapterId}`);
      
      const baseUrl = data.baseUrl;
      const hash = data.chapter.hash;
      const pages = data.chapter.data;
      const dataSaver = data.chapter.dataSaver;

      return pages.map((filename, index) => ({
        index: index + 1,
        url: `${baseUrl}/data/${hash}/${filename}`,
        dataSaverUrl: `${baseUrl}/data-saver/${hash}/${dataSaver[index]}`
      }));
    } catch (error) {
      this.log.warn('Get pages failed', { chapterId, error: error.message });
      throw error;
    }
  }

  formatMangaResponse(manga) {
    const attrs = manga.attributes;
    
    // Get cover
    const coverRel = manga.relationships?.find(r => r.type === 'cover_art');
    const coverFilename = coverRel?.attributes?.fileName;
    const coverUrl = coverFilename 
      ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFilename}.512.jpg`
      : '';

    // Get author/artist
    const authorRel = manga.relationships?.find(r => r.type === 'author');
    const artistRel = manga.relationships?.find(r => r.type === 'artist');

    // Get tags
    const tags = attrs.tags?.map(tag => tag.attributes?.name?.en || '').filter(Boolean) || [];

    return this.formatManga({
      id: manga.id,
      title: attrs.title?.en || attrs.title?.ja || Object.values(attrs.title || {})[0] || 'Unknown',
      altTitles: attrs.altTitles?.map(t => Object.values(t)[0]) || [],
      description: attrs.description?.en || attrs.description?.ja || '',
      coverUrl,
      author: authorRel?.attributes?.name || 'Unknown',
      artist: artistRel?.attributes?.name || authorRel?.attributes?.name || 'Unknown',
      status: attrs.status,
      tags,
      rating: null,
      lastChapter: attrs.lastChapter,
      updatedAt: attrs.updatedAt
    });
  }
}

export default new MangaDexSource();
