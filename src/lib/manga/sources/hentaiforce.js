import BaseSource from './base';

class HentaiForceSource extends BaseSource {
  constructor() {
    super({
      name: 'HentaiForce',
      baseUrl: 'https://hentaiforce.net',
      adult: true,
      features: ['search', 'popular', 'latest', 'chapters'],
      rateLimit: 500,
    });
    this.id = 'hentaiforce';
    this.icon = '⚡';
    this.description = 'Hentai manga, doujinshi & western comics from HentaiForce';
    this.enabled = true;
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

  parseGalleryList(html) {
    const results = [];
    if (!html) return results;

    const seenIds = new Set();
    const galleryRegex = /<div class="gallery[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div class="gallery)/gi;
    const linkRegex = /href=['"](?:https:\/\/hentaiforce\.net)?\/view\/(\d+)\/?['"]/i;
    const imgRegex = /(?:data-src|src)=['"]([^'"]+)['"]/i;
    const titleRegex = /<div class="gallery-name"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i;
    const catRegex = /<h3 class="gallery-type"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i;

    let match;
    while ((match = galleryRegex.exec(html)) !== null) {
      const block = match[1];

      const linkMatch = linkRegex.exec(block);
      if (!linkMatch) continue;

      const id = linkMatch[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const titleMatch = titleRegex.exec(block);
      const rawTitle = titleMatch ? titleMatch[1].trim() : `Gallery ${id}`;
      const title = this.decodeHtml(rawTitle).replace(/\s+/g, ' ');

      const imgMatch = imgRegex.exec(block);
      const cover = imgMatch ? imgMatch[1] : '';

      const catMatch = catRegex.exec(block);
      const category = catMatch ? catMatch[1].trim().toLowerCase() : 'doujin';

      results.push({
        id: `${this.id}:${id}`,
        title,
        coverImage: cover,
        coverUrl: cover,
        source: this.id,
        sourceId: this.id,
        category,
        url: `${this.baseUrl}/view/${id}`,
        adult: true,
        contentRating: 'pornographic',
      });
    }

    return results;
  }

  async search(query, options = {}) {
    const { limit = 24, page = 1, existingIds = new Set() } = options;

    try {
      const url = query && query.trim()
        ? `${this.baseUrl}/search?q=${encodeURIComponent(query.trim())}&page=${page}`
        : (page > 1 ? `${this.baseUrl}/page/${page}` : `${this.baseUrl}/`);
      console.log('[HentaiForce] Searching:', url);

      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);

      const filtered = galleries.filter(g => !existingIds.has(g.id));
      filtered.forEach(g => existingIds.add(g.id));

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('[HentaiForce] Search failed:', error);
      this.log.warn('HentaiForce search failed', { query, error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24, page = 1, existingIds = new Set() } = options;

    try {
      const url = page > 1 ? `${this.baseUrl}/page/${page}` : `${this.baseUrl}/`;
      console.log('[HentaiForce] Fetching latest from:', url);

      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);

      const filtered = galleries.filter(g => !existingIds.has(g.id));
      filtered.forEach(g => existingIds.add(g.id));

      return {
        results: filtered.slice(0, limit),
        hasMore: filtered.length >= 20,
        nextPage: page + 1,
      };
    } catch (error) {
      console.error('[HentaiForce] Latest fetch failed:', error);
      this.log.warn('HentaiForce latest failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getPopular(options = {}) {
    const { limit = 24, page = 1, existingIds = new Set() } = options;

    try {
      const url = page > 1 ? `${this.baseUrl}/page/${page}?sort=popular` : `${this.baseUrl}/?sort=popular`;
      console.log('[HentaiForce] Fetching popular from:', url);

      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);

      const filtered = galleries.filter(g => !existingIds.has(g.id));
      filtered.forEach(g => existingIds.add(g.id));

      return {
        results: filtered.slice(0, limit),
        hasMore: filtered.length >= 20,
        nextPage: page + 1,
      };
    } catch (error) {
      console.error('[HentaiForce] Popular fetch failed:', error);
      this.log.warn('HentaiForce popular failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getGalleryDetails(id) {
    const gid = id.replace(`${this.id}:`, '');

    try {
      const url = `${this.baseUrl}/view/${gid}`;
      console.log('[HentaiForce] Fetching gallery details:', url);

      const html = await this.fetchHtml(url);

      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const rawTitle = titleMatch ? titleMatch[1].trim() : `Gallery ${gid}`;
      const title = this.decodeHtml(rawTitle).replace(/\s+/g, ' ');

      const coverMatch = html.match(/(?:data-src|src)=['"]([^'"]*(?:cover|thumb)[^'"]*)['"]/i);
      const cover = coverMatch ? coverMatch[1] : '';

      const tags = [];
      const tagRegex = /<a[^>]*class=['"][^'"]*tag-btn[^'"]*['"][^>]*>([\s\S]*?)<\/a>/gi;
      let tm;
      while ((tm = tagRegex.exec(html)) !== null) {
        const cleaned = tm[1].replace(/<span[\s\S]*?<\/span>/gi, '').trim();
        if (cleaned) tags.push(cleaned);
      }

      const pagesMatch = html.match(/Pages:\s*(\d+)/i);
      const pages = pagesMatch ? parseInt(pagesMatch[1], 10) : 0;

      return {
        id: `${this.id}:${gid}`,
        title,
        description: '',
        coverImage: cover,
        coverUrl: cover,
        tags,
        source: this.id,
        sourceId: this.id,
        url,
        info: { pages },
        adult: true,
        contentRating: 'pornographic',
      };
    } catch (error) {
      console.error('[HentaiForce] Gallery details error:', error);
      this.log.warn('HentaiForce gallery details failed', { id, error: error.message });
      return null;
    }
  }

  async getMangaDetails(mangaId) {
    const id = mangaId.startsWith(`${this.id}:`) ? mangaId : `${this.id}:${mangaId}`;
    const details = await this.getGalleryDetails(id);
    if (!details) return null;
    return {
      ...details,
      sourceId: this.id,
      coverUrl: details.coverUrl || details.coverImage || details.cover || '',
    };
  }

  async getChapters(mangaId) {
    const id = mangaId.startsWith(`${this.id}:`) ? mangaId : `${this.id}:${mangaId}`;
    const details = await this.getGalleryDetails(id);
    if (!details) return [];
    return [{
      id,
      mangaId: id,
      chapter: '1',
      title: details.title,
      pages: details.info?.pages || 0,
      language: 'en',
      sourceId: this.id,
    }];
  }

  async getChapterPages(chapterId) {
    try {
      const gid = chapterId.replace(`${this.id}:`, '');
      const url = `${this.baseUrl}/view/${gid}`;
      const html = await this.fetchHtml(url);

      const coverMatch = html.match(/https?:\/\/m(\d+)\.hentaiforce\.me\/img\/(\d+)-(?:cover|thumb|\d+t?)\.(jpg|png|webp)/i);
      const pagesMatch = html.match(/Pages:\s*(\d+)/i);

      if (coverMatch && pagesMatch) {
        const server = coverMatch[1];
        const mediaId = coverMatch[2];
        const ext = coverMatch[3];
        const total = parseInt(pagesMatch[1], 10);

        const pages = [];
        for (let i = 1; i <= total; i++) {
          const fullUrl = `https://m${server}.hentaiforce.me/img/${mediaId}-${i}.${ext}`;
          pages.push({
            index: i,
            url: fullUrl,
            originalUrl: fullUrl,
          });
        }
        return pages;
      }

      return [];
    } catch (error) {
      this.log.warn('HentaiForce pages failed', { chapterId, error: error.message });
      return [];
    }
  }

  async getTags() {
    return [];
  }
}

export default new HentaiForceSource();
