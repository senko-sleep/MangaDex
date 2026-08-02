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
      // If empty query and we have category/type, browse that category
      if (!query && (category !== 'all' || type !== 'all')) {
        return this.getLatest(options);
      }
      
      let url = `${this.baseUrl}/search/?key=${encodeURIComponent(query)}&page=${page}`;
      
      // Add category filter (support both category and type params)
      const cat = category !== 'all' ? category : type;
      if (cat !== 'all' && CATEGORY_IDS[cat]) {
        url += `&cat=${CATEGORY_IDS[cat]}`;
      }
      
      console.log('[IMHentai] Search URL:', url);
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
      
      console.log('[IMHentai] Popular URL:', url);
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
      
      console.log('[IMHentai] Latest URL:', url);
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
    const gid = mangaId.replace('imhentai:', '');
    try {
      const url = `${this.baseUrl}/gallery/${gid}/`;
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
    const gid = galleryId.replace('imhentai:', '');
    try {
      const url = `${this.baseUrl}/gallery/${gid}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryPages(html, gid);
    } catch (error) {
      this.log.warn('IMHentai pages failed', { galleryId, error: error.message });
      throw error;
    }
  }

  parseGalleryList(html) {
    const results = [];
    
    // Match each .thumb div block, capturing both content and caption
    // Structure: <div class="thumb" ...><div class="thumbnail">...<div class="caption"><a>TITLE</a></div></div></div>
    const thumbRegex = /<div[^>]*class="thumb"[^>]*>([\s\S]*?)<div\s+class="caption"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    const linkRegex = /href="\/gallery\/(\d+)\/?"/i;
    const imgRegex = /<img[^>]*(?:data-src|src)="([^"]*)"[^>]*>/i;
    const titleRegex = /<a[^>]*>([^<]+)<\/a>/i;
    const categoryRegex = /class="thumb_cat"[^>]*>([^<]*)<\/a>/i;
    const pagesRegex = /(\d+)\s*(?:P|pages|page)/i;
    
    let match;
    while ((match = thumbRegex.exec(html)) !== null) {
      const content = match[1];
      const captionContent = match[2];
      const linkMatch = linkRegex.exec(content);
      
      if (linkMatch) {
        const id = linkMatch[1];
        const titleMatch = titleRegex.exec(captionContent);
        const imgMatch = imgRegex.exec(content);
        const categoryMatch = categoryRegex.exec(content);
        const pagesMatch = pagesRegex.exec(content);
        
        const category = (categoryMatch?.[1] || 'doujinshi').toLowerCase().trim();
        
        results.push(this.formatManga({
          id,
          title: this.decodeHtml((titleMatch?.[1] || `Gallery ${id}`).trim()),
          coverUrl: imgMatch ? imgMatch[1] : '',
          genres: [category],
          type: category,
          pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
          adult: true
        }));
      }
    }
    
    // Fallback pattern for different layouts
    if (results.length === 0) {
      const altRegex = /<div[^>]*class="[^"]*thumb[^"]*"[^>]*>([\s\S]*?href="\/gallery\/(\d+)"[^>]*>([\s\S]*?)<\/a>)/gi;
      while ((match = altRegex.exec(html)) !== null) {
        const id = match[2];
        const content = match[1];
        const titleMatch = /<a[^>]*>([^<]+)<\/a>/i.exec(content);
        const imgMatch = /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i.exec(content);
        
        results.push(this.formatManga({
          id,
          title: this.decodeHtml((titleMatch?.[1] || `Gallery ${id}`).trim()),
          coverUrl: imgMatch ? imgMatch[1] : '',
          adult: true
        }));
      }
    }
    
    return results;
  }

  parseGalleryDetails(html, galleryId) {
    const titleMatch = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html);
    const coverMatch = /<div[^>]*class="[^"]*cover[^"]*"[^>]*>[\s\S]*?<img[^>]*(?:data-src|src)="([^"]+)"[^>]*>/i.exec(html);
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
    const serverMatch = html.match(/id=['"]load_server['"][^>]*value=['"]([^'"]*)['"]/i);
    const dirMatch = html.match(/id=['"]load_dir['"][^>]*value=['"]([^'"]*)['"]/i);
    const loadIdMatch = html.match(/id=['"]load_id['"][^>]*value=['"]([^'"]*)['"]/i);
    const pagesMatch = html.match(/id=['"]load_pages['"][^>]*value=['"]([^'"]*)['"]/i);
    
    const server = serverMatch ? serverMatch[1] : null;
    const dir = dirMatch ? dirMatch[1] : null;
    const loadId = loadIdMatch ? loadIdMatch[1] : null;
    const totalPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
    
    if (server && dir && loadId && totalPages > 0) {
      // Try to detect extension from thumbnail images
      let ext = 'jpg';
      const extPatterns = [
        /<img[^>]*data-src=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i,
        /<img[^>]*src=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i,
        /<img[^>]*data-original=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i
      ];
      for (const pattern of extPatterns) {
        const match = pattern.exec(html);
        if (match && match[1]) {
          ext = match[1].toLowerCase();
          break;
        }
      }
      
      // Build all page URLs - imhentai uses multiple image servers
      for (let i = 1; i <= totalPages; i++) {
        const urlPatterns = [
          `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://m1.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          // Try webp variants
          `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.webp`,
          `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.jpg`,
        ];
        
        pages.push({
          index: i,
          url: urlPatterns[0],
          fallbackUrls: urlPatterns.slice(1)
        });
      }
    }
    
    // Fallback: Parse thumbnail list
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
    
    // Fallback: Extract page count and build URLs from hidden inputs or page text
    if (pages.length === 0) {
      const pagesMatch2 = /(\d+)\s*Pages/i.exec(html);
      if (pagesMatch2 && server && dir && loadId) {
        const pageCount = parseInt(pagesMatch2[1]);
        for (let i = 1; i <= pageCount; i++) {
          pages.push({
            index: i,
            url: `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.jpg`
          });
        }
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
