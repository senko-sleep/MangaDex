/**
 * IMHentai Source
 * Large adult content collection with easy API access
 * Supports: manga, doujinshi, western, imageset, artistcg, gamecg
 * Fast and reliable with good search
 */

import BaseSource from './base';

// IMHentai content categories
export const IMHENTAI_CATEGORIES = {
  ALL: 'all',
  MANGA: 'manga',
  DOUJINSHI: 'doujinshi',
  WESTERN: 'western',
  IMAGESET: 'imageset',
  ARTISTCG: 'artistcg',
  GAMECG: 'gamecg'
};

// Category IDs for IMHentai
const CATEGORY_IDS = {
  manga: 1,
  doujinshi: 2,
  western: 3,
  imageset: 4,
  artistcg: 5,
  gamecg: 6
};

class IMHentaiSource extends BaseSource {
  constructor() {
    super({
      name: 'IMHentai',
      baseUrl: 'https://imhentai.xxx',
      adult: true,
      features: [
        'search', 'popular', 'latest', 'tags', 
        'doujinshi', 'manga', 'artistcg', 'gamecg', 
        'western', 'imageset', 'multi-language'
      ],
      rateLimit: 500
    });
    
    this.categories = IMHENTAI_CATEGORIES;
    this.imageServer = 'https://m1.imhentai.xxx';
    this.thumbServer = 'https://m1.imhentai.xxx/t';
  }

  /**
   * Enhanced search with support for advanced queries:
   * - title: search in titles (default)
   * - tag: search in tags (prefix with # or tag:)
   * - description: search in descriptions (prefix with description: or desc:)
   * - artist: search by artist (prefix with artist: or @)
   * - group: search by group (prefix with group:)
   * - language: filter by language (prefix with lang: or language:)
   * - rating: filter by minimum rating (prefix with rating: or score:)
   * - pages: filter by page count (prefix with pages: or p:)
   * - sort: sort by (popular, popular-today, popular-week, popular-month, date, rating)
   * 
   * Examples:
   * - "tag:loli tag:blonde" - galleries with both loli and blonde tags
   * - "artist:shindoL" or "@shindoL" - galleries by shindoL (case-insensitive)
   * - "artist:(shindoL OR shindol)" - galleries by either shindoL or shindol
   * - "artist:shin*" - galleries by artists starting with 'shin' (wildcard search)
   * - "artist:^shin" - galleries by artists starting exactly with 'shin'
   * - "artist:lol$" - galleries by artists ending with 'lol'
   * - "rating:4.5" - galleries with at least 4.5 rating
   * - "pages:>20" - galleries with more than 20 pages
   * - "sort:popular-today" - sort by today's popularity
   */
  /**
   * Parse artist name from query or return null if not an artist query
   */
  parseArtistQuery(query) {
    // Check if the query is exactly in the format "artist:name" or "@name"
    const artistMatch = query.match(/^(?:artist:|@)([^\s]+)$/i);
    if (artistMatch) {
      return artistMatch[1].toLowerCase();
    }
    
    // Check if the query is just a simple name (no spaces, no special characters except - and _)
    if (/^[\w-]+$/.test(query.trim())) {
      return query.trim().toLowerCase();
    }
    
    return null;
  }

  /**
   * Fetch galleries from artist page
   */
  async fetchArtistGalleries(artist, page = 1) {
    try {
      const url = `${this.baseUrl}/artist/${encodeURIComponent(artist)}/${page > 1 ? `?page=${page}` : ''}`;
      console.log(`[IMHentai] Fetching artist page: ${url}`);
      
      const html = await this.fetchHtml(url);
      return this.parseGalleryList(html);
    } catch (error) {
      console.error(`[IMHentai] Failed to fetch artist ${artist}:`, error);
      return [];
    }
  }

  async search(query, options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      type = 'all',
      existingIds = new Set(),
      sort = 'date',
      sortDesc = true,
      isArtistSearch = false,
      forceArtistSearch = false
    } = options;

