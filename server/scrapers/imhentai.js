import BaseScraper from './base.js';

// API base URL for proxy (set via environment variable in production)
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// IMHentai - Adult content
export class IMHentaiScraper extends BaseScraper {
  constructor() {
    super('IMHentai', 'https://imhentai.xxx', true);
  }

  // Helper to create proxy URL - returns absolute URL for cross-origin access
  proxyUrl(url) {
    if (!url) return '';
    const base = API_BASE || '';
    return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = [], adultOnly = false) {
    try {
      // Build search query - IMHentai supports tag search in query
      let searchQuery = query || '';
      
      // Add tags to search query if provided
      if (tags && tags.length > 0) {
        searchQuery += ' ' + tags.join(' ');
      }
      
      searchQuery = searchQuery.trim();
      
      // If no query at all, return popular instead
      if (!searchQuery) {
        return this.getPopular(page);
      }
      
      const searchUrl = `${this.baseUrl}/search/?key=${encodeURIComponent(searchQuery)}&page=${page}`;
      const $ = await this.fetch(searchUrl);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[IMHentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, tags = [], excludeTags = []) {
    try {
      // If tags provided, use search
      if (tags.length > 0 || excludeTags.length > 0) {
        return this.search('', page, includeAdult, tags, excludeTags);
      }
      
      const $ = await this.fetch(`${this.baseUrl}/popular/?page=${page}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[IMHentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true, tags = [], excludeTags = []) {
    try {
      // If tags provided, use search
      if (tags.length > 0 || excludeTags.length > 0) {
        return this.search('', page, includeAdult, tags, excludeTags);
      }
      
      const $ = await this.fetch(`${this.baseUrl}/?page=${page}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[IMHentai] Latest error:', e.message);
      return [];
    }
  }

  parseGalleryList($) {
    const results = [];
    
    // IMHentai gallery list - uses div.thumb containers
    $('.thumb').each((_, el) => {
      const $el = $(el);
      
      // Get gallery link from inner_thumb > a
      const link = $el.find('.inner_thumb a, a[href*="/gallery/"]').first();
      const href = link.attr('href') || '';
      const match = href.match(/\/gallery\/(\d+)/);
      
      if (!match) return;
      
      const gid = match[1];
      
      // Get title from gallery_title h2 > a or img alt
      const title = $el.find('.gallery_title a').text().trim() || 
                    $el.find('img').attr('alt') ||
                    link.attr('title') || 
                    `Gallery ${gid}`;
      
      // Get cover from lazy-loaded img
      let cover = $el.find('img.lazy').attr('data-src') || 
                  $el.find('img').attr('data-src') ||
                  $el.find('img').attr('src');
      
      if (cover && !cover.startsWith('http')) {
        cover = `https://imhentai.xxx${cover}`;
      }
      
      // Get category from thumb_cat
      const category = $el.find('.thumb_cat').text().trim().toLowerCase() || 'doujinshi';
      
      if (gid) {
        results.push({
          id: `imhentai:${gid}`,
          sourceId: 'imhentai',
          slug: gid,
          title,
          cover: this.proxyUrl(cover),
          category,
          isAdult: true,
          contentType: this.mapCategory(category),
        });
      }
    });

    return results;
  }

  mapCategory(cat) {
    const catMap = {
      'doujinshi': 'doujinshi',
      'manga': 'manga',
      'artist cg': 'artistcg',
      'game cg': 'gamecg',
      'western': 'western',
      'image set': 'imageset',
    };
    return catMap[cat] || 'doujinshi';
  }

  async getMangaDetails(id) {
    const gid = id.replace('imhentai:', '');
    
    try {
      const $ = await this.fetch(`${this.baseUrl}/gallery/${gid}/`);
      if (!$) return null;
      
      const title = $('h1').first().text().trim();
      // Cover is in .left_cover div, not .cover
      const cover = $('.left_cover img').attr('data-src') || $('.left_cover img').attr('src');
      
      // Parse tags
      const tags = [];
      const artists = [];
      const groups = [];
      const parodies = [];
      const characters = [];
      const languages = [];
      
      $('.tag_list, .tags').find('a').each((_, el) => {
        const $tag = $(el);
        const href = $tag.attr('href') || '';
        const tagName = $tag.text().trim().replace(/\s*\d+$/, ''); // Remove count
        
        if (href.includes('/artist/')) artists.push(tagName);
        else if (href.includes('/group/')) groups.push(tagName);
        else if (href.includes('/parody/')) parodies.push(tagName);
        else if (href.includes('/character/')) characters.push(tagName);
        else if (href.includes('/language/')) languages.push(tagName);
        else if (href.includes('/tag/')) tags.push(tagName);
      });
      
      // Get page count
      const pageText = $('.pages').text() || '';
      const pageMatch = pageText.match(/(\d+)/);
      const pageCount = pageMatch ? parseInt(pageMatch[1]) : 0;

      return {
        id,
        sourceId: 'imhentai',
        slug: gid,
        title,
        cover: this.proxyUrl(cover),
        tags,
        artists,
        groups,
        parodies,
        characters,
        languages,
        pageCount,
        isAdult: true,
        isLongStrip: false,
      };
    } catch (e) {
      console.error('[IMHentai] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const gid = mangaId.replace('imhentai:', '');
    return [{
      id: gid,
      mangaId,
      chapter: '1',
      title: 'Full Gallery',
      sourceId: 'imhentai',
    }];
  }

  async getChapterPages(chapterId, mangaId) {
    const gid = mangaId.replace('imhentai:', '');
    
    try {
      const $ = await this.fetch(`${this.baseUrl}/gallery/${gid}/`);
      if (!$) return [];
      
      const pages = [];
      
      // IMHentai embeds page info in hidden inputs:
      // load_server, load_dir, load_id, load_pages
      const server = $('#load_server').val();
      const dir = $('#load_dir').val();
      const loadId = $('#load_id').val();
      const totalPages = parseInt($('#load_pages').val()) || 0;
      
      if (server && dir && loadId && totalPages > 0) {
        // Detect correct extension by checking first image
        // Thumbnails always use .jpg but full images can be .jpg or .webp
        let ext = 'jpg';
        
        // Try to detect from first thumbnail's actual full image
        const firstThumb = $('.gthumb img').first().attr('data-src') || '';
        if (firstThumb) {
          // Extract base URL pattern from thumbnail
          const baseUrl = `https://m${server}.imhentai.xxx/${dir}/${loadId}/1`;
          
          // Check if webp exists (most common for newer galleries)
          try {
            const testRes = await this.client.head(`${baseUrl}.webp`, {
              headers: { 'Referer': 'https://imhentai.xxx/' }
            });
            if (testRes.status === 200) {
              ext = 'webp';
            }
          } catch {
            // webp doesn't exist, try jpg
            try {
              const testRes = await this.client.head(`${baseUrl}.jpg`, {
                headers: { 'Referer': 'https://imhentai.xxx/' }
              });
              if (testRes.status === 200) {
                ext = 'jpg';
              }
            } catch {
              // Default to jpg if both fail
              ext = 'jpg';
            }
          }
        }
        
        console.log(`[IMHentai] Gallery ${gid}: Using extension .${ext}`);
        
        // Build all page URLs using the pattern
        for (let i = 1; i <= totalPages; i++) {
          const fullUrl = `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`;
          pages.push({
            page: i,
            url: this.proxyUrl(fullUrl),
            originalUrl: fullUrl
          });
        }
      }
      
      // Fallback to thumbnail scraping if hidden inputs not found
      if (pages.length === 0) {
        $('.gthumb').each((i, el) => {
          const $el = $(el);
          let src = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
          
          if (!src || src.includes('svg') || src.includes('logo')) return;
          
          // Convert thumbnail to full image: 1t.jpg -> 1.jpg
          if (src.match(/\d+t\.(jpg|png|gif|webp)/i)) {
            src = src.replace(/(\d+)t\./, '$1.');
          }
          
          if (src.startsWith('//')) {
            src = 'https:' + src;
          } else if (src.startsWith('/')) {
            src = this.baseUrl + src;
          }
          
          if (src.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
            pages.push({
              page: pages.length + 1,
              url: this.proxyUrl(src),
              originalUrl: src
            });
          }
        });
      }

      console.log(`[IMHentai] Found ${pages.length} pages for gallery ${gid}`);
      return pages;
    } catch (e) {
      console.error('[IMHentai] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    return [
      'big breasts', 'sole female', 'sole male', 'translated', 'stockings',
      'schoolgirl uniform', 'glasses', 'full color', 'anal', 'nakadashi',
      'blowjob', 'paizuri', 'ahegao', 'femdom', 'group', 'incest'
    ];
  }

  async getNewlyAdded(page = 1) {
    return this.getLatest(page);
  }

  async getTopRated(page = 1) {
    return this.getPopular(page);
  }
}

export default IMHentaiScraper;
