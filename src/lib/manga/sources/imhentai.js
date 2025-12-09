/**
 * IMHentai Source
 * Large adult content collection with easy API access
 * Supports: manga, doujinshi, western, imageset, artistcg, gamecg
 * Fast and reliable with good search
 */

import BaseSource from './base';

// IMHentai content categories
export const IMHENTAI_CATEGORIES = {
  ALL: 'all',
  MANGA: 'manga',
  DOUJINSHI: 'doujinshi',
  WESTERN: 'western',
  IMAGESET: 'imageset',
  ARTISTCG: 'artistcg',
  GAMECG: 'gamecg'
};

// Category IDs for IMHentai
const CATEGORY_IDS = {
  manga: 1,
  doujinshi: 2,
  western: 3,
  imageset: 4,
  artistcg: 5,
  gamecg: 6
};

class IMHentaiSource extends BaseSource {
  constructor() {
    super({
      name: 'IMHentai',
      baseUrl: 'https://imhentai.xxx',
      adult: true,
      features: [
        'search', 'popular', 'latest', 'tags', 
        'doujinshi', 'manga', 'artistcg', 'gamecg', 
        'western', 'imageset', 'multi-language'
      ],
      rateLimit: 500
    });
    
    this.categories = IMHENTAI_CATEGORIES;
    this.imageServer = 'https://m1.imhentai.xxx';
    this.thumbServer = 'https://m1.imhentai.xxx/t';
  }

  async search(query, options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      type = 'all'
    } = options;
    
    try {
      // If empty query and we have category/type, browse that category instead
      if (!query && (category !== 'all' || type !== 'all')) {
        return this.getLatest(options);
      }
      
      let url = `${this.baseUrl}/search/?key=${encodeURIComponent(query)}&page=${page}`;
      
      // Add category filter
      const cat = category !== 'all' ? category : type;
      if (cat !== 'all' && CATEGORY_IDS[cat]) {
        url += `&cat=${CATEGORY_IDS[cat]}`;
      }
      
      console.log('[IMHentai] Searching:', url);
      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);
      
