// Utility to normalize cover URLs to always use MangaDex CDN directly

/**
 * Extracts and normalizes cover URL to use MangaDex CDN directly
 * Handles proxy URLs, wrong domains, etc.
 */
export function normalizeCoverUrl(url) {
  if (!url) return null;
  
  // If it's a proxy URL, extract the original URL
  if (url.includes('/api/proxy/image?url=')) {
    try {
      const match = url.match(/[?&]url=([^&]+)/);
      if (match) {
        url = decodeURIComponent(match[1]);
      }
    } catch (e) {
      // Continue with original URL
    }
  }
  
  // Fix wrong domain: mangadex.org/covers -> uploads.mangadex.org/covers
  if (url.includes('mangadex.org/covers/') && !url.includes('uploads.mangadex.org')) {
    url = url.replace('mangadex.org/covers/', 'uploads.mangadex.org/covers/');
  }
  
  // Ensure it uses uploads.mangadex.org for covers
  if (url.includes('/covers/') && !url.startsWith('https://uploads.mangadex.org')) {
    // Extract manga ID and filename from URL
    const match = url.match(/covers\/([a-f0-9-]+)\/([^?]+)/);
    if (match) {
      const [, mangaId, filename] = match;
      url = `https://uploads.mangadex.org/covers/${mangaId}/${filename}`;
    }
  }
  
  return url;
}

/**
 * Get cover URL with fallback
 */
export function getCoverUrl(manga) {
  const url = manga?.coverUrl || manga?.thumbnail || manga?.cover;
  return normalizeCoverUrl(url);
}
