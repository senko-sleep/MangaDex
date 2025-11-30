// Utility to proxy cover URLs through our backend to bypass hotlink protection

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Wraps a MangaDex image URL in our proxy to bypass hotlink protection
 */
export function normalizeCoverUrl(url) {
  if (!url) return null;
  
  // Already proxied
  if (url.includes('/api/proxy/image?url=')) {
    return url;
  }
  
  // Fix wrong domain: mangadex.org/covers -> uploads.mangadex.org/covers
  if (url.includes('mangadex.org/covers/') && !url.includes('uploads.mangadex.org')) {
    url = url.replace('mangadex.org/covers/', 'uploads.mangadex.org/covers/');
  }
  
  // Ensure it uses uploads.mangadex.org for covers
  if (url.includes('/covers/') && !url.startsWith('https://uploads.mangadex.org')) {
    const match = url.match(/covers\/([a-f0-9-]+)\/([^?]+)/);
    if (match) {
      const [, mangaId, filename] = match;
      url = `https://uploads.mangadex.org/covers/${mangaId}/${filename}`;
    }
  }
  
  // Proxy all MangaDex CDN URLs to bypass hotlink protection
  if (url.includes('mangadex.org') || url.includes('cmdxd98sb0x3yprd.mangadex.network')) {
    return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
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
