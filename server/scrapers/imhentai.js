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

  async search(query, options = {}) {
    try {
      // Handle both old positional params and new options object
      let page = 1;
      let tags = [];
      let excludeTags = [];
      let language = null;
      let contentType = null;
      let sortBy = 'latest';

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
        contentType = options.type;
        sortBy = options.sort || 'latest';
      }

      // Check if this is an artist search
      // Artist search if:
      // 1. Query matches "artist:<name>" or "@<name>" format
      // 2. Query is a simple single word with no spaces (like "dagasi")
      // AND there are no tags, excludeTags, or language filters
      const queryTrimmed = (query || '').trim();
      const artistMatch = queryTrimmed.match(/^(?:artist:|@)([\w-]+)$/i);
      const isSimpleWord = /^[\w-]+$/.test(queryTrimmed) && !queryTrimmed.includes(' ');
      
      if ((artistMatch || isSimpleWord) && tags.length === 0 && excludeTags.length === 0 && !language) {
        const artistName = artistMatch ? artistMatch[1] : queryTrimmed;
        const artistUrl = `${this.baseUrl}/artist/${encodeURIComponent(artistName)}/${page > 1 ? `?page=${page}` : ''}`;
        console.log('[IMHentai] Searching deeper:', artistUrl);
        const $ = await this.fetch(artistUrl);
        if (!$) return [];
        return this.parseGalleryList($);
      }

      const params = new URLSearchParams();

      // Build search query
      let searchQuery = query || '';

      // IMHentai handles tags better if they are in the key parameter
      if (tags && tags.length > 0) {
        // Replace spaces with underscores for tags
        const formattedTags = tags.map(t => t.replace(/\s+/g, '_'));
        searchQuery += (searchQuery ? ' ' : '') + formattedTags.join(' ');
      }

      if (excludeTags && excludeTags.length > 0) {
        const formattedExcludes = excludeTags.map(t => '-' + t.replace(/\s+/g, '_'));
        searchQuery += (searchQuery ? ' ' : '') + formattedExcludes.join(' ');
      }

      params.set('key', searchQuery.trim() || '*');
      params.set('page', String(page));

      // Category filters (1 = enabled, 0 = disabled)
      // If a specific content type is requested, enable ONLY that one
      // Otherwise enable all search categories to "search deeper"
      const typeFlags = {
        m: 1, // Manga
        d: 1, // Doujinshi
        w: 1, // Western
        i: 1, // Image Set
        a: 1, // Artist CG
        g: 1, // Game CG
      };

      if (contentType && contentType !== 'all') {
        // Reset all to 0
        Object.keys(typeFlags).forEach(k => typeFlags[k] = 0);
        // Enable selected
        if (contentType === 'manga') typeFlags.m = 1;
        else if (contentType === 'doujinshi') typeFlags.d = 1;
        else if (contentType === 'western') typeFlags.w = 1;
        else if (contentType === 'imageset') typeFlags.i = 1;
        else if (contentType === 'artistcg') typeFlags.a = 1;
        else if (contentType === 'gamecg') typeFlags.g = 1;
      }

      Object.entries(typeFlags).forEach(([k, v]) => params.set(k, String(v)));

      // Language filters
      if (language && language !== 'all') {
        const langCode = language.substring(0, 2).toLowerCase();
        // IMHentai uses en, jp, es, fr, kr, de, ru, it, tr codes
        params.set(langCode, '1');
      }

      // Sorting
      if (sortBy === 'popular') {
        params.set('sort', 'popular'); // Or 'downloads' / 'views'
      }

      const searchUrl = `${this.baseUrl}/search/?${params}`;
      console.log('[IMHentai] Searching deeper:', searchUrl);
      const $ = await this.fetch(searchUrl);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[IMHentai] Search error:', e.message);
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
        // Old style: getPopular(page, includeAdult, tags, excludeTags, language)
        page = options || 1;
        tags = arguments[2] || [];
        excludeTags = arguments[3] || [];
        language = arguments[4] || null;
      } else {
        // New style: getPopular({ page, limit, language, tags, exclude })
        page = options.page || 1;
        tags = options.tags || [];
        excludeTags = options.exclude || [];
        language = options.language || null;
      }

      // If tags or language provided, use search
      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        return this.search('', options);
      }

      const popularUrl = `${this.baseUrl}/popular/?page=${page}`;
      console.log('[IMHentai] Fetching popular:', popularUrl);
      const $ = await this.fetch(popularUrl);
      if (!$) return [];
      return this.parseGalleryList($);
    } catch (e) {
      console.error('[IMHentai] Popular error:', e.message);
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
        // Old style: getLatest(page, includeAdult, tags, excludeTags, language)
        page = options || 1;
        tags = arguments[2] || [];
        excludeTags = arguments[3] || [];
        language = arguments[4] || null;
      } else {
        // New style: getLatest({ page, limit, language, tags, exclude })
        page = options.page || 1;
        tags = options.tags || [];
        excludeTags = options.exclude || [];
        language = options.language || null;
      }

      // If tags or language provided, use search
      if (tags.length > 0 || excludeTags.length > 0 || (language && language !== 'all')) {
        return this.search('', options);
      }

      const latestUrl = `${this.baseUrl}/?page=${page}`;
      console.log('[IMHentai] Fetching latest:', latestUrl);
      const $ = await this.fetch(latestUrl);
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

      // Get title from caption div or h2, or from link title attribute
      let title = $el.find('.caption, .gallery_title').text().trim();
      if (!title) {
        title = $el.find('h2').text().trim();
      }
      if (!title) {
        title = link.attr('title') || '';
      }
      if (!title) {
        title = $el.find('img').attr('alt') || '';
      }
      if (!title || title === 'IMG') {
        title = `Gallery ${gid}`;
      }

      // Get cover from lazy-loaded img
      let cover = $el.find('img.lazy').attr('data-src') ||
        $el.find('img').attr('data-src') ||
        $el.find('img').attr('src');

      if (cover && !cover.startsWith('http')) {
        cover = `https://imhentai.xxx${cover}`;
      }

      // Get category from thumb_cat span
      const category = $el.find('.thumb_cat, .category').text().trim().toLowerCase() || 'doujinshi';

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

    console.log(`[IMHentai] Parsed ${results.length} galleries`);
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
