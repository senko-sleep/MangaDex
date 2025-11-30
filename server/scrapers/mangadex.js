import BaseScraper from './base.js';

// API base URL for proxy (set via environment variable in production)
// Must be set to the full URL of the API server (e.g., https://mangadex-i6sv.onrender.com)
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// MangaDex - Official API, very reliable
export class MangaDexScraper extends BaseScraper {
  constructor() {
    super('MangaDex', 'https://api.mangadex.org', false);
    this.tagCache = null;
    this.tagCacheTime = 0;
  }
  
  // Helper to create proxy URL - returns absolute URL for cross-origin access
  proxyUrl(url) {
    const base = API_BASE || 'https://mangadex-i6sv.onrender.com';
    return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  // Get tag IDs from tag names (for API filtering)
  async getTagIds(tagNames) {
    if (!tagNames || tagNames.length === 0) return [];
    
    // Load tags cache if needed
    if (!this.tagCache || Date.now() - this.tagCacheTime > 3600000) {
      try {
        const res = await this.client.get(`${this.baseUrl}/manga/tag`);
        this.tagCache = res.data?.data || [];
        this.tagCacheTime = Date.now();
      } catch (e) {
        console.error('[MangaDex] Failed to load tag cache:', e.message);
        return [];
      }
    }
    
    // Find tag IDs matching the names
    return tagNames.map(name => {
      const tag = this.tagCache.find(t => 
        t.attributes?.name?.en?.toLowerCase() === name.toLowerCase()
      );
      return tag?.id;
    }).filter(Boolean);
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = []) {
    try {
      const offset = (page - 1) * 24;
      const params = new URLSearchParams();
      params.append('limit', '24');
      params.append('offset', String(offset));
      params.append('includes[]', 'cover_art');
      params.append('order[followedCount]', 'desc');
      params.append('hasAvailableChapters', 'true');
      
      // Content ratings
      params.append('contentRating[]', 'safe');
      params.append('contentRating[]', 'suggestive');
      if (includeAdult) {
        params.append('contentRating[]', 'erotica');
        params.append('contentRating[]', 'pornographic');
      }
      
      if (query) params.set('title', query);
      
      // Add tag filtering using MangaDex API
      if (tags.length > 0) {
        const tagIds = await this.getTagIds(tags);
        tagIds.forEach(id => params.append('includedTags[]', id));
      }
      
      if (excludeTags.length > 0) {
        const excludeIds = await this.getTagIds(excludeTags);
        excludeIds.forEach(id => params.append('excludedTags[]', id));
      }

      const res = await this.client.get(`${this.baseUrl}/manga?${params}`);
      return (res.data?.data || []).map(m => this.formatManga(m));
    } catch (e) {
      console.error('[MangaDex] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, tags = [], excludeTags = []) {
    return this.search('', page, includeAdult, tags, excludeTags);
  }

  async getLatest(page = 1, includeAdult = true) {
    try {
      const offset = (page - 1) * 24;
      // Build params with multiple content ratings
      const params = new URLSearchParams();
      params.append('limit', '24');
      params.append('offset', String(offset));
      params.append('includes[]', 'cover_art');
      params.append('order[latestUploadedChapter]', 'desc');
      params.append('hasAvailableChapters', 'true');
      
      // Content ratings - include ALL by default
      params.append('contentRating[]', 'safe');
      params.append('contentRating[]', 'suggestive');
      params.append('contentRating[]', 'erotica');
      params.append('contentRating[]', 'pornographic');

      const res = await this.client.get(`${this.baseUrl}/manga?${params}`);
      return (res.data?.data || []).map(m => this.formatManga(m));
    } catch (e) {
      console.error('[MangaDex] Latest error:', e.message);
      return [];
    }
  }

  formatManga(m) {
    const cover = m.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName;
    const tags = m.attributes?.tags || [];
    const isLongStrip = tags.some(t => t.attributes?.name?.en === 'Long Strip');
    const contentRating = m.attributes?.contentRating;
    const isAdult = contentRating === 'erotica' || contentRating === 'pornographic';
    
    // Proxy MangaDex cover URL for cross-origin access
    const coverUrl = cover ? this.proxyUrl(`https://uploads.mangadex.org/covers/${m.id}/${cover}.256.jpg`) : null;
    
    return {
      id: `mangadex:${m.id}`,
      sourceId: 'mangadex',
      slug: m.id,
      title: m.attributes?.title?.en || m.attributes?.title?.['ja-ro'] || Object.values(m.attributes?.title || {})[0] || 'Unknown',
      cover: coverUrl,
      status: m.attributes?.status,
      contentRating,
      isAdult,
      genres: tags.filter(t => t.attributes?.group === 'genre').map(t => t.attributes?.name?.en).filter(Boolean),
      tags: tags.map(t => t.attributes?.name?.en).filter(Boolean),
      year: m.attributes?.year,
      isLongStrip,
    };
  }

  async getMangaDetails(id) {
    const mangaId = id.replace('mangadex:', '');
    try {
      const res = await this.client.get(`${this.baseUrl}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`);
      const m = res.data?.data;
      if (!m) return null;

      const cover = m.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName;
      const author = m.relationships?.find(r => r.type === 'author')?.attributes?.name;
      const artist = m.relationships?.find(r => r.type === 'artist')?.attributes?.name;
      const tags = m.attributes?.tags || [];
      const isLongStrip = tags.some(t => t.attributes?.name?.en === 'Long Strip');
      const contentRating = m.attributes?.contentRating;
      const isAdult = contentRating === 'erotica' || contentRating === 'pornographic';

      // Get description - try English first, then any available
      const descriptions = m.attributes?.description || {};
      const description = descriptions.en || descriptions['en-us'] || Object.values(descriptions)[0] || '';

      // Get all titles
      const titles = m.attributes?.title || {};
      const altTitles = m.attributes?.altTitles || [];
      const title = titles.en || titles['ja-ro'] || titles.ja || Object.values(titles)[0] || 'Unknown';
      
      // Proxy MangaDex cover URL for cross-origin access
      const coverUrl = cover ? this.proxyUrl(`https://uploads.mangadex.org/covers/${mangaId}/${cover}`) : null;

      return {
        id,
        sourceId: 'mangadex',
        slug: mangaId,
        title,
        altTitles: altTitles.map(t => Object.values(t)[0]).filter(Boolean),
        description,
        cover: coverUrl,
        status: m.attributes?.status,
        contentRating,
        isAdult,
        author,
        artist,
        genres: tags.filter(t => t.attributes?.group === 'genre').map(t => t.attributes?.name?.en).filter(Boolean),
        tags: tags.map(t => t.attributes?.name?.en).filter(Boolean),
        year: m.attributes?.year,
        isLongStrip,
        // Extra metadata
        lastChapter: m.attributes?.lastChapter,
        lastVolume: m.attributes?.lastVolume,
        publicationDemographic: m.attributes?.publicationDemographic,
        originalLanguage: m.attributes?.originalLanguage,
      };
    } catch (e) {
      console.error('[MangaDex] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const id = mangaId.replace('mangadex:', '');
    try {
      // Fetch ALL chapters with pagination
      const allChapters = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams();
        params.append('limit', String(limit));
        params.append('offset', String(offset));
        params.append('order[chapter]', 'desc');
        params.append('order[volume]', 'desc');
        // Include all content ratings
        params.append('contentRating[]', 'safe');
        params.append('contentRating[]', 'suggestive');
        params.append('contentRating[]', 'erotica');
        params.append('contentRating[]', 'pornographic');
        // Include scanlation group info
        params.append('includes[]', 'scanlation_group');
        // Include ALL languages - not just English
        // This ensures we get all available chapters

        const res = await this.client.get(`${this.baseUrl}/manga/${id}/feed?${params}`);
        const chapters = res.data?.data || [];
        const total = res.data?.total || 0;

        allChapters.push(...chapters);
        offset += limit;
        hasMore = offset < total && chapters.length === limit;

        // Safety limit to prevent infinite loops
        if (offset > 10000) break;
      }

      console.log(`[MangaDex] Loaded ${allChapters.length} total chapters for ${id}`);

      // Keep ALL chapters - don't deduplicate, let user choose
      // But filter to prefer: English with pages > English external > Other languages with pages
      const chapterMap = new Map();
      
      for (const ch of allChapters) {
        const num = ch.attributes?.chapter || '0';
        const vol = ch.attributes?.volume || '';
        const lang = ch.attributes?.translatedLanguage || 'unknown';
        const isExternal = !!ch.attributes?.externalUrl;
        const pages = ch.attributes?.pages || 0;
        
        // Key by chapter number + language for unique entries
        const key = `${vol}-${num}-${lang}`;
        
        const existing = chapterMap.get(key);
        
        // For same chapter+language, prefer one with more pages
        if (!existing || pages > (existing.attributes?.pages || 0)) {
          chapterMap.set(key, ch);
        }
      }
      
      // Return ALL unique chapters (all languages) - let frontend filter/display
      // Convert to result format - include all versions
      const result = Array.from(chapterMap.values()).map(ch => {
        const group = ch.relationships?.find(r => r.type === 'scanlation_group');
        const externalUrl = ch.attributes?.externalUrl;
        
        return {
          id: ch.id,
          mangaId,
          chapter: ch.attributes?.chapter || '0',
          volume: ch.attributes?.volume || null,
          title: ch.attributes?.title || '',
          pages: ch.attributes?.pages || 0,
          date: ch.attributes?.publishAt,
          scanlationGroup: group?.attributes?.name || 'Unknown',
          language: ch.attributes?.translatedLanguage || 'en',
          externalUrl: externalUrl || null, // Link to external site if applicable
          isExternal: !!externalUrl,
          sourceId: 'mangadex',
        };
      });

      // Sort by chapter number (descending)
      result.sort((a, b) => {
        const aNum = parseFloat(a.chapter) || 0;
        const bNum = parseFloat(b.chapter) || 0;
        return bNum - aNum;
      });

      const externalCount = result.filter(r => r.isExternal).length;
      console.log(`[MangaDex] ${result.length} unique chapters (${externalCount} external)`);

      return result;
    } catch (e) {
      console.error('[MangaDex] Chapters error:', e.message);
      return [];
    }
  }

  async getChapterPages(chapterId, mangaId) {
    try {
      // First, check if this is an external chapter
      const chapterRes = await this.client.get(`${this.baseUrl}/chapter/${chapterId}`);
      const chapterData = chapterRes.data?.data;
      
      if (chapterData?.attributes?.externalUrl) {
        // External chapter - return the external URL
        console.log(`[MangaDex] Chapter ${chapterId} is external:`, chapterData.attributes.externalUrl);
        return [{
          page: 1,
          url: chapterData.attributes.externalUrl,
          isExternal: true,
          externalUrl: chapterData.attributes.externalUrl,
        }];
      }

      // Regular chapter - get pages from at-home server
      const res = await this.client.get(`${this.baseUrl}/at-home/server/${chapterId}`);
      const data = res.data;
      
      if (!data?.chapter) {
        console.error('[MangaDex] No chapter data for:', chapterId);
        // Try to return external URL if available
        if (chapterData?.attributes?.externalUrl) {
          return [{
            page: 1,
            url: chapterData.attributes.externalUrl,
            isExternal: true,
          }];
        }
        return [];
      }

      const baseUrl = data.baseUrl;
      const hash = data.chapter.hash;
      
      // High quality pages - use proxy to bypass hotlink protection
      const highQuality = (data.chapter.data || []).map((file, i) => {
        const originalUrl = `${baseUrl}/data/${hash}/${file}`;
        return {
          page: i + 1,
          url: this.proxyUrl(originalUrl),
          originalUrl,
          quality: 'high',
          isExternal: false,
        };
      });

      // Data saver (lower quality) pages as fallback
      const dataSaver = (data.chapter.dataSaver || []).map((file, i) => {
        const originalUrl = `${baseUrl}/data-saver/${hash}/${file}`;
        return {
          page: i + 1,
          url: this.proxyUrl(originalUrl),
          originalUrl,
          quality: 'low',
        };
      });

      console.log(`[MangaDex] Loaded ${highQuality.length} pages for chapter ${chapterId}`);

      // Return high quality pages with dataSaver as fallback info
      return highQuality.map((page, i) => ({
        ...page,
        fallbackUrl: dataSaver[i]?.url,
      }));
    } catch (e) {
      console.error('[MangaDex] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    try {
      // Fetch official tags from MangaDex API
      const res = await this.client.get(`${this.baseUrl}/manga/tag`);
      const tags = res.data?.data || [];
      
      // Extract tag names (genres and themes)
      return tags
        .filter(t => t.attributes?.group === 'genre' || t.attributes?.group === 'theme')
        .map(t => t.attributes?.name?.en)
        .filter(Boolean)
        .sort();
    } catch (e) {
      console.error('[MangaDex] Tags error:', e.message);
      // Fallback to basic tags
      return [
        'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
        'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life',
        'Sports', 'Supernatural', 'Thriller', 'Tragedy', 'Isekai'
      ];
    }
  }
}

export default MangaDexScraper;
