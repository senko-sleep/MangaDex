import BaseScraper from './base.js';

// API base URL for proxy
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// E-Hentai - Adult content using JSON API
export class EHentaiScraper extends BaseScraper {
  constructor() {
    super('E-Hentai', 'https://e-hentai.org', true);
    this.apiUrl = 'https://api.e-hentai.org/api.php';
    // Track seen gallery IDs to prevent duplicates across pagination
    this.seenIds = new Set();
    this.lastClearTime = Date.now();
    // E-Hentai uses ?next=<last_gallery_id> for pagination, not ?page=N
    // Track the last gallery ID for each context (latest, popular, search queries)
    this.paginationState = new Map();
  }

  // Helper to create proxy URL
  proxyUrl(url) {
    if (!url) return '';
    const base = API_BASE || '';
    return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  // Clear seen IDs periodically to prevent memory bloat
  // Use a shorter interval since galleries update frequently
  clearSeenIdsIfStale() {
    const CLEAR_INTERVAL = 2 * 60 * 1000; // 2 minutes - allows fresh results on new browsing sessions
    if (Date.now() - this.lastClearTime > CLEAR_INTERVAL) {
      this.seenIds.clear();
      this.lastClearTime = Date.now();
      console.log('[E-Hentai] Cleared seen IDs cache');
    }
  }

  async fetchApi(method, params = {}) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({ method, ...params }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error('[E-Hentai] API error:', e.message);
      return null;
    }
  }

