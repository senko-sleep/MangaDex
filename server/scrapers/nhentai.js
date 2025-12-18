import BaseScraper from './base.js';

// API base URL for proxy (set via environment variable in production)
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// NHentai - Adult content - Using nhentai.xxx mirror (nhentai.net has Cloudflare)
export class NHentaiScraper extends BaseScraper {
  constructor() {
    // Using nhentai.xxx mirror - nhentai.net API is blocked by Cloudflare
    super('NHentai', 'https://nhentai.xxx', true);
    this.imageServer = 'https://i5.nhentaimg.com';
  }

  // Helper to create proxy URL - returns absolute URL for cross-origin access
  proxyUrl(url) {
    if (!url) return '';
    const base = API_BASE || '';
    return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  async fetchHtml(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (e) {
      console.error('[NHentai] Fetch error:', e.message);
      return null;
    }
  }

  parseGalleryList(html) {
    const results = [];
    // Match gallery_item containers for nhentai.xxx
    const galleryRegex = /<div[^>]*class="gallery_item"[^>]*>([\s\S]*?)<\/div>\s*<\/a>\s*<\/div>/gi;
    const linkRegex = /<a[^>]*href="\/g\/(\d+)\/"/i;
    const titleRegex = /title="([^"]*)"/i;
    const imgRegex = /<img[^>]*data-src="([^"]*)"[^>]*>/i;
    const captionRegex = /<div[^>]*class="caption"[^>]*>([\s\S]*?)<\/div>/i;

    let match;
    while ((match = galleryRegex.exec(html)) !== null) {
      const content = match[1];
      const linkMatch = linkRegex.exec(content);
      const titleMatch = titleRegex.exec(content);
      const imgMatch = imgRegex.exec(content);
      const captionMatch = captionRegex.exec(content);

      if (linkMatch) {
        const id = linkMatch[1];
        // Prefer title attribute, then caption text
        let title = titleMatch ? titleMatch[1] : (captionMatch ? captionMatch[1].trim() : `Gallery ${id}`);
        title = this.decodeHtml(title.trim());
        const coverUrl = imgMatch ? imgMatch[1] : '';

        results.push(this.formatGallery({ id, title, coverUrl }));
      }
    }
    return results;
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      // Build search query - nhentai.xxx supports tag search in query
      let searchQuery = query || '';

      // Add language filter (english, japanese, chinese)
      if (language && language !== 'all') {
        searchQuery += ` language:${language}`;
      }

      // Add tags to search query if provided
      if (tags && tags.length > 0) {
        searchQuery += ' ' + tags.join(' ');
      }

      // Add excluded tags with minus prefix
      if (excludeTags && excludeTags.length > 0) {
        searchQuery += ' ' + excludeTags.map(t => `-${t}`).join(' ');
      }

      searchQuery = searchQuery.trim();

      // If no query at all, return popular instead
      if (!searchQuery) {
        return this.getPopular(page, includeAdult, tags, excludeTags, language);
      }

      // nhentai.xxx uses 'key' parameter, not 'q'
      const url = `${this.baseUrl}/search/?key=${encodeURIComponent(searchQuery)}&page=${page}`;
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html);
    } catch (e) {
      console.error('[NHentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      // Defensive: if tags is not an array (e.g., called with sort string), reset it
      if (!Array.isArray(tags)) {
        tags = [];
      }
      if (!Array.isArray(excludeTags)) {
        excludeTags = [];
      }

      // If tags or language provided, use search with popular sort
      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        let searchQuery = tags.join(' ');
        if (language && language !== 'all') {
          searchQuery += ` language:${language}`;
        }
        if (excludeTags.length > 0) {
          searchQuery += ' ' + excludeTags.map(t => `-${t}`).join(' ');
        }
        const url = `${this.baseUrl}/search/?q=${encodeURIComponent(searchQuery.trim())}&sort=popular&page=${page}`;
        const html = await this.fetchHtml(url);
        if (!html) return [];
        return this.parseGalleryList(html);
      }

      const url = `${this.baseUrl}/?sort=popular&page=${page}`;
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html);
    } catch (e) {
      console.error('[NHentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      // Defensive: if tags is not an array (e.g., called with sort string), reset it
      if (!Array.isArray(tags)) {
        tags = [];
      }
      if (!Array.isArray(excludeTags)) {
        excludeTags = [];
      }

      // If tags or language provided, use search
      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        let searchQuery = tags.join(' ');
        if (language && language !== 'all') {
          searchQuery += ` language:${language}`;
        }
        if (excludeTags.length > 0) {
          searchQuery += ' ' + excludeTags.map(t => `-${t}`).join(' ');
        }
        const url = `${this.baseUrl}/search/?q=${encodeURIComponent(searchQuery.trim())}&page=${page}`;
        const html = await this.fetchHtml(url);
        if (!html) return [];
        return this.parseGalleryList(html);
      }

      const url = page > 1 ? `${this.baseUrl}/?page=${page}` : this.baseUrl;
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html);
    } catch (e) {
      console.error('[NHentai] Latest error:', e.message);
      return [];
    }
  }

  formatGallery({ id, title, coverUrl }) {
    return {
      id: `nhentai:${id}`,
      sourceId: 'nhentai',
      slug: String(id),
      title,
      cover: this.proxyUrl(coverUrl),
      author: 'Unknown',
      tags: [],
      pages: 0,
      isAdult: true,
      contentType: 'doujinshi',
    };
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

  getExtension(type) {
    const types = { j: 'jpg', p: 'png', g: 'gif', w: 'webp' };
    return types[type] || 'jpg';
  }

  async getMangaDetails(id) {
    const galleryId = id.replace('nhentai:', '');

    try {
      // Use HTML scraping for nhentai.xxx
      const url = `${this.baseUrl}/g/${galleryId}/`;
      const html = await this.fetchHtml(url);
      if (!html) return null;

      // Parse title from <h1>
      const titleMatch = /<h1>([^<]*)<\/h1>/i.exec(html);
      const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : `Gallery ${galleryId}`;

      // Parse pages count
      const pagesMatch = /pages">(\d+)<\/span>/i.exec(html);
      const pageCount = pagesMatch ? parseInt(pagesMatch[1]) : 0;

      // Parse cover image
      const coverMatch = /<img[^>]*class="[^"]*lazyload[^"]*"[^>]*data-src="([^"]*)"[^>]*>/i.exec(html);
      const cover = coverMatch ? coverMatch[1] : '';

      // Extract tags
      const tags = [];
      const tagRegex = /<a[^>]*class='tag_btn[^']*'[^>]*href='\/tag\/([^']*)\/'[^>]*>[\s\S]*?<span[^>]*class='tag_name'[^>]*>([^<]*)<\/span>/gi;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(html)) !== null) {
        tags.push(tagMatch[2].trim());
      }

      // Extract artist
      const artistMatch = /<a[^>]*href='\/artist\/[^']*'[^>]*>[\s\S]*?<span[^>]*class='tag_name'[^>]*>([^<]*)<\/span>/i.exec(html);
      const artist = artistMatch ? artistMatch[1].trim() : 'Unknown';

      return {
        id,
        sourceId: 'nhentai',
        slug: galleryId,
        title,
        cover: this.proxyUrl(cover),
        tags,
        artists: artist !== 'Unknown' ? [artist] : [],
        pageCount,
        isAdult: true,
        isLongStrip: false,
      };
    } catch (e) {
      console.error('[NHentai] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    // NHentai galleries are single "chapters"
    const galleryId = mangaId.replace('nhentai:', '');
    return [{
      id: galleryId,
      mangaId,
      chapter: '1',
      title: 'Full Gallery',
      sourceId: 'nhentai',
    }];
  }

  async getChapterPages(chapterId, mangaId) {
    const galleryId = mangaId.replace('nhentai:', '');

    try {
      const url = `${this.baseUrl}/g/${galleryId}/`;
      const html = await this.fetchHtml(url);
      if (!html) return [];

      const pages = [];

      // nhentai.xxx embeds page data as JSON: var g_th = $.parseJSON('{"fl":{"1":"j,w,h",...},...}');
      // "fl" = full images, format is "ext_code,width,height" where j=jpg, p=png, g=gif, w=webp
      const jsonMatch = /var g_th = \$\.parseJSON\('(\{[^']+\})'\);/i.exec(html);

      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          const fullImages = data.fl || {};

          // Get the image server from a thumbnail on the page
          const serverMatch = /https:\/\/(i\d+\.nhentaimg\.com)\/(\d+)\/([^/]+)\//i.exec(html);
          const server = serverMatch ? serverMatch[1] : 'i5.nhentaimg.com';
          const prefix = serverMatch ? serverMatch[2] : '000';
          const hash = serverMatch ? serverMatch[3] : '';

          const extMap = { j: 'jpg', p: 'png', g: 'gif', w: 'webp' };

          for (const [pageNum, info] of Object.entries(fullImages)) {
            const [extCode] = info.split(',');
            const ext = extMap[extCode] || 'jpg';
            const fullUrl = `https://${server}/${prefix}/${hash}/${pageNum}.${ext}`;

            pages.push({
              page: parseInt(pageNum),
              url: this.proxyUrl(fullUrl),
              originalUrl: fullUrl,
            });
          }
        } catch (parseErr) {
          console.error('[NHentai] JSON parse error:', parseErr.message);
        }
      }

      // Fallback to thumbnail scraping if JSON parsing failed
      if (pages.length === 0) {
        const thumbRegex = /<a[^>]*href="\/g\/\d+\/(\d+)\/"[^>]*><img[^>]*data-src="([^"]*)"[^>]*>/gi;
        let match;

        while ((match = thumbRegex.exec(html)) !== null) {
          const pageNum = parseInt(match[1]);
          const thumbUrl = match[2];
          // Keep original extension from thumbnail
          const fullUrl = thumbUrl.replace(/(\d+)t\./, '$1.');

          pages.push({
            page: pageNum,
            url: this.proxyUrl(fullUrl),
            originalUrl: fullUrl,
          });
        }
      }

      return pages.sort((a, b) => a.page - b.page);
    } catch (e) {
      console.error('[NHentai] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    // Return common tags since scraping tags from nhentai.xxx is complex
    return [
      'ahegao', 'anal', 'big breasts', 'blowjob', 'bondage', 'cheating',
      'femdom', 'futanari', 'group', 'harem', 'incest', 'lolicon',
      'milf', 'mind break', 'monster girl', 'netorare', 'paizuri',
      'rape', 'shotacon', 'stockings', 'tentacles', 'vanilla', 'yuri'
    ];
  }
}

export default NHentaiScraper;
