import BaseScraper from './base.js';

// ReaperScans - Popular manhwa translation group  
export class ReaperScansScraper extends BaseScraper {
  constructor() {
    super('ReaperScans', 'https://reaperscans.com', false);
  }

  async search(query, page = 1, includeAdult = true) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/comics?search=${encodeURIComponent(query)}&page=${page}`);
      if (!$) return [];
      return this.parseList($);
    } catch (e) {
      console.error('[ReaperScans] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/comics?order=popular&page=${page}`);
      if (!$) return [];
      return this.parseList($);
    } catch (e) {
      console.error('[ReaperScans] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/comics?order=latest&page=${page}`);
      if (!$) return [];
      return this.parseList($);
    } catch (e) {
      console.error('[ReaperScans] Latest error:', e.message);
      return [];
    }
  }

  parseList($) {
    const results = [];
    $('a[href*="/comics/"]').each((i, el) => {
      const $el = $(el);
      const link = $el.attr('href') || '';
      const slug = link.split('/comics/').pop()?.replace(/\/$/, '') || '';
      const title = $el.find('h2, .title').text().trim() || $el.attr('title') || '';
      const cover = $el.find('img').attr('src') || '';

      if (slug && title && !link.includes('/chapter/')) {
        results.push({
          id: `reaperscans:${slug}`,
          sourceId: 'reaperscans',
          slug,
          title,
          cover,
          isAdult: false,
        });
      }
    });
    
    // Dedupe
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  async getMangaDetails(id) {
    const slug = id.replace('reaperscans:', '');
    try {
      const $ = await this.fetch(`${this.baseUrl}/comics/${slug}`);
      if (!$) return null;

      const title = $('h1').first().text().trim();
      const description = $('[class*="description"], .synopsis').text().trim();
      const cover = $('img[class*="cover"]').attr('src') || '';
      const genres = [];
      $('a[href*="/genre/"]').each((i, el) => {
        genres.push($(el).text().trim());
      });

      return {
        id,
        sourceId: 'reaperscans',
        slug,
        title,
        description,
        cover,
        genres,
        tags: genres,
        isAdult: false,
      };
    } catch (e) {
      console.error('[ReaperScans] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('reaperscans:', '');
    try {
      const $ = await this.fetch(`${this.baseUrl}/comics/${slug}`);
      if (!$) return [];

      const chapters = [];
      $('a[href*="/chapter/"]').each((i, el) => {
        const $el = $(el);
        const link = $el.attr('href') || '';
        const chMatch = link.match(/chapter[/-](\d+(?:\.\d+)?)/i);
        const chNum = chMatch ? chMatch[1] : String(i + 1);
        const chId = link.split('/').pop() || `chapter-${chNum}`;

        chapters.push({
          id: chId,
          mangaId,
          chapter: chNum,
          title: $el.text().trim() || `Chapter ${chNum}`,
          sourceId: 'reaperscans',
        });
      });
      return chapters;
    } catch (e) {
      console.error('[ReaperScans] Chapters error:', e.message);
      return [];
    }
  }

  async getChapterPages(chapterId, mangaId) {
    const slug = mangaId.replace('reaperscans:', '');
    try {
      const $ = await this.fetch(`${this.baseUrl}/comics/${slug}/${chapterId}`);
      if (!$) return [];

      const pages = [];
      $('img[class*="chapter"], .reader-content img').each((i, el) => {
        const url = $(el).attr('src') || $(el).attr('data-src') || '';
        if (url) {
          pages.push({ page: i + 1, url });
        }
      });
      return pages;
    } catch (e) {
      console.error('[ReaperScans] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    return [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Harem',
      'Historical', 'Horror', 'Isekai', 'Martial Arts', 'Mecha',
      'Mystery', 'Psychological', 'Romance', 'School Life', 'Sci-Fi',
      'Seinen', 'Shounen', 'Slice of Life', 'Sports', 'Supernatural'
    ];
  }
}

export default ReaperScansScraper;
