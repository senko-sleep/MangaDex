// MangaDex API for direct chapter page fetching
const MANGADEX_API = 'https://api.mangadex.org';

// Proxy base URL - routes images through backend to bypass hotlink protection
const PROXY_BASE = import.meta.env.VITE_API_URL || 'https://mangadex-i6sv.onrender.com';

// Helper to create proxied image URL
function proxyUrl(url) {
  return `${PROXY_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
}

// Cache for at-home server responses
const atHomeCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (MangaDex at-home tokens last ~15 mins)

/**
 * Extract MangaDex chapter ID from various formats
 * @param {string} chapterId - Chapter ID (may include source prefix)
 * @returns {string} Clean MangaDex chapter UUID
 */
export function extractChapterId(chapterId) {
  // Remove any source prefix like "mangadex:"
  return chapterId.replace(/^[a-z]+:/i, '');
}

/**
 * Extract MangaDex manga ID from various formats
 * @param {string} mangaId - Manga ID (may include source prefix)
 * @returns {string} Clean MangaDex manga UUID
 */
export function extractMangaId(mangaId) {
  return mangaId.replace(/^mangadex:/i, '');
}

/**
 * Fetch chapter pages directly from MangaDex at-home API
 * This bypasses the render.com proxy and fetches directly from MangaDex CDN
 * @param {string} chapterId - Chapter UUID
 * @returns {Promise<Array<{page: number, url: string, fallbackUrl: string}>>}
 */
export async function getChapterPages(chapterId) {
  const cleanChapterId = extractChapterId(chapterId);
  
  // Check cache first
  const cached = atHomeCache.get(cleanChapterId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[MangaDex] Using cached at-home data for:', cleanChapterId);
    return cached.pages;
  }
  
  // Retry logic for better reliability
  const maxRetries = 2;
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // First check if this is an external chapter
      const chapterResponse = await fetch(`${MANGADEX_API}/chapter/${cleanChapterId}`, {
        headers: { 'Accept': 'application/json' },
      });
      
      if (!chapterResponse.ok) {
        if (chapterResponse.status === 429) {
          // Rate limited - wait and retry
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Chapter fetch failed: ${chapterResponse.status}`);
      }
      
      const chapterData = await chapterResponse.json();
      const chapter = chapterData?.data;
      
      if (chapter?.attributes?.externalUrl) {
        // External chapter - return external URL
        console.log('[MangaDex] External chapter:', chapter.attributes.externalUrl);
        return [{
          page: 1,
          url: chapter.attributes.externalUrl,
          isExternal: true,
          externalUrl: chapter.attributes.externalUrl,
        }];
      }
      
      // Regular chapter - get pages from at-home server
      const atHomeResponse = await fetch(`${MANGADEX_API}/at-home/server/${cleanChapterId}`, {
        headers: { 'Accept': 'application/json' },
      });
      
      if (!atHomeResponse.ok) {
        if (atHomeResponse.status === 429) {
          // Rate limited - wait and retry
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(`At-home server fetch failed: ${atHomeResponse.status}`);
      }
      
      const atHomeData = await atHomeResponse.json();
      
      if (!atHomeData?.chapter) {
        console.error('[MangaDex] No chapter data in at-home response');
        return [];
      }
      
      const baseUrl = atHomeData.baseUrl;
      const hash = atHomeData.chapter.hash;
      
      // Build page URLs - proxy through backend to bypass hotlink protection
      const highQualityPages = (atHomeData.chapter.data || []).map((file, i) => ({
        page: i + 1,
        url: proxyUrl(`${baseUrl}/data/${hash}/${file}`),
        originalUrl: `${baseUrl}/data/${hash}/${file}`,
        quality: 'high',
        isExternal: false,
      }));
      
      // Data saver (lower quality) pages as fallback
      const dataSaverPages = (atHomeData.chapter.dataSaver || []).map((file, i) => ({
        page: i + 1,
        url: proxyUrl(`${baseUrl}/data-saver/${hash}/${file}`),
        originalUrl: `${baseUrl}/data-saver/${hash}/${file}`,
        quality: 'low',
        isExternal: false,
      }));
      
      // Combine high quality with fallback URLs
      const pages = highQualityPages.map((page, i) => ({
        ...page,
        fallbackUrl: dataSaverPages[i]?.url,
      }));
      
      console.log(`[MangaDex] Fetched ${pages.length} pages for chapter ${cleanChapterId}`);
      
      // Cache the result
      atHomeCache.set(cleanChapterId, {
        pages,
        timestamp: Date.now(),
      });
      
      return pages;
    } catch (error) {
      lastError = error;
      console.warn(`[MangaDex] Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  
  console.error('[MangaDex] All attempts failed:', lastError?.message);
  throw lastError || new Error('Failed to fetch chapter pages');
}

/**
 * Fetch chapter list directly from MangaDex API
 * @param {string} mangaId - Manga UUID
 * @param {Object} options - Options for filtering
 * @returns {Promise<Array>}
 */
export async function getChapters(mangaId, options = {}) {
  const cleanMangaId = extractMangaId(mangaId);
  const { page = 1, limit = 100, language = null } = options;
  
  try {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String((page - 1) * limit));
    params.append('order[chapter]', 'desc');
    params.append('order[volume]', 'desc');
    
    // Include all content ratings
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');
    params.append('contentRating[]', 'erotica');
    params.append('contentRating[]', 'pornographic');
    
    // Include scanlation group info
    params.append('includes[]', 'scanlation_group');
    
    // Filter by language if specified
    if (language) {
      params.append('translatedLanguage[]', language);
    }
    
    const response = await fetch(`${MANGADEX_API}/manga/${cleanMangaId}/feed?${params}`);
    if (!response.ok) {
      throw new Error(`Chapter list fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    const chapters = data?.data || [];
    
    return chapters.map(ch => {
      const group = ch.relationships?.find(r => r.type === 'scanlation_group');
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
        externalUrl: ch.attributes?.externalUrl || null,
        isExternal: !!ch.attributes?.externalUrl,
      };
    });
  } catch (error) {
    console.error('[MangaDex] Error fetching chapters:', error.message);
    return [];
  }
}

