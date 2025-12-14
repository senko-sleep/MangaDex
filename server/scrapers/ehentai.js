import BaseScraper from './base.js';

// E-Hentai - Adult content using JSON API
export class EHentaiScraper extends BaseScraper {
  constructor() {
    super('E-Hentai', 'https://e-hentai.org', true);
    this.apiUrl = 'https://api.e-hentai.org/api.php';
  }

  async fetchApi(method, params = {}) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ method, ...params })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error('[E-Hentai] API error:', e.message);
      return null;
    }
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    // Ensure tags is an array
    if (!Array.isArray(tags)) tags = [];
    if (!Array.isArray(excludeTags)) excludeTags = [];
    
    try {
      // Build search query with tags
      let searchQuery = query || '';
      
      // Add language filter (english, japanese, chinese)
      if (language && language !== 'all') {
        searchQuery += ` language:${language}`;
      }
      
      if (tags.length > 0) {
        searchQuery += ' ' + tags.map(t => `"${t}$"`).join(' ');
      }
      if (excludeTags.length > 0) {
        searchQuery += ' ' + excludeTags.map(t => `-"${t}$"`).join(' ');
      }
      
      const searchUrl = `${this.baseUrl}/?f_search=${encodeURIComponent(searchQuery.trim())}&page=${page - 1}`;
      const $ = await this.fetch(searchUrl);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[E-Hentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    // Ensure tags is an array
    if (!Array.isArray(tags)) tags = [];
    if (!Array.isArray(excludeTags)) excludeTags = [];
    
    try {
      // If tags or language provided, use search instead
      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        return this.search('', page, includeAdult, tags, excludeTags, language);
      }
      
      // Popular galleries (front page sorted by favorites)
      const $ = await this.fetch(`${this.baseUrl}/popular?page=${page - 1}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[E-Hentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    // Ensure tags is an array
    if (!Array.isArray(tags)) tags = [];
    if (!Array.isArray(excludeTags)) excludeTags = [];
    
    try {
      // If tags or language provided, use search
      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        return this.search('', page, includeAdult, tags, excludeTags, language);
      }
      
      const $ = await this.fetch(`${this.baseUrl}/?page=${page - 1}`);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[E-Hentai] Latest error:', e.message);
      return [];
    }
  }

  parseGalleryList($) {
    const results = [];
    
    // E-Hentai gallery list
    $('table.itg tr, .gl1t').each((_, el) => {
      const $el = $(el);
      
      // Get gallery link
      const link = $el.find('a[href*="/g/"]').first();
      const href = link.attr('href') || '';
      const match = href.match(/\/g\/(\d+)\/([a-f0-9]+)/);
      
      if (!match) return;
      
      const [, gid, token] = match;
      const title = $el.find('.glink, .gl4t a').text().trim() || link.text().trim();
      
      // Get cover
      let cover = $el.find('img').first().attr('data-src') || $el.find('img').first().attr('src');
      if (cover && !cover.startsWith('http')) {
        cover = `https:${cover}`;
      }
      
      // Get category
      const category = $el.find('.cn, .cs, .ct').first().text().trim().toLowerCase();
      
      if (gid && title) {
        results.push({
          id: `ehentai:${gid}_${token}`,
          sourceId: 'ehentai',
          slug: `${gid}/${token}`,
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
      'cosplay': 'cosplay',
      'non-h': 'manga',
      'misc': 'imageset',
    };
    return catMap[cat] || 'doujinshi';
  }

  async getMangaDetails(id) {
    const slug = id.replace('ehentai:', '');
    const [gid, token] = slug.split('_');
    
    try {
      // Use API for details
      const data = await this.fetchApi('gdata', {
        gidlist: [[parseInt(gid), token]],
        namespace: 1
      });
      
      if (!data?.gmetadata?.[0]) return null;
      
      const gallery = data.gmetadata[0];
      
      // Parse tags
      const tags = [];
      const artists = [];
      const groups = [];
      const parodies = [];
      const characters = [];
      
      for (const tag of (gallery.tags || [])) {
        const [namespace, name] = tag.includes(':') ? tag.split(':') : ['misc', tag];
        switch (namespace) {
          case 'artist': artists.push(name); break;
          case 'group': groups.push(name); break;
          case 'parody': parodies.push(name); break;
          case 'character': characters.push(name); break;
          default: tags.push(name);
        }
      }

      return {
        id,
        sourceId: 'ehentai',
        slug,
        title: gallery.title || gallery.title_jpn || `Gallery ${gid}`,
        titleJpn: gallery.title_jpn,
        cover: gallery.thumb ? `/api/proxy/image?url=${encodeURIComponent(gallery.thumb)}` : null,
        tags,
        artists,
        groups,
        parodies,
        characters,
        category: gallery.category?.toLowerCase(),
        pageCount: gallery.filecount || 0,
        rating: parseFloat(gallery.rating) || 0,
        isAdult: true,
        isLongStrip: false,
      };
    } catch (e) {
      console.error('[E-Hentai] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('ehentai:', '');
    return [{
      id: slug,
      mangaId,
      chapter: '1',
      title: 'Full Gallery',
      sourceId: 'ehentai',
    }];
  }

  async getChapterPages(chapterId, mangaId) {
    const slug = mangaId.replace('ehentai:', '');
    const [gid, token] = slug.split('_');
    
    try {
      const pageLinks = [];
      let currentPage = 0;
      let hasMorePages = true;
      
      // E-Hentai paginates gallery thumbnails with ?p=0, ?p=1, etc.
      // Each page shows ~40 thumbnails
      while (hasMorePages && currentPage < 10) { // Max 10 pages = ~400 images
        const galleryUrl = `${this.baseUrl}/g/${gid}/${token}/?p=${currentPage}`;
        const $ = await this.fetch(galleryUrl);
        if (!$) break;
        
        const linksOnPage = [];
        // Get all page links (thumbnail links that lead to full image pages)
        $('a[href*="/s/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !pageLinks.includes(href)) {
            linksOnPage.push(href);
            pageLinks.push(href);
          }
        });
        
        // If no new links found, we've reached the end
        if (linksOnPage.length === 0) {
          hasMorePages = false;
        } else {
          currentPage++;
        }
        
        // Small delay between pagination requests
        if (hasMorePages) {
          await new Promise(r => setTimeout(r, 200));
        }
      }
      
      console.log(`[E-Hentai] Found ${pageLinks.length} page links across ${currentPage} pages`);
      
      // Fetch actual image URLs from each page (limit to first 500 pages)
      const limitedLinks = pageLinks.slice(0, 500);
      const pages = [];
      
      // Fetch pages in batches of 50 for faster loading
      for (let i = 0; i < limitedLinks.length; i += 50) {
        const batch = limitedLinks.slice(i, i + 50);
        const batchResults = await Promise.all(
          batch.map(async (pageUrl, batchIdx) => {
            try {
              const page$ = await this.fetch(pageUrl);
              if (!page$) return null;
              
              // Extract actual image URL from the page
              const imgSrc = page$('#img').attr('src');
              if (imgSrc) {
                return {
                  page: i + batchIdx + 1,
                  url: `/api/proxy/image?url=${encodeURIComponent(imgSrc)}`,
                  originalUrl: imgSrc
                };
              }
              return null;
            } catch {
              return null;
            }
          })
        );
        
        pages.push(...batchResults.filter(Boolean));
      }
      
      console.log(`[E-Hentai] Loaded ${pages.length} image URLs`);
      return pages;
    } catch (e) {
      console.error('[E-Hentai] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    // Common E-Hentai tags
    return [
      'translated', 'chinese', 'english', 'japanese', 'full color',
      'sole female', 'sole male', 'femdom', 'big breasts', 'ahegao',
      'nakadashi', 'schoolgirl uniform', 'stockings', 'glasses',
      'blowjob', 'paizuri', 'anal', 'group', 'netorare', 'vanilla'
    ];
  }

  async getNewlyAdded(page = 1) {
    return this.getLatest(page);
  }

  async getTopRated(page = 1) {
    return this.getPopular(page);
  }
}

export default EHentaiScraper;
