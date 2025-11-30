/**
 * MangaPark Source
 * Multiple versions/scanlations available
 */

import BaseSource from './base';

class MangaParkSource extends BaseSource {
  constructor() {
    super({
      name: 'MangaPark',
      baseUrl: 'https://mangapark.net',
      adult: false,
      features: ['search', 'popular', 'latest', 'chapters', 'multiversion'],
      rateLimit: 1000
    });
  }

  async search(query, options = {}) {
    const { limit = 24 } = options;
    
    try {
      const url = `${this.baseUrl}/search?word=${encodeURIComponent(query)}`;
      const html = await this.fetchHtml(url);
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/browse?sort=d007`);
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/browse?sort=update`);
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      const url = mangaId.startsWith('http') ? mangaId : `${this.baseUrl}/title/${mangaId}`;
      const html = await this.fetchHtml(url);
      return this.parseMangaDetails(html, mangaId);
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    try {
      const url = mangaId.startsWith('http') ? mangaId : `${this.baseUrl}/title/${mangaId}`;
      const html = await this.fetchHtml(url);
      return this.parseChapters(html, mangaId);
    } catch (error) {
      this.log.warn('Get chapters failed', { mangaId, error: error.message });
      return [];
    }
  }

  async getChapterPages(chapterId) {
    try {
      const url = chapterId.startsWith('http') ? chapterId : `${this.baseUrl}${chapterId}`;
      const html = await this.fetchHtml(url);
      return this.parseChapterPages(html);
    } catch (error) {
      this.log.warn('Get pages failed', { chapterId, error: error.message });
      throw error;
    }
  }

  parseSearchResults(html) {
    const results = [];
    
    // Match manga cards
    const cardRegex = /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*cover[^"]*"[^>]*>/i;
    const imgRegex = /<img[^>]*(?:src|data-src)="([^"]*)"[^>]*>/i;
    const titleRegex = /<a[^>]*class="[^"]*fw-bold[^"]*"[^>]*>([^<]*)<\/a>/i;
    
    let match;
    while ((match = cardRegex.exec(html)) !== null) {
      const content = match[1];
      const linkMatch = linkRegex.exec(content);
      const imgMatch = imgRegex.exec(content);
      const titleMatch = titleRegex.exec(content);
      
      if (linkMatch && titleMatch) {
        results.push(this.formatManga({
          id: this.extractId(linkMatch[1]),
          title: this.decodeHtml(titleMatch[1].trim()),
          coverUrl: imgMatch ? imgMatch[1] : '',
          url: linkMatch[1]
        }));
      }
    }
    
    return results;
  }

  parseMangaDetails(html, mangaId) {
    const titleMatch = /<h3[^>]*class="[^"]*item-title[^"]*"[^>]*>([^<]*)<\/h3>/i.exec(html);
    const descMatch = /<div[^>]*class="[^"]*limit-html[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    const imgMatch = /<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]*)"[^>]*>/i.exec(html);
    const authorMatch = /<span[^>]*>Author[^<]*<\/span>[\s\S]*?<a[^>]*>([^<]*)<\/a>/i.exec(html);
    const statusMatch = /<span[^>]*>Status[^<]*<\/span>[\s\S]*?<span[^>]*>([^<]*)<\/span>/i.exec(html);
    
    return this.formatManga({
      id: mangaId,
      title: titleMatch ? this.decodeHtml(titleMatch[1].trim()) : mangaId,
      description: descMatch ? this.stripHtml(descMatch[1]).trim() : '',
      coverUrl: imgMatch ? imgMatch[1] : '',
      author: authorMatch ? this.decodeHtml(authorMatch[1].trim()) : 'Unknown',
      status: statusMatch ? statusMatch[1].trim() : 'unknown'
    });
  }

  parseChapters(html, mangaId) {
    const chapters = [];
    
    // Match chapter links
    const chapterRegex = /<a[^>]*href="([^"]*chapter[^"]*)"[^>]*class="[^"]*chapt[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/gi;
    
    let match;
    while ((match = chapterRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();
      const chapterNum = this.extractChapterNumber(title);
      
      chapters.push(this.formatChapter({
        id: url,
        mangaId,
        chapter: chapterNum,
        title: this.decodeHtml(title)
      }));
    }
    
    return chapters.reverse();
  }

  parseChapterPages(html) {
    const pages = [];
    
    // Extract images from script
    const scriptMatch = /images\s*=\s*(\[[\s\S]*?\])/i.exec(html);
    if (scriptMatch) {
      try {
        const images = JSON.parse(scriptMatch[1].replace(/'/g, '"'));
        for (let i = 0; i < images.length; i++) {
          pages.push({
            index: i + 1,
            url: images[i]
          });
        }
      } catch {
        // Fallback to img parsing
      }
    }
    
    // Fallback
    if (pages.length === 0) {
      const imgRegex = /<img[^>]*class="[^"]*page-img[^"]*"[^>]*(?:src|data-src)="([^"]*)"[^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        pages.push({
          index: pages.length + 1,
          url: match[1]
        });
      }
    }
    
    return pages;
  }

  extractId(url) {
    const match = /\/title\/([^/]+)/i.exec(url);
    return match ? match[1] : url;
  }

  extractChapterNumber(title) {
    const match = /ch[:\s.-]*(\d+(?:\.\d+)?)/i.exec(title);
    return match ? match[1] : '0';
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
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

export default new MangaParkSource();
