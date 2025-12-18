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
      type = 'all',
      existingIds = new Set()
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
      let galleries = this.parseGalleryList(html);
      
      // Filter out duplicates using existingIds
      galleries = galleries.filter(gallery => !existingIds.has(gallery.id));
      
      // Add new IDs to the set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: galleries.length >= 24, // IMHentai shows 24 results per page
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[IMHentai] Search failed:', error);
      this.log.warn('IMHentai search failed', { query, error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getPopular(options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      type = 'all',
      existingIds = new Set()
    } = options;
    
    try {
      // Try multiple possible popular URLs
      const possiblePaths = [
        '/popular/',
        '/popular/all/',
        '/popular/all/popular/' // Some sites use this pattern
      ];
      
      const cat = category !== 'all' ? category : type;
      let galleries = [];
      
      for (const path of possiblePaths) {
        try {
          let url = `${this.baseUrl}${path}?page=${page}`;
          
          if (cat !== 'all' && CATEGORY_IDS[cat]) {
            url = `${this.baseUrl}/${cat}${path}?page=${page}`;
          }
          
          console.log('[IMHentai] Fetching popular from:', url);
          const html = await this.fetchHtml(url);
          const newGalleries = this.parseGalleryList(html);
          
          // Add only new galleries to avoid duplicates
          const existingIdsSet = new Set([...existingIds, ...galleries.map(g => g.id)]);
          newGalleries.forEach(g => {
            if (!existingIdsSet.has(g.id)) {
              galleries.push(g);
              existingIdsSet.add(g.id);
            }
          });
          
          // If we have enough results, no need to try other URLs
          if (galleries.length >= limit) break;
        } catch (error) {
          console.warn(`[IMHentai] Failed to fetch from path: ${path}`, error.message);
          // Continue to next path
        }
      }
      
      // Add all new IDs to the existingIds set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: galleries.length >= 24, // IMHentai shows 24 results per page
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[IMHentai] Popular fetch failed:', error);
      this.log.warn('IMHentai popular failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getLatest(options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      type = 'all',
      existingIds = new Set()
    } = options;
    
    try {
      // Try multiple possible latest URLs
      const possiblePaths = [
        '/',
        '/latest/',
        '/latest/all/',
        '/g/'  // Some sites use this as the root for latest
      ];
      
      const cat = category !== 'all' ? category : type;
      let galleries = [];
      
      for (const path of possiblePaths) {
        try {
          let url = `${this.baseUrl}${path}${path.endsWith('/') ? '' : '/'}?page=${page}`;
          
          if (cat !== 'all' && CATEGORY_IDS[cat]) {
            url = `${this.baseUrl}/${cat}${path}?page=${page}`;
          }
          
          console.log('[IMHentai] Fetching latest from:', url);
          const html = await this.fetchHtml(url);
          const newGalleries = this.parseGalleryList(html);
          
          // Add only new galleries to avoid duplicates
          const existingIdsSet = new Set([...existingIds, ...galleries.map(g => g.id)]);
          newGalleries.forEach(g => {
            if (!existingIdsSet.has(g.id)) {
              galleries.push(g);
              existingIdsSet.add(g.id);
            }
          });
          
          // If we have enough results, no need to try other URLs
          if (galleries.length >= limit) break;
        } catch (error) {
          console.warn(`[IMHentai] Failed to fetch latest from path: ${path}`, error.message);
          // Continue to next path
        }
      }
      
      // Sort by ID in descending order (newest first)
      galleries.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      
      // Add all new IDs to the existingIds set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: galleries.length >= 24, // IMHentai shows 24 results per page
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[IMHentai] Latest fetch failed:', error);
      this.log.warn('IMHentai latest failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
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
    
    // Try multiple gallery item patterns to handle different layouts
    const patterns = [
      // Modern grid layout
      {
        regex: /<div[^>]*class="[^"]*thumb[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
        link: /href="\/gallery\/(\d+)\/?"/i,
        title: /class="[^"]*caption[^"]*"[^>]*>([^<]+)<\/|title="([^"]+)"/i,
        thumb: /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
        category: /<span[^>]*class="[^"]*cat[^"]*"[^>]*>([^<]+)<\/span>/i,
        pages: /(\d+)\s*(?:P|pages|page)/i
      },
      // Alternative grid layout
      {
        regex: /<article[^>]*class="[^"]*gallery[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
        link: /href="\/gallery\/(\d+)\/?"/i,
        title: /class="[^"]*caption[^"]*"[^>]*>([^<]+)<\/|title="([^"]+)"/i,
        thumb: /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
        category: /<span[^>]*class="[^"]*type[^"]*"[^>]*>([^<]+)<\/span>/i,
        pages: /(\d+)\s*(?:P|pages|page)/i
      },
      // List layout
      {
        regex: /<tr[^>]*class="[^"]*gallery[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi,
        link: /href="\/gallery\/(\d+)\/?"/i,
        title: /class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i,
        thumb: /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
        category: /<span[^>]*class="[^"]*category[^"]*"[^>]*>([^<]+)<\/span>/i,
        pages: /(\d+)\s*(?:P|pages|page)/i
      }
    ];

    for (const pattern of patterns) {
      const { regex, link, title, thumb, category, pages } = pattern;
      let match;
      
      while ((match = regex.exec(html)) !== null) {
        const content = match[1];
        const linkMatch = link.exec(content);
        
        if (linkMatch) {
          const id = linkMatch[1];
          const titleMatch = title.exec(content);
          const thumbMatch = thumb.exec(content);
          const categoryMatch = category?.exec(content);
          const pagesMatch = pages?.exec(content);
          
          // Skip if we already have this gallery
          if (results.some(r => r.id === id)) continue;
          
          const cat = (categoryMatch?.[1] || 'doujinshi').toLowerCase().trim();
          
          // Process thumbnail URL - ensure it's absolute
          let coverUrl = thumbMatch ? thumbMatch[1] : '';
          if (coverUrl && !coverUrl.startsWith('http')) {
            if (coverUrl.startsWith('//')) {
              coverUrl = 'https:' + coverUrl;
            } else if (coverUrl.startsWith('/')) {
              coverUrl = this.baseUrl + coverUrl;
            } else {
              coverUrl = this.baseUrl + '/' + coverUrl;
            }
          }
          
          results.push(this.formatManga({
            id,
            title: this.decodeHtml((titleMatch?.[1] || titleMatch?.[2] || `Gallery ${id}`).trim()),
            coverUrl,
            genres: [cat],
            type: cat,
            pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
            adult: true
          }));
        }
      }
      
      // If we found results with this pattern, no need to try others
      if (results.length > 0) break;
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
    
    // Try multiple patterns to extract page information
    const patterns = [
      // Standard hidden inputs
      {
        server: /id=['"]load_server['"][^>]*value=['"]([^'"]*)['"]/i,
        dir: /id=['"]load_dir['"][^>]*value=['"]([^'"]*)['"]/i,
        loadId: /id=['"]load_id['"][^>]*value=['"]([^'"]*)['"]/i,
        pages: /id=['"]load_pages['"][^>]*value=['"]([^'"]*)['"]/i,
      },
      // Alternative pattern for some sites
      {
        server: /var\s+load_server\s*=\s*['"]([^'"]*)['"]/i,
        dir: /var\s+load_dir\s*=\s*['"]([^'"]*)['"]/i,
        loadId: /var\s+load_id\s*=\s*['"]([^'"]*)['"]/i,
        pages: /var\s+load_pages\s*=\s*(\d+)/i,
      },
      // Another common pattern
      {
        server: /"server":\s*"([^"]*)"/i,
        dir: /"dir":\s*"([^"]*)"/i,
        loadId: /"id":\s*"([^"]*)"/i,
        pages: /"pages":\s*(\d+)/i,
      }
    ];

    let server, dir, loadId, totalPages;
    
    // Try each pattern until we find one that works
    for (const pattern of patterns) {
      try {
        const serverMatch = pattern.server.exec(html);
        const dirMatch = pattern.dir.exec(html);
        const loadIdMatch = pattern.loadId.exec(html);
        const pagesMatch = pattern.pages.exec(html);
        
        if (serverMatch && dirMatch && loadIdMatch && pagesMatch) {
          server = serverMatch[1];
          dir = dirMatch[1];
          loadId = loadIdMatch[1];
          totalPages = parseInt(pagesMatch[1]);
          break;
        }
      } catch (error) {
        console.warn('[IMHentai] Error parsing page info with pattern:', error);
      }
    }
    
    if (server && dir && loadId && totalPages > 0) {
      // Try to determine the image extension
      const extPatterns = [
        /<img[^>]*data-src=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i,
        /<img[^>]*src=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i,
        /<img[^>]*data-original=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i
      ];
      
      let ext = 'jpg';
      for (const pattern of extPatterns) {
        const match = pattern.exec(html);
        if (match && match[1]) {
          ext = match[1].toLowerCase();
          break;
        }
      }
      
      // Build all page URLs using the pattern
      for (let i = 1; i <= totalPages; i++) {
        // Try multiple URL patterns as different sites may use different formats
        const urlPatterns = [
          `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://m1.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://imhentai.xxx/${dir}/${loadId}/${i}.${ext}`
        ];
        
        // Add all possible URLs and let the proxy handle fallback
        pages.push({
          index: i,
          url: urlPatterns[0], // Primary URL
          fallbackUrls: urlPatterns.slice(1) // Fallback URLs if primary fails
        });
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
