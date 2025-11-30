import BaseScraper from './base.js';

// NHentai - Adult content
export class NHentaiScraper extends BaseScraper {
  constructor() {
    super('NHentai', 'https://nhentai.net', true);
    // Better headers to avoid 403
    this.client.defaults.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.client.defaults.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
    this.client.defaults.headers['Accept-Language'] = 'en-US,en;q=0.9';
    this.client.defaults.headers['Referer'] = 'https://nhentai.net/';
    this.client.defaults.headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
    this.client.defaults.headers['sec-ch-ua-mobile'] = '?0';
    this.client.defaults.headers['sec-ch-ua-platform'] = '"Windows"';
    this.client.defaults.headers['Sec-Fetch-Dest'] = 'document';
    this.client.defaults.headers['Sec-Fetch-Mode'] = 'navigate';
    this.client.defaults.headers['Sec-Fetch-Site'] = 'same-origin';
  }

  async search(query, page = 1) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/search/?q=${encodeURIComponent(query)}&page=${page}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[NHentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/?page=${page}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[NHentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1) {
    return this.getPopular(page);
  }

  parseGalleryList($) {
    const results = [];
    
    $('.gallery').each((_, el) => {
      const $el = $(el);
      const link = $el.find('a').first().attr('href') || '';
      const title = $el.find('.caption').text().trim();
      const cover = $el.find('img').attr('data-src') || $el.find('img').attr('src');
      
      const idMatch = link.match(/\/g\/(\d+)/);
      const id = idMatch ? idMatch[1] : '';
      
      if (id && title) {
        const coverUrl = cover?.replace('t.nhentai', 'i.nhentai').replace('t.jpg', '.jpg');
        results.push({
          id: `nhentai:${id}`,
          sourceId: 'nhentai',
          slug: id,
          title,
          cover: coverUrl ? `/api/proxy/image?url=${encodeURIComponent(coverUrl)}` : null,
          isAdult: true,
        });
      }
    });

    return results;
  }

  async getMangaDetails(id) {
    const galleryId = id.replace('nhentai:', '');
    const $ = await this.fetch(`${this.baseUrl}/g/${galleryId}/`);
    if (!$) return null;

    try {
      const title = $('#info h1').text().trim() || $('#info h2').text().trim();
      const cover = $('#cover img').attr('data-src') || $('#cover img').attr('src');
      
      const tags = [];
      const artists = [];
      const parodies = [];
      const characters = [];
      const groups = [];
      const languages = [];
      const categories = [];
      
      $('.tag-container').each((_, container) => {
        const $c = $(container);
        const label = $c.text().split(':')[0].toLowerCase().trim();
        
        $c.find('.tag .name').each((_, tag) => {
          const name = $(tag).text().trim();
          if (label.includes('tag')) tags.push(name);
          if (label.includes('artist')) artists.push(name);
          if (label.includes('parody')) parodies.push(name);
          if (label.includes('character')) characters.push(name);
          if (label.includes('group')) groups.push(name);
          if (label.includes('language')) languages.push(name);
          if (label.includes('category')) categories.push(name);
        });
      });

      const pageCount = parseInt($('#info .tag-container:contains("pages") .name').text()) || 0;

      return {
        id,
        sourceId: 'nhentai',
        slug: galleryId,
        title,
        cover: cover ? `/api/proxy/image?url=${encodeURIComponent(cover)}` : null,
        tags,
        artists,
        parodies,
        characters,
        groups,
        languages,
        categories,
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
    const $ = await this.fetch(`${this.baseUrl}/g/${galleryId}/`);
    if (!$) return [];

    const pages = [];
    
    // Get page count and media ID
    const thumbs = $('#thumbnail-container .thumb-container img');
    
    thumbs.each((i, img) => {
      let src = $(img).attr('data-src') || $(img).attr('src') || '';
      // Convert thumbnail URL to full image URL
      // t.nhentai.net/galleries/XXXXX/1t.jpg -> i.nhentai.net/galleries/XXXXX/1.jpg
      src = src.replace('t.nhentai', 'i.nhentai').replace(/(\d+)t\./, '$1.');
      
      if (src) {
        // Use proxy to bypass hotlink protection
        pages.push({ 
          page: i + 1, 
          url: `/api/proxy/image?url=${encodeURIComponent(src)}`,
          originalUrl: src
        });
      }
    });

    return pages;
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
