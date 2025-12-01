import BaseScraper from './base.js';

// NHentai - Adult content - Using direct JSON API
export class NHentaiScraper extends BaseScraper {
  constructor() {
    super('NHentai', 'https://nhentai.net', true);
    this.apiUrl = 'https://nhentai.net/api';
    this.thumbServer = 'https://t.nhentai.net';
    this.imageServer = 'https://i.nhentai.net';
  }

  async fetchApi(endpoint) {
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://nhentai.net/'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error('[NHentai] API error:', e.message);
      return null;
    }
  }

  async search(query, page = 1) {
    try {
      const data = await this.fetchApi(`/galleries/search?query=${encodeURIComponent(query)}&page=${page}`);
      if (!data?.result) return [];
      return data.result.map(g => this.formatGallery(g));
    } catch (e) {
      console.error('[NHentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1) {
    try {
      // Popular sorted by favorites
      const data = await this.fetchApi(`/galleries/search?query=&page=${page}&sort=popular`);
      if (!data?.result) return [];
      return data.result.map(g => this.formatGallery(g));
    } catch (e) {
      console.error('[NHentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1) {
    try {
      const data = await this.fetchApi(`/galleries/all?page=${page}`);
      if (!data?.result) return [];
      return data.result.map(g => this.formatGallery(g));
    } catch (e) {
      console.error('[NHentai] Latest error:', e.message);
      return [];
    }
  }

  formatGallery(gallery) {
    const id = gallery.id;
    const mediaId = gallery.media_id;
    const title = gallery.title?.english || gallery.title?.japanese || gallery.title?.pretty || `Gallery ${id}`;
    
    // Build cover URL from media_id
    const coverExt = this.getExtension(gallery.images?.cover?.t);
    const coverUrl = `${this.thumbServer}/galleries/${mediaId}/cover.${coverExt}`;
    
    // Extract tags
    const tags = (gallery.tags || [])
      .filter(t => t.type === 'tag')
      .map(t => t.name);
    
    const artists = (gallery.tags || [])
      .filter(t => t.type === 'artist')
      .map(t => t.name);
    
    return {
      id: `nhentai:${id}`,
      sourceId: 'nhentai',
      slug: String(id),
      title,
      cover: `/api/proxy/image?url=${encodeURIComponent(coverUrl)}`,
      author: artists.join(', ') || 'Unknown',
      tags,
      pages: gallery.num_pages || 0,
      isAdult: true,
      contentType: 'doujinshi',
    };
  }

  getExtension(type) {
    const types = { j: 'jpg', p: 'png', g: 'gif', w: 'webp' };
    return types[type] || 'jpg';
  }

  async getMangaDetails(id) {
    const galleryId = id.replace('nhentai:', '');
    
    try {
      // Use API to get gallery details
      const data = await this.fetchApi(`/gallery/${galleryId}`);
      if (!data) return null;
      
      const mediaId = data.media_id;
      const title = data.title?.english || data.title?.japanese || data.title?.pretty || `Gallery ${galleryId}`;
      
      // Build cover URL
      const coverExt = this.getExtension(data.images?.cover?.t);
      const cover = `${this.thumbServer}/galleries/${mediaId}/cover.${coverExt}`;
      
      // Extract tags by type
      const tags = [];
      const artists = [];
      const parodies = [];
      const characters = [];
      const groups = [];
      const languages = [];
      const categories = [];
      
      for (const tag of (data.tags || [])) {
        switch (tag.type) {
          case 'tag': tags.push(tag.name); break;
          case 'artist': artists.push(tag.name); break;
          case 'parody': parodies.push(tag.name); break;
          case 'character': characters.push(tag.name); break;
          case 'group': groups.push(tag.name); break;
          case 'language': languages.push(tag.name); break;
          case 'category': categories.push(tag.name); break;
        }
      }

      return {
        id,
        sourceId: 'nhentai',
        slug: galleryId,
        title,
        cover: `/api/proxy/image?url=${encodeURIComponent(cover)}`,
        tags,
        artists,
        parodies,
        characters,
        groups,
        languages,
        categories,
        pageCount: data.num_pages || 0,
        mediaId,
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
      // Use API to get gallery details including pages
      const data = await this.fetchApi(`/gallery/${galleryId}`);
      if (!data) return [];
      
      const mediaId = data.media_id;
      const pages = [];
      
      for (let i = 0; i < (data.images?.pages || []).length; i++) {
        const page = data.images.pages[i];
        const ext = this.getExtension(page.t);
        const url = `${this.imageServer}/galleries/${mediaId}/${i + 1}.${ext}`;
        
        pages.push({ 
          page: i + 1, 
          url: `/api/proxy/image?url=${encodeURIComponent(url)}`,
          originalUrl: url,
          width: page.w,
          height: page.h
        });
      }

      return pages;
    } catch (e) {
      console.error('[NHentai] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    try {
      // Scrape popular tags from NHentai homepage
      const $ = await this.fetch(this.baseUrl);
      if (!$) throw new Error('Failed to fetch homepage');
      
      const tags = [];
      // Get tags from popular tags section
      $('.tag-cloud a, .tag .name').each((_, el) => {
        const tag = $(el).text().trim();
        if (tag && !tag.includes('(') && tag.length > 2) {
          tags.push(tag.toLowerCase());
        }
      });
      
      // Remove duplicates and sort
      const uniqueTags = [...new Set(tags)].sort();
      
      if (uniqueTags.length > 0) {
        console.log(`[NHentai] Loaded ${uniqueTags.length} official tags`);
        return uniqueTags;
      }
      
      throw new Error('No tags found');
    } catch (e) {
      console.error('[NHentai] Tags error:', e.message);
      // Fallback to common tags
      return [
        'ahegao', 'anal', 'big breasts', 'blowjob', 'bondage', 'cheating',
        'femdom', 'futanari', 'group', 'harem', 'incest', 'lolicon',
        'milf', 'mind break', 'monster girl', 'netorare', 'paizuri',
        'rape', 'shotacon', 'stockings', 'tentacles', 'vanilla', 'yuri'
      ];
    }
  }
}

export default NHentaiScraper;
