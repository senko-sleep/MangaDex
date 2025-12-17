import BaseScraper from './base.js';

// MangaSee123 - Very reliable, fast, good quality
export class MangaSeeScraper extends BaseScraper {
  constructor() {
  // MangaSee moved to manga4life.com
    super('MangaSee', 'https://manga4life.com', false);
    this.searchCache = null;
    this.searchCacheTime = 0;
    this.mirrors = [
      'https://manga4life.com',
      'https://mangasee123.com',
    ];
  }

  // MangaSee stores all manga in a JS variable on the _search.php or directory page
  async getSearchIndex() {
    // Cache for 10 minutes
    if (this.searchCache && Date.now() - this.searchCacheTime < 600000) {
      return this.searchCache;
    }

    // Try each mirror
    for (const mirror of this.mirrors) {
      try {
        // Method 1: Try the search page to extract directory
        const res = await this.client.get(`${mirror}/search/`, {
          headers: {
            'Referer': mirror,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });
        const html = res.data;
        
        // Look for vm.Directory = [...] in the page
        let match = html.match(/vm\.Directory\s*=\s*(\[[\s\S]*?\]);/);
        if (!match) {
          // Try alternative pattern
          match = html.match(/Directory\s*=\s*(\[[\s\S]*?\]);/);
        }
        
        if (match) {
          const directory = JSON.parse(match[1]);
          this.searchCache = directory;
          this.searchCacheTime = Date.now();
          this.baseUrl = mirror; // Use working mirror
          console.log(`[MangaSee] Loaded ${directory.length} manga from ${mirror}`);
          return directory;
        }
      } catch (e) {
        console.warn(`[MangaSee] Mirror ${mirror} failed:`, e.message);
      }
    }
    
    console.error('[MangaSee] All mirrors failed');
    return [];
  }

  async search(query, page = 1) {
    const directory = await this.getSearchIndex();
    if (!directory.length) return [];

    const q = query.toLowerCase();
    const results = directory.filter(m => {
      const title = (m.s || '').toLowerCase();
      const alt = (m.al || []).join(' ').toLowerCase();
      return title.includes(q) || alt.includes(q);
    });

    const start = (page - 1) * 24;
    return results.slice(start, start + 24).map(m => this.formatManga(m));
  }

  async getPopular(page = 1) {
    const directory = await this.getSearchIndex();
    if (!directory.length) return [];

    // Sort by views (v field)
    const sorted = [...directory].sort((a, b) => (b.v || 0) - (a.v || 0));
    const start = (page - 1) * 24;
    return sorted.slice(start, start + 24).map(m => this.formatManga(m));
  }

  async getLatest(page = 1) {
    const directory = await this.getSearchIndex();
    if (!directory.length) return [];

    // Sort by last updated (lt field)
    const sorted = [...directory].sort((a, b) => {
      const dateA = new Date(a.lt || 0);
      const dateB = new Date(b.lt || 0);
      return dateB - dateA;
    });
    const start = (page - 1) * 24;
    return sorted.slice(start, start + 24).map(m => this.formatManga(m));
  }

  formatManga(m) {
    const slug = m.i;
    const coverUrl = `https://temp.compsci88.com/cover/${slug}.jpg`;
    return {
      id: `mangasee:${slug}`,
      sourceId: 'mangasee',
      slug,
      title: m.s,
      altTitles: m.al || [],
      cover: `/api/proxy/image?url=${encodeURIComponent(coverUrl)}`,
      status: m.ss || 'Unknown',
      type: m.t || 'Manga',
      genres: m.g || [],
      year: m.y,
      author: m.a?.join(', '),
      views: m.v,
      isLongStrip: (m.g || []).some(g => g.toLowerCase().includes('long strip') || g.toLowerCase().includes('webtoon')),
    };
  }

  async getMangaDetails(id) {
    const slug = id.replace('mangasee:', '');
    const $ = await this.fetch(`${this.baseUrl}/manga/${slug}`);
    if (!$) return null;

    try {
      const title = $('h1').first().text().trim();
      const cover = $('img.img-fluid.bottom-5').attr('src');
      const description = $('div.top-5.Content').text().trim();
      
      const info = {};
      $('li.list-group-item').each((_, el) => {
        const text = $(el).text();
        if (text.includes('Author')) info.author = $(el).find('a').text().trim();
        if (text.includes('Genre')) info.genres = $(el).find('a').map((_, a) => $(a).text().trim()).get();
        if (text.includes('Type')) info.type = $(el).find('a').text().trim();
        if (text.includes('Status')) info.status = $(el).find('a').text().trim();
      });

      return {
        id,
        sourceId: 'mangasee',
        slug,
        title,
        cover: cover ? `/api/proxy/image?url=${encodeURIComponent(cover)}` : null,
        description,
        ...info,
        isLongStrip: (info.genres || []).some(g => g.toLowerCase().includes('long strip') || g.toLowerCase().includes('webtoon')),
      };
    } catch (e) {
      console.error('[MangaSee] Detail parse error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('mangasee:', '');
    
    try {
      const res = await this.client.get(`${this.baseUrl}/manga/${slug}`);
      const html = res.data;
      
      // Extract chapters from JS variable
      const match = html.match(/vm\.Chapters\s*=\s*(\[[\s\S]*?\]);/);
      if (!match) return [];
      
      const chapters = JSON.parse(match[1]);
      
      return chapters.map(ch => {
        const chNum = this.parseChapterNumber(ch.Chapter);
        return {
          id: `${slug}-chapter-${chNum}`,
          mangaId,
          chapter: chNum,
          title: ch.ChapterName || '',
          date: ch.Date,
          sourceId: 'mangasee',
        };
      }).sort((a, b) => parseFloat(b.chapter) - parseFloat(a.chapter));
    } catch (e) {
      console.error('[MangaSee] Chapters error:', e.message);
      return [];
    }
  }

  parseChapterNumber(chStr) {
    // MangaSee format: "100010" = chapter 1, "100150" = chapter 15, etc.
    const num = parseInt(chStr.slice(1, -1), 10);
    const decimal = parseInt(chStr.slice(-1), 10);
    return decimal > 0 ? `${num}.${decimal}` : `${num}`;
  }

  async getChapterPages(chapterId, mangaId) {
    const slug = mangaId.replace('mangasee:', '');
    const chNum = chapterId.replace(`${slug}-chapter-`, '');
    
    // Format chapter for URL
    const chFormatted = chNum.includes('.') 
      ? chNum.replace('.', '-') 
      : chNum;
    
    try {
      const res = await this.client.get(`${this.baseUrl}/read-online/${slug}-chapter-${chFormatted}.html`);
      const html = res.data;
      
      // Extract page info
      const chapterMatch = html.match(/vm\.CurChapter\s*=\s*({[\s\S]*?});/);
      const pathMatch = html.match(/vm\.CurPathName\s*=\s*"([^"]+)"/);
      
      if (!chapterMatch || !pathMatch) return [];
      
      const chapter = JSON.parse(chapterMatch[1]);
      const pathName = pathMatch[1];
      const pageCount = parseInt(chapter.Page, 10);
      
      const pages = [];
      for (let i = 1; i <= pageCount; i++) {
        const pageNum = String(i).padStart(3, '0');
        const chDir = this.formatChapterDir(chapter.Chapter);
        const originalUrl = `https://${pathName}/manga/${slug}/${chDir}-${pageNum}.png`;
        pages.push({
          page: i,
          url: `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`,
          originalUrl,
        });
      }
      
      return pages;
    } catch (e) {
      console.error('[MangaSee] Pages error:', e.message);
      return [];
    }
  }

  formatChapterDir(chStr) {
    const num = parseInt(chStr.slice(1, -1), 10);
    const decimal = parseInt(chStr.slice(-1), 10);
    const formatted = String(num).padStart(4, '0');
    return decimal > 0 ? `${formatted}.${decimal}` : formatted;
  }

  async getTags() {
    try {
      // Get tags from actual manga directory
      const directory = await this.getSearchIndex();
      const tagsSet = new Set();
      
      // Extract all unique genres from manga
      directory.forEach(manga => {
        if (manga.g && Array.isArray(manga.g)) {
          manga.g.forEach(genre => tagsSet.add(genre));
        }
      });
      
      const tags = Array.from(tagsSet).sort();
      console.log(`[MangaSee] Loaded ${tags.length} official tags`);
      return tags;
    } catch (e) {
      console.error('[MangaSee] Tags error:', e.message);
      // Fallback to basic tags
      return [
        'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
        'Harem', 'Historical', 'Horror', 'Isekai', 'Josei', 'Martial Arts',
        'Mature', 'Mecha', 'Mystery', 'Psychological', 'Romance',
        'School Life', 'Sci-fi', 'Seinen', 'Shoujo', 'Shounen',
        'Slice of Life', 'Sports', 'Supernatural', 'Tragedy', 'Webtoon'
      ];
    }
  }
}

export default MangaSeeScraper;
