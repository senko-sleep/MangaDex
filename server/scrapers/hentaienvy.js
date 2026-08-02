import BaseScraper from './base.js';

const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// HentaiEnvy - Adult content, HTML scraping
// Gallery URLs: /gallery/{id}/
// Reader URLs:  /g/{id}/{page}/
// Image CDN:    https://m{server}.hentaienvy.com/{dir}/{load_id}/{N}.jpg
export class HentaiEnvyScraper extends BaseScraper {
  constructor() {
    super('HentaiEnvy', 'https://hentaienvy.com', true);
    this.seenIds = new Set();
    this.lastClearTime = Date.now();
  }

  proxyUrl(url) {
    if (!url) return '';
    return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  clearSeenIdsIfStale() {
    const CLEAR_INTERVAL = 2 * 60 * 1000;
    if (Date.now() - this.lastClearTime > CLEAR_INTERVAL) {
      this.seenIds.clear();
      this.lastClearTime = Date.now();
    }
  }

  async fetchHtml(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://hentaienvy.com/',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (e) {
      console.error('[HentaiEnvy] Fetch error:', e.message);
      return null;
    }
  }

  // Parse gallery list from HTML (used for home, search, popular pages)
  // Structure: div.thumb > a[href="/gallery/{id}/"] > div.th_img > img[data-src]
  //            div.thumb > a > div.title
  //            div.thumb > div.wrap.top > div.category > a (category text)
  parseGalleryList(html, resetSeen = false) {
    if (resetSeen) this.seenIds.clear();
    this.clearSeenIdsIfStale();

    const results = [];

    // Match each .thumb block
    const thumbRegex = /<div class="thumb"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    const linkRegex = /href="\/gallery\/(\d+)\/"\s+title="([^"]*)"/i;
    const imgRegex = /data-src="([^"]+)"/i;
    const categoryRegex = /href="\/category\/[^"]+"\s*>([^<]+)</i;
    const titleDivRegex = /<div class="title">([\s\S]*?)<\/div>/i;

    let match;
    while ((match = thumbRegex.exec(html)) !== null) {
      const block = match[1];

      const linkMatch = linkRegex.exec(block);
      if (!linkMatch) continue;

      const id = linkMatch[1];
      const titleAttr = this.decodeHtml(linkMatch[2].trim());

      if (this.seenIds.has(id)) continue;
      this.seenIds.add(id);

      const imgMatch = imgRegex.exec(block);
      const cover = imgMatch ? imgMatch[1] : '';

      const catMatch = categoryRegex.exec(block);
      const category = catMatch ? catMatch[1].trim().toLowerCase() : 'doujinshi';

      // Prefer div.title text over title attribute (more complete)
      const titleDivMatch = titleDivRegex.exec(block);
      const title = titleDivMatch
        ? this.decodeHtml(titleDivMatch[1].trim())
        : titleAttr || `Gallery ${id}`;

      results.push({
        id: `hentaienvy:${id}`,
        sourceId: 'hentaienvy',
        slug: id,
        title,
        cover: cover ? this.proxyUrl(cover) : '',
        category,
        isAdult: true,
        contentType: this.mapCategory(category),
      });
    }

    console.log(`[HentaiEnvy] Parsed ${results.length} galleries`);
    return results;
  }

  mapCategory(cat) {
    const map = {
      'doujinshi': 'doujinshi',
      'manga': 'manga',
      'artist cg': 'artistcg',
      'game cg': 'gamecg',
      'western': 'western',
      'image set': 'imageset',
      'cosplay': 'cosplay',
    };
    return map[cat] || 'doujinshi';
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

  async getLatest(options = {}) {
    const page = (typeof options === 'object' ? options.page : options) || 1;
    try {
      const url = page > 1
        ? `${this.baseUrl}/?page=${page}`
        : `${this.baseUrl}/`;
      console.log('[HentaiEnvy] Fetching latest:', url);
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html, page === 1);
    } catch (e) {
      console.error('[HentaiEnvy] Latest error:', e.message);
      return [];
    }
  }

  async getPopular(options = {}) {
    const page = (typeof options === 'object' ? options.page : options) || 1;
    try {
      const url = `${this.baseUrl}/?order_by=popularity&page=${page}`;
      console.log('[HentaiEnvy] Fetching popular:', url);
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html, page === 1);
    } catch (e) {
      console.error('[HentaiEnvy] Popular error:', e.message);
      return [];
    }
  }

  async search(query, options = {}) {
    const page = (typeof options === 'object' ? options.page : options) || 1;
    try {
      if (!query || !query.trim()) return this.getLatest({ page });

      const url = `${this.baseUrl}/search/?s_key=${encodeURIComponent(query.trim())}&page=${page}`;
      console.log('[HentaiEnvy] Searching:', url);
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html, page === 1);
    } catch (e) {
      console.error('[HentaiEnvy] Search error:', e.message);
      return [];
    }
  }

  async getMangaDetails(id) {
    const galleryId = id.replace('hentaienvy:', '');
    try {
      const url = `${this.baseUrl}/gallery/${galleryId}/`;
      console.log('[HentaiEnvy] Fetching details:', url);
      const html = await this.fetchHtml(url);
      if (!html) return null;

      // Title: <h1>...</h1>
      const titleMatch = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
      const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : `Gallery ${galleryId}`;

      // Cover: data-src in .gt_left img
      const coverMatch = /class="gt_left"[\s\S]*?data-src="([^"]+)"/i.exec(html);
      const cover = coverMatch ? coverMatch[1] : '';

      // Page count: hidden input load_pages
      const pagesMatch = /name="load_pages"[^>]*value="(\d+)"/i.exec(html);
      const pageCount = pagesMatch ? parseInt(pagesMatch[1]) : 0;

      // Artists: /artist/{slug}/
      const artists = [];
      const artistRegex = /href='\/artist\/[^']+'\s*>[\s\S]*?<span[^>]*class='badge_tg'[^>]*>\d+<\/span>([\s\S]*?)<\/a>/gi;
      // Simpler: grab artist link text before badge
      const artistSimple = /href='\/artist\/[^']+'>([^<]+)\s*<span/gi;
      let am;
      while ((am = artistSimple.exec(html)) !== null) {
        artists.push(am[1].trim());
      }

      // Tags
      const tags = [];
      const tagRegex = /href='\/tag\/[^']+'>([^<]+)\s*<span/gi;
      let tm;
      while ((tm = tagRegex.exec(html)) !== null) {
        tags.push(tm[1].trim());
      }

      // Category
      const catMatch = /href='\/category\/[^']+'>([^<]+)\s*<span/i.exec(html);
      const category = catMatch ? catMatch[1].trim().toLowerCase() : 'doujinshi';

      // Image server data for pages
      const serverMatch = /name="load_server"[^>]*value="(\d+)"/i.exec(html);
      const dirMatch = /name="load_dir"[^>]*value="([^"]+)"/i.exec(html);
      const loadIdMatch = /name="load_id"[^>]*value="([^"]+)"/i.exec(html);

      const loadServer = serverMatch ? serverMatch[1] : null;
      const loadDir = dirMatch ? dirMatch[1] : null;
      const loadId = loadIdMatch ? loadIdMatch[1] : null;

      return {
        id,
        sourceId: 'hentaienvy',
        slug: galleryId,
        title,
        cover: cover ? this.proxyUrl(cover) : '',
        tags,
        artists,
        category,
        contentType: this.mapCategory(category),
        pageCount,
        isAdult: true,
        isLongStrip: false,
        // Store image server data for getChapterPages
        _loadServer: loadServer,
        _loadDir: loadDir,
        _loadId: loadId,
      };
    } catch (e) {
      console.error('[HentaiEnvy] Details error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const galleryId = mangaId.replace('hentaienvy:', '');
    return [{
      id: galleryId,
      mangaId,
      chapter: '1',
      title: 'Full Gallery',
      sourceId: 'hentaienvy',
    }];
  }

  async getChapterPages(chapterId, mangaId) {
    const galleryId = mangaId.replace('hentaienvy:', '');
    try {
      const url = `${this.baseUrl}/gallery/${galleryId}/`;
      const html = await this.fetchHtml(url);
      if (!html) return [];

      // Extract image server metadata from hidden inputs
      // <input type="hidden" name="load_server" id="load_server" value="11" />
      // <input type="hidden" name="load_dir"    id="load_dir"    value="032" />
      // <input type="hidden" name="load_id"     id="load_id"     value="m9xrtqlfa3" />
      // <input type="hidden" name="load_pages"  id="load_pages"  value="56" />
      const serverMatch = /name="load_server"[^>]*value="(\d+)"/i.exec(html);
      const dirMatch    = /name="load_dir"[^>]*value="([^"]+)"/i.exec(html);
      const loadIdMatch = /name="load_id"[^>]*value="([^"]+)"/i.exec(html);
      const pagesMatch  = /name="load_pages"[^>]*value="(\d+)"/i.exec(html);

      if (!serverMatch || !dirMatch || !loadIdMatch || !pagesMatch) {
        console.error('[HentaiEnvy] Could not extract image server data for gallery:', galleryId);
        return [];
      }

      const server  = serverMatch[1];
      const dir     = dirMatch[1];
      const loadId  = loadIdMatch[1];
      const total   = parseInt(pagesMatch[1]);

      console.log(`[HentaiEnvy] Gallery ${galleryId}: server=${server}, dir=${dir}, id=${loadId}, pages=${total}`);

      // Build pages using the CDN pattern:
      // Thumbnail: https://m{server}.hentaienvy.com/{dir}/{load_id}/{N}t.jpg
      // Full image: https://m{server}.hentaienvy.com/{dir}/{load_id}/{N}.jpg
      const pages = [];
      for (let i = 1; i <= total; i++) {
        const baseImgUrl = `https://m${server}.hentaienvy.com/${dir}/${loadId}/${i}.jpg`;
        pages.push({
          page: i,
          url: this.proxyUrl(baseImgUrl),
          originalUrl: baseImgUrl,
        });
      }

      console.log(`[HentaiEnvy] Built ${pages.length} page URLs for gallery ${galleryId}`);
      return pages;
    } catch (e) {
      console.error('[HentaiEnvy] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    return [
      'ahegao', 'anal', 'big breasts', 'blowjob', 'bondage', 'cheating',
      'femdom', 'futanari', 'group', 'harem', 'incest', 'milf',
      'mind break', 'netorare', 'paizuri', 'rape', 'stockings',
      'tentacles', 'vanilla', 'yuri', 'school girl', 'teacher',
    ];
  }

  async getNewlyAdded(page = 1) {
    return this.getLatest({ page });
  }

  async getTopRated(page = 1) {
    return this.getPopular({ page });
  }
}

export default HentaiEnvyScraper;
