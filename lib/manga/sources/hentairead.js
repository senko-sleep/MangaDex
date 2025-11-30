/**
 * HentaiRead Source
 * Adult manga with chapters
 */

import BaseSource from './base';

class HentaiReadSource extends BaseSource {
  constructor() {
    super({
      name: 'HentaiRead',
      baseUrl: 'https://hentairead.com',
      adult: true,
      features: ['search', 'popular', 'latest', 'chapters', 'hentai'],
      rateLimit: 1500
    });
  }

  async search(query, options = {}) {
    const { limit = 24 } = options;
    
    try {
      const url = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
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
      const html = await this.fetchHtml(`${this.baseUrl}/hentai-list/all/popular/`);
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/hentai-list/all/new/`);
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      const url = mangaId.startsWith('http') ? mangaId : `${this.baseUrl}/hentai/${mangaId}/`;
      const html = await this.fetchHtml(url);
      return this.parseMangaDetails(html, mangaId);
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    try {
      const url = mangaId.startsWith('http') ? mangaId : `${this.baseUrl}/hentai/${mangaId}/`;
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
    const cardRegex = /<div[^>]*class="[^"]*manga-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    const linkRegex = /<a[^>]*href="([^"]*hentai\/[^"]*)"[^>]*>/i;
    const imgRegex = /<img[^>]*(?:src|data-src)="([^"]*)"[^>]*>/i;
    const titleRegex = /<h[23][^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>/i;
    
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
          url: linkMatch[1],
          adult: true
        }));
      }
    }
    
    // Alternative parsing
    if (results.length === 0) {
      const altRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
      while ((match = altRegex.exec(html)) !== null) {
        const content = match[1];
        const linkMatch = /<a[^>]*href="([^"]*)"[^>]*>/i.exec(content);
        const imgMatch = /<img[^>]*(?:src|data-src)="([^"]*)"[^>]*>/i.exec(content);
        const titleMatch = /<h\d[^>]*>([^<]*)<\/h\d>/i.exec(content);
        
        if (linkMatch && titleMatch) {
          results.push(this.formatManga({
            id: this.extractId(linkMatch[1]),
            title: this.decodeHtml(titleMatch[1].trim()),
            coverUrl: imgMatch ? imgMatch[1] : '',
            url: linkMatch[1],
            adult: true
          }));
        }
      }
    }
    
    return results;
  }

  parseMangaDetails(html, mangaId) {
    const titleMatch = /<h1[^>]*>([^<]*)<\/h1>/i.exec(html);
    const descMatch = /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    const imgMatch = /<div[^>]*class="[^"]*cover[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/i.exec(html);
    const authorMatch = /Author[^:]*:\s*<[^>]*>([^<]*)<\/a>/i.exec(html);
    
    // Extract tags
    const tags = [];
    const tagRegex = /<a[^>]*href="[^"]*tag\/[^"]*"[^>]*>([^<]*)<\/a>/gi;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(html)) !== null) {
      tags.push(tagMatch[1].trim());
    }
    
    return this.formatManga({
      id: mangaId,
      title: titleMatch ? this.decodeHtml(titleMatch[1].trim()) : mangaId,
      description: descMatch ? this.stripHtml(descMatch[1]).trim() : '',
      coverUrl: imgMatch ? imgMatch[1] : '',
      author: authorMatch ? this.decodeHtml(authorMatch[1].trim()) : 'Unknown',
      tags,
      adult: true
    });
  }

  parseChapters(html, mangaId) {
    const chapters = [];
    
    // Match chapter links
    const chapterRegex = /<li[^>]*class="[^"]*chapter[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    
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
    
    // If no chapters found, treat as single chapter
    if (chapters.length === 0) {
      chapters.push(this.formatChapter({
        id: mangaId,
        mangaId,
        chapter: '1',
        title: 'Chapter 1'
      }));
    }
    
    return chapters.reverse();
  }

  parseChapterPages(html) {
    const pages = [];
    
    // Match reader images
    const imgRegex = /<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*(?:src|data-src)="([^"]*)"[^>]*>/gi;
    
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      pages.push({
        index: pages.length + 1,
        url: match[1].trim()
      });
    }
    
    // Alternative: look for page images in reader container
    if (pages.length === 0) {
      const containerMatch = /<div[^>]*class="[^"]*reading-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
      if (containerMatch) {
        const altImgRegex = /<img[^>]*(?:src|data-src)="([^"]*)"[^>]*>/gi;
        while ((match = altImgRegex.exec(containerMatch[1])) !== null) {
          const url = match[1].trim();
          if (url && !url.includes('logo') && !url.includes('ads')) {
            pages.push({
              index: pages.length + 1,
              url
            });
          }
        }
      }
    }
    
    return pages;
  }

  extractId(url) {
    const match = /hentai\/([^/]+)/i.exec(url);
    return match ? match[1] : url;
  }

  extractChapterNumber(title) {
    const match = /chapter[:\s-]*(\d+(?:\.\d+)?)/i.exec(title);
    return match ? match[1] : '1';
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

export default new HentaiReadSource();