/**
 * Get manga details directly from MangaDex API
 * @param {string} mangaId - Manga UUID
 * @returns {Promise<Object|null>}
 */
export async function getMangaDetails(mangaId) {
  const cleanMangaId = extractMangaId(mangaId);
  
  try {
    const params = new URLSearchParams();
    params.append('includes[]', 'cover_art');
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');
    
    const response = await fetch(`${MANGADEX_API}/manga/${cleanMangaId}?${params}`);
    if (!response.ok) {
      throw new Error(`Manga details fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    const manga = data?.data;
    
    if (!manga) return null;
    
    const cover = manga.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName;
    const author = manga.relationships?.find(r => r.type === 'author')?.attributes?.name;
    const artist = manga.relationships?.find(r => r.type === 'artist')?.attributes?.name;
    const tags = manga.attributes?.tags || [];
    const isLongStrip = tags.some(t => t.attributes?.name?.en === 'Long Strip');
    
    const titles = manga.attributes?.title || {};
    const descriptions = manga.attributes?.description || {};
    
    // Proxy cover URL through backend
    const coverUrl = cover 
      ? proxyUrl(`https://uploads.mangadex.org/covers/${cleanMangaId}/${cover}`)
      : null;

    return {
      id: mangaId,
      sourceId: 'mangadex',
      slug: cleanMangaId,
      title: titles.en || titles['ja-ro'] || titles.ja || Object.values(titles)[0] || 'Unknown',
      description: descriptions.en || descriptions['en-us'] || Object.values(descriptions)[0] || '',
      coverUrl,
      status: manga.attributes?.status,
      contentRating: manga.attributes?.contentRating,
      author,
      artist,
      genres: tags.filter(t => t.attributes?.group === 'genre').map(t => t.attributes?.name?.en).filter(Boolean),
      tags: tags.map(t => t.attributes?.name?.en).filter(Boolean),
      year: manga.attributes?.year,
      isLongStrip,
    };
  } catch (error) {
    console.error('[MangaDex] Error fetching manga details:', error.message);
    return null;
  }
}

/**
 * Clear cached data
 */
export function clearCache() {
  atHomeCache.clear();
}

export default {
  getChapterPages,
  getChapters,
  getMangaDetails,
  extractChapterId,
  extractMangaId,
  clearCache,
};
