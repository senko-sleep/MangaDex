/**
 * MangaKakalot/Manganato Source
 * Large manga library with frequent updates
 */

import BaseSource from './base';

class MangaKakalotSource extends BaseSource {
  constructor() {
    super({
      name: 'MangaKakalot',
      baseUrl: 'https://mangakakalot.com',
      adult: false,
      features: ['search', 'popular', 'latest', 'chapters'],
      rateLimit: 1000
    });
    this.altUrl = 'https://manganato.com';
  }

  async search(query, options = {}) {
    const { limit = 24 } = options;
    
    try {
      const searchUrl = `${this.baseUrl}/search/story/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
      const html = await this.fetchHtml(searchUrl);
      
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/manga_list?type=topview&category=all&state=all&page=1`);
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/manga_list?type=latest&category=all&state=all&page=1`);
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      // mangaId could be a full URL or just the slug
      const url = mangaId.startsWith('http') ? mangaId : `${this.baseUrl}/manga/${mangaId}`;
      const html = await this.fetchHtml(url);
      
      return this.parseMangaDetails(html, mangaId);
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    try {
      const url = mangaId.startsWith('http') ? mangaId : `${this.baseUrl}/manga/${mangaId}`;
      const html = await this.fetchHtml(url);
      
      return this.parseChapterList(html, mangaId);
    } catch (error) {
      this.log.warn('Get chapters failed', { mangaId, error: error.message });
      return [];
    }
  }

  async getChapterPages(chapterId) {
    try {
      const url = chapterId.startsWith('http') ? chapterId : `${this.baseUrl}/chapter/${chapterId}`;
      const html = await this.fetchHtml(url);
      
      return this.parseChapterPages(html);
    } catch (error) {
      this.log.warn('Get pages failed', { chapterId, error: error.message });
      throw error;
    }
  }

  // Parse search results from HTML
  parseSearchResults(html) {
    const results = [];
    
    // Match story items
    const storyRegex = /<div class="story_item"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    const itemRegex = /<a[^>]*href="([^"]*)"[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*>/i;
    const titleRegex = /<h3[^>]*>\s*<a[^>]*>([^<]*)<\/a>/i;
    
    let match;
    while ((match = storyRegex.exec(html)) !== null) {
      const content = match[1];
      const itemMatch = itemRegex.exec(content);
      const titleMatch = titleRegex.exec(content);
      
      if (itemMatch && titleMatch) {
        const url = itemMatch[1];
        const id = this.extractIdFromUrl(url);
        
        results.push(this.formatManga({
          id,
          title: this.decodeHtml(titleMatch[1].trim()),
          coverUrl: itemMatch[2],
          url
        }));
      }
    }
    
    // Alternative format
    if (results.length === 0) {
      const altRegex = /<div class="list-truyen-item-wrap"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      while ((match = altRegex.exec(html)) !== null) {
        const content = match[1];
        const linkMatch = /<a[^>]*href="([^"]*)"[^>]*title="([^"]*)"[^>]*>/i.exec(content);
        const imgMatch = /<img[^>]*src="([^"]*)"[^>]*>/i.exec(content);
        
        if (linkMatch) {
          results.push(this.formatManga({
            id: this.extractIdFromUrl(linkMatch[1]),
            title: this.decodeHtml(linkMatch[2]),
            coverUrl: imgMatch ? imgMatch[1] : '',
            url: linkMatch[1]
          }));
        }
      }
    }
    
    return results;
  }

  // Parse manga details
  parseMangaDetails(html, mangaId) {
    const titleMatch = /<h1[^>]*>([^<]*)<\/h1>/i.exec(html);
    const descMatch = /<div[^>]*id="noidungm"[^>]*>([\s\S]*?)<\/div>/i.exec(html) ||
                      /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    const imgMatch = /<div[^>]*class="[^"]*manga-info-pic[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/i.exec(html);
    const authorMatch = /Author[^:]*:\s*<[^>]*>([^<]*)<\/a>/i.exec(html);
    const statusMatch = /Status[^:]*:\s*([^<\n]*)/i.exec(html);
    
    return this.formatManga({
      id: mangaId,
      title: titleMatch ? this.decodeHtml(titleMatch[1].trim()) : 'Unknown',
      description: descMatch ? this.stripHtml(descMatch[1]).trim() : '',
      coverUrl: imgMatch ? imgMatch[1] : '',
      author: authorMatch ? this.decodeHtml(authorMatch[1].trim()) : 'Unknown',
      status: statusMatch ? statusMatch[1].trim() : 'unknown'
    });
  }

  // Parse chapter list
  parseChapterList(html, mangaId) {
    const chapters = [];
    const chapterRegex = /<a[^>]*class="[^"]*chapter-name[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    
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
    
    // Alternative format
    if (chapters.length === 0) {
      const altRegex = /<li[^>]*class="[^"]*a-h[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
      while ((match = altRegex.exec(html)) !== null) {
        chapters.push(this.formatChapter({
          id: match[1],
          mangaId,
          chapter: this.extractChapterNumber(match[2]),
          title: this.decodeHtml(match[2].trim())
        }));
      }
    }
    
    return chapters.reverse(); // Oldest first
  }

  // Parse chapter pages
  parseChapterPages(html) {
    const pages = [];
    const imgRegex = /<img[^>]*class="[^"]*img-loading[^"]*"[^>]*(?:src|data-src)="([^"]*)"[^>]*>/gi;
    
    let match;
    let index = 1;
    while ((match = imgRegex.exec(html)) !== null) {
      pages.push({
        index: index++,
        url: match[1]
      });
    }
    
    // Alternative: look for container-chapter-reader images
    if (pages.length === 0) {
      const containerMatch = /<div[^>]*class="[^"]*container-chapter-reader[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
      if (containerMatch) {
        const altImgRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi;
        while ((match = altImgRegex.exec(containerMatch[1])) !== null) {
          if (!match[1].includes('logo') && !match[1].includes('ads')) {
            pages.push({
              index: pages.length + 1,
              url: match[1]
            });
          }
        }
      }
    }
    
    return pages;
  }

  // Helper methods
  extractIdFromUrl(url) {
    const parts = url.replace(/\/$/, '').split('/');
    return parts[parts.length - 1] || url;
  }

  extractChapterNumber(title) {
    const match = /chapter[:\s-]*(\d+(?:\.\d+)?)/i.exec(title);
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

export default new MangaKakalotSource();
