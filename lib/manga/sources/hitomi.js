/**
 * Hitomi.la Source
 * Adult content source - manga, doujinshi, CG sets, anime
 * Supports all content types with high-quality images
 */

import BaseSource from './base';

// Hitomi content types
export const HITOMI_TYPES = {
  ALL: 'all',
  DOUJINSHI: 'doujinshi',
  MANGA: 'manga',
  ARTISTCG: 'artistcg',
  GAMECG: 'gamecg',
  ANIME: 'anime',
  IMAGESET: 'imageset'
};

// Language options
export const HITOMI_LANGUAGES = {
  ALL: 'all',
  JAPANESE: 'japanese',
  ENGLISH: 'english',
  CHINESE: 'chinese',
  KOREAN: 'korean',
  SPANISH: 'spanish',
  RUSSIAN: 'russian'
};

class HitomiSource extends BaseSource {
  constructor() {
    super({
      name: 'Hitomi.la',
      baseUrl: 'https://hitomi.la',
      adult: true,
      features: [
        'search', 'popular', 'latest', 'tags', 
        'doujinshi', 'manga', 'artistcg', 'gamecg', 'anime',
        'high-quality', 'multi-language', 'type-filter'
      ],
      rateLimit: 800
    });
    this.ltnDomain = 'https://ltn.hitomi.la';
    this.galleryDomain = 'https://ltn.hitomi.la/galleries';
    this.nozomiDomain = 'https://ltn.hitomi.la';
    // Image subdomains rotate - we'll calculate dynamically
    this.ggJs = null;
    this.ggJsTimestamp = 0;
    this.GG_JS_TTL = 60 * 60 * 1000; // 1 hour cache for gg.js
    
    // Content types available
    this.contentTypes = HITOMI_TYPES;
    this.languages = HITOMI_LANGUAGES;
  }

  /**
   * Fetch and cache the gg.js configuration for image URL generation
   */
  async fetchGgJs() {
    const now = Date.now();
    if (this.ggJs && (now - this.ggJsTimestamp) < this.GG_JS_TTL) {
      return this.ggJs;
    }

    try {
      const response = await this.fetch(`${this.ltnDomain}/gg.js?_=${now}`);
      const text = await response.text();
      
      // Parse gg.js to extract subdomain function
      // Format: var gg = ...; function subdomain_from_url(url, base) { ... }
      const bMatch = /var\s+b\s*=\s*'([^']+)'/i.exec(text);
      const oMatch = /var\s+o\s*=\s*(\d+)/i.exec(text);
      const mMatch = /case\s+(\d+):/gi;
      
      const cases = [];
      let match;
      while ((match = mMatch.exec(text)) !== null) {
        cases.push(parseInt(match[1]));
      }
      
      this.ggJs = {
        b: bMatch ? bMatch[1] : 'a',
        o: oMatch ? parseInt(oMatch[1]) : 1,
        cases: cases
      };
      this.ggJsTimestamp = now;
      
