/**
 * MangaSee/MangaLife Source
 * High quality scans with good organization
 */

import BaseSource from './base';

class MangaSeeSource extends BaseSource {
  constructor() {
    super({
      name: 'MangaSee',
      baseUrl: 'https://mangasee123.com',
      adult: false,
      features: ['search', 'popular', 'latest', 'chapters', 'highquality'],
      rateLimit: 1000
    });
  }

  async search(query, options = {}) {
    const { limit = 24 } = options;
    
    try {
      // MangaSee uses JavaScript-based search, we need to fetch the manga list
      const html = await this.fetchHtml(`${this.baseUrl}/search/?name=${encodeURIComponent(query)}`);
      return this.parseSearchResults(html, query).slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/hot.php`);
      return this.parseHotList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}`);
      return this.parseLatestUpdates(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      const url = `${this.baseUrl}/manga/${mangaId}`;
      const html = await this.fetchHtml(url);
      return this.parseMangaDetails(html, mangaId);
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    try {
      const url = `${this.baseUrl}/manga/${mangaId}`;
      const html = await this.fetchHtml(url);
      return this.parseChapters(html, mangaId);
    } catch (error) {
      this.log.warn('Get chapters failed', { mangaId, error: error.message });
      return [];
    }
  }

  async getChapterPages(chapterId) {
    try {
      // ChapterId format: mangaId-chapter-X
      const url = `${this.baseUrl}/read-online/${chapterId}.html`;
      const html = await this.fetchHtml(url);
      return this.parseChapterPages(html);
    } catch (error) {
      this.log.warn('Get pages failed', { chapterId, error: error.message });
      throw error;
    }
  }

  parseSearchResults(html, query) {
    const results = [];
    
    // Extract manga list from JavaScript variable
    const vmMatch = /vm\.Directory\s*=\s*(\[[\s\S]*?\]);/i.exec(html);
    if (vmMatch) {
      try {
        const directory = JSON.parse(vmMatch[1]);
        const queryLower = query.toLowerCase();
        
        for (const manga of directory) {
          const title = manga.s || '';
          if (title.toLowerCase().includes(queryLower)) {
            results.push(this.formatManga({
              id: manga.i,
              title: title,
              coverUrl: `https://temp.compsci88.com/cover/${manga.i}.jpg`,
              status: manga.ss || 'unknown',
              genres: manga.g || []
            }));
          }
        }
      } catch {
        // Fallback to HTML parsing
      }
    }
    
    return results;
  }

  parseHotList(html) {
    const results = [];
    const itemRegex = /<a[^>]*href="\/manga\/([^"]*)"[^>]*class="[^"]*SeriesName[^"]*"[^>]*>([^<]*)<\/a>/gi;
    
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
      results.push(this.formatManga({
        id: match[1],
        title: match[2].trim(),
        coverUrl: `https://temp.compsci88.com/cover/${match[1]}.jpg`
      }));
    }
    
    return results;
  }

  parseLatestUpdates(html) {
    const results = [];
    const sectionMatch = /<div[^>]*class="[^"]*LatestChapters[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i.exec(html);
    
    if (sectionMatch) {
      const itemRegex = /<a[^>]*href="\/manga\/([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[\s\S]*?<strong>([^<]*)<\/strong>/gi;
      
      let match;
      while ((match = itemRegex.exec(sectionMatch[1])) !== null) {
        results.push(this.formatManga({
          id: match[1],
          title: match[3].trim(),
          coverUrl: match[2]
        }));
      }
    }
    
    return results;
  }

  parseMangaDetails(html, mangaId) {
    const titleMatch = /<h1[^>]*>([^<]*)<\/h1>/i.exec(html);
    const descMatch = /<div[^>]*class="[^"]*Content[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    const authorMatch = /Author[^:]*:\s*<[^>]*>([^<]*)<\/a>/i.exec(html);
    const statusMatch = /Status[^:]*:\s*<[^>]*>([^<]*)<\/a>/i.exec(html);
    
    return this.formatManga({
      id: mangaId,
      title: titleMatch ? titleMatch[1].trim() : mangaId,
      description: descMatch ? this.stripHtml(descMatch[1]).trim() : '',
      coverUrl: `https://temp.compsci88.com/cover/${mangaId}.jpg`,
      author: authorMatch ? authorMatch[1].trim() : 'Unknown',
      status: statusMatch ? statusMatch[1].trim() : 'unknown'
    });
  }

  parseChapters(html, mangaId) {
    const chapters = [];
    
    // Extract from JavaScript
    const vmMatch = /vm\.Chapters\s*=\s*(\[[\s\S]*?\]);/i.exec(html);
    if (vmMatch) {
      try {
        const chapterList = JSON.parse(vmMatch[1]);
        
        for (const ch of chapterList) {
          const chapterNum = this.decodeChapter(ch.Chapter);
          chapters.push(this.formatChapter({
            id: `${mangaId}-chapter-${chapterNum}`,
            mangaId,
            chapter: chapterNum,
            title: ch.ChapterName || `Chapter ${chapterNum}`,
            publishedAt: ch.Date
          }));
        }
      } catch {
        // Fallback
      }
    }
    
    return chapters;
  }

  parseChapterPages(html) {
    const pages = [];
    
    // Extract from JavaScript
    const pagesMatch = /vm\.CurChapter\s*=\s*({[\s\S]*?});/i.exec(html);
    const pathMatch = /vm\.CurPathName\s*=\s*"([^"]*)"/i.exec(html);
    const indexMatch = /vm\.IndexName\s*=\s*"([^"]*)"/i.exec(html);
    
    if (pagesMatch && pathMatch) {
      try {
        const chapter = JSON.parse(pagesMatch[1]);
        const pathName = pathMatch[1];
        const indexName = indexMatch ? indexMatch[1] : '';
        const pageCount = parseInt(chapter.Page) || 0;
        const chapterNum = this.decodeChapter(chapter.Chapter);
        
        for (let i = 1; i <= pageCount; i++) {
          const pageNum = String(i).padStart(3, '0');
          pages.push({
            index: i,
            url: `https://${pathName}/manga/${indexName}/${this.formatChapterPath(chapterNum)}-${pageNum}.png`
          });
        }
      } catch {
        // Fallback
      }
    }
    
    return pages;
  }

  decodeChapter(encoded) {
    if (!encoded) return '0';
    const major = (parseInt(encoded.slice(1, -1)) || 0).toString();
    const minor = encoded.slice(-1);
    return minor === '0' ? major : `${major}.${minor}`;
  }

  formatChapterPath(chapter) {
    const parts = chapter.split('.');
    const major = parts[0].padStart(4, '0');
    const minor = parts[1] || '';
    return minor ? `${major}.${minor}` : major;
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }
}

export default new MangaSeeSource();
