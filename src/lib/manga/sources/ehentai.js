/**
 * E-Hentai / ExHentai Source
 * The largest repository for doujinshi, manga, and CG sets
 * Supports: manga, doujinshi, artistcg, gamecg, western, non-h, imageset, cosplay
 * Millions of galleries available
 */

import BaseSource from './base';

// E-Hentai content categories
export const EHENTAI_CATEGORIES = {
  ALL: 'all',
  DOUJINSHI: 'doujinshi',
  MANGA: 'manga',
  ARTISTCG: 'artistcg',
  GAMECG: 'gamecg',
  WESTERN: 'western',
  NON_H: 'non-h',
  IMAGESET: 'imageset',
  COSPLAY: 'cosplay',
  ASIAN_PORN: 'asianporn',
  MISC: 'misc'
};

// Category bit flags for E-Hentai API
const CATEGORY_FLAGS = {
  doujinshi: 2,
  manga: 4,
  artistcg: 8,
  gamecg: 16,
  western: 512,
  'non-h': 256,
  imageset: 32,
  cosplay: 64,
  asianporn: 128,
  misc: 1
};

class EHentaiSource extends BaseSource {
  constructor() {
    super({
      name: 'E-Hentai',
      baseUrl: 'https://e-hentai.org',
      apiUrl: 'https://api.e-hentai.org/api.php',
      adult: true,
      features: [
        'search', 'popular', 'latest', 'tags', 
        'doujinshi', 'manga', 'artistcg', 'gamecg', 
        'western', 'imageset', 'cosplay', 
        'high-quality', 'multi-language', 'favorites', 'torrents'
      ],
      rateLimit: 1000
    });
    
    this.categories = EHENTAI_CATEGORIES;
    this.thumbDomain = 'https://ehgt.org';
  }

  /**
   * Build category filter for URL
   * E-Hentai uses f_cats parameter with bitwise exclusion
   */
  buildCategoryFilter(category) {
    if (category === 'all') return 0;
    
    // Exclude all categories except the one we want
    let excludeBits = 0;
    for (const [cat, bit] of Object.entries(CATEGORY_FLAGS)) {
      if (cat !== category.toLowerCase()) {
        excludeBits |= bit;
      }
    }
    return excludeBits;
  }