    // Clean up the query
    query = (query || '').trim();

    // Check if this is an artist search:
    // 1. Format: artist:<name> or @<name>
    // 2. Simple single word with no spaces (like "dagasi")
    const artistMatch = query.match(/^(?:artist:|@)([\w-]+)$/i);
    const isSimpleWord = /^[\w-]+$/.test(query) && !query.includes(' ');
    
    if (artistMatch || isSimpleWord) {
      const artistName = artistMatch ? artistMatch[1].toLowerCase() : query.toLowerCase();
      console.log(`[IMHentai] Direct artist search for: ${artistName}, page: ${page}`);
      const galleries = await this.fetchArtistGalleries(artistName, page);
      const filteredGalleries = galleries.filter(g => !existingIds.has(g.id));
      filteredGalleries.forEach(g => existingIds.add(g.id));
      return filteredGalleries;
    }
    
    try {
      // If empty query and we have category/type, browse that category instead
      if (!query && (category !== 'all' || type !== 'all')) {
        return this.getLatest(options);
      }

      // Parse advanced search parameters
      const params = new URLSearchParams();
      let searchQuery = '';
      const searchTerms = [];
      const tagTerms = [];
      const titleTerms = [];
      const descTerms = [];
      const artistTerms = [];
      const groupTerms = [];
      let minRating = 0;
      let minPages = 0;
      let maxPages = 0;
      let language = '';
      let sortField = sort;
      let sortOrder = sortDesc ? 'desc' : 'asc';

      // Parse query string for advanced search terms
      const terms = query.split(/\s+/);
      for (const term of terms) {
        const lowerTerm = term.toLowerCase();
        
        // Handle tag search (prefix with # or tag:)
        if (term.startsWith('#') || term.startsWith('tag:')) {
          const tag = term.replace(/^(#|tag:)/, '').trim();
          if (tag) tagTerms.push(`"${tag}"`);
          continue;
        }
        
        // Handle description search
        if (term.startsWith('description:') || term.startsWith('desc:')) {
          const desc = term.replace(/^(description:|desc:)/, '').trim();
          if (desc) descTerms.push(`"${desc}"`);
          continue;
        }
        
        // Handle artist search with advanced options
        if (term.startsWith('artist:') || term.startsWith('@')) {
          let artist = term.replace(/^(artist:|@)/, '').trim();
          
          // Check if this is a direct artist page search (no special characters)
          if (/^[\w-]+$/.test(artist)) {
            // This is a simple artist name, we'll handle it as a direct artist page search
            if (terms.length === 1 || (terms.length === 2 && terms[1].startsWith('page:'))) {
              // If this is the only term or followed by a page parameter, treat as direct artist search
              const pageMatch = terms[1]?.match(/^page:(\d+)$/);
              const pageNum = pageMatch ? parseInt(pageMatch[1]) : 1;
              return this.search(`artist:${artist}`, { ...options, page: pageNum, isArtistSearch: true });
            }
          }
          
          // Handle OR conditions in artist names (artist:(name1 OR name2))
          if (artist.startsWith('(') && artist.endsWith(')')) {
            const orArtists = artist.slice(1, -1).split(' OR ').map(a => a.trim());
            if (orArtists.length > 1) {
              artistTerms.push(`(${orArtists.map(a => `artist:"${a}"`).join(' OR ')})`);
              continue;
            }
            artist = orArtists[0]; // Fallback to single artist if invalid OR syntax
          }
          
          // Handle wildcard searches and exact matches
          if (artist) {
            // Convert to lowercase for case-insensitive search
            artist = artist.toLowerCase();
            
            // Handle exact start/end matching
            if (artist.startsWith('^')) {
              // Exact start match
              artistTerms.push(`artist:^"${artist.slice(1)}"`);
            } else if (artist.endsWith('$')) {
              // Exact end match
              artistTerms.push(`artist:"${artist.slice(0, -1)}$"`);
            } else if (artist.includes('*')) {
              // Wildcard search
              artistTerms.push(`artist:${artist}`);
            } else {
              // Regular search (case-insensitive)
              artistTerms.push(`artist:"${artist}"`);
            }
          }
          continue;
        }
        
        // Handle group search
        if (term.startsWith('group:')) {
          const group = term.replace(/^group:/, '').trim();
          if (group) groupTerms.push(`"${group}"`);
          continue;
        }
        
        // Handle language filter
        if (term.startsWith('lang:') || term.startsWith('language:')) {
          language = term.split(':')[1]?.trim() || '';
          continue;
        }
        
        // Handle rating filter
        if (term.startsWith('rating:') || term.startsWith('score:')) {
          const rating = parseFloat(term.split(':')[1]);
          if (!isNaN(rating)) minRating = Math.max(0, Math.min(5, rating));
          continue;
        }
        
        // Handle page count filter
        if (term.startsWith('pages:') || term.startsWith('p:')) {
          const pageTerm = term.split(':')[1]?.trim() || '';
          if (pageTerm.startsWith('>=')) {
            minPages = parseInt(pageTerm.substring(2)) || 0;
          } else if (pageTerm.startsWith('>')) {
            minPages = (parseInt(pageTerm.substring(1)) || 0) + 1;
          } else if (pageTerm.startsWith('<=')) {
            maxPages = parseInt(pageTerm.substring(2)) || 0;
          } else if (pageTerm.startsWith('<')) {
            maxPages = (parseInt(pageTerm.substring(1)) || 1) - 1;
          } else {
            const pages = parseInt(pageTerm);
            if (!isNaN(pages)) {
              minPages = pages;
              maxPages = pages;
            }
          }
          continue;
        }
        
        // Handle sort
        if (term.startsWith('sort:')) {
          const sortValue = term.split(':')[1]?.trim() || '';
          if (['popular', 'popular-today', 'popular-week', 'popular-month', 'date', 'rating'].includes(sortValue)) {
            sortField = sortValue;
            sortOrder = sortValue.startsWith('popular') ? 'desc' : sortOrder;
          }
          continue;
        }
        
        // Default to title search for regular terms
        if (term.trim()) {
          titleTerms.push(`"${term.trim()}"`);
        }
      }

      // Build the search query
      if (titleTerms.length > 0) searchTerms.push(titleTerms.join(' '));
      if (tagTerms.length > 0) searchTerms.push(`tags:${tagTerms.join(' ')}`);
      if (descTerms.length > 0) searchTerms.push(`description:${descTerms.join(' ')}`);
      if (artistTerms.length > 0) searchTerms.push(`artist:${artistTerms.join(' ')}`);
      if (groupTerms.length > 0) searchTerms.push(`group:${groupTerms.join(' ')}`);
      
      // Add filters
      if (minRating > 0) params.append('min_rating', minRating);
      if (minPages > 0) params.append('min_pages', minPages);
      if (maxPages > 0) params.append('max_pages', maxPages);
      if (language) params.append('language', language);
      
      // Add category filter
      const cat = category !== 'all' ? category : type;
      if (cat !== 'all' && CATEGORY_IDS[cat]) {
        params.append('cat', CATEGORY_IDS[cat]);
      }
      
      // Add search query if we have any terms
      if (searchTerms.length > 0) {
        // If we have artist terms and it's a simple artist search, use artist page instead
        if (artistTerms.length > 0 && searchTerms.length === artistTerms.length) {
          const artistName = artistTerms[0].replace(/^artist:"|"$/g, '');
          return this.search(`artist:${artistName}`, { ...options, isArtistSearch: true });
        }
        params.append('key', searchTerms.join(' '));
      }
      
      // Add pagination and sorting
      params.append('page', page);
      params.append('sort', sortField);
      params.append('order', sortOrder);
      
      const url = `${this.baseUrl}/search/?${params.toString()}`;
      console.log('[IMHentai] Searching:', url);
      
      const html = await this.fetchHtml(url);
      let galleries = this.parseGalleryList(html);
      
      // Filter out duplicates using existingIds
      galleries = galleries.filter(gallery => !existingIds.has(gallery.id));
      
      // Add new IDs to the set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: galleries.length >= 24, // IMHentai shows 24 results per page
        nextPage: page + 1,
        sort: sortField,
        sortOrder,
        filters: {
          category: cat,
          minRating,
          minPages,
          maxPages,
          language
        }
      };
    } catch (error) {
      console.error('[IMHentai] Search failed:', error);
      this.log.warn('IMHentai search failed', { query, error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getPopular(options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      type = 'all',
      existingIds = new Set()
    } = options;
    
    try {
      // Try multiple possible popular URLs
      const possiblePaths = [
        '/popular/',
        '/popular/all/',
        '/popular/all/popular/' // Some sites use this pattern
      ];
      
      const cat = category !== 'all' ? category : type;
      let galleries = [];
      
      for (const path of possiblePaths) {
        try {
          let url = `${this.baseUrl}${path}?page=${page}`;
          
          if (cat !== 'all' && CATEGORY_IDS[cat]) {
            url = `${this.baseUrl}/${cat}${path}?page=${page}`;
          }
          
          console.log('[IMHentai] Fetching popular from:', url);
          const html = await this.fetchHtml(url);
          const newGalleries = this.parseGalleryList(html);
          
          // Add only new galleries to avoid duplicates
          const existingIdsSet = new Set([...existingIds, ...galleries.map(g => g.id)]);
          newGalleries.forEach(g => {
            if (!existingIdsSet.has(g.id)) {
              galleries.push(g);
              existingIdsSet.add(g.id);
            }
          });
          
          // If we have enough results, no need to try other URLs
          if (galleries.length >= limit) break;
        } catch (error) {
          console.warn(`[IMHentai] Failed to fetch from path: ${path}`, error.message);
          // Continue to next path
        }
      }
      
      // Add all new IDs to the existingIds set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: galleries.length >= 24, // IMHentai shows 24 results per page
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[IMHentai] Popular fetch failed:', error);
      this.log.warn('IMHentai popular failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  async getLatest(options = {}) {
    const { 
      limit = 24, 
      page = 1, 
      category = 'all',
      type = 'all',
      existingIds = new Set()
    } = options;
    
    try {
      // Try multiple possible latest URLs
      const possiblePaths = [
        '/',
        '/latest/',
        '/latest/all/',
        '/g/'  // Some sites use this as the root for latest
      ];
      
      const cat = category !== 'all' ? category : type;
      let galleries = [];
      
      for (const path of possiblePaths) {
        try {
          let url = `${this.baseUrl}${path}${path.endsWith('/') ? '' : '/'}?page=${page}`;
          
          if (cat !== 'all' && CATEGORY_IDS[cat]) {
            url = `${this.baseUrl}/${cat}${path}?page=${page}`;
          }
          
          console.log('[IMHentai] Fetching latest from:', url);
          const html = await this.fetchHtml(url);
          const newGalleries = this.parseGalleryList(html);
          
          // Add only new galleries to avoid duplicates
          const existingIdsSet = new Set([...existingIds, ...galleries.map(g => g.id)]);
          newGalleries.forEach(g => {
            if (!existingIdsSet.has(g.id)) {
              galleries.push(g);
              existingIdsSet.add(g.id);
            }
          });
          
          // If we have enough results, no need to try other URLs
          if (galleries.length >= limit) break;
        } catch (error) {
          console.warn(`[IMHentai] Failed to fetch latest from path: ${path}`, error.message);
          // Continue to next path
        }
      }
      
      // Sort by ID in descending order (newest first)
      galleries.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      
      // Add all new IDs to the existingIds set
      galleries.forEach(gallery => existingIds.add(gallery.id));
      
      return { 
        results: galleries.slice(0, limit),
        hasMore: galleries.length >= 24, // IMHentai shows 24 results per page
        nextPage: page + 1
      };
    } catch (error) {
      console.error('[IMHentai] Latest fetch failed:', error);
      this.log.warn('IMHentai latest failed', { error: error.message });
      return { results: [], hasMore: false, nextPage: page };
    }
  }

  /**
   * Get content by category
   */
  async getByCategory(category, options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.baseUrl}/${category}/?page=${page}`;
      
      const html = await this.fetchHtml(url);
      const galleries = this.parseGalleryList(html);
      
      return galleries.slice(0, limit);
    } catch (error) {
      this.log.warn(`IMHentai get ${category} failed`, { error: error.message });
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

  async getMangaDetails(mangaId) {
    try {
      const url = `${this.baseUrl}/gallery/${mangaId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryDetails(html, mangaId);
    } catch (error) {
      this.log.warn('IMHentai details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapters(mangaId) {
    // IMHentai galleries are single "chapters"
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
      const url = `${this.baseUrl}/gallery/${galleryId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryPages(html, galleryId);
    } catch (error) {
      this.log.warn('IMHentai pages failed', { galleryId, error: error.message });
      throw error;
    }
    const results = [];
    
    // Check if this is an artist page
    const isArtistPage = html.includes('class="artist-info"') || html.includes('class="artist-galleries"');
    
    // Different patterns to match gallery entries
    const patterns = [
      // Artist page gallery format
      isArtistPage ? {
        regex: /<div[^>]*class="[^"]*item"[^>]*>([\s\S]*?)<\/div>/gi,
        link: /<a[^>]*href="\/gallery\/(\d+)\/?"[^>]*>/i,
        title: /<div[^>]*class="[^"]*title"[^>]*>([^<]+)<\/div>/i,
        thumb: /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
        category: /<div[^>]*class="[^"]*category"[^>]*>([^<]+)<\/div>/i,
        pages: /(\d+)\s*(?:P|pages|page)/i
      } : null,
      // New gallery card format
      {
        regex: /<div[^>]*class="[^"]*gallery"[^>]*>([\s\S]*?)<\/div>/gi,
        link: /<a[^>]*href="\/gallery\/(\d+)\/?"[^>]*>/i,
        title: /<div[^>]*class="[^"]*caption"[^>]*>([^<]+)<\/div>/i,
        thumb: /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
        category: /<div[^>]*class="[^"]*cat"[^>]*>([^<]+)<\/div>/i,
        pages: /(\d+)\s*(?:P|pages|page)/i
      },
      // Old gallery row format
      {
        regex: /<tr[^>]*class="[^"]*gallery[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi,
        link: /href="\/gallery\/(\d+)\/?"/i,
        title: /class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i,
        thumb: /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
        category: /<span[^>]*class="[^"]*category[^"]*"[^>]*>([^<]+)<\/span>/i,
        pages: /(\d+)\s*(?:P|pages|page)/i
      },
      // List layout
      {
        regex: /<tr[^>]*class="[^"]*gallery[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi,
        link: /href="\/gallery\/(\d+)\/?"/i,
        title: /class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i,
        thumb: /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
        category: /<span[^>]*class="[^"]*category[^"]*"[^>]*>([^<]+)<\/span>/i,
        pages: /(\d+)\s*(?:P|pages|page)/i
      }
    ];

    for (const pattern of patterns) {
      if (!pattern) continue; // Skip null patterns (like disabled artist page pattern)
      const { regex, link, title, thumb, category, pages } = pattern;
      let match;
      
      while ((match = regex.exec(html)) !== null) {
        const content = match[1];
        const linkMatch = link.exec(content);
        
        if (linkMatch) {
          const id = linkMatch[1];
          const titleMatch = title.exec(content);
          const thumbMatch = thumb.exec(content);
          const categoryMatch = category?.exec(content);
          const pagesMatch = pages?.exec(content);
          
          // Skip if we already have this gallery
          if (results.some(r => r.id === id)) continue;
          
          const cat = (categoryMatch?.[1] || 'doujinshi').toLowerCase().trim();
          
          // Process thumbnail URL - ensure it's absolute
          let coverUrl = thumbMatch ? thumbMatch[1] : '';
          if (coverUrl && !coverUrl.startsWith('http')) {
            if (coverUrl.startsWith('//')) {
              coverUrl = 'https:' + coverUrl;
            } else if (coverUrl.startsWith('/')) {
              coverUrl = this.baseUrl + coverUrl;
            } else {
              coverUrl = this.baseUrl + '/' + coverUrl;
            }
          }
          
          results.push(this.formatManga({
            id,
            title: this.decodeHtml((titleMatch?.[1] || titleMatch?.[2] || `Gallery ${id}`).trim()),
            coverUrl,
            genres: [cat],
            type: cat,
            pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
            adult: true
          }));
        }
      }
      
      // If we found results with this pattern, no need to try others
      if (results.length > 0) break;
    }
    
    return results;
  }

  parseGalleryDetails(html, galleryId) {
    const titleMatch = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html);
    const coverMatch = /<div[^>]*class="[^"]*cover[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/i.exec(html);
    const categoryMatch = /<span[^>]*class="[^"]*type[^"]*"[^>]*>([^<]+)<\/span>/i.exec(html);
    
    // Extract tags
    const tags = [];
    const artists = [];
    const parodies = [];
    const characters = [];
    const groups = [];
    let language = 'english';
    
    // Parse tag sections
    const tagRowRegex = /<li[^>]*>[\s\S]*?<span[^>]*class="[^"]*tag_name[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*class="[^"]*tags[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/li>/gi;
    let tagRow;
    
    while ((tagRow = tagRowRegex.exec(html)) !== null) {
      const namespace = tagRow[1].toLowerCase().trim();
      const tagContent = tagRow[2];
      
      const tagRegex = /<a[^>]*>([^<]+)<\/a>/gi;
      let tagMatch;
      
      while ((tagMatch = tagRegex.exec(tagContent)) !== null) {
        const tag = tagMatch[1].trim();
        
        switch (namespace) {
          case 'artists':
          case 'artist':
            artists.push(tag);
            break;
          case 'parodies':
          case 'parody':
            parodies.push(tag);
            break;
          case 'characters':
          case 'character':
            characters.push(tag);
            break;
          case 'groups':
          case 'group':
            groups.push(tag);
            break;
          case 'languages':
          case 'language':
            if (tag.toLowerCase() !== 'translated') {
              language = tag;
            }
            break;
          case 'tags':
          case 'tag':
          default:
            tags.push(tag);
        }
      }
    }
    
    // Extract page count
    const pagesMatch = /(\d+)\s*Pages/i.exec(html);
    
    const category = (categoryMatch?.[1] || 'doujinshi').toLowerCase().trim();
    
    return this.formatManga({
      id: galleryId,
      title: this.decodeHtml((titleMatch?.[1] || `Gallery ${galleryId}`).trim()),
      description: `${category}${parodies.length ? ` | Parody: ${parodies.join(', ')}` : ''}${characters.length ? ` | Characters: ${characters.join(', ')}` : ''}`,
      coverUrl: coverMatch ? coverMatch[1] : '',
      author: artists.join(', ') || groups.join(', ') || 'Unknown',
      artist: artists.join(', ') || 'Unknown',
      status: 'completed',
      tags,
      genres: [category],
      type: category,
      parodies,
      characters,
      groups,
      artists,
      pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
      language: this.languageToCode(language),
      languageName: language,
      adult: true
    });
  }

  parseGalleryPages(html, galleryId) {
    const pages = [];
    
    // Try multiple patterns to extract page information
    const patterns = [
      // Standard hidden inputs
      {
        server: /id=['"]load_server['"][^>]*value=['"]([^'"]*)['"]/i,
        dir: /id=['"]load_dir['"][^>]*value=['"]([^'"]*)['"]/i,
        loadId: /id=['"]load_id['"][^>]*value=['"]([^'"]*)['"]/i,
        pages: /id=['"]load_pages['"][^>]*value=['"]([^'"]*)['"]/i,
      },
      // Alternative pattern for some sites
      {
        server: /var\s+load_server\s*=\s*['"]([^'"]*)['"]/i,
        dir: /var\s+load_dir\s*=\s*['"]([^'"]*)['"]/i,
        loadId: /var\s+load_id\s*=\s*['"]([^'"]*)['"]/i,
        pages: /var\s+load_pages\s*=\s*(\d+)/i,
      },
      // Another common pattern
      {
        server: /"server":\s*"([^"]*)"/i,
        dir: /"dir":\s*"([^"]*)"/i,
        loadId: /"id":\s*"([^"]*)"/i,
        pages: /"pages":\s*(\d+)/i,
      }
    ];

    let server, dir, loadId, totalPages;
    
    // Try each pattern until we find one that works
    for (const pattern of patterns) {
      try {
        const serverMatch = pattern.server.exec(html);
        const dirMatch = pattern.dir.exec(html);
        const loadIdMatch = pattern.loadId.exec(html);
        const pagesMatch = pattern.pages.exec(html);
        
        if (serverMatch && dirMatch && loadIdMatch && pagesMatch) {
          server = serverMatch[1];
          dir = dirMatch[1];
          loadId = loadIdMatch[1];
          totalPages = parseInt(pagesMatch[1]);
          break;
        }
      } catch (error) {
        console.warn('[IMHentai] Error parsing page info with pattern:', error);
      }
    }
    
    if (server && dir && loadId && totalPages > 0) {
      // Try to determine the image extension
      const extPatterns = [
        /<img[^>]*data-src=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i,
        /<img[^>]*src=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i,
        /<img[^>]*data-original=['"][^'"]*?\.(jpg|jpeg|png|gif|webp)/i
      ];
      
      let ext = 'jpg';
      for (const pattern of extPatterns) {
        const match = pattern.exec(html);
        if (match && match[1]) {
          ext = match[1].toLowerCase();
          break;
        }
      }
      
      // Build all page URLs using the pattern
      for (let i = 1; i <= totalPages; i++) {
        // Try multiple URL patterns as different sites may use different formats
        const urlPatterns = [
          `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://${server}.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://m1.imhentai.xxx/${dir}/${loadId}/${i}.${ext}`,
          `https://imhentai.xxx/${dir}/${loadId}/${i}.${ext}`
        ];
        
        // Add all possible URLs and let the proxy handle fallback
        pages.push({
          index: i,
          url: urlPatterns[0], // Primary URL
          fallbackUrls: urlPatterns.slice(1) // Fallback URLs if primary fails
        });
        pages.push({
          index: i,
          url: fullUrl
        });
      }
    }
    
    // Fallback: Parse from thumbnail list
    if (pages.length === 0) {
      const thumbRegex = /class=['"][^'"]*gthumb[^'"]*['"][^>]*>[\s\S]*?<img[^>]*data-src=['"]([^'"]*)['"]/gi;
      let thumbMatch;
      let pageNum = 1;
      
      while ((thumbMatch = thumbRegex.exec(html)) !== null) {
        const thumbUrl = thumbMatch[1];
        // Convert thumbnail to full image URL: 1t.jpg -> 1.jpg
        const fullUrl = thumbUrl.replace(/(\d+)t\./, '$1.');
        
        pages.push({
          index: pageNum++,
          url: fullUrl
        });
      }
    }
    
    return pages;
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
      'german': 'de'
    };
    return codes[language?.toLowerCase()] || 'en';
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

const imhentaiSource = new IMHentaiSource();

export default imhentaiSource;
export { imhentaiSource, IMHENTAI_CATEGORIES };
