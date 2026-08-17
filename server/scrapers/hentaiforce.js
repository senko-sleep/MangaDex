import * as cheerio from 'cheerio';
import BaseScraper from './base.js';

const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

/**
 * HentaiForce Scraper
 * Site: https://hentaiforce.net/
 * Gallery: https://hentaiforce.net/view/{id}
 * CDN: https://m{server}.hentaiforce.me/img/{mediaId}-{page}.{ext}
 */
export class HentaiForceScraper extends BaseScraper {
  constructor() {
    super('HentaiForce', 'https://hentaiforce.net', true);
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

  mapCategory(cat) {
    const lower = (cat || '').toLowerCase().trim();
    const map = {
      'doujin': 'doujinshi',
      'doujinshi': 'doujinshi',
      'manga': 'manga',
      'artist cg': 'artistcg',
      'artist-cg': 'artistcg',
      'game cg': 'gamecg',
      'game-cg': 'gamecg',
      'western': 'western',
      'image western set': 'western',
      'image-western-set': 'western',
      'image set': 'imageset',
      'cosplay': 'cosplay',
      'comic': 'comic',
    };
    return map[lower] || 'doujinshi';
  }

  parseGalleryList(html, resetSeen = false) {
    if (resetSeen) this.seenIds.clear();
    this.clearSeenIdsIfStale();

    const results = [];
    if (!html) return results;

    const $ = cheerio.load(html);

    $('.gallery').each((_, el) => {
      const linkEl = $(el).find('a.gallery-thumb, a[href*="/view/"]').first();
      const href = linkEl.attr('href') || '';
      const match = href.match(/\/view\/(\d+)/i);
      if (!match) return;

      const id = match[1];
      if (this.seenIds.has(id)) return;
      this.seenIds.add(id);

      const titleEl = $(el).find('.gallery-name a, h2 a').first();
      const rawTitle = titleEl.text().trim() || `Gallery ${id}`;
      const title = this.decodeHtml(rawTitle).replace(/\s+/g, ' ');

      const imgEl = $(el).find('img').first();
      const cover = imgEl.attr('data-src') || imgEl.attr('src') || '';

      const categoryEl = $(el).find('.gallery-type a, .gallery-type').first();
      const category = categoryEl.text().trim().toLowerCase() || 'doujin';

      results.push({
        id: `hentaiforce:${id}`,
        sourceId: 'hentaiforce',
        slug: id,
        title,
        cover: cover ? this.proxyUrl(cover) : '',
        category,
        isAdult: true,
        contentType: this.mapCategory(category),
      });
    });

    return results;
  }

  async getLatest(options = {}) {
    const page = (typeof options === 'object' ? options.page : options) || 1;
    try {
      const url = page > 1
        ? `${this.baseUrl}/page/${page}`
        : `${this.baseUrl}/`;
      console.log('[HentaiForce] Fetching latest:', url);
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html, page === 1);
    } catch (e) {
      console.error('[HentaiForce] Latest error:', e.message);
      return [];
    }
  }

