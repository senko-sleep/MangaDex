// API base URL - uses environment variable in production, empty for local development
export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to build API URLs
export function apiUrl(path) {
  return `${API_URL}${path}`;
}
