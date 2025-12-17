import axios from 'axios';
import * as cheerio from 'cheerio';
import http from 'http';
import https from 'https';

// Shared connection agents for keep-alive (faster repeated requests)
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

// Base scraper class - optimized for speed
export class BaseScraper {
  constructor(name, baseUrl, isAdult = false) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.isAdult = isAdult;
    this.client = axios.create({
      timeout: 8000, // Fast timeout
      httpAgent,
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      decompress: true,
      maxRedirects: 3,
    });
  }

  async fetch(url) {
    try {
      const res = await this.client.get(url);
      return cheerio.load(res.data);
    } catch (e) {
      // Silent fail for speed
      return null;
    }
  }

  async fetchJson(url) {
    try {
      const res = await this.client.get(url);
      return res.data;
    } catch (e) {
      // Silent fail for speed
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