  async getPopular(options = {}) {
    const page = (typeof options === 'object' ? options.page : options) || 1;
    try {
      const url = page > 1
        ? `${this.baseUrl}/page/${page}?sort=popular`
        : `${this.baseUrl}/?sort=popular`;
      console.log('[HentaiForce] Fetching popular:', url);
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html, page === 1);
    } catch (e) {
      console.error('[HentaiForce] Popular error:', e.message);
      return [];
    }
  }

  async search(query, options = {}) {
    const page = (typeof options === 'object' ? options.page : options) || 1;
    const sort = typeof options === 'object' && options.sort ? options.sort : 'popular';

    try {
      if (!query || !query.trim()) {
        return sort === 'popular' ? this.getPopular({ page }) : this.getLatest({ page });
      }

      const sortParam = sort === 'popular' ? '&sort=popular' : '';
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query.trim())}&page=${page}${sortParam}`;
      console.log('[HentaiForce] Searching:', url);
      const html = await this.fetchHtml(url);
      if (!html) return [];
      return this.parseGalleryList(html, page === 1);
    } catch (e) {
      console.error('[HentaiForce] Search error:', e.message);
      return [];
    }
  }

  async getMangaDetails(id) {
    const galleryId = id.replace('hentaiforce:', '');
    try {
      const url = `${this.baseUrl}/view/${galleryId}`;
      console.log('[HentaiForce] Fetching details:', url);
      const html = await this.fetchHtml(url);
      if (!html) return null;

      const $ = cheerio.load(html);

      const rawTitle = $('h1').first().text().trim() || $('title').text().trim();
      const title = this.decodeHtml(rawTitle).replace(/\s+/g, ' ');

      const coverImg = $('img[data-src*="cover"], img[src*="cover"], img[data-src*="thumb"]').first();
      const cover = coverImg.attr('data-src') || coverImg.attr('src') || '';

      const tags = [];
      const artists = [];
      const languages = [];
      const parodies = [];
      const characters = [];
      let category = 'doujin';
      let totalPages = 0;

      $('.tag-container').each((_, el) => {
        const headerText = $(el).clone().children().remove().end().text().trim();
        if (headerText.includes('Tags:')) {
          $(el).find('a').each((_, a) => {
            const t = $(a).clone().children('.badge').remove().end().text().trim();
            if (t) tags.push(t);
          });
        } else if (headerText.includes('Artists:')) {
          $(el).find('a').each((_, a) => {
            const t = $(a).clone().children('.badge').remove().end().text().trim();
            if (t) artists.push(t);
          });
        } else if (headerText.includes('Languages:')) {
          $(el).find('a').each((_, a) => {
            const t = $(a).clone().children('.badge').remove().end().text().trim();
            if (t) languages.push(t);
          });
        } else if (headerText.includes('Parodies:')) {
          $(el).find('a').each((_, a) => {
            const t = $(a).clone().children('.badge').remove().end().text().trim();
            if (t) parodies.push(t);
          });
        } else if (headerText.includes('Characters:')) {
          $(el).find('a').each((_, a) => {
            const t = $(a).clone().children('.badge').remove().end().text().trim();
            if (t) characters.push(t);
          });
        } else if (headerText.includes('Category:')) {
          const cat = $(el).find('a').first().clone().children('.badge').remove().end().text().trim();
          if (cat) category = cat.toLowerCase();
        } else if (headerText.includes('Pages:')) {
          const match = headerText.match(/Pages:\s*(\d+)/i) || $(el).text().match(/Pages:\s*(\d+)/i);
          if (match) totalPages = parseInt(match[1], 10);
        }
      });

      // Extract media ID, server and extension
      let mediaId = null;
      let server = '1';
      let ext = 'jpg';

      const mediaMatch = cover.match(/https?:\/\/m(\d+)\.hentaiforce\.me\/img\/(\d+)-(?:cover|thumb|\d+t?)\.(jpg|png|webp)/i);
      if (mediaMatch) {
        server = mediaMatch[1];
        mediaId = mediaMatch[2];
        ext = mediaMatch[3];
      } else {
        const thumbSrc = $('img[data-src*="hentaiforce.me"], img[src*="hentaiforce.me"]').first().attr('data-src') || '';
        const tMatch = thumbSrc.match(/https?:\/\/m(\d+)\.hentaiforce\.me\/img\/(\d+)-(?:cover|thumb|\d+t?)\.(jpg|png|webp)/i);
        if (tMatch) {
          server = tMatch[1];
          mediaId = tMatch[2];
          ext = tMatch[3];
        }
      }

      if (!mediaId) {
        const plausibleMatch = html.match(/plausible\s*\(\s*["']gallery["']\s*,\s*\{\s*props\s*:\s*\{\s*did\s*:\s*["'](\d+)["']/i);
        if (plausibleMatch) {
          mediaId = plausibleMatch[1];
        }
      }

      return {
        id,
        sourceId: 'hentaiforce',
        slug: galleryId,
        title,
        cover: cover ? this.proxyUrl(cover) : '',
        tags,
        artists,
        languages,
        parodies,
        characters,
        category,
        contentType: this.mapCategory(category),
        pageCount: totalPages,
        isAdult: true,
        isLongStrip: false,
        _server: server,
        _mediaId: mediaId,
        _ext: ext,
      };
    } catch (e) {
      console.error('[HentaiForce] Details error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const galleryId = mangaId.replace('hentaiforce:', '');
    return [{
      id: galleryId,
      mangaId,
      chapter: '1',
      title: 'Full Gallery',
      sourceId: 'hentaiforce',
    }];
  }

  async getChapterPages(chapterId, mangaId) {
    const galleryId = (mangaId || chapterId).replace('hentaiforce:', '');
    try {
      const details = await this.getMangaDetails(galleryId);
      if (!details || !details._mediaId || !details.pageCount) {
        console.error('[HentaiForce] Could not resolve gallery metadata for pages:', galleryId);
        return [];
      }

      const server = details._server || '1';
      const mediaId = details._mediaId;
      const ext = details._ext || 'jpg';
      const total = details.pageCount;

      console.log(`[HentaiForce] Building ${total} pages for gallery ${galleryId} (media=${mediaId}, server=${server})`);

      const pages = [];
      for (let i = 1; i <= total; i++) {
        const baseImgUrl = `https://m${server}.hentaiforce.me/img/${mediaId}-${i}.${ext}`;
        pages.push({
          page: i,
          url: this.proxyUrl(baseImgUrl),
          originalUrl: baseImgUrl,
        });
      }

      return pages;
    } catch (e) {
      console.error('[HentaiForce] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    return [
      'ahegao', 'anal (female)', 'bbm', 'bdsm', 'big breasts (female)',
      'big penis (male)', 'bikini', 'blindfold', 'blowjob (female)',
      'blowjob face (female)', 'bondage', 'bunny girl', 'catgirl',
      'cheating (female)', 'collar (female)', 'cosplaying (female)',
      'cowgirl', 'creampie', 'cunnilingus', 'dark skin (female)',
      'dark skin (male)', 'deepthroat (female)', 'defloration',
      'dilf', 'double penetration (female)', 'exhibitionism',
      'femdom', 'footjob', 'futanari', 'glasses', 'group', 'garter straps',
      'handjob', 'harem', 'huge breasts (female)', 'huge penis (male)',
      'humiliation', 'impregnation', 'incest', 'kissing (female)',
      'lingerie', 'maid', 'masturbation', 'milf', 'mind break',
      'nakadashi (female)', 'netorare (female)', 'nipple piercings',
      'nun (female)', 'omorashi', 'paizuri (female)', 'pantyhose',
      'prostitution (female)', 'public sex', 'rimjob (female)',
      'schoolgirl uniform (female)', 'sole female', 'sole male',
      'spanking', 'stockings (female)', 'swimsuit (female)',
      'tanlines (female)', 'teacher (female)', 'tentacles',
      'threesome', 'tomgirl', 'tomboy', 'toys', 'tsundere',
      'twintails', 'urination', 'vanilla', 'virgin', 'voyeurism',
      'waitress', 'x-ray', 'yaoi', 'yuri',
    ];
  }

  async getNewlyAdded(page = 1) {
    return this.getLatest({ page });
  }

  async getTopRated(page = 1) {
    return this.getPopular({ page });
  }
}

export default HentaiForceScraper;
