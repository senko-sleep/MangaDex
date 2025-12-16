// API base URL - uses environment variable in production, empty for local development
export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to build API URLs
export function apiUrl(path) {
  return `${API_URL}${path}`;
}

const _getJsonCache = new Map();
const _getJsonInFlight = new Map();

export async function getJsonCached(path, { ttlMs = 60_000 } = {}) {
  const url = apiUrl(path);
  const now = Date.now();

  const cached = _getJsonCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inFlight = _getJsonInFlight.get(url);
  if (inFlight) {
    return inFlight;
  }

  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    })
    .then((data) => {
      _getJsonCache.set(url, { data, expiresAt: now + ttlMs });
      return data;
    })
    .finally(() => {
      _getJsonInFlight.delete(url);
    });

  _getJsonInFlight.set(url, promise);
  return promise;
}
