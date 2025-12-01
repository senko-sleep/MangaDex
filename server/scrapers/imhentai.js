import BaseScraper from './base.js';

// IMHentai - Adult content
export class IMHentaiScraper extends BaseScraper {
  constructor() {
    super('IMHentai', 'https://imhentai.xxx', true);
  }

  async search(query, page = 1) {
    try {
      const searchUrl = `${this.baseUrl}/search/?key=${encodeURIComponent(query)}&page=${page}`;
      const $ = await this.fetch(searchUrl);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[IMHentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1) {
    try {
      const $ = await this.fetch(`${this.baseUrl}/popular/?page=${page}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[IMHentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1) {
    try {
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
    
    // IMHentai gallery list
    $('.thumb, .gallery').each((_, el) => {
      const $el = $(el);
      
      // Get gallery link
      const link = $el.find('a').first();
      const href = link.attr('href') || '';
      const match = href.match(/\/gallery\/(\d+)/);
      
      if (!match) return;
      
      const gid = match[1];
      const title = $el.find('.caption, .title, h2').text().trim() || link.attr('title') || '';
      
      // Get cover
      let cover = $el.find('img').first().attr('data-src') || 
                  $el.find('img').first().attr('src') ||
                  $el.find('.lazy').attr('data-src');
      
      if (cover && !cover.startsWith('http')) {
        cover = `https://imhentai.xxx${cover}`;
      }
      
      // Get category/type from class or text
      const category = $el.find('.type, .category').text().trim().toLowerCase() || 'doujinshi';
      
      if (gid && title) {
        results.push({
          id: `imhentai:${gid}`,
          sourceId: 'imhentai',
          slug: gid,
          title,
          cover: cover ? `/api/proxy/image?url=${encodeURIComponent(cover)}` : null,
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
      const cover = $('.cover img').attr('data-src') || $('.cover img').attr('src');
      
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
        cover: cover ? `/api/proxy/image?url=${encodeURIComponent(cover)}` : null,
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
      
      // IMHentai stores image info in a script tag or data attributes
      // Try multiple selectors for thumbnails
      const thumbSelectors = [
        '.gthumb img',
        '.thumb img', 
        '.gallery_thumb img',
        '.thumbs img',
        '.lazy',
        'img[data-src]'
      ];
      
      let foundThumbs = false;
      for (const selector of thumbSelectors) {
        $(selector).each((i, el) => {
          let src = $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('src') || '';
          
          // Skip non-image sources
          if (!src || src.includes('logo') || src.includes('icon') || src.includes('avatar')) return;
          
          // Convert thumbnail to full image
          // Patterns: 1t.jpg -> 1.jpg, 001t.webp -> 001.webp
          if (src.includes('t.')) {
            src = src.replace(/(\d+)t\./, '$1.');
          }
          
          // Ensure full URL
          if (src.startsWith('//')) {
            src = 'https:' + src;
          } else if (src.startsWith('/')) {
            src = this.baseUrl + src;
          }
          
          if (src.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
            pages.push({
              page: pages.length + 1,
              url: `/api/proxy/image?url=${encodeURIComponent(src)}`,
              originalUrl: src
            });
            foundThumbs = true;
          }
        });
        
        if (foundThumbs) break;
      }
      
      // Alternative: try to find image viewer page and extract from there
      if (pages.length === 0) {
        const viewerUrl = `${this.baseUrl}/view/${gid}/1/`;
        const viewer$ = await this.fetch(viewerUrl);
        if (viewer$) {
          // Get total pages from viewer
          const pageInfo = viewer$('.total_pages, .page_num').text();
          const totalMatch = pageInfo.match(/(\d+)/);
          const totalPages = totalMatch ? parseInt(totalMatch[1]) : 1;
          
          // Get image from viewer
          const imgSrc = viewer$('#gimg, #img, .gimg img').attr('src');
          if (imgSrc) {
            // Build URLs for all pages based on pattern
            const basePattern = imgSrc.replace(/\/\d+\./, '/PAGE.');
            for (let i = 1; i <= Math.min(totalPages, 200); i++) {
              const pageUrl = basePattern.replace('PAGE', i);
              pages.push({
                page: i,
                url: `/api/proxy/image?url=${encodeURIComponent(pageUrl)}`,
                originalUrl: pageUrl
              });
            }
          }
        }
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
