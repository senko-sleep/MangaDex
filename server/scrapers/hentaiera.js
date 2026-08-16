import BaseScraper from './base.js';
import * as cheerio from 'cheerio';

class HentaieraScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'Hentaiera';
    this.baseUrl = 'https://hentaiera.com';
    this.id = 'hentaiera';
  }
  
  loadHtml(html) {
    return cheerio.load(html);
  }
  
  proxyUrl(url) {
    // For now, return the URL directly
    // Later we can add proxy logic if needed
    return url;
  }

  // NOTE: Hentaiera CDN serves MIXED extensions — some pages are .webp, others .jpg.
  // We do NOT force-convert extensions here. Instead we keep the original URL and let
  // the frontend route it through /api/proxy/image which has extension fallback
  // (.webp -> .jpg -> .png -> .gif) that resolves whichever extension actually exists.
  parseGalleryList($, isFirstPage = true) {
    const results = [];
    const seenIds = new Set();

    // Parse gallery items from the page using the actual HTML structure.
    // Each gallery is contained in a single `div.thumb` block. Parsing by block
    // (instead of matching every `a[href*="/gallery/"]`) avoids duplicates, since
    // each block contains BOTH a thumbnail image link AND a title link.
    $('.thumb').each((i, el) => {
      const $el = $(el);

      // Find the gallery link (title link preferred, fall back to any gallery link)
      let $link = $el.find('h2.gallery_title a[href*="/gallery/"]').first();
      if ($link.length === 0) {
        $link = $el.find('a[href*="/gallery/"]').first();
      }

      const href = $link.attr('href');
      if (!href || !href.includes('/gallery/')) return;

      const idMatch = href.match(/\/gallery\/(\d+)\//);
      if (!idMatch) return;

      const id = idMatch[1];

      // Deduplicate by gallery ID in case a page repeats a block
      if (seenIds.has(id)) return;
      seenIds.add(id);

      // Title from the thumbnail image alt, fall back to the title link text
      const $img = $el.find('img').first();
      const title = $img.attr('alt') || $link.text().trim();

      // Cover from the lazy-loaded thumbnail image (data-src), fall back to src
      const thumb = $img.attr('data-src') || $img.attr('src');

      if (!title || title.includes('loading')) return;

      results.push({
        id: `${this.id}:${id}`,
        title: title.trim(),
        coverImage: thumb,
        source: this.id,
        url: `${this.baseUrl}${href}`,
        isAdult: true,
        contentRating: 'pornographic',
        sourceId: this.id
      });
    });

    return results;
  }

  async getGalleryDetails(id) {
    const gid = id.replace(`${this.id}:`, '');

    try {
      const url = `${this.baseUrl}/gallery/${gid}/`;
      console.log('[Hentaiera] Fetching gallery details:', url);
      
      const $ = await this.fetch(url);
      if (!$) return null;

      const title = $('h1').first().text().trim() || $('.title').first().text().trim();
      
      // Extract cover - Hentaiera uses lazy loading (data-src) for the cover image.
      // The cover is usually a "cover.jpg" image before the thumbnail grid.
      let cover = $('.cover img').attr('src') || 
                  $('.cover img').attr('data-src') ||
                  $('img[data-src*="cover."]').first().attr('data-src') ||
                  $('img[data-src*="hentaiera"]').first().attr('data-src') ||
                  $('.g_thumb img').attr('data-src') || '';
      
      // Keep original cover URL extension — the frontend routes it through the
      // proxy (/api/proxy/image) which has extension fallback for mixed formats.
      const coverUrl = cover || '';
      
      // Extract tags
      const tags = [];
      $('.tags a, .tag a').each((i, el) => {
        const tag = $(el).text().trim();
        if (tag) tags.push(tag);
      });

      // Extract info (pages, language, etc.)
      const info = {};
      $('.info li, .info-row').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('Pages:')) {
          info.pages = parseInt(text.replace(/[^0-9]/g, '')) || 0;
        }
        if (text.includes('Language:')) {
          info.language = text.replace('Language:', '').trim();
        }
      });

      return {
        id: `${this.id}:${gid}`,
        title: title || `Gallery ${gid}`,
        description: '',
        coverImage: coverUrl,
        tags: tags,
        source: this.id,
        url: `${this.baseUrl}/gallery/${gid}/`,
        info: info
      };
    } catch (e) {
      console.error('[Hentaiera] Details error:', e.message);
      return null;
    }
  }

  async getMangaDetails(id) {
    const details = await this.getGalleryDetails(id);
    if (!details) return null;

    return {
      ...details,
      sourceId: this.id,
      coverUrl: details.coverImage || details.cover || '',
      isAdult: true,
      contentRating: 'pornographic'
    };
  }

  async getChapters(mangaId) {
    const details = await this.getGalleryDetails(mangaId);
    if (!details) return [];

    return [{
      id: details.id,
      mangaId: details.id,
      chapter: '1',
      title: details.title,
      pages: details.info?.pages || 0,
      language: details.info?.language || 'en',
      sourceId: this.id
    }];
  }

  async getChapterPages(chapterId, mangaId) {
    const gid = mangaId.replace(`${this.id}:`, '');

    try {
      console.log(`[Hentaiera] Fetching chapter pages for gallery ${gid}`);
      
      const url = `${this.baseUrl}/gallery/${gid}/`;
      
      const $ = await this.fetch(url);
      if (!$) return [];

      const pages = [];

      // Hentaiera embeds page info in hidden inputs:
      // load_server, load_dir, load_id, load_pages
      const server = $('#load_server').val();
      const dir = $('#load_dir').val();
      const loadId = $('#load_id').val();
      const totalPages = parseInt($('#load_pages').val()) || 0;

      console.log(`[Hentaiera] Gallery ${gid}: server=${server}, dir=${dir}, loadId=${loadId}, pages=${totalPages}`);

      if (server && dir && loadId && totalPages > 0) {
        // Build all page URLs using the pattern.
        // IMPORTANT: Hentaiera CDN serves MIXED extensions (some pages .webp, others .jpg).
        // We emit the URL with the extension as-is and let the frontend route it through
        // /api/proxy/image whose extension fallback (.webp -> .jpg -> .png -> .gif)
        // resolves whichever extension actually exists for each page.
        for (let i = 1; i <= totalPages; i++) {
          const fullUrl = `https://m${server}.hentaiera.com/${dir}/${loadId}/${i}.jpg`;
          pages.push({
            page: i,
            url: this.proxyUrl(fullUrl),
            originalUrl: fullUrl
          });
        }
      }

      // Fallback to thumbnail scraping if hidden inputs not found
      if (pages.length === 0) {
        console.log(`[Hentaiera] Gallery ${gid}: Hidden inputs not found, trying thumbnail fallback`);
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
            // Keep the original extension - the frontend proxy resolves the correct one
            pages.push({
              page: pages.length + 1,
              url: this.proxyUrl(src),
              originalUrl: src
            });
          }
        });
      }

      console.log(`[Hentaiera] Found ${pages.length} pages for gallery ${gid}`);
      return pages;
    } catch (e) {
      console.error('[Hentaiera] Pages error:', e.message);
      return [];
    }
  }

  async search(query, options = {}) {
    try {
      // Handle both object parameters and legacy parameters
      let page = 1;
      if (typeof options === 'number') {
        page = options;
      } else if (options && typeof options === 'object') {
        page = options.page || 1;
      }
      
      // IMPORTANT: Hentaiera's search form uses `key` as the query parameter
      // (NOT `q`). Using `?q=` causes Hentaiera to ignore the query and return
      // the latest galleries instead of actual search matches.
      const searchUrl = `${this.baseUrl}/search/?key=${encodeURIComponent(query)}&page=${page}`;
      console.log('[Hentaiera] Searching:', searchUrl);
      
      const $ = await this.fetch(searchUrl);
      if (!$) return [];
      
      return this.parseGalleryList($, page === 1);
    } catch (e) {
      console.error('[Hentaiera] Search error:', e.message);
      return [];
    }
  }

  async getLatest(options = {}) {
    try {
      // Handle both object parameters and legacy parameters
      let page = 1;
      if (typeof options === 'number') {
        page = options;
      } else if (options && typeof options === 'object') {
        page = options.page || 1;
      }
      
      const latestUrl = `${this.baseUrl}/?page=${page}`;
      console.log('[Hentaiera] Fetching latest:', latestUrl);
      
      const $ = await this.fetch(latestUrl);
      if (!$) {
        return { results: [], hasMore: false, nextPage: 1 };
      }
      
      const results = this.parseGalleryList($, page === 1);

      return {
        results,
        hasMore: results.length >= 20,
        nextPage: page + 1
      };
    } catch (e) {
      console.error('[Hentaiera] Latest error:', e.message);
      return {
        results: [],
        hasMore: false,
        nextPage: 1
      };
    }
  }
  
  async getPopular(options = {}) {
    try {
      // Hentaiera doesn't have a popular endpoint, return latest instead
      console.log('[Hentaiera] No popular endpoint, returning latest');
      return this.getLatest(options);
    } catch (e) {
      console.error('[Hentaiera] Popular error:', e.message);
      return {
        results: [],
        hasMore: false,
        nextPage: 1
      };
    }
  }
}

export default HentaieraScraper;
