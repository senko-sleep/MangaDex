import BaseSource from './base';

class HentaieraSource extends BaseSource {
  constructor() {
    super({
      name: 'Hentaiera',
      baseUrl: 'https://hentaiera.com',
      adult: true,
      features: ['search', 'popular', 'latest', 'chapters'],
      rateLimit: 1500
    });
    this.id = 'hentaiera';
    this.icon = '🔞';
    this.description = 'Adult manga from Hentaiera';
    this.enabled = true;
  }

  async search(query, options = {}) {
    const { limit = 24, page = 1, existingIds = new Set() } = options;
    
    try {
      const searchUrl = `${this.baseUrl}/search/?q=${encodeURIComponent(query)}&page=${page}`;
      console.log('[Hentaiera] Searching:', searchUrl);
      
      const html = await this.fetchHtml(searchUrl);
      const galleries = this.parseGalleryList(html);
      
      // Filter out duplicates using existingIds
      const filteredGalleries = galleries.filter(gallery => !existingIds.has(gallery.id));
      
      // Add new IDs to the set
      filteredGalleries.forEach(gallery => existingIds.add(gallery.id));
      
      return filteredGalleries.slice(0, limit);
    } catch (error) {
      console.error('[Hentaiera] Search failed:', error);
      this.log.warn('Hentaiera search failed', { query, error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24, page = 1, existingIds = new Set() } = options;
    
    try {
      const url = `${this.baseUrl}/?page=${page}`;
      console.log('[Hentaiera] Fetching latest from:', url);
      
      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);
      
      // Filter out duplicates using existingIds
      const filteredGalleries = galleries.filter(gallery => !existingIds.has(gallery.id));
      
      // Add new IDs to the set
      filteredGalleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: filteredGalleries.slice(0, limit),
        hasMore: filteredGalleries.length >= 24,
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[Hentaiera] Latest fetch failed:', error);
      this.log.warn('Hentaiera latest failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getPopular(options = {}) {
    const { limit = 24, page = 1, existingIds = new Set() } = options;
    
    try {
      const url = `${this.baseUrl}/popular/?page=${page}`;
      console.log('[Hentaiera] Fetching popular from:', url);
      
      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);
      
      // Filter out duplicates using existingIds
      const filteredGalleries = galleries.filter(gallery => !existingIds.has(gallery.id));
      
      // Add new IDs to the set
      filteredGalleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: filteredGalleries.slice(0, limit),
        hasMore: filteredGalleries.length >= 24,
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[Hentaiera] Popular fetch failed:', error);
      this.log.warn('Hentaiera popular failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  parseGalleryList(html) {
    const results = [];
    
    // Parse gallery items from the page
    const galleryRegex = /<a[^>]*href=['"]\/gallery\/(\d+)\/['"][^>]*>[\s\S]*?<img[^>]*class=['"][^'"]*lazy[^'"]*['"][^>]*data-src=['"]([^'"]*)['"][^>]*alt=['"]([^'"]*)['"]/gi;
    let match;
    
    while ((match = galleryRegex.exec(html)) !== null) {
      const id = match[1];
      const thumb = match[2];
      const title = match[3];
      
      if (!title || title.includes('loading')) continue;
      
      results.push({
        id: `${this.id}:${id}`,
        title: title.trim(),
        coverImage: thumb,
        source: this.id,
        url: `${this.baseUrl}/gallery/${id}/`
      });
    }
    
    return results;
  }

  async getGalleryDetails(id) {
    const gid = id.replace(`${this.id}:`, '');
    
    try {
      const url = `${this.baseUrl}/gallery/${gid}/`;
      console.log('[Hentaiera] Fetching gallery details:', url);
      
      const html = await this.fetchHtml(url);
      
      // Extract title
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : `Gallery ${gid}`;
      
      // Extract cover
      const coverMatch = html.match(/<img[^>]*class=['"][^'"]*cover[^'"]*['"][^>]*src=['"]([^'"]*)['"]/i);
      const cover = coverMatch ? coverMatch[1] : null;
      
      // Extract tags
      const tags = [];
      const tagRegex = /<a[^>]*class=['"][^'"]*tag[^'"]*['"][^>]*>([^<]+)<\/a>/gi;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(html)) !== null) {
        const tag = tagMatch[1].trim();
        if (tag) tags.push(tag);
      }
      
      // Extract page count
      const pagesMatch = html.match(/load_pages['"][^>]*value=['"]([^'"]*)['"]/i);
      const pages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
      
      return {
        id: `${this.id}:${gid}`,
        title: title,
        description: '',
        coverImage: cover,
        coverUrl: cover,
        tags: tags,
        source: this.id,
        sourceId: this.id,
        url: url,
        info: { pages },
        adult: true,
        contentRating: 'pornographic'
      };
    } catch (error) {
      console.error('[Hentaiera] Gallery details error:', error);
      this.log.warn('Hentaiera gallery details failed', { id, error: error.message });
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
      coverUrl: details.coverUrl || details.coverImage || details.cover || ''
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
      language: details.language || 'en',
      sourceId: this.id
    }];
  }

  async getChapterPages(chapterId) {
    try {
      const gid = chapterId.replace(`${this.id}:`, '');
      const url = `${this.baseUrl}/gallery/${gid}/`;
      const html = await this.fetchHtml(url);

      // Parse page info from hidden inputs (order-independent)
      const getInputValue = (html, inputId) => {
        const tagMatch = html.match(new RegExp(`<input[^>]*\\bid=['"]${inputId}['"][^>]*>`, 'i'));
        if (!tagMatch) return null;
        const valMatch = tagMatch[0].match(/value=['"]([^'"]*)['"]/i);
        return valMatch ? valMatch[1] : null;
      };

      const server = getInputValue(html, 'load_server');
      const dir = getInputValue(html, 'load_dir');
      const loadId = getInputValue(html, 'load_id');
      const totalPages = parseInt(getInputValue(html, 'load_pages') || '') || 0;

      const pages = [];

      if (server && dir && loadId && totalPages > 0) {
        for (let i = 1; i <= totalPages; i++) {
          const fullUrl = `https://m${server}.hentaiera.com/${dir}/${loadId}/${i}.jpg`;
          pages.push({
            index: i,
            url: fullUrl,
            originalUrl: fullUrl
          });
        }
      }

      // Fallback to thumbnail parsing
      if (pages.length === 0) {
        const thumbRegex = /class=['"][^'"]*gthumb[^'"]*['"][^>]*>[\s\S]*?<img[^>]*data-src=['"]([^'"]*)['"]/gi;
        let match;
        let pageNum = 1;

        while ((match = thumbRegex.exec(html)) !== null) {
          let src = match[1];
          if (src.match(/\d+t\.(jpg|png|gif|webp)/i)) {
            src = src.replace(/(\d+)t\./, '$1.');
          }
          if (src.startsWith('//')) src = 'https:' + src;
          if (src.startsWith('/')) src = this.baseUrl + src;
          if (src.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
            pages.push({ index: pageNum++, url: src, originalUrl: src });
          }
        }
      }

      return pages;
    } catch (error) {
      this.log.warn('Hentaiera pages failed', { chapterId, error: error.message });
      return [];
    }
  }

  async getTags() {
    return [];
  }
}

export default new HentaieraSource();