      return galleries.slice(0, limit);
    } catch (error) {
      this.log.warn('IMHentai search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      type = 'all' 
    } = options;
    
    try {
      let url = `${this.baseUrl}/popular/?page=${page}`;
      
      const cat = category !== 'all' ? category : type;
      if (cat !== 'all' && CATEGORY_IDS[cat]) {
        url = `${this.baseUrl}/${cat}/popular/?page=${page}`;
      }
      
      console.log('[IMHentai] Fetching popular:', url);
      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);
      
      return galleries.slice(0, limit);
    } catch (error) {
      this.log.warn('IMHentai popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      type = 'all'
    } = options;
    
    try {
      let url = `${this.baseUrl}/?page=${page}`;
      
      const cat = category !== 'all' ? category : type;
      if (cat !== 'all') {
        url = `${this.baseUrl}/${cat}/?page=${page}`;
      }
      
      console.log('[IMHentai] Fetching latest:', url);
      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);
      
      return galleries.slice(0, limit);
    } catch (error) {
      this.log.warn('IMHentai latest failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get content by category
   */
  async getByCategory(category, options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.baseUrl}/${category}/?page=${page}`;
      
      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);
      
      return galleries.slice(0, limit);
    } catch (error) {
      this.log.warn(`IMHentai get ${category} failed`, { error: error.message });
      return [];
    }
  }

  async getDoujinshi(options = {}) {
    return this.getByCategory('doujinshi', options);
  }

  async getManga(options = {}) {
    return this.getByCategory('manga', options);
  }

  async getArtistCG(options = {}) {
    return this.getByCategory('artistcg', options);
  }

  async getGameCG(options = {}) {
    return this.getByCategory('gamecg', options);
  }

  async getWestern(options = {}) {
    return this.getByCategory('western', options);
  }

  async getImageSet(options = {}) {
    return this.getByCategory('imageset', options);
  }

  async getMangaDetails(mangaId) {
    try {
      const url = `${this.baseUrl}/gallery/${mangaId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryDetails(html, mangaId);
    } catch (error) {
      this.log.warn('IMHentai details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    // IMHentai galleries are single "chapters"
    try {
      const details = await this.getMangaDetails(mangaId);
      return [{
        id: mangaId,
        mangaId,
        chapter: '1',
        title: details.title,
        pages: details.pages || 0,
        language: details.language || 'en'
      }];
    } catch (error) {
      return [];
    }
  }

  async getChapterPages(galleryId) {
    try {
      const url = `${this.baseUrl}/gallery/${galleryId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryPages(html, galleryId);
    } catch (error) {
      this.log.warn('IMHentai pages failed', { galleryId, error: error.message });
      throw error;
    }
  }

  parseGalleryList(html) {
    const results = [];
    
    // Match gallery cards
    const galleryRegex = /<div[^>]*class="[^"]*thumb[^"]*"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi;
    const linkRegex = /href="\/gallery\/(\d+)\/?"/i;
    const titleRegex = /class="[^"]*caption[^"]*"[^>]*>([^<]+)<\/|title="([^"]+)"/i;
    const thumbRegex = /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i;
    const categoryRegex = /<span[^>]*class="[^"]*cat[^"]*"[^>]*>([^<]+)<\/span>/i;
    const pagesRegex = /(\d+)\s*(?:P|pages|page)/i;
    
    let match;
    while ((match = galleryRegex.exec(html)) !== null) {
      const content = match[1];
      const linkMatch = linkRegex.exec(content);
      
      if (linkMatch) {
        const id = linkMatch[1];
        const titleMatch = titleRegex.exec(content);
        const thumbMatch = thumbRegex.exec(content);
        const categoryMatch = categoryRegex.exec(content);
        const pagesMatch = pagesRegex.exec(content);
        
        const category = (categoryMatch?.[1] || 'doujinshi').toLowerCase().trim();
        
        results.push(this.formatManga({
          id,
          title: this.decodeHtml((titleMatch?.[1] || titleMatch?.[2] || `Gallery ${id}`).trim()),
          coverUrl: thumbMatch ? thumbMatch[1] : '',
          genres: [category],
          type: category,
          pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
          adult: true
        }));
      }
    }
    
    // Fallback pattern for different layouts
    if (results.length === 0) {
      const altRegex = /<article[^>]*class="[^"]*gallery[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
      while ((match = altRegex.exec(html)) !== null) {
        const content = match[1];
        const linkMatch = linkRegex.exec(content);
        
        if (linkMatch) {
          const id = linkMatch[1];
          const titleMatch = titleRegex.exec(content);
          const thumbMatch = thumbRegex.exec(content);
          
          results.push(this.formatManga({
            id,
            title: this.decodeHtml((titleMatch?.[1] || titleMatch?.[2] || `Gallery ${id}`).trim()),
            coverUrl: thumbMatch ? thumbMatch[1] : '',
            adult: true
          }));
        }
      }
    }
    
    return results;
  }

  parseGalleryDetails(html, galleryId) {
    const titleMatch = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html);
    const coverMatch = /<div[^>]*class="[^"]*cover[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/i.exec(html);
    const categoryMatch = /<span[^>]*class="[^"]*type[^"]*"[^>]*>([^<]+)<\/span>/i.exec(html);
    
    // Extract tags
    const tags = [];
    const artists = [];
    const parodies = [];
    const characters = [];
    const groups = [];
    let language = 'english';
    
    // Parse tag sections
    const tagRowRegex = /<li[^>]*>[\s\S]*?<span[^>]*class="[^"]*tag_name[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*class="[^"]*tags[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/li>/gi;
    let tagRow;
    
    while ((tagRow = tagRowRegex.exec(html)) !== null) {
      const namespace = tagRow[1].toLowerCase().trim();
      const tagContent = tagRow[2];
      
      const tagRegex = /<a[^>]*>([^<]+)<\/a>/gi;
      let tagMatch;
      
      while ((tagMatch = tagRegex.exec(tagContent)) !== null) {
        const tag = tagMatch[1].trim();
        
        switch (namespace) {
          case 'artists':
          case 'artist':
            artists.push(tag);
            break;
          case 'parodies':
          case 'parody':
            parodies.push(tag);
            break;
          case 'characters':
          case 'character':
            characters.push(tag);
            break;
          case 'groups':
          case 'group':
            groups.push(tag);
            break;
          case 'languages':
          case 'language':
            if (tag.toLowerCase() !== 'translated') {
              language = tag;
            }
            break;
          case 'tags':
          case 'tag':
          default:
            tags.push(tag);
        }
      }
    }
    
    // Extract page count
    const pagesMatch = /(\d+)\s*Pages/i.exec(html);
    
    const category = (categoryMatch?.[1] || 'doujinshi').toLowerCase().trim();
    
    return this.formatManga({
      id: galleryId,
      title: this.decodeHtml((titleMatch?.[1] || `Gallery ${galleryId}`).trim()),
      description: `${category}${parodies.length ? ` | Parody: ${parodies.join(', ')}` : ''}${characters.length ? ` | Characters: ${characters.join(', ')}` : ''}`,
      coverUrl: coverMatch ? coverMatch[1] : '',
      author: artists.join(', ') || groups.join(', ') || 'Unknown',
      artist: artists.join(', ') || 'Unknown',
      status: 'completed',
      tags,
      genres: [category],
      type: category,
      parodies,
      characters,
      groups,
      artists,
      pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
      language: this.languageToCode(language),
      languageName: language,
      adult: true
    });
  }

  parseGalleryPages(html, galleryId) {
    const pages = [];
    
    // IMHentai embeds page info in hidden inputs:
    // load_server, load_dir, load_id, load_pages
    const serverMatch = /id=['"]load_server['"][^>]*value=['"]([^'"]*)['"]/i.exec(html);
    const dirMatch = /id=['"]load_dir['"][^>]*value=['"]([^'"]*)['"]/i.exec(html);
    const loadIdMatch = /id=['"]load_id['"][^>]*value=['"]([^'"]*)['"]/i.exec(html);
    const pagesMatch = /id=['"]load_pages['"][^>]*value=['"]([^'"]*)['"]/i.exec(html);
    
    const server = serverMatch ? serverMatch[1] : null;
    const dir = dirMatch ? dirMatch[1] : null;
    const loadId = loadIdMatch ? loadIdMatch[1] : null;
    const totalPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
    
    if (server && dir && loadId && totalPages > 0) {
      // Extract extension from first thumbnail
      // Note: Thumbnails use .jpg but full images may be .webp
      // We'll use .jpg as default and let the proxy handle fallback
      const thumbMatch = /class=['"][^'"]*gthumb[^'"]*['"][^>]*>[\s\S]*?<img[^>]*data-src=['"]([^'"]*)['"]/i.exec(html);
      let ext = 'jpg';
      
      // Check if thumbnail indicates webp (some galleries use webp thumbnails)
      if (thumbMatch && thumbMatch[1]) {
        const thumbExt = thumbMatch[1].match(/\.(\w+)$/);
        if (thumbExt && thumbExt[1] === 'webp') {
          ext = 'webp';
        }
      }
      
      // Build all page URLs using the pattern
      for (let i = 1; i <= totalPages; i++) {
        const fullUrl = `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`;
        pages.push({
          index: i,
          url: fullUrl
        });
      }
    }
    
    // Fallback: Parse from thumbnail list
    if (pages.length === 0) {
      const thumbRegex = /class=['"][^'"]*gthumb[^'"]*['"][^>]*>[\s\S]*?<img[^>]*data-src=['"]([^'"]*)['"]/gi;
      let thumbMatch;
      let pageNum = 1;
      
      while ((thumbMatch = thumbRegex.exec(html)) !== null) {
        const thumbUrl = thumbMatch[1];
        // Convert thumbnail to full image URL: 1t.jpg -> 1.jpg
        const fullUrl = thumbUrl.replace(/(\d+)t\./, '$1.');
        
        pages.push({
          index: pageNum++,
          url: fullUrl
        });
      }
    }
    
    return pages;
  }

  languageToCode(language) {
    const codes = {
      'japanese': 'ja',
      'english': 'en',
      'chinese': 'zh',
      'korean': 'ko',
      'spanish': 'es',
      'russian': 'ru',
      'french': 'fr',
      'german': 'de'
    };
    return codes[language?.toLowerCase()] || 'en';
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

  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await this.fetch(this.baseUrl, { signal: controller.signal, method: 'HEAD' });
      clearTimeout(timeout);
      
      return true;
    } catch {
      return false;
    }
  }
}

const imhentaiSource = new IMHentaiSource();

export default imhentaiSource;
export { imhentaiSource, IMHENTAI_CATEGORIES };