  async search(query, options = {}) {
    try {
      // Handle both old positional params and new options object
      let page = 1;
      let tags = [];
      let excludeTags = [];
      let language = null;

      if (typeof options === 'number') {
        page = options || 1;
        tags = arguments[3] || [];
        excludeTags = arguments[4] || [];
        language = arguments[5] || null;
      } else {
        page = options.page || 1;
        tags = options.tags || [];
        excludeTags = options.exclude || [];
        language = options.language || null;
      }

      // Check if cache needs clearing (TTL-based)
      this.clearSeenIdsIfStale();

      let searchQuery = query || '';

      if (language && language !== 'all') {
        searchQuery += ` language:${language}`;
      }

      if (tags && tags.length > 0) {
        searchQuery += ' ' + tags.map(t => `"${t}$"`).join(' ');
      }

      if (excludeTags && excludeTags.length > 0) {
        searchQuery += ' ' + excludeTags.map(t => `-"${t}$"`).join(' ');
      }

      // E-Hentai uses ?next=<last_gallery_id> for pagination
      const paginationKey = `search:${searchQuery.trim()}`;
      let searchUrl = `${this.baseUrl}/?f_search=${encodeURIComponent(searchQuery.trim())}`;
      
      if (page > 1) {
        const lastId = this.paginationState.get(paginationKey);
        if (lastId) {
          searchUrl += `&next=${lastId}`;
        }
      } else {
        // Reset pagination state for page 1
        this.paginationState.delete(paginationKey);
        this.seenIds.clear();
      }

      console.log('[E-Hentai] Searching:', searchUrl);
      const $ = await this.fetch(searchUrl);
      if (!$) return [];
      
      const results = this.parseGalleryList($);
      
      // Store the last gallery ID for next page
      if (results.length > 0) {
        const lastGallery = results[results.length - 1];
        const lastId = lastGallery.id.replace('ehentai:', '').split('_')[0];
        this.paginationState.set(paginationKey, lastId);
      }
      
      return results;
    } catch (e) {
      console.error('[E-Hentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(options = {}) {
    try {
      // Handle both old positional params and new options object
      let page = 1;
      let tags = [];
      let excludeTags = [];
      let language = null;

      if (typeof options === 'number') {
        page = options || 1;
        tags = arguments[2] || [];
        excludeTags = arguments[3] || [];
        language = arguments[4] || null;
      } else {
        page = options.page || 1;
        tags = options.tags || [];
        excludeTags = options.exclude || [];
        language = options.language || null;
      }

      if (!Array.isArray(tags)) tags = [];
      if (!Array.isArray(excludeTags)) excludeTags = [];

      // Check if cache needs clearing (TTL-based)
      this.clearSeenIdsIfStale();

      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        return this.search('', { page, tags, exclude: excludeTags, language });
      }

      // E-Hentai /popular page doesn't support pagination, so use main page with pagination
      // This allows infinite scroll to work properly
      const paginationKey = 'popular';
      let popularUrl = this.baseUrl;
      
      if (page > 1) {
        const lastId = this.paginationState.get(paginationKey);
        if (lastId) {
          popularUrl = `${this.baseUrl}/?next=${lastId}`;
        }
      } else {
        // Reset pagination state for page 1
        this.paginationState.delete(paginationKey);
        this.seenIds.clear();
      }
      
      console.log('[E-Hentai] Fetching popular:', popularUrl);
      const $ = await this.fetch(popularUrl);
      if (!$) return [];
      
      const results = this.parseGalleryList($);
      
      // Store the last gallery ID for next page
      if (results.length > 0) {
        const lastGallery = results[results.length - 1];
        const lastId = lastGallery.id.replace('ehentai:', '').split('_')[0];
        this.paginationState.set(paginationKey, lastId);
      }
      
      return results;
    } catch (e) {
      console.error('[E-Hentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(options = {}) {
    try {
      // Handle both old positional params and new options object
      let page = 1;
      let tags = [];
      let excludeTags = [];
      let language = null;

      if (typeof options === 'number') {
        page = options || 1;
        tags = arguments[2] || [];
        excludeTags = arguments[3] || [];
        language = arguments[4] || null;
      } else {
        page = options.page || 1;
        tags = options.tags || [];
        excludeTags = options.exclude || [];
        language = options.language || null;
      }

      // Check if cache needs clearing (TTL-based)
      this.clearSeenIdsIfStale();

      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        return this.search('', { page, tags, exclude: excludeTags, language });
      }

      // E-Hentai uses ?next=<last_gallery_id> for pagination
      const paginationKey = 'latest';
      let latestUrl = this.baseUrl;
      
      if (page > 1) {
        const lastId = this.paginationState.get(paginationKey);
        if (lastId) {
          latestUrl = `${this.baseUrl}/?next=${lastId}`;
        }
      } else {
        // Reset pagination state for page 1
        this.paginationState.delete(paginationKey);
        this.seenIds.clear();
      }
      
      console.log('[E-Hentai] Fetching latest:', latestUrl);
      const $ = await this.fetch(latestUrl);
      if (!$) return [];
      
      const results = this.parseGalleryList($);
      
      // Store the last gallery ID for next page
      if (results.length > 0) {
        const lastGallery = results[results.length - 1];
        const lastId = lastGallery.id.replace('ehentai:', '').split('_')[0];
        this.paginationState.set(paginationKey, lastId);
      }
      
      return results;
    } catch (e) {
      console.error('[E-Hentai] Latest error:', e.message);
      return [];
    }
  }

  parseGalleryList($) {
    const results = [];

    $('table.itg tr, .gl1t').each((_, el) => {
      const $el = $(el);

      const link = $el.find('a[href*="/g/"]').first();
      const href = link.attr('href') || '';
      const match = href.match(/\/g\/(\d+)\/([a-f0-9]+)/);

      if (!match) return;

      const [, gid, token] = match;
      const galleryId = `${gid}_${token}`;

      // Skip if we've already seen this gallery (deduplication)
      if (this.seenIds.has(galleryId)) {
        return;
      }
      this.seenIds.add(galleryId);

      const title =
        $el.find('.glink, .gl4t a').text().trim() || link.text().trim();

      let cover =
        $el.find('img').first().attr('data-src') ||
        $el.find('img').first().attr('src');

      if (cover && !cover.startsWith('http')) {
        cover = `https:${cover}`;
      }

      const category = $el
        .find('.cn, .cs, .ct')
        .first()
        .text()
        .trim()
        .toLowerCase();

      if (gid && title) {
        results.push({
          id: `ehentai:${galleryId}`,
          sourceId: 'ehentai',
          slug: `${gid}/${token}`,
          title,
          cover: this.proxyUrl(cover),
          category,
          isAdult: true,
          contentType: this.mapCategory(category),
        });
      }
    });

    console.log(`[E-Hentai] Parsed ${results.length} galleries (${this.seenIds.size} total seen)`);
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
      const data = await this.fetchApi('gdata', {
        gidlist: [[parseInt(gid, 10), token]],
        namespace: 1,
      });

      if (!data?.gmetadata?.[0]) return null;
      const gallery = data.gmetadata[0];

      const tags = [];
      const artists = [];
      const groups = [];
      const parodies = [];
      const characters = [];

      for (const tag of gallery.tags || []) {
        const [ns, name] = tag.includes(':') ? tag.split(':') : ['misc', tag];
        switch (ns) {
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
        cover: gallery.thumb
          ? `/api/proxy/image?url=${encodeURIComponent(gallery.thumb)}`
          : null,
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
    try {
      // chapterId format: gid_token or gid/token
      const slug = chapterId.replace('ehentai:', '');
      const [gid, token] = slug.includes('_') ? slug.split('_') : slug.split('/');
      
      const galleryUrl = `${this.baseUrl}/g/${gid}/${token}/`;
      console.log('[E-Hentai] Fetching gallery pages:', galleryUrl);
      
      // Get the first gallery page to extract page links
      const $ = await this.fetch(galleryUrl);
      if (!$) return [];
      
      const pages = [];
      
      // Extract page links from thumbnails on first page
      // Look for links matching /s/hash/gid-pagenum pattern
      $('a[href*="/s/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.match(/\/s\/[a-f0-9]+\/\d+-\d+/)) {
          const thumbnail = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
          pages.push({
            page: pages.length + 1,
            url: this.proxyUrl(thumbnail),
            originalUrl: thumbnail,
            // Store the page URL for lazy loading full image
            pageUrl: href,
          });
        }
      });
      
      // Also check for extended/compact layout
      if (pages.length === 0) {
        $('div.gdtm a, div.gdtl a').each((i, el) => {
          const href = $(el).attr('href');
          if (href && href.includes('/s/')) {
            const thumbnail = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
            pages.push({
              page: pages.length + 1,
              url: this.proxyUrl(thumbnail),
              originalUrl: thumbnail,
              pageUrl: href,
            });
          }
        });
      }
      
      // Get total page count to know if we need more pages
      let totalPages = pages.length;
      const details = await this.getMangaDetails(`ehentai:${gid}_${token}`);
      if (details && details.pageCount) {
        totalPages = parseInt(details.pageCount);
      }
      
      // If there are more pages, fetch additional gallery listing pages
      // E-Hentai shows ~40 thumbnails per page
      if (totalPages > pages.length) {
        const thumbsPerPage = 40;
        const maxGalleryPages = Math.ceil(totalPages / thumbsPerPage);
        
        // Fetch remaining gallery pages in parallel (up to 5 at a time)
        const additionalPages = [];
        for (let gp = 1; gp < maxGalleryPages && gp < 10; gp++) {
          additionalPages.push(gp);
        }
        
        const batchSize = 3;
        for (let i = 0; i < additionalPages.length; i += batchSize) {
          const batch = additionalPages.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (gp) => {
              try {
                const pageUrl = `${galleryUrl}?p=${gp}`;
                const $page = await this.fetch(pageUrl);
                if (!$page) return [];
                
                const pageResults = [];
                $page('a[href*="/s/"]').each((_, el) => {
                  const href = $page(el).attr('href');
                  if (href && href.match(/\/s\/[a-f0-9]+\/\d+-\d+/)) {
                    const thumbnail = $page(el).find('img').attr('src') || $page(el).find('img').attr('data-src') || '';
                    pageResults.push({
                      url: this.proxyUrl(thumbnail),
                      originalUrl: thumbnail,
                      pageUrl: href,
                    });
                  }
                });
                
                // Fallback for extended/compact layout
                if (pageResults.length === 0) {
                  $page('div.gdtm a, div.gdtl a').each((_, el) => {
                    const href = $page(el).attr('href');
                    if (href && href.includes('/s/')) {
                      const thumbnail = $page(el).find('img').attr('src') || $page(el).find('img').attr('data-src') || '';
                      pageResults.push({
                        url: this.proxyUrl(thumbnail),
                        originalUrl: thumbnail,
                        pageUrl: href,
                      });
                    }
                  });
                }
                
                return pageResults;
              } catch (e) {
                return [];
              }
            })
          );
          
          // Add results with correct page numbers
          batchResults.flat().forEach(p => {
            pages.push({
              page: pages.length + 1,
              ...p,
            });
          });
        }
      }
      
      console.log(`[E-Hentai] Found ${pages.length} page links for gallery ${gid}`);
      
      // Fetch all full-size image URLs from the page links
      // Use larger batches and shorter delays for better performance
      const resolvedPages = [];
      const batchSize = 10;
      
      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (pageInfo) => {
            try {
              const $imgPage = await this.fetch(pageInfo.pageUrl);
              if (!$imgPage) {
                return {
                  page: pageInfo.page,
                  url: pageInfo.url,
                  originalUrl: pageInfo.originalUrl,
                };
              }
              
              let fullImageUrl = $imgPage('img#img').attr('src') || 
                                $imgPage('img[id="img"]').attr('src') || 
                                $imgPage('div#i3 img').attr('src') || '';
              
              return {
                page: pageInfo.page,
                url: fullImageUrl ? this.proxyUrl(fullImageUrl) : pageInfo.url,
                originalUrl: fullImageUrl || pageInfo.originalUrl,
              };
            } catch (e) {
              console.error(`[E-Hentai] Error fetching page ${pageInfo.page}:`, e.message);
              return {
                page: pageInfo.page,
                url: pageInfo.url,
                originalUrl: pageInfo.originalUrl,
              };
            }
          })
        );
        
        resolvedPages.push(...batchResults);
        
        if (pages.length > 20) {
          console.log(`[E-Hentai] Resolved ${resolvedPages.length}/${pages.length} images`);
        }
        
        if (i + batchSize < pages.length) {
          await new Promise(r => setTimeout(r, 50));
        }
      }
      
      console.log(`[E-Hentai] Resolved ${resolvedPages.length} full-size images`);
      return resolvedPages;
    } catch (e) {
      console.error('[E-Hentai] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    return [
      'translated', 'chinese', 'english', 'japanese', 'full color',
      'sole female', 'sole male', 'femdom', 'big breasts', 'ahegao',
      'nakadashi', 'schoolgirl uniform', 'stockings', 'glasses',
      'blowjob', 'paizuri', 'anal', 'group', 'netorare', 'vanilla',
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
