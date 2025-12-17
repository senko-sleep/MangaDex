/**
 * Bato.to Source
 * Large manga library with multiple languages
 */

import BaseSource from './base';

class BatoSource extends BaseSource {
  constructor() {
    super({
      name: 'Bato.to',
      baseUrl: 'https://bato.to',
      adult: false,
      features: ['search', 'popular', 'latest', 'language-filter', 'status-filter'],
      rateLimit: 1000
    });
  }

  formatManga(item) {
    return {
      id: `bato:${item.id || item.slug}`,
      title: item.title || item.name || 'Unknown',
      cover: item.cover || item.image || null,
      description: item.description || item.synopsis || '',
      status: item.status || 'unknown',
      genres: item.genres || [],
      sourceId: 'bato'
    };
  }

  async search(query, options = {}) {
    const { limit = 24, page = 1, language = 'en', status = null } = options;
    
    try {
      if (!query) {
        return this.getPopular(options);
      }

      const params = new URLSearchParams();
      params.set('word', query);
      params.set('page', String(page));
      params.set('langs', language);
      
      if (status) {
        const statusMap = {
          'ongoing': 'ongoing',
          'completed': 'completed',
          'hiatus': 'hiatus',
          'cancelled': 'cancelled',
        };
        if (statusMap[status]) {
          params.set('release', statusMap[status]);
        }
      }
      
      const url = `${this.baseUrl}/v3x-search?${params}`;
      const html = await this.fetchHtml(url);
      
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24, page = 1, language = 'en' } = options;
    
    try {
      const url = `${this.baseUrl}/v3x-search?langs=${language}&sort=views_a&page=${page}`;
      const html = await this.fetchHtml(url);
      
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24, page = 1, language = 'en' } = options;
    
    try {
      const url = `${this.baseUrl}/v3x-search?langs=${language}&sort=create&page=${page}`;
      const html = await this.fetchHtml(url);
      
      return this.parseSearchResults(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  parseSearchResults(html) {
    const results = [];
    
    try {
      // Try to parse JSON response first (Bato might return JSON)
      const jsonMatch = html.match(/<script[^>]*>(.+?)<\/script>/s);
      if (jsonMatch) {
        try {
          const scriptContent = jsonMatch[1];
          // Look for data patterns in script
          const dataMatch = scriptContent.match(/\{[\s\S]*"title"[\s\S]*?\}/g);
          if (dataMatch) {
            for (const jsonStr of dataMatch) {
              try {
                const item = JSON.parse(jsonStr);
                if (item.title) {
                  results.push(this.formatManga(item));
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        } catch (e) {
          // Continue to HTML parsing
        }
      }
      
      // Fallback: Parse HTML structure
      if (results.length === 0) {
        // Look for manga items in common patterns
        const itemRegex = /<div[^>]*class="[^"]*manga-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
        let match;
        
        while ((match = itemRegex.exec(html)) !== null) {
          const itemHtml = match[1];
          
          // Extract title
          const titleMatch = itemHtml.match(/<[ah][^>]*title="([^"]*)"/) || 
                           itemHtml.match(/<a[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/);
          const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
          
          // Extract cover image
          const imgMatch = itemHtml.match(/<img[^>]*src="([^"]*)"[^>]*>/);
          const cover = imgMatch ? imgMatch[1] : null;
          
          // Extract ID from href
          const idMatch = itemHtml.match(/<a[^>]*href="\/title\/([^/"]*)/);
          const id = idMatch ? idMatch[1] : Math.random().toString();
          
          results.push({
            id: `bato:${id}`,
            title,
            cover,
            sourceId: 'bato'
          });
        }
      }
    } catch (error) {
      this.log.warn('Parse error', { error: error.message });
    }
    
    return results;
  }

  async getMangaDetails(mangaId) {
    try {
      const id = mangaId.replace('bato:', '');
      const url = `${this.baseUrl}/title/${id}`;
      
      const html = await this.fetchHtml(url);
      
      // Parse title
      const titleMatch = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
      
      // Parse description
      const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      // Parse cover
      const coverMatch = html.match(/<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]*)"/);
      const cover = coverMatch ? coverMatch[1] : null;
      
      return {
        id: mangaId,
        title,
        description,
        cover,
        sourceId: 'bato'
      };
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async checkConnectivity() {
    try {
      const response = await this.fetch(this.baseUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default new BatoSource();
