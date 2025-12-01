/**
 * Anchira Source
 * Quality doujinshi/manga source with API
 * High-quality scans and translations
 */

import BaseSource from './base';

// Anchira content categories
export const ANCHIRA_CATEGORIES = {
  ALL: 'all',
  DOUJINSHI: 'doujinshi',
  MANGA: 'manga',
  ARTBOOK: 'artbook',
  WEBTOON: 'webtoon'
};

class AnchiraSource extends BaseSource {
  constructor() {
    super({
      name: 'Anchira',
      baseUrl: 'https://anchira.to',
      apiUrl: 'https://anchira.to/api',
      adult: true,
      features: [
        'search', 'popular', 'latest', 'tags', 
        'doujinshi', 'manga', 'artbook',
        'high-quality', 'api'
      ],
      rateLimit: 300
    });
    
    this.categories = ANCHIRA_CATEGORIES;
  }

  async search(query, options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      sort = 'date'
    } = options;
    
    try {
      // Try API first
      let url = `${this.apiUrl}/v2/library?s=${encodeURIComponent(query)}&page=${page}&limit=${limit}&sort=${sort}`;
      
      if (category !== 'all') {
        url += `&type=${category}`;
      }
      
      const response = await this.fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.entries && Array.isArray(data.entries)) {
        return data.entries.map(entry => this.formatApiEntry(entry)).slice(0, limit);
      }
      
