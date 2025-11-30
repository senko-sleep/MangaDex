import axios from 'axios';

// Base scraper class
export class BaseScraper {
  constructor(name, baseUrl, isAdult = false) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.isAdult = isAdult;
    this.client = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/html,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
  }

  async fetchJson(url) {
    try {
      const res = await this.client.get(url);
      return res.data;
    } catch (e) {
      console.error(`[${this.name}] JSON fetch error:`, e.message);
      return null;
    }
  }

  // Override these in subclasses
  async search(query, page = 1, includeAdult = true) { return []; }
  async getPopular(page = 1, includeAdult = true) { return []; }
  async getLatest(page = 1, includeAdult = true) { return []; }
  async getMangaDetails(id) { return null; }
  async getChapters(mangaId) { return []; }
  async getChapterPages(chapterId) { return []; }
  async getTags() { return []; }
}

export default BaseScraper;