  async search(query, options = {}) {
    const { 
      limit = 24, 
      page = 0, 
      category = 'all',
      minimumRating = 0,
      existingIds = new Set()
    } = options;
    
    try {
      // Build search URL
      const catFilter = this.buildCategoryFilter(category);
      let url = `${this.baseUrl}/?f_search=${encodeURIComponent(query)}&page=${page}`;
      
      if (catFilter > 0) {
        url += `&f_cats=${catFilter}`;
      }
      
      if (minimumRating > 0) {
        url += `&f_srdd=${minimumRating}`;
      }
      
      const html = await this.fetchHtml(url);
      let galleries = this.parseGalleryList(html);
      
      // Filter out duplicates using existingIds
      galleries = galleries.filter(gallery => !existingIds.has(gallery.id));
      
      // Add new IDs to the set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: galleries.length >= 25, // E-Hentai shows 25 results per page
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[E-Hentai] Search failed:', error);
      this.log.warn('E-Hentai search failed', { query, error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getPopular(options = {}) {
    const { 
      limit = 24, 
      category = 'all',
      existingIds = new Set()
    } = options;
    
    try {
      // E-Hentai popular page
      let url = `${this.baseUrl}/popular`;
      const catFilter = this.buildCategoryFilter(category);
      
      if (catFilter > 0) {
        url += `?f_cats=${catFilter}`;
      }
      
      const html = await this.fetchHtml(url);
      let galleries = this.parseGalleryList(html);
      
      // Filter out duplicates using existingIds
      galleries = galleries.filter(gallery => !existingIds.has(gallery.id));
      
      // Add new IDs to the set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: false, // Popular page is a single page
        nextPage: null
      };
    } catch (error) {
      console.error('[E-Hentai] Popular fetch failed:', error);
      this.log.warn('E-Hentai popular failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: null };
    }
  }

  async getLatest(options = {}) {
    const { 
      limit = 24, 
      page = 0, 
      category = 'all',
      existingIds = new Set()
    } = options;
    
    try {
      let url = `${this.baseUrl}/?page=${page}`;
      const catFilter = this.buildCategoryFilter(category);
      
      if (catFilter > 0) {
        url += `&f_cats=${catFilter}`;
      }
      
      const html = await this.fetchHtml(url);
      let galleries = this.parseGalleryList(html);
      
      // Filter out duplicates using existingIds
      galleries = galleries.filter(gallery => !existingIds.has(gallery.id));
      
      // Add new IDs to the set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: galleries.length >= 25, // E-Hentai shows 25 results per page
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[E-Hentai] Latest fetch failed:', error);
      this.log.warn('E-Hentai latest failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  /**
   * Get content by category type
   */
  async getByCategory(category, options = {}) {
    const { limit = 24, page = 0 } = options;
    
    try {
      const catFilter = this.buildCategoryFilter(category);
      let url = `${this.baseUrl}/?page=${page}&f_cats=${catFilter}`;
      
      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);
      
      return galleries.slice(0, limit);
    } catch (error) {
      this.log.warn(`E-Hentai get ${category} failed`, { error: error.message });
      return [];
    }
  }

  async getDoujinshi(options = {}) {
    return this.getByCategory('doujinshi', options);
  }

  async getManga(options = {}) {
    return this.getByCategory('manga', options);
  }

  async getArtistCG(options = {}) {
    return this.getByCategory('artistcg', options);
  }

  async getGameCG(options = {}) {
    return this.getByCategory('gamecg', options);
  }

  async getWestern(options = {}) {
    return this.getByCategory('western', options);
  }

  async getImageSet(options = {}) {
    return this.getByCategory('imageset', options);
  }

  async getCosplay(options = {}) {
    return this.getByCategory('cosplay', options);
  }

  async getMangaDetails(mangaId) {
    try {
      // mangaId format: gid/token or just gid
      const [gid, token] = mangaId.includes('/') ? mangaId.split('/') : [mangaId, null];
      
      if (token) {
        // Use API for faster details
        const apiData = await this.fetchGalleryMetadata(gid, token);
        if (apiData) {
          return this.formatApiGallery(apiData);
        }
      }
      
      // Fallback to HTML scraping
      const url = token ? `${this.baseUrl}/g/${gid}/${token}/` : `${this.baseUrl}/g/${gid}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryDetails(html, gid);
    } catch (error) {
      this.log.warn('E-Hentai details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  /**
   * Fetch gallery metadata using E-Hentai API
   */
  async fetchGalleryMetadata(gid, token) {
    try {
      const response = await this.fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'gdata',
          gidlist: [[parseInt(gid), token]],
          namespace: 1
        })
      });
      
      const data = await response.json();
      return data.gmetadata?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  async getChapters(mangaId) {
    // E-Hentai galleries are single "chapters"
    try {
      const details = await this.getMangaDetails(mangaId);
      return [{
        id: mangaId,
        mangaId,
        chapter: '1',
        title: details.title,
        pages: details.pages || 0,
        language: details.language || 'ja'
      }];
    } catch (error) {
      return [];
    }
  }

  async getChapterPages(galleryId) {
    try {
      const [gid, token] = galleryId.includes('/') ? galleryId.split('/') : [galleryId, null];
      const baseUrl = token ? `${this.baseUrl}/g/${gid}/${token}/` : `${this.baseUrl}/g/${gid}/`;
      
      // Get first page to find total pages
      const html = await this.fetchHtml(baseUrl);
      
      // Extract page count
      const pagesMatch = /(\d+)\s*pages/i.exec(html) || 
                         /Showing\s+\d+\s*-\s*\d+\s*of\s*(\d+)/i.exec(html);
      const totalPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
      
      // Parse image links from gallery pages
      const pages = [];
      const imgRegex = /href="(https?:\/\/e-hentai\.org\/s\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/gi;
      let match;
      let pageNum = 1;
      
      while ((match = imgRegex.exec(html)) !== null) {
        pages.push({
          index: pageNum++,
          pageUrl: match[1],
          thumbnail: match[2]
        });
      }
      
      // Fetch actual image URLs from page links (first few pages as sample)
      const resolvedPages = await Promise.all(
        pages.slice(0, Math.min(pages.length, 50)).map(async (page, idx) => {
          try {
            const pageHtml = await this.fetchHtml(page.pageUrl);
            const imgMatch = /<img[^>]*id="img"[^>]*src="([^"]+)"[^>]*>/i.exec(pageHtml);
            return {
              index: idx + 1,
              url: imgMatch ? imgMatch[1] : page.thumbnail
            };
          } catch {
            return {
              index: idx + 1,
              url: page.thumbnail
            };
          }
        })
      );
      
      return resolvedPages;
    } catch (error) {
      this.log.warn('E-Hentai pages failed', { galleryId, error: error.message });
      throw error;
    }
  }

  parseGalleryList(html) {
    const results = [];
    
    // Match gallery table rows or divs
    const galleryRegex = /<tr[^>]*class="gtr[^"]*"[^>]*>([\s\S]*?)<\/tr>|<div[^>]*class="[^"]*gl1[te][^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const linkRegex = /href="https?:\/\/e-hentai\.org\/g\/(\d+)\/([a-f0-9]+)\/?"/i;
    const titleRegex = /<div[^>]*class="[^"]*glink[^"]*"[^>]*>([^<]+)<\/div>|title="([^"]+)"/i;
    const thumbRegex = /<img[^>]*src="([^"]+)"[^>]*>/i;
    const categoryRegex = /<div[^>]*class="[^"]*cn[^"]*"[^>]*>([^<]+)<\/div>|<td[^>]*class="[^"]*gl1c[^"]*"[^>]*>[\s\S]*?<div[^>]*>([^<]+)<\/div>/i;
    const ratingRegex = /background-position:\s*-?(\d+)px\s+-?(\d+)px/i;
    const pagesRegex = /(\d+)\s*pages/i;
    
    let match;
    while ((match = galleryRegex.exec(html)) !== null) {
      const content = match[1] || match[2];
      const linkMatch = linkRegex.exec(content);
      
      if (linkMatch) {
        const gid = linkMatch[1];
        const token = linkMatch[2];
        const titleMatch = titleRegex.exec(content);
        const thumbMatch = thumbRegex.exec(content);
        const categoryMatch = categoryRegex.exec(content);
        const pagesMatch = pagesRegex.exec(content);
        const ratingMatch = ratingRegex.exec(content);
        
        // Calculate rating from sprite position
        let rating = 0;
        if (ratingMatch) {
          const x = parseInt(ratingMatch[1]);
          const y = parseInt(ratingMatch[2]);
          rating = 5 - (x / 16) - (y > 0 ? 0.5 : 0);
        }
        
        const category = (categoryMatch?.[1] || categoryMatch?.[2] || 'misc').toLowerCase().trim();
        
        results.push(this.formatManga({
          id: `${gid}/${token}`,
          title: this.decodeHtml((titleMatch?.[1] || titleMatch?.[2] || `Gallery ${gid}`).trim()),
          coverUrl: thumbMatch ? thumbMatch[1] : '',
          genres: [category],
          type: category,
          rating: rating > 0 ? rating : null,
          pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
          adult: true
        }));
      }
    }
    
    return results;
  }

  parseGalleryDetails(html, gid) {
    const titleMatch = /<h1[^>]*id="gn"[^>]*>([^<]+)<\/h1>/i.exec(html);
    const japTitleMatch = /<h1[^>]*id="gj"[^>]*>([^<]+)<\/h1>/i.exec(html);
    const coverMatch = /<div[^>]*id="gd1"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/i.exec(html);
    const categoryMatch = /<div[^>]*id="gdc"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i.exec(html);
    
    // Extract uploader
    const uploaderMatch = /<div[^>]*id="gdn"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i.exec(html);
    
    // Extract tags by namespace
    const tags = [];
    const artists = [];
    const parodies = [];
    const characters = [];
    const groups = [];
    let language = 'japanese';
    
    const tagSectionRegex = /<tr[^>]*>[\s\S]*?<td[^>]*class="[^"]*tc[^"]*"[^>]*>([^<:]+):?<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tagSection;
    
    while ((tagSection = tagSectionRegex.exec(html)) !== null) {
      const namespace = tagSection[1].toLowerCase().trim();
      const tagContent = tagSection[2];
      
      const tagRegex = /<a[^>]*>([^<]+)<\/a>/gi;
      let tagMatch;
      
      while ((tagMatch = tagRegex.exec(tagContent)) !== null) {
        const tag = tagMatch[1].trim();
        
        switch (namespace) {
          case 'artist':
            artists.push(tag);
            break;
          case 'parody':
            parodies.push(tag);
            break;
          case 'character':
            characters.push(tag);
            break;
          case 'group':
            groups.push(tag);
            break;
          case 'language':
            if (tag !== 'translated' && tag !== 'rewrite') {
              language = tag;
            }
            break;
          default:
            tags.push(tag);
        }
      }
    }
    
    // Extract page count
    const pagesMatch = /(\d+)\s*pages/i.exec(html);
    
    // Extract rating
    const ratingMatch = /Average:\s*([\d.]+)/i.exec(html);
    
    const category = (categoryMatch?.[1] || 'misc').toLowerCase().trim();
    
    return this.formatManga({
      id: gid,
      title: this.decodeHtml((titleMatch?.[1] || `Gallery ${gid}`).trim()),
      altTitles: japTitleMatch ? [this.decodeHtml(japTitleMatch[1].trim())] : [],
      description: `${category}${parodies.length ? ` | Parody: ${parodies.join(', ')}` : ''}${characters.length ? ` | Characters: ${characters.join(', ')}` : ''}`,
      coverUrl: coverMatch ? coverMatch[1] : '',
      author: artists.join(', ') || groups.join(', ') || uploaderMatch?.[1] || 'Unknown',
      artist: artists.join(', ') || 'Unknown',
      status: 'completed',
      tags,
      genres: [category],
      type: category,
      parodies,
      characters,
      groups,
      artists,
      uploader: uploaderMatch?.[1] || 'Unknown',
      pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
      language: this.languageToCode(language),
      languageName: language,
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
      adult: true
    });
  }

  formatApiGallery(data) {
    const category = (data.category || 'misc').toLowerCase();
    const artists = data.tags?.filter(t => t.startsWith('artist:')).map(t => t.replace('artist:', '')) || [];
    const parodies = data.tags?.filter(t => t.startsWith('parody:')).map(t => t.replace('parody:', '')) || [];
    const characters = data.tags?.filter(t => t.startsWith('character:')).map(t => t.replace('character:', '')) || [];
    const groups = data.tags?.filter(t => t.startsWith('group:')).map(t => t.replace('group:', '')) || [];
    const language = data.tags?.find(t => t.startsWith('language:') && !t.includes('translated'))?.replace('language:', '') || 'japanese';
    const tags = data.tags?.filter(t => !t.includes(':')) || [];
    
    return this.formatManga({
      id: `${data.gid}/${data.token}`,
      title: this.decodeHtml(data.title || data.title_jpn || `Gallery ${data.gid}`),
      altTitles: data.title_jpn ? [this.decodeHtml(data.title_jpn)] : [],
      description: `${category}${parodies.length ? ` | Parody: ${parodies.join(', ')}` : ''}`,
      coverUrl: data.thumb || '',
      author: artists.join(', ') || groups.join(', ') || data.uploader || 'Unknown',
      artist: artists.join(', ') || 'Unknown',
      status: 'completed',
      tags,
      genres: [category],
      type: category,
      parodies,
      characters,
      groups,
      artists,
      uploader: data.uploader || 'Unknown',
      pages: parseInt(data.filecount) || 0,
      language: this.languageToCode(language),
      languageName: language,
      rating: data.rating ? parseFloat(data.rating) : null,
      adult: true,
      filesize: data.filesize || 0,
      posted: data.posted ? new Date(parseInt(data.posted) * 1000).toISOString() : null
    });
  }

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

  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      await this.fetch(this.baseUrl, { signal: controller.signal, method: 'HEAD' });
      clearTimeout(timeout);
      
      return true;
    } catch {
      return false;
    }
  }
}

const ehentaiSource = new EHentaiSource();

export default ehentaiSource;
export { ehentaiSource, EHENTAI_CATEGORIES };