      // Fallback to HTML
      return this.searchHtml(query, options);
    } catch (error) {
      this.log.warn('Anchira API search failed, trying HTML', { query, error: error.message });
      return this.searchHtml(query, options);
    }
  }

  async searchHtml(query, options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Anchira HTML search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24, category = 'all' } = options;
    
    try {
      let url = `${this.apiUrl}/v2/library?sort=views&limit=${limit}`;
      
      if (category !== 'all') {
        url += `&type=${category}`;
      }
      
      const response = await this.fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.entries && Array.isArray(data.entries)) {
        return data.entries.map(entry => this.formatApiEntry(entry)).slice(0, limit);
      }
      
      return this.getPopularHtml(options);
    } catch (error) {
      this.log.warn('Anchira popular failed', { error: error.message });
      return this.getPopularHtml(options);
    }
  }

  async getPopularHtml(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/popular`);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24, page = 1, category = 'all' } = options;
    
    try {
      let url = `${this.apiUrl}/v2/library?sort=date&page=${page}&limit=${limit}`;
      
      if (category !== 'all') {
        url += `&type=${category}`;
      }
      
      const response = await this.fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.entries && Array.isArray(data.entries)) {
        return data.entries.map(entry => this.formatApiEntry(entry)).slice(0, limit);
      }
      
      return this.getLatestHtml(options);
    } catch (error) {
      this.log.warn('Anchira latest failed', { error: error.message });
      return this.getLatestHtml(options);
    }
  }

  async getLatestHtml(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/?page=${page}`);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      return [];
    }
  }

  async getDoujinshi(options = {}) {
    return this.getLatest({ ...options, category: 'doujinshi' });
  }

  async getManga(options = {}) {
    return this.getLatest({ ...options, category: 'manga' });
  }

  async getArtbook(options = {}) {
    return this.getLatest({ ...options, category: 'artbook' });
  }

  async getMangaDetails(mangaId) {
    try {
      // Try API first
      const apiUrl = `${this.apiUrl}/v2/library/${mangaId}`;
      
      try {
        const response = await this.fetch(apiUrl, {
          headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();
        
        if (data.entry) {
          return this.formatApiEntry(data.entry, true);
        }
      } catch {
        // Continue to HTML fallback
      }
      
      // HTML fallback
      const html = await this.fetchHtml(`${this.baseUrl}/g/${mangaId}`);
      return this.parseGalleryDetails(html, mangaId);
    } catch (error) {
      this.log.warn('Anchira details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    // Anchira galleries are single "chapters"
    try {
      const details = await this.getMangaDetails(mangaId);
      return [{
        id: mangaId,
        mangaId,
        chapter: '1',
        title: details.title,
        pages: details.pages || 0,
        language: details.language || 'en'
      }];
    } catch (error) {
      return [];
    }
  }

  async getChapterPages(galleryId) {
    try {
      // Try API first for image data
      try {
        const apiUrl = `${this.apiUrl}/v2/library/${galleryId}/data`;
        const response = await this.fetch(apiUrl, {
          headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();
        
        if (data.pages && Array.isArray(data.pages)) {
          return data.pages.map((page, index) => ({
            index: index + 1,
            url: page.url || page.src || page,
            width: page.width,
            height: page.height
          }));
        }
      } catch {
        // Continue to HTML fallback
      }
      
      // HTML fallback
      const html = await this.fetchHtml(`${this.baseUrl}/g/${galleryId}`);
      return this.parseGalleryPages(html, galleryId);
    } catch (error) {
      this.log.warn('Anchira pages failed', { galleryId, error: error.message });
      throw error;
    }
  }

  formatApiEntry(entry, detailed = false) {
    const tags = entry.tags?.map(t => typeof t === 'string' ? t : t.name) || [];
    const artists = entry.artists?.map(a => typeof a === 'string' ? a : a.name) || [];
    const parodies = entry.parodies?.map(p => typeof p === 'string' ? p : p.name) || [];
    const characters = entry.characters?.map(c => typeof c === 'string' ? c : c.name) || [];
    const circles = entry.circles?.map(c => typeof c === 'string' ? c : c.name) || [];
    
    const type = entry.type || 'doujinshi';
    
    return this.formatManga({
      id: String(entry.id || entry.slug),
      title: entry.title || entry.name || `Entry ${entry.id}`,
      altTitles: entry.alt_title ? [entry.alt_title] : [],
      description: entry.description || `${type}${parodies.length ? ` | Parody: ${parodies.join(', ')}` : ''}${characters.length ? ` | Characters: ${characters.join(', ')}` : ''}`,
      coverUrl: entry.cover || entry.thumbnail || '',
      author: artists.join(', ') || circles.join(', ') || 'Unknown',
      artist: artists.join(', ') || 'Unknown',
      status: 'completed',
      tags,
      genres: [type],
      type,
      parodies,
      characters,
      artists,
      circles,
      pages: entry.pages || entry.page_count || 0,
      language: entry.language || 'en',
      rating: entry.rating || null,
      views: entry.views || 0,
      adult: true,
      updatedAt: entry.updated_at || entry.created_at || null
    });
  }

  parseGalleryList(html) {
    const results = [];
    
    // Match gallery cards
    const galleryRegex = /<article[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/article>|<div[^>]*class="[^"]*gallery-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const linkRegex = /href="\/g\/([^/"]+)\/?"/i;
    const titleRegex = /class="[^"]*title[^"]*"[^>]*>([^<]+)<\/|title="([^"]+)"/i;
    const thumbRegex = /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i;
    const pagesRegex = /(\d+)\s*(?:pages?|P)/i;
    
    let match;
    while ((match = galleryRegex.exec(html)) !== null) {
      const content = match[1] || match[2];
      const linkMatch = linkRegex.exec(content);
      
      if (linkMatch) {
        const id = linkMatch[1];
        const titleMatch = titleRegex.exec(content);
        const thumbMatch = thumbRegex.exec(content);
        const pagesMatch = pagesRegex.exec(content);
        
        results.push(this.formatManga({
          id,
          title: this.decodeHtml((titleMatch?.[1] || titleMatch?.[2] || `Gallery ${id}`).trim()),
          coverUrl: thumbMatch ? thumbMatch[1] : '',
          pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
          adult: true
        }));
      }
    }
    
    return results;
  }

  parseGalleryDetails(html, galleryId) {
    const titleMatch = /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i.exec(html);
    const coverMatch = /<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"[^>]*>/i.exec(html);
    
    // Extract tags
    const tags = [];
    const artists = [];
    const parodies = [];
    const characters = [];
    let language = 'english';
    
    // Parse tag sections
    const tagRowRegex = /<div[^>]*class="[^"]*tag-row[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*label[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<div[^>]*class="[^"]*tags[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let tagRow;
    
    while ((tagRow = tagRowRegex.exec(html)) !== null) {
      const namespace = tagRow[1].toLowerCase().trim();
      const tagContent = tagRow[2];
      
      const tagRegex = /<a[^>]*>([^<]+)<\/a>/gi;
      let tagMatch;
      
      while ((tagMatch = tagRegex.exec(tagContent)) !== null) {
        const tag = tagMatch[1].trim();
        
        switch (namespace) {
          case 'artist':
          case 'artists':
            artists.push(tag);
            break;
          case 'parody':
          case 'parodies':
            parodies.push(tag);
            break;
          case 'character':
          case 'characters':
            characters.push(tag);
            break;
          case 'language':
          case 'languages':
            language = tag;
            break;
          default:
            tags.push(tag);
        }
      }
    }
    
    // Extract page count
    const pagesMatch = /(\d+)\s*Pages/i.exec(html);
    
    return this.formatManga({
      id: galleryId,
      title: this.decodeHtml((titleMatch?.[1] || `Gallery ${galleryId}`).trim()),
      description: parodies.length ? `Parody: ${parodies.join(', ')}` : '',
      coverUrl: coverMatch ? coverMatch[1] : '',
      author: artists.join(', ') || 'Unknown',
      artist: artists.join(', ') || 'Unknown',
      status: 'completed',
      tags,
      parodies,
      characters,
      artists,
      pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
      language,
      adult: true
    });
  }

  parseGalleryPages(html, galleryId) {
    const pages = [];
    
    // Look for image data in script or page structure
    const imgRegex = /<img[^>]*class="[^"]*page[^"]*"[^>]*(?:src|data-src)="([^"]+)"[^>]*>/gi;
    let match;
    let pageNum = 1;
    
    while ((match = imgRegex.exec(html)) !== null) {
      pages.push({
        index: pageNum++,
        url: match[1]
      });
    }
    
    // Try JSON data in script
    if (pages.length === 0) {
      const jsonMatch = /var\s+images\s*=\s*(\[[\s\S]*?\]);/i.exec(html);
      if (jsonMatch) {
        try {
          const images = JSON.parse(jsonMatch[1]);
          images.forEach((img, idx) => {
            pages.push({
              index: idx + 1,
              url: typeof img === 'string' ? img : img.url || img.src
            });
          });
        } catch (e) {
          // Continue
        }
      }
    }
    
    return pages;
  }

  decodeHtml(html) {
    if (!html) return '';
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

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
}

const anchiraSource = new AnchiraSource();

export default anchiraSource;
export { anchiraSource, ANCHIRA_CATEGORIES };