      return this.ggJs;
    } catch (error) {
      // Fallback defaults
      this.ggJs = { b: 'a', o: 1, cases: [] };
      return this.ggJs;
    }
  }

  /**
   * Calculate image subdomain based on gallery and image hash
   */
  getSubdomain(hash, gg) {
    // Hitomi uses hash-based subdomain routing
    const g = parseInt(hash.slice(-1), 16);
    if (gg.cases.includes(g)) {
      return 'a';
    }
    return String.fromCharCode(97 + (g % 3)); // a, b, or c
  }

  /**
   * Build image URL from file info
   */
  buildImageUrl(image, gg) {
    const hash = image.hash;
    const ext = image.haswebp ? 'webp' : (image.hasavif ? 'avif' : image.name.split('.').pop());
    
    // Calculate subdomain
    const subdomain = this.getSubdomain(hash, gg);
    
    // Build path based on hash
    const hashPath = hash.slice(-1) + '/' + hash.slice(-3, -1) + '/' + hash;
    
    return `https://${subdomain}a.hitomi.la/webp/${hashPath}.${ext}`;
  }

  /**
   * Fetch gallery IDs from nozomi binary index files
   * Nozomi files contain big-endian 32-bit integers of gallery IDs
   */
  async fetchNozomi(path, options = {}) {
    const { start = 0, count = 25 } = options;
    
    try {
      const url = `${this.nozomiDomain}/${path}`;
      const byteStart = start * 4;
      const byteEnd = byteStart + (count * 4) - 1;
      
      const response = await this.fetch(url, {
        headers: {
          'Range': `bytes=${byteStart}-${byteEnd}`,
          'Origin': this.baseUrl,
          'Referer': `${this.baseUrl}/`
        }
      });
      
      const buffer = await response.arrayBuffer();
      const view = new DataView(buffer);
      const ids = [];
      
      for (let i = 0; i < view.byteLength; i += 4) {
        if (i + 4 <= view.byteLength) {
          ids.push(view.getInt32(i, false)); // big-endian
        }
      }
      
      return ids;
    } catch (error) {
      this.log.warn('Failed to fetch nozomi', { path, error: error.message });
      return [];
    }
  }

  /**
   * Build nozomi path for content type and language
   */
  buildNozomiPath(type = 'all', language = 'all', area = 'index') {
    // Hitomi nozomi file structure:
    // /index-{language}.nozomi - all content for language
    // /type/{type}-{language}.nozomi - specific type for language
    // /index-all.nozomi - all content, all languages
    
    if (type === 'all' && language === 'all') {
      return `${area}-all.nozomi`;
    }
    
    if (type === 'all') {
      return `${area}-${language}.nozomi`;
    }
    
    if (language === 'all') {
      return `type/${type}-all.nozomi`;
    }
    
    return `type/${type}-${language}.nozomi`;
  }

  async search(query, options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      type = 'all',
      language = 'all' 
    } = options;
    
    try {
      // Build search URL with type filter
      let searchUrl = `${this.baseUrl}/search.html?${encodeURIComponent(query)}`;
      if (type !== 'all') {
        searchUrl = `${this.baseUrl}/${type}/search.html?${encodeURIComponent(query)}`;
      }
      
      const html = await this.fetchHtml(searchUrl);
      const galleryIds = this.extractGalleryIds(html);
      
      // Fetch gallery details for each ID
      const startIdx = (page - 1) * limit;
      const targetIds = galleryIds.slice(startIdx, startIdx + limit);
      
      const results = await Promise.allSettled(
        targetIds.map(id => this.getGalleryInfo(id))
      );
      
      let galleries = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
      
      // Filter by type if specified
      if (type !== 'all') {
        galleries = galleries.filter(g => 
          g.genres?.includes(type) || g.type === type
        );
      }
      
      // Filter by language if specified  
      if (language !== 'all') {
        galleries = galleries.filter(g => 
          g.language === this.languageToCode(language)
        );
      }
      
      return galleries.slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  /**
   * Get galleries by content type
   */
  async getByType(type, options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      language = 'all' 
    } = options;
    
    try {
      const offset = (page - 1) * limit;
      const nozomiPath = this.buildNozomiPath(type, language, 'index');
      
      const galleryIds = await this.fetchNozomi(nozomiPath, {
        start: offset,
        count: limit
      });
      
      const results = await Promise.allSettled(
        galleryIds.map(id => this.getGalleryInfo(id))
      );
      
      return results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
    } catch (error) {
      this.log.warn(`Get by type failed: ${type}`, { error: error.message });
      // Fallback to HTML scraping
      return this.getByTypeHtml(type, options);
    }
  }

  /**
   * Fallback: Get galleries by type using HTML scraping
   */
  async getByTypeHtml(type, options = {}) {
    const { limit = 24, page = 1, language = 'all' } = options;
    
    try {
      let url = `${this.baseUrl}/type/${type}-all.html`;
      if (language !== 'all') {
        url = `${this.baseUrl}/type/${type}-${language}.html`;
      }
      if (page > 1) {
        url = url.replace('.html', `-${page}.html`);
      }
      
      const html = await this.fetchHtml(url);
      const galleryIds = this.extractGalleryIds(html);
      
      const results = await Promise.allSettled(
        galleryIds.slice(0, limit).map(id => this.getGalleryInfo(id))
      );
      
      return results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
    } catch (error) {
      this.log.warn(`Get by type HTML failed: ${type}`, { error: error.message });
      return [];
    }
  }

  /**
   * Get doujinshi specifically
   */
  async getDoujinshi(options = {}) {
    return this.getByType('doujinshi', options);
  }

  /**
   * Get manga specifically
   */
  async getManga(options = {}) {
    return this.getByType('manga', options);
  }

  /**
   * Get artist CG sets
   */
  async getArtistCG(options = {}) {
    return this.getByType('artistcg', options);
  }

  /**
   * Get game CG sets
   */
  async getGameCG(options = {}) {
    return this.getByType('gamecg', options);
  }

  /**
   * Get anime content
   */
  async getAnime(options = {}) {
    return this.getByType('anime', options);
  }

  /**
   * Get image sets
   */
  async getImageSet(options = {}) {
    return this.getByType('imageset', options);
  }

  async getPopular(options = {}) {
    const { 
      limit = 24, 
      type = 'all',
      language = 'all' 
    } = options;
    
    try {
      // Use nozomi for popular (sorted by popularity)
      const nozomiPath = this.buildNozomiPath(type, language, 'popular');
      
      let galleryIds;
      try {
        galleryIds = await this.fetchNozomi(nozomiPath, { start: 0, count: limit });
      } catch {
        // Fallback to index page
        const url = type === 'all' ? this.baseUrl : `${this.baseUrl}/${type}/`;
        const html = await this.fetchHtml(url);
        galleryIds = this.extractGalleryIds(html);
      }
      
      const results = await Promise.allSettled(
        galleryIds.slice(0, limit).map(id => this.getGalleryInfo(id))
      );
      
      return results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { 
      limit = 24, 
      page = 1,
      type = 'all',
      language = 'all' 
    } = options;
    
    try {
      const offset = (page - 1) * limit;
      const nozomiPath = this.buildNozomiPath(type, language, 'index');
      
      let galleryIds;
      try {
        galleryIds = await this.fetchNozomi(nozomiPath, { start: offset, count: limit });
      } catch {
        // Fallback to HTML
        let url = `${this.baseUrl}/index-all.html`;
        if (type !== 'all') {
          url = `${this.baseUrl}/type/${type}-all.html`;
        }
        const html = await this.fetchHtml(url);
        galleryIds = this.extractGalleryIds(html).slice(offset, offset + limit);
      }
      
      const results = await Promise.allSettled(
        galleryIds.map(id => this.getGalleryInfo(id))
      );
      
      return results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get all content types at once (mixed feed)
   */
  async getAllTypes(options = {}) {
    const { limit = 24, language = 'all' } = options;
    const perType = Math.ceil(limit / 5);
    
    const [doujinshi, manga, artistcg, gamecg, anime] = await Promise.allSettled([
      this.getDoujinshi({ limit: perType, language }),
      this.getManga({ limit: perType, language }),
      this.getArtistCG({ limit: perType, language }),
      this.getGameCG({ limit: perType, language }),
      this.getAnime({ limit: perType, language })
    ]);
    
    const all = [];
    for (const result of [doujinshi, manga, artistcg, gamecg, anime]) {
      if (result.status === 'fulfilled') {
        all.push(...result.value);
      }
    }
    
    // Shuffle to mix types
    return this.shuffleArray(all).slice(0, limit);
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Get gallery info from gallery JSON
   */
  async getGalleryInfo(galleryId) {
    try {
      const url = `${this.galleryDomain}/${galleryId}.js`;
      const response = await this.fetch(url);
      const text = await response.text();
      
      // Parse JavaScript object: var galleryinfo = {...}
      const jsonMatch = /var\s+galleryinfo\s*=\s*(\{[\s\S]*\});?$/i.exec(text);
      if (!jsonMatch) {
        throw new Error('Invalid gallery data');
      }
      
      const gallery = JSON.parse(jsonMatch[1]);
      return this.formatGalleryToManga(gallery);
    } catch (error) {
      this.log.warn('Failed to fetch gallery info', { galleryId, error: error.message });
      return null;
    }
  }

  async getMangaDetails(mangaId) {
    const gallery = await this.getGalleryInfo(mangaId);
    if (!gallery) {
      throw new Error(`Gallery ${mangaId} not found`);
    }
    return gallery;
  }

  async getChapters(mangaId) {
    // Hitomi galleries are single "chapters"
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
      // Fetch gallery info
      const url = `${this.galleryDomain}/${galleryId}.js`;
      const response = await this.fetch(url);
      const text = await response.text();
      
      const jsonMatch = /var\s+galleryinfo\s*=\s*(\{[\s\S]*\});?$/i.exec(text);
      if (!jsonMatch) {
        throw new Error('Invalid gallery data');
      }
      
      const gallery = JSON.parse(jsonMatch[1]);
      const gg = await this.fetchGgJs();
      
      // Build image URLs
      const pages = (gallery.files || []).map((file, index) => ({
        index: index + 1,
        url: this.buildImageUrl(file, gg),
        width: file.width,
        height: file.height
      }));
      
      return pages;
    } catch (error) {
      this.log.warn('Get pages failed', { galleryId, error: error.message });
      throw error;
    }
  }

  /**
   * Extract gallery IDs from HTML page
   */
  extractGalleryIds(html) {
    const ids = [];
    
    // Match gallery links: href="/galleries/123456.html" or data-id="123456"
    const patterns = [
      /href="\/(?:reader|galleries)\/(\d+)(?:\.html)?"/gi,
      /data-id="(\d+)"/gi,
      /galleries\/(\d+)/gi
    ];
    
    const seen = new Set();
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const id = match[1];
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }
    
    return ids;
  }

  /**
   * Convert Hitomi gallery format to standard manga format
   */
  formatGalleryToManga(gallery) {
    // Build cover URL from first image
    let coverUrl = '';
    if (gallery.files && gallery.files.length > 0) {
      const firstFile = gallery.files[0];
      const hash = firstFile.hash;
      // Thumbnail URL pattern
      const hashPath = hash.slice(-1) + '/' + hash.slice(-3, -1) + '/' + hash;
      coverUrl = `https://tn.hitomi.la/webpbigtn/${hashPath}.webp`;
    }
    
    // Extract tags
    const tags = [];
    if (gallery.tags) {
      for (const tag of gallery.tags) {
        if (typeof tag === 'string') {
          tags.push(tag);
        } else if (tag.tag) {
          tags.push(tag.tag);
        }
      }
    }

    // Extract artist(s)
    const artists = [];
    if (gallery.artists) {
      for (const artist of gallery.artists) {
        if (typeof artist === 'string') {
          artists.push(artist);
        } else if (artist.artist) {
          artists.push(artist.artist);
        }
      }
    }

    // Get language
    const language = gallery.language || 'japanese';
    const languageCode = this.languageToCode(language);

    // Extract parody/series info
    const parodies = [];
    if (gallery.parodys) {
      for (const parody of gallery.parodys) {
        if (typeof parody === 'string') {
          parodies.push(parody);
        } else if (parody.parody) {
          parodies.push(parody.parody);
        }
      }
    }

    // Extract characters
    const characters = [];
    if (gallery.characters) {
      for (const char of gallery.characters) {
        if (typeof char === 'string') {
          characters.push(char);
        } else if (char.character) {
          characters.push(char.character);
        }
      }
    }

    // Extract groups
    const groups = [];
    if (gallery.groups) {
      for (const group of gallery.groups) {
        if (typeof group === 'string') {
          groups.push(group);
        } else if (group.group) {
          groups.push(group.group);
        }
      }
    }

    const contentType = gallery.type || 'doujinshi';

    return this.formatManga({
      id: String(gallery.id),
      title: gallery.title || gallery.japanese_title || `Gallery ${gallery.id}`,
      altTitles: gallery.japanese_title ? [gallery.japanese_title] : [],
      description: `${contentType} - ${language}${parodies.length ? ` | Parody: ${parodies.join(', ')}` : ''}`,
      coverUrl,
      author: artists.join(', ') || groups.join(', ') || 'Unknown',
      artist: artists.join(', ') || 'Unknown',
      status: 'completed',
      tags,
      genres: [contentType],
      type: contentType, // manga, doujinshi, artistcg, gamecg, anime, imageset
      parodies,
      characters,
      groups,
      pages: gallery.files?.length || 0,
      language: languageCode,
      languageName: language,
      adult: true,
      updatedAt: gallery.date ? new Date(gallery.date).toISOString() : null
    });
  }

  /**
   * Convert language name to code
   */
  languageToCode(language) {
    const codes = {
      'japanese': 'ja',
      'english': 'en',
      'chinese': 'zh',
      'korean': 'ko',
      'spanish': 'es',
      'russian': 'ru',
      'french': 'fr',
      'german': 'de',
      'italian': 'it',
      'portuguese': 'pt'
    };
    return codes[language?.toLowerCase()] || 'ja';
  }

  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await this.fetch(`${this.ltnDomain}/gg.js`, { signal: controller.signal });
      clearTimeout(timeout);
      
      return true;
    } catch {
      return false;
    }
  }
}

const hitomiSource = new HitomiSource();

export default hitomiSource;
export { hitomiSource, HITOMI_TYPES, HITOMI_LANGUAGES };
