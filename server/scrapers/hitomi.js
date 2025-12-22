import BaseScraper from './base.js';
import axios from 'axios';
import https from 'https';

// API base URL for proxy (set via environment variable in production)
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// Custom HTTPS agent with IPv4 preference for Hitomi API
const hitomiHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  family: 4, // Force IPv4 to avoid DNS resolution issues
});

// Hitomi.la - Adult content
// Uses direct API calls (no browser required)
// API domain changed to gold-usergeneratedcontent.net
export class HitomiScraper extends BaseScraper {
  constructor() {
    super('Hitomi', 'https://hitomi.la', true);
    this.apiDomain = 'gold-usergeneratedcontent.net';
    this.ltnBase = `https://ltn.${this.apiDomain}`;
    this.ggJsUrl = `https://ltn.${this.apiDomain}/gg.js`;
    this.ggData = null;
    this.ggDataExpiry = 0;
    
    // Create custom axios client with IPv4 preference for Hitomi API
    this.apiClient = axios.create({
      timeout: 10000,
      httpsAgent: hitomiHttpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Origin': this.baseUrl,
        'Referer': `${this.baseUrl}/`,
      },
      decompress: true,
    });
  }

  // Helper to create proxy URL
  proxyUrl(url) {
    if (!url) return '';
    const base = API_BASE || '';
    return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  // Fetch and parse gg.js for subdomain calculation
  async getGgData() {
    const now = Date.now();
    if (this.ggData && now < this.ggDataExpiry) {
      return this.ggData;
    }

    try {
      const res = await this.apiClient.get(this.ggJsUrl, {
        timeout: 8000,
        headers: {
          'Origin': this.baseUrl,
          'Referer': `${this.baseUrl}/`,
        },
      });
      const js = res.data;

      // Parse gg.js - extract subdomain mapping and b value
      // b value: b: '...'
      const bMatch = js.match(/b:\s*['"]([^'"]+)['"]/);
      // Default o value: var o = N or default: o = N
      const defaultMatch = js.match(/(?:var\s|default:)\s*o\s*=\s*(\d+)/);
      
      // Parse case statements for subdomain mapping
      // case N: o = M pattern
      const caseMap = {};
      const caseRegex = /case\s+(\d+):(?:\s*o\s*=\s*(\d+))?/g;
      let match;
      let pendingKeys = [];
      
      while ((match = caseRegex.exec(js)) !== null) {
        const key = parseInt(match[1]);
        const value = match[2] ? parseInt(match[2]) : null;
        
        pendingKeys.push(key);
        if (value !== null) {
          for (const k of pendingKeys) {
            caseMap[k] = value;
          }
          pendingKeys = [];
        }
      }
      
      // Also check for if (g === N) o = M pattern
      const ifRegex = /if\s*\(g\s*===?\s*(\d+)\)[\s{]*o\s*=\s*(\d+)/g;
      while ((match = ifRegex.exec(js)) !== null) {
        caseMap[parseInt(match[1])] = parseInt(match[2]);
      }
      
      this.ggData = {
        b: bMatch ? bMatch[1].replace(/\//g, '') : '1',
        defaultO: defaultMatch ? parseInt(defaultMatch[1]) : 0,
        caseMap: caseMap,
      };
      this.ggDataExpiry = now + 60000; // Cache for 1 minute
      
      console.log('[Hitomi] gg.js parsed:', { b: this.ggData.b, defaultO: this.ggData.defaultO, cases: Object.keys(this.ggData.caseMap).length });
      return this.ggData;
    } catch (e) {
      console.error('[Hitomi] Failed to fetch gg.js:', e.message);
      return { b: '1', defaultO: 0, caseMap: {} };
    }
  }

  // Calculate subdomain number for image URL based on hash
  getSubdomainNum(hash, gg) {
    // inum = last char + chars -3 to -1 parsed as hex
    const inum = parseInt(hash.slice(-1) + hash.slice(-3, -1), 16);
    
    // Look up in case map, or use default
    const o = gg.caseMap[inum] !== undefined ? gg.caseMap[inum] : gg.defaultO;
    
    return { inum, subdomainNum: o + 1 };
  }

  // Build image URL from file info
  buildImageUrl(file, gg) {
    const hash = file.hash;
    const haswebp = file.haswebp !== 0;
    const hasavif = file.hasavif !== 0;
    
    // Determine extension (prefer webp, can use avif if configured)
    let ext = 'webp';
    if (hasavif) {
      ext = 'avif'; // avif has better compression
    } else if (haswebp) {
      ext = 'webp';
    } else if (file.name) {
      const extMatch = file.name.match(/\.(\w+)$/);
      if (extMatch) {
        ext = extMatch[1].toLowerCase();
      }
    }

    // Get subdomain calculation
    const { inum, subdomainNum } = this.getSubdomainNum(hash, gg);
    
    // URL format: https://{ext[0]}{subdomainNum}.{domain}/{b}/{inum}/{hash}.{ext}
    return `https://${ext[0]}${subdomainNum}.${this.apiDomain}/${gg.b}/${inum}/${hash}.${ext}`;
  }

  // Fetch gallery info from ltn.gold-usergeneratedcontent.net/galleries/{id}.js
  async fetchGalleryInfo(gid) {
    try {
      const url = `${this.ltnBase}/galleries/${gid}.js`;
      const res = await this.apiClient.get(url, {
        headers: {
          'Referer': `${this.baseUrl}/reader/${gid}.html`,
        },
      });
      const js = res.data;
      
      // Parse: var galleryinfo = {...}
      const match = js.match(/var\s+galleryinfo\s*=\s*(\{[\s\S]*\})/);
      if (!match) return null;
      
      return JSON.parse(match[1]);
    } catch (e) {
      console.error(`[Hitomi] Failed to fetch gallery ${gid}:`, e.message);
      return null;
    }
  }

  // Fetch nozomi index (binary file with gallery IDs)
  async fetchNozomi(path, start = 0, count = 25) {
    try {
      const url = `${this.ltnBase}/${path}`;
      const byteStart = start * 4;
      const byteEnd = byteStart + count * 4 - 1;
      
      const res = await this.apiClient.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'Range': `bytes=${byteStart}-${byteEnd}`,
        },
      });
      
      const buffer = Buffer.from(res.data);
      const ids = [];
      
      for (let i = 0; i < buffer.length; i += 4) {
        if (i + 4 <= buffer.length) {
          ids.push(buffer.readInt32BE(i));
        }
      }
      
      return ids;
    } catch (e) {
      console.error(`[Hitomi] Failed to fetch nozomi ${path}:`, e.message);
      return [];
    }
  }

  // Convert gallery info to our format
  galleryInfoToManga(info) {
    if (!info) return null;
    
    const gid = String(info.id);
    
    // Build cover URL from first file if available
    let cover = '';
    if (info.files && info.files.length > 0) {
      const firstFile = info.files[0];
      // Use thumbnail server - tn.gold-usergeneratedcontent.net
      const hash = firstFile.hash;
      const inum = parseInt(hash.slice(-1) + hash.slice(-3, -1), 16);
      cover = `https://tn.${this.apiDomain}/bigtn/${gid}/${inum}/${hash}.webp`;
    }

    return {
      id: `hitomi:${gid}`,
      sourceId: 'hitomi',
      slug: gid,
      title: info.title || info.japanese_title || `Gallery ${gid}`,
      cover: this.proxyUrl(cover),
      type: info.type || 'doujinshi',
      isAdult: true,
      contentType: info.type || 'doujinshi',
      artists: (info.artists || []).map(a => a.artist || a),
      groups: (info.groups || []).map(g => g.group || g),
      parodies: (info.parodies || []).map(p => p.parody || p),
      characters: (info.characters || []).map(c => c.character || c),
      tags: (info.tags || []).map(t => t.tag || t),
      language: info.language || 'japanese',
      pageCount: info.files ? info.files.length : 0,
    };
  }

  // Fetch multiple galleries in parallel
  async fetchGalleries(ids) {
    const results = await Promise.all(
      ids.map(async (id) => {
        const info = await this.fetchGalleryInfo(id);
        return this.galleryInfoToManga(info);
      })
    );
    return results.filter(r => r !== null);
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      // For search, we need to use the search nozomi files
      // Format: search/query-language.nozomi
      const perPage = 25;
      const start = (page - 1) * perPage;
      
      let searchPath = 'index-all.nozomi';
      
      if (query && query.trim()) {
        // Search by query - use tag search if it looks like a tag
        const cleanQuery = query.trim().toLowerCase().replace(/\s+/g, '_');
        // Try tag search first
        searchPath = `tag/${cleanQuery}-all.nozomi`;
      }
      
      if (language && language !== 'all') {
        searchPath = searchPath.replace('-all.nozomi', `-${language}.nozomi`);
      }
      
      const ids = await this.fetchNozomi(searchPath, start, perPage);
      if (ids.length === 0) {
        // Fallback to index if tag search fails
        if (query) {
          const fallbackIds = await this.fetchNozomi('index-all.nozomi', start, perPage);
          return this.fetchGalleries(fallbackIds);
        }
        return [];
      }
      
      return this.fetchGalleries(ids);
    } catch (e) {
      console.error('[Hitomi] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      if (!Array.isArray(tags)) tags = [];
      if (!Array.isArray(excludeTags)) excludeTags = [];
      
      const perPage = 25;
      const start = (page - 1) * perPage;
      const lang = (language && language !== 'all') ? language : 'all';
      
      // Popular uses different nozomi path
      const path = `popular/week-${lang}.nozomi`;
      
      console.log(`[Hitomi] Fetching popular page ${page}: ${path}`);
      const ids = await this.fetchNozomi(path, start, perPage);
      
      if (ids.length === 0) {
        console.log('[Hitomi] No IDs from popular, trying fallback');
        return [];
      }
      
      const results = await this.fetchGalleries(ids);
      console.log(`[Hitomi] Got ${results.length} results from popular page ${page}`);
      return results;
    } catch (e) {
      console.error('[Hitomi] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      const perPage = 25;
      const start = (page - 1) * perPage;
      const lang = (language && language !== 'all') ? language : 'all';
      
      const path = `index-${lang}.nozomi`;
      
      console.log(`[Hitomi] Fetching latest page ${page}: ${path}`);
      const ids = await this.fetchNozomi(path, start, perPage);
      
      if (ids.length === 0) {
        console.log('[Hitomi] No IDs from latest');
        return [];
      }
      
      const results = await this.fetchGalleries(ids);
      console.log(`[Hitomi] Got ${results.length} results from latest page ${page}`);
      return results;
    } catch (e) {
      console.error('[Hitomi] Latest error:', e.message);
      return [];
    }
  }

  async getMangaDetails(id) {
    const gid = id.replace('hitomi:', '');
    
    try {
      const info = await this.fetchGalleryInfo(gid);
      if (!info) return null;
      
      const manga = this.galleryInfoToManga(info);
      manga.isLongStrip = false;
      
      return manga;
    } catch (e) {
      console.error('[Hitomi] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const gid = mangaId.replace('hitomi:', '');
    return [{
      id: gid,
      mangaId,
      chapter: '1',
      title: 'Full Gallery',
      sourceId: 'hitomi',
    }];
  }

  async getChapterPages(chapterId, mangaId) {
    const gid = mangaId.replace('hitomi:', '');
    
    try {
      const info = await this.fetchGalleryInfo(gid);
      if (!info || !info.files) {
        console.log(`[Hitomi] No gallery info for ${gid}`);
        return [];
      }
      
      const gg = await this.getGgData();
      const pages = [];
      
      for (let i = 0; i < info.files.length; i++) {
        const file = info.files[i];
        const imageUrl = this.buildImageUrl(file, gg);
        
        pages.push({
          page: i + 1,
          url: this.proxyUrl(imageUrl),
          originalUrl: imageUrl,
        });
      }
      
      console.log(`[Hitomi] Found ${pages.length} pages for gallery ${gid}`);
      return pages;
    } catch (e) {
      console.error('[Hitomi] Pages error:', e.message);
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
}

export default HitomiScraper;
