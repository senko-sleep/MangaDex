/**
 * nhentai Source
 * Adult doujinshi/hentai manga source
 */

import BaseSource from './base';

class NHentaiSource extends BaseSource {
  constructor() {
    super({
      name: 'nhentai',
      // Using nhentai.xxx mirror - nhentai.net and nhentai.to have Cloudflare protection
      baseUrl: 'https://nhentai.xxx',
      adult: true,
      features: ['search', 'popular', 'latest', 'tags', 'doujinshi'],
      rateLimit: 1500
    });
    // nhentai.xxx uses i5.nhentaimg.com for images
    this.imageServer = 'https://i5.nhentaimg.com';
    this.thumbServer = 'https://i5.nhentaimg.com';
  }

  async search(query, options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.baseUrl}/search/?q=${encodeURIComponent(query)}&page=${page}`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/?sort=popular`);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(this.baseUrl);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      const url = `${this.baseUrl}/g/${mangaId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryDetails(html, mangaId);
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    // nhentai galleries are single "chapters"
    try {
      const details = await this.getMangaDetails(mangaId);
      return [{
        id: mangaId,
        mangaId,
        chapter: '1',
        title: details.title,
        pages: details.pages || 0
      }];
    } catch (error) {
      return [];
    }
  }

  async getChapterPages(galleryId) {
    try {
      const url = `${this.baseUrl}/g/${galleryId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryPages(html, galleryId);
    } catch (error) {
      this.log.warn('Get pages failed', { galleryId, error: error.message });
      throw error;
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
        
        // Get cover URL from data-src
        let coverUrl = imgMatch ? imgMatch[1] : '';
        
        results.push(this.formatManga({
          id,
          title,
          coverUrl,
          adult: true
        }));
      }
    }
    
    return results;
  }

  parseGalleryDetails(html, galleryId) {
    // nhentai.xxx uses simple <h1> tag for title
    const titleMatch = /<h1>([^<]*)<\/h1>/i.exec(html);
    // Pages are in format: pages">41</span>
    const pagesMatch = /pages">(\d+)<\/span>/i.exec(html);
    // Cover image - look for main gallery image
    const coverMatch = /<img[^>]*class="[^"]*lazyload[^"]*"[^>]*data-src="([^"]*)"[^>]*>/i.exec(html);
    
    // Extract tags - nhentai.xxx uses tag_btn class
    const tags = [];
    const tagRegex = /<a[^>]*class='tag_btn[^']*'[^>]*href='\/tag\/([^']*)\/'[^>]*>[\s\S]*?<span[^>]*class='tag_name'[^>]*>([^<]*)<\/span>/gi;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(html)) !== null) {
      tags.push(tagMatch[2].trim());
    }
    
    // Extract artists - nhentai.xxx uses artist path
    const artistMatch = /<a[^>]*href='\/artist\/[^']*'[^>]*>[\s\S]*?<span[^>]*class='tag_name'[^>]*>([^<]*)<\/span>/i.exec(html);
    
    return this.formatManga({
      id: galleryId,
      title: titleMatch ? this.decodeHtml(titleMatch[1].trim()) : `Gallery ${galleryId}`,
      coverUrl: coverMatch ? coverMatch[1] : '',
      author: artistMatch ? artistMatch[1].trim() : 'Unknown',
      artist: artistMatch ? artistMatch[1].trim() : 'Unknown',
      tags,
      pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
      adult: true
    });
  }

  parseGalleryPages(html, galleryId) {
    const pages = [];
    
    // nhentai.xxx uses gt_th divs with thumbnail images
    // Format: <a href="/g/616715/1/"><img data-src="https://i5.nhentaimg.com/017/j7qrnbiuka/1t.jpg" /></a>
    const thumbRegex = /<a[^>]*href="\/g\/\d+\/(\d+)\/"[^>]*><img[^>]*data-src="([^"]*)"[^>]*>/gi;
    let match;
    
    while ((match = thumbRegex.exec(html)) !== null) {
      const pageNum = parseInt(match[1]);
      const thumbUrl = match[2];
      // Convert thumbnail URL to full image URL
      // Thumbnail: https://i5.nhentaimg.com/017/j7qrnbiuka/1t.jpg
      // Full:      https://i5.nhentaimg.com/017/j7qrnbiuka/1.webp (always webp for full images)
      const fullUrl = thumbUrl.replace(/(\d+)t\.(jpg|png|gif|webp)$/, '$1.webp');
      pages.push({
        index: pageNum,
        url: fullUrl
      });
    }
    
    return pages.sort((a, b) => a.index - b.index);
  }

  getExtension(type) {
    const types = { j: 'jpg', p: 'png', g: 'gif', w: 'webp' };
    return types[type] || 'jpg';
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

export default new NHentaiSource();
