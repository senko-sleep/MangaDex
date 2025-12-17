// Anilist GraphQL API for fetching manga cover images
const ANILIST_API = 'https://graphql.anilist.co';

// GraphQL query for searching manga by title
const SEARCH_MANGA_QUERY = `
query ($search: String) {
  Media(search: $search, type: MANGA) {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      medium
    }
    bannerImage
  }
}
`;

// Cache for Anilist results to avoid repeated API calls
const coverCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search Anilist for a manga and get its cover image
 * @param {string} title - Manga title to search for
 * @returns {Promise<{coverUrl: string|null, bannerUrl: string|null}>}
 */
export async function getAnilistCover(title) {
  if (!title) return { coverUrl: null, bannerUrl: null };
  
  // Check cache first
  const cacheKey = title.toLowerCase().trim();
  const cached = coverCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: SEARCH_MANGA_QUERY,
        variables: { search: title },
      }),
    });
    
    if (!response.ok) {
      console.warn('[Anilist] API error:', response.status);
      return { coverUrl: null, bannerUrl: null };
    }
    
    const data = await response.json();
    const media = data?.data?.Media;
    
    if (!media) {
      console.log('[Anilist] No results for:', title);
      return { coverUrl: null, bannerUrl: null };
    }
    
    const result = {
      coverUrl: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null,
      bannerUrl: media.bannerImage || null,
      anilistId: media.id,
      titles: media.title,
    };
    
    // Cache the result
    coverCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });
    
    return result;
  } catch (error) {
    console.error('[Anilist] Fetch error:', error.message);
    return { coverUrl: null, bannerUrl: null };
  }
}

// Default placeholder image for manga without covers
export const PLACEHOLDER_COVER = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.3" />
    </linearGradient>
  </defs>
  <rect width="300" height="450" fill="#18181b"/>
  <rect width="300" height="450" fill="url(#grad)"/>
  <g fill="#52525b" transform="translate(110, 180)">
    <path d="M40 10H8c-4.4 0-8 3.6-8 8v36c0 4.4 3.6 8 8 8h32c4.4 0 8-3.6 8-8V18c0-4.4-3.6-8-8-8zM8 14h32c2.2 0 4 1.8 4 4v24l-10-12-8 10-6-8-12 14V18c0-2.2 1.8-4 4-4z"/>
  </g>
  <text x="150" y="270" fill="#52525b" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle">No Cover Available</text>
</svg>
`);

export default {
  getAnilistCover,
  PLACEHOLDER_COVER,
};
