import axios from 'axios';
import * as cheerio from 'cheerio';

// Cloudflare bypass using Playwright - lazily imported to avoid overhead
let playwrightModule = null;
let browser = null;
let cfCookies = null;
let cfCookiesExpiry = 0;

async function getPlaywright() {
  if (!playwrightModule) {
    playwrightModule = await import('playwright');
  }
  return playwrightModule;
}

function isCloudflareChallenge(html) {
  if (!html || typeof html !== 'string') return false;
  return html.includes('Just a moment') ||
         html.includes('cf-browser-verification') ||
         html.includes('Cloudflare') ||
         html.includes('_cf_chl') ||
         html.includes('challenges.cloudflare.com');
}

// Base scraper class - optimized for speed with Cloudflare bypass
export class BaseScraper {
  constructor(name, baseUrl, isAdult = false) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.isAdult = isAdult;
    this.lastRequest = 0;
    this.rateLimit = 200;
    // Keep axios client for scrapers that use it directly for JSON/API calls
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
    });
  }

  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimit - elapsed));
    }
    this.lastRequest = Date.now();
  }

  // Detect if a response indicates a Cloudflare challenge
  isCloudflare(html) {
    return isCloudflareChallenge(html);
  }

  // Fetch HTML using Playwright to bypass Cloudflare
  async fetchWithPlaywright(url) {
    const pw = await getPlaywright();
    let ctx = null;

    try {
      if (!browser || !browser.isConnected()) {
        browser = await pw.chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationDetected',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--disable-features=BlockInsecurePrivateNetworkRequests',
          ],
        });
      }

      const contextOptions = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        javaScriptEnabled: true,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        permissions: ['geolocation'],
        geolocation: { latitude: 40.7128, longitude: -74.0060 }, // NYC
      };

      // Try using cached Cloudflare cookies
      if (cfCookies && Date.now() < cfCookiesExpiry) {
        contextOptions.storageState = { cookies: cfCookies, origins: [] };
      }

      ctx = await browser.newContext(contextOptions);

      // Enhanced anti-detection
      await ctx.addInitScript(() => {
        // Hide webdriver property
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        
        // Mock chrome object
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
        
        // Mock plugins
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        
        // Mock languages
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        
        // Mock permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        
        // Mock screen
        Object.defineProperty(screen, 'availHeight', { get: () => 1080 });
        Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
        
        // Mock connection
        Object.defineProperty(navigator, 'connection', {
          get: () => ({
            effectiveType: '4g',
            rtt: 100,
            downlink: 10,
            saveData: false
          })
        });
      });

      const page = await ctx.newPage();
      
      // Set extra headers to look more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Ch-Ua-Platform-Version': '"15.0.0"',
        'Cache-Control': 'max-age=0',
      });

      // Navigate with wait for network idle to ensure Cloudflare challenge completes
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 45000,
      });

      // Wait for Cloudflare JS challenge to solve
      await new Promise(r => setTimeout(r, 3000));

      let html = await page.content();

      // Check if we're still on Cloudflare challenge page
      if (isCloudflareChallenge(html)) {
        console.log(`[${this.name}] Cloudflare still blocking after initial wait, extending wait...`);
        await new Promise(r => setTimeout(r, 15000));
        html = await page.content();
      }

      // Final check
      if (isCloudflareChallenge(html)) {
        console.error(`[${this.name}] Playwright still blocked by Cloudflare for ${url}`);
        throw new Error('Cloudflare challenge not solved');
      }

      // Cache cookies for future requests
      const cookies = await ctx.cookies();
      if (cookies.length > 0) {
        cfCookies = cookies;
        cfCookiesExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
        console.log(`[${this.name}] Cached ${cookies.length} Cloudflare bypass cookies`);
      }

      return html;
    } catch (e) {
      throw e;
    } finally {
      if (ctx) await ctx.close();
    }
  }

  // Core HTTP fetch using Playwright as primary method - returns HTML text
  async fetchHtml(url, options = {}) {
    await this.waitForRateLimit();

    // Skip Playwright for Hentaiera (too slow and unreliable)
    if (this.name === 'Hentaiera') {
      return this.fetchWithNativeFetch(url, options);
    }

    // Use Playwright as primary method for all other scrapers
    try {
      console.log(`[${this.name}] Using Playwright for: ${url}`);
      const body = await this.fetchWithPlaywright(url);
      if (isCloudflareChallenge(body)) {
        throw new Error('Cloudflare challenge not solved by Playwright');
      }
      return body;
    } catch (pwError) {
      console.warn(`[${this.name}] Playwright failed (${pwError.message}), trying native fetch: ${url}`);
      try {
        return await this.fetchWithNativeFetch(url, options);
      } catch (nativeError) {
        console.error(`[${this.name}] Both Playwright and native fetch failed`);
        throw pwError;
      }
    }
  }

  // Native fetch fallback (original method)
  async fetchWithNativeFetch(url, options = {}) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const body = await response.text();

      // Check for Cloudflare challenge even on 200 responses
      if (isCloudflareChallenge(body)) {
        throw new Error('Cloudflare challenge - need Playwright');
      }

      return body;
    } catch (error) {
      throw error;
    }
  }

  // Legacy fetch method - returns cheerio $ function for backward compatibility
  async fetch(url, options = {}) {
    try {
      const html = await this.fetchHtml(url, options);
      return cheerio.load(html);
    } catch (e) {
      console.error(`[${this.name}] Fetch failed: ${url}`, { error: e.message });
      return null;
    }
  }

  // HTTP HEAD request - returns status code
  async head(url, options = {}) {
    await this.waitForRateLimit();

    // Skip Playwright for Hentaiera
    if (this.name === 'Hentaiera') {
      return this.headWithNativeFetch(url, options);
    }

    // Use Playwright as primary method
    try {
      console.log(`[${this.name}] Using Playwright for HEAD: ${url}`);
      await this.fetchWithPlaywright(url);
      return { status: 200 };
    } catch (pwError) {
      console.warn(`[${this.name}] Playwright HEAD failed (${pwError.message}), trying native fetch: ${url}`);
      try {
        return await this.headWithNativeFetch(url, options);
      } catch (nativeError) {
        console.error(`[${this.name}] Both Playwright and native HEAD failed`);
        throw pwError;
      }
    }
  }

  // Native HEAD fallback
  async headWithNativeFetch(url, options = {}) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': this.baseUrl + '/',
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { method: 'HEAD', headers });
      return { status: response.status };
    } catch (error) {
      throw error;
    }
  }

  // Fetch JSON
  async fetchJson(url) {
    await this.waitForRateLimit();
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json,*/*',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error(`[${this.name}] fetchJson failed: ${url}`, { error: e.message });
      return null;
    }
  }

  // Check connectivity
  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok && !isCloudflareChallenge(await response.text());
    } catch {
      return false;
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
