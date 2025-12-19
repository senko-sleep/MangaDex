/**
 * nhentai Source
 * Adult doujinshi/hentai manga source
 */

import BaseSource from './base';

class NHentaiSource extends BaseSource {
  constructor() {
    super({
      name: 'nhentai',
      baseUrl: 'https://nhentai.net',
      adult: true,
      features: ['search', 'popular', 'latest', 'tags', 'doujinshi'],
      rateLimit: 1500
    });
    this.imageServer = 'https://i.nhentai.net';
    this.thumbServer = 'https://t.nhentai.net';
  }

  async search(query, options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.baseUrl}/search/?q=${encodeURIComponent(query)}&page=${page}`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = page > 1 
        ? `${this.baseUrl}/?sort=popular&page=${page}`
        : `${this.baseUrl}/?sort=popular`;
      
      const html = await this.fetchHtml(url);
      const results = this.parseGalleryList(html);
      
      return {
        results: results.slice(0, limit),
        hasMore: results.length >= limit,
        nextPage: page + 1,
        sort: 'popular',
        sortOrder: 'desc'
      };
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getLatest(options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = page > 1 
        ? `${this.baseUrl}/?page=${page}`
        : this.baseUrl;
      
      const html = await this.fetchHtml(url);
      const results = this.parseGalleryList(html);
      
      return {
        results: results.slice(0, limit),
        hasMore: results.length >= limit,
        nextPage: page + 1,
        sort: 'latest',
        sortOrder: 'desc'
      };
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getMangaDetails(mangaId) {
    try {
      const url = `${this.baseUrl}/g/${mangaId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryDetails(html, mangaId);
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    // nhentai galleries are single "chapters"
    try {
      const details = await this.getMangaDetails(mangaId);
      return [{
        id: mangaId,
        mangaId,
        chapter: '1',
        title: details.title,
        pages: details.pages || 0
      }];
    } catch (error) {
      return [];
    }
  }

  async getChapterPages(galleryId) {
    try {
      const url = `${this.baseUrl}/g/${galleryId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryPages(html, galleryId);
    } catch (error) {
      this.log.warn('Get pages failed', { galleryId, error: error.message });
      throw error;
    }
  }

  parseGalleryList(html) {
    const results = [];
    
    // Match gallery containers
    const galleryRegex = /<div[^>]*class="[^"]*gallery[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    const linkRegex = /<a[^>]*href="\/g\/(\d+)\/"[^>]*>/i;
    const imgRegex = /<img[^>]*(?:src|data-src)="([^"]*)"[^>]*>/i;
    const titleRegex = /<div[^>]*class="[^"]*caption[^"]*"[^>]*>([^<]*)<\/div>/i;
    
    let match;
    while ((match = galleryRegex.exec(html)) !== null) {
      const content = match[1];
      const linkMatch = linkRegex.exec(content);
      const imgMatch = imgRegex.exec(content);
      const titleMatch = titleRegex.exec(content);
      
      if (linkMatch) {
        results.push(this.formatManga({
          id: linkMatch[1],
          title: titleMatch ? this.decodeHtml(titleMatch[1].trim()) : `Gallery ${linkMatch[1]}`,
          coverUrl: imgMatch ? imgMatch[1].replace('t.nhentai', 'i.nhentai').replace('t.', '.') : '',
          adult: true
        }));
      }
    }
    
    return results;
  }

  parseGalleryDetails(html, galleryId) {
    const titleMatch = /<h1[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*pretty[^"]*"[^>]*>([^<]*)<\/span>/i.exec(html);
    const pagesMatch = /(\d+)\s*pages/i.exec(html);
    const coverMatch = /<div[^>]*id="cover"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/i.exec(html);
    
    // Extract tags
    const tags = [];
    const tagRegex = /<a[^>]*href="\/tag\/([^"]*)\/"[^>]*class="[^"]*tag[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]*)<\/span>/gi;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(html)) !== null) {
      tags.push(tagMatch[2].trim());
    }
    
    // Extract artists
    const artistMatch = /<a[^>]*href="\/artist\/[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]*)<\/span>/i.exec(html);
    
    return this.formatManga({
      id: galleryId,
      title: titleMatch ? this.decodeHtml(titleMatch[1].trim()) : `Gallery ${galleryId}`,
      coverUrl: coverMatch ? coverMatch[1] : '',
      author: artistMatch ? artistMatch[1].trim() : 'Unknown',
      artist: artistMatch ? artistMatch[1].trim() : 'Unknown',
      tags,
      pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
      adult: true
    });
  }

  parseGalleryPages(html, galleryId) {
    const pages = [];
    
    // Extract media ID and pages info from script
    const mediaIdMatch = /media_id:\s*"?(\d+)"?/i.exec(html);
    const pagesMatch = /(\d+)\s*pages/i.exec(html);
    
    if (mediaIdMatch && pagesMatch) {
      const mediaId = mediaIdMatch[1];
      const pageCount = parseInt(pagesMatch[1]);
      
      // Extract image extension pattern
      const extMatch = /images\s*:\s*\[([\s\S]*?)\]/i.exec(html);
      let extensions = [];
      
      if (extMatch) {
        const extRegex = /t:\s*"([^"]*)"/gi;
        let m;
        while ((m = extRegex.exec(extMatch[1])) !== null) {
          extensions.push(this.getExtension(m[1]));
        }
      }
      
      for (let i = 1; i <= pageCount; i++) {
        const ext = extensions[i - 1] || 'jpg';
        pages.push({
          index: i,
          url: `${this.imageServer}/galleries/${mediaId}/${i}.${ext}`
        });
      }
    } else {
      // Fallback: Parse thumbnail links
      const thumbRegex = /<a[^>]*href="\/g\/\d+\/(\d+)\/"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/gi;
      let match;
      while ((match = thumbRegex.exec(html)) !== null) {
        const pageNum = parseInt(match[1]);
        const thumbUrl = match[2];
        // Convert thumbnail URL to full image URL
        const fullUrl = thumbUrl.replace('t.nhentai', 'i.nhentai').replace(/t\.(jpg|png|gif|webp)/, '.$1');
        pages.push({
          index: pageNum,
          url: fullUrl
        });
      }
    }
    
    return pages.sort((a, b) => a.index - b.index);
  }

  getExtension(type) {
    const types = { j: 'jpg', p: 'png', g: 'gif', w: 'webp' };
    return types[type] || 'jpg';
  }

  decodeHtml(html) {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}

export default new NHentaiSource();
