import BaseScraper from './base.js';
import { chromium } from 'playwright';

// API base URL for proxy (set via environment variable in production)
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// Browser instance management - reuse browser across requests
let browserInstance = null;
let browserLastUsed = 0;
const BROWSER_TIMEOUT = 5 * 60 * 1000; // Close browser after 5 minutes of inactivity

async function getBrowser() {
  const now = Date.now();
  
  if (browserInstance && browserInstance.isConnected()) {
    browserLastUsed = now;
    return browserInstance;
  }
  
  console.log('[Hitomi] Launching headless browser...');
  browserInstance = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  browserLastUsed = now;
  
  // Auto-close browser after inactivity
  setInterval(async () => {
    if (browserInstance && Date.now() - browserLastUsed > BROWSER_TIMEOUT) {
      console.log('[Hitomi] Closing idle browser...');
      await browserInstance.close().catch(() => {});
      browserInstance = null;
    }
  }, 60000);
  
  return browserInstance;
}

// Hitomi.la - Adult content
// Uses Playwright for headless browser rendering
export class HitomiScraper extends BaseScraper {
  constructor() {
    super('Hitomi', 'https://hitomi.la', true);
  }

  // Helper to create proxy URL
  proxyUrl(url) {
    if (!url) return '';
    const base = API_BASE || '';
    return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  async fetchWithBrowser(url, waitSelector = '.gallery-content', timeout = 30000) {
    let context = null;
    let page = null;
    
    try {
      const browser = await getBrowser();
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });
      page = await context.newPage();
      
      // Block images/media for speed but allow scripts
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'media', 'font'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      console.log(`[Hitomi] Fetching: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout });
      
      // Wait for initial content
      try {
        await page.waitForSelector(waitSelector, { timeout: 10000 });
      } catch {
        // Content might already be there
      }
      
      // Wait longer for JS to fully render all gallery items
      // Hitomi loads galleries dynamically via JavaScript
      await page.waitForTimeout(3000);
      
      // Scroll down to trigger lazy loading of more items
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1500);
      
      const html = await page.content();
      return html;
    } catch (e) {
      console.error('[Hitomi] Browser fetch error:', e.message);
      return null;
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  }

  parseGalleryListFromHtml(html) {
    const results = [];
    if (!html) return results;
    
    const seen = new Set();
    
    // Method 1: Match gallery links with lillie class (can be before or after href)
    // Hitomi structure varies: class="lillie" can appear before or after href
    const galleryRegex1 = /<a[^>]*(?:class="[^"]*lillie[^"]*"[^>]*href="(\/(?:doujinshi|manga|artistcg|gamecg|anime|imageset)\/[^"]+\.html)"|href="(\/(?:doujinshi|manga|artistcg|gamecg|anime|imageset)\/[^"]+\.html)"[^>]*class="[^"]*lillie[^"]*")[^>]*>([\s\S]*?)<\/a>/gi;
    
    let match;
    while ((match = galleryRegex1.exec(html)) !== null) {
      const href = match[1] || match[2];
      const content = match[3];
      
      const idMatch = href.match(/-(\d+)\.html$/);
      if (!idMatch) continue;
      
      const gid = idMatch[1];
      if (seen.has(gid)) continue;
      seen.add(gid);
      
      let type = 'doujinshi';
      if (href.includes('/manga/')) type = 'manga';
      else if (href.includes('/artistcg/')) type = 'artistcg';
      else if (href.includes('/gamecg/')) type = 'gamecg';
      else if (href.includes('/anime/')) type = 'anime';
      else if (href.includes('/imageset/')) type = 'imageset';
      
      // Extract title - try multiple patterns
      let title = '';
      const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                         content.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/i);
      if (titleMatch) title = titleMatch[1].trim();
      
      if (!title || title.length < 2) {
        const urlTitleMatch = href.match(/\/[^/]+\/(.+)-\d+\.html$/);
        if (urlTitleMatch) {
          title = urlTitleMatch[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
          title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        } else {
          title = `Gallery ${gid}`;
        }
      }
      
      const imgMatch = content.match(/(?:data-src|src)="([^"]*(?:\.webp|\.jpg|\.png|\.avif)[^"]*)"/i);
      let cover = imgMatch ? imgMatch[1] : '';
      if (cover.startsWith('//')) cover = 'https:' + cover;
      
      results.push({
        id: `hitomi:${gid}`,
        sourceId: 'hitomi',
        slug: gid,
        title,
        cover: this.proxyUrl(cover),
        type,
        isAdult: true,
        contentType: type,
      });
    }
    
    // Method 2: Fallback - find all gallery links by URL pattern
    const hrefRegex = /href="(\/(?:doujinshi|manga|artistcg|gamecg|anime|imageset)\/[^"]*-(\d+)\.html)"/gi;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      const gid = match[2];
      
      if (seen.has(gid)) continue;
      seen.add(gid);
      
      let type = 'doujinshi';
      if (href.includes('/manga/')) type = 'manga';
      else if (href.includes('/artistcg/')) type = 'artistcg';
      else if (href.includes('/gamecg/')) type = 'gamecg';
      else if (href.includes('/anime/')) type = 'anime';
      else if (href.includes('/imageset/')) type = 'imageset';
      
      // Extract title from URL
      const urlTitleMatch = href.match(/\/[^/]+\/(.+)-\d+\.html$/);
      let title = `Gallery ${gid}`;
      if (urlTitleMatch) {
        title = urlTitleMatch[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      
      // Try to find cover image near this link
      const surroundingHtml = html.substring(Math.max(0, match.index - 500), match.index + 500);
      const imgMatch = surroundingHtml.match(/(?:data-src|src)="([^"]*(?:tn\.hitomi\.la|smalltn|bigtn)[^"]*\.(?:webp|jpg|png|avif)[^"]*)"/i);
      let cover = imgMatch ? imgMatch[1] : '';
      if (cover.startsWith('//')) cover = 'https:' + cover;
      
      results.push({
        id: `hitomi:${gid}`,
        sourceId: 'hitomi',
        slug: gid,
        title,
        cover: this.proxyUrl(cover),
        type,
        isAdult: true,
        contentType: type,
      });
    }
    
    console.log(`[Hitomi] Parsed ${results.length} galleries from HTML`);
    return results;
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      // Build search URL
      let searchUrl = `${this.baseUrl}/search.html?${encodeURIComponent(query || '')}`;
      
      // Add language filter
      if (language && language !== 'all') {
        if (query) {
          searchUrl = `${this.baseUrl}/search.html?${encodeURIComponent(query + ' language:' + language)}`;
        } else {
          searchUrl = `${this.baseUrl}/index-${language}.html`;
        }
      }
      
      // Add page
      if (page > 1) {
        if (searchUrl.includes('search.html')) {
          searchUrl = searchUrl.replace('.html', `-${page}.html`);
        } else {
          searchUrl = searchUrl.replace('.html', `-${page}.html`);
        }
      }
      
      const html = await this.fetchWithBrowser(searchUrl);
      if (!html) return [];
      
      return this.parseGalleryListFromHtml(html);
    } catch (e) {
      console.error('[Hitomi] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      // Hitomi popular page - uses week/month for more results
      // today has fewer, week/month have more sorted by popularity
      const period = 'week'; // 'today', 'week', 'month', 'year'
      const lang = (language && language !== 'all') ? language : 'all';
      
      // URL format: /popular/week-all.html or /popular/week-all-2.html for page 2
      let url = `${this.baseUrl}/popular/${period}-${lang}.html`;
      
      // Add page number (Hitomi uses 1-indexed pages in URL)
      if (page > 1) {
        url = url.replace('.html', `-${page}.html`);
      }
      
      console.log(`[Hitomi] Fetching popular page ${page}: ${url}`);
      const html = await this.fetchWithBrowser(url, '.gallery-content', 20000);
      if (!html) return [];
      
      const results = this.parseGalleryListFromHtml(html);
      console.log(`[Hitomi] Got ${results.length} results from popular page ${page}`);
      return results;
    } catch (e) {
      console.error('[Hitomi] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true, tags = [], excludeTags = [], language = null) {
    try {
      // Hitomi index page (latest uploads)
      const lang = (language && language !== 'all') ? language : 'all';
      
      // URL format: /index-all.html or /index-all-2.html for page 2
      let url = `${this.baseUrl}/index-${lang}.html`;
      
      // Add page number
      if (page > 1) {
        url = url.replace('.html', `-${page}.html`);
      }
      
      console.log(`[Hitomi] Fetching latest page ${page}: ${url}`);
      const html = await this.fetchWithBrowser(url, '.gallery-content', 20000);
      if (!html) return [];
      
      const results = this.parseGalleryListFromHtml(html);
      console.log(`[Hitomi] Got ${results.length} results from latest page ${page}`);
      return results;
    } catch (e) {
      console.error('[Hitomi] Latest error:', e.message);
      return [];
    }
  }

  async getMangaDetails(id) {
    const gid = id.replace('hitomi:', '');
    
    try {
      // Try to find the gallery page - we need to search for it
      const types = ['doujinshi', 'manga', 'artistcg', 'gamecg', 'anime'];
      let html = null;
      let foundType = 'doujinshi';
      
      // First try reader page which has consistent URL
      html = await this.fetchWithBrowser(`${this.baseUrl}/reader/${gid}.html`, '.img-url', 20000);
      
      if (!html) {
        // Try gallery pages
        for (const type of types) {
          // We don't know the full URL, so search for it
          const searchHtml = await this.fetchWithBrowser(
            `${this.baseUrl}/search.html?${gid}`,
            '.gallery-content',
            20000
          );
          if (searchHtml && searchHtml.includes(`-${gid}.html`)) {
            // Found it, extract the full URL
            const urlMatch = searchHtml.match(new RegExp(`href="(/[^"]*-${gid}\\.html)"`));
            if (urlMatch) {
              html = await this.fetchWithBrowser(`${this.baseUrl}${urlMatch[1]}`, '.dj-content', 20000);
              if (html) {
                foundType = urlMatch[1].split('/')[1] || 'doujinshi';
                break;
              }
            }
          }
        }
      }
      
      if (!html) return null;
      
      // Parse title
      const titleMatch = html.match(/<h1[^>]*>(?:<a[^>]*>)?([^<]+)/i);
      const title = titleMatch ? titleMatch[1].trim() : `Gallery ${gid}`;
      
      // Parse cover
      const coverMatch = html.match(/(?:data-src|src)="([^"]*(?:tn\.hitomi\.la|bigtn)[^"]*)"/i);
      let cover = coverMatch ? coverMatch[1] : '';
      if (cover.startsWith('//')) cover = 'https:' + cover;
      
      // Parse metadata from dj-content table
      const tags = [];
      const artists = [];
      const groups = [];
      const parodies = [];
      const characters = [];
      let language = 'japanese';
      
      // Extract table rows
      const tableMatch = html.match(/<table[^>]*class="[^"]*dj-desc[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        for (const row of rows) {
          const labelMatch = row.match(/<td[^>]*>([^<]+)/i);
          const label = labelMatch ? labelMatch[1].toLowerCase().trim() : '';
          
          const valueMatches = row.match(/<a[^>]*>([^<]+)<\/a>/gi) || [];
          const values = valueMatches.map(m => m.replace(/<[^>]+>/g, '').trim());
          
          if (label.includes('artist')) artists.push(...values);
          else if (label.includes('group')) groups.push(...values);
          else if (label.includes('series') || label.includes('parody')) parodies.push(...values);
          else if (label.includes('character')) characters.push(...values);
          else if (label.includes('tag')) tags.push(...values);
          else if (label.includes('language')) language = values[0]?.toLowerCase() || 'japanese';
        }
      }
      
      // Get page count from thumbnail list or reader
      const pageCountMatch = html.match(/(\d+)\s*(?:pages?|images?)/i);
      const pageCount = pageCountMatch ? parseInt(pageCountMatch[1]) : 0;

      return {
        id,
        sourceId: 'hitomi',
        slug: gid,
        title,
        cover: this.proxyUrl(cover),
        tags,
        artists,
        groups,
        parodies,
        characters,
        language,
        pageCount,
        type: foundType,
        isAdult: true,
        isLongStrip: false,
      };
    } catch (e) {
      console.error('[Hitomi] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const gid = mangaId.replace('hitomi:', '');
    return [{
      id: gid,
      mangaId,
      chapter: '1',
      title: 'Full Gallery',
      sourceId: 'hitomi',
    }];
  }

  async getChapterPages(chapterId, mangaId) {
    const gid = mangaId.replace('hitomi:', '');
    
    try {
      // Get the reader page with Playwright
      const html = await this.fetchWithBrowser(`${this.baseUrl}/reader/${gid}.html`, '.img-url', 30000);
      
      if (!html) {
        console.log(`[Hitomi] Could not load reader for gallery ${gid}`);
        return [];
      }
      
      const pages = [];
      
      // Hitomi reader stores image URLs in JavaScript
      // Look for the galleryinfo variable or image URLs in the page
      
      // Method 1: Extract from img-url divs (reader page)
      const imgUrlRegex = /class="img-url"[^>]*>([^<]+)</gi;
      let match;
      while ((match = imgUrlRegex.exec(html)) !== null) {
        let src = match[1].trim();
        if (src.startsWith('//')) src = 'https:' + src;
        if (src && src.match(/\.(jpg|jpeg|png|gif|webp|avif)/i)) {
          pages.push({
            page: pages.length + 1,
            url: this.proxyUrl(src),
            originalUrl: src,
          });
        }
      }
      
      // Method 2: Extract from galleryinfo JavaScript variable
      if (pages.length === 0) {
        const galleryInfoMatch = html.match(/var\s+galleryinfo\s*=\s*(\{[\s\S]*?\});/);
        if (galleryInfoMatch) {
          try {
            const info = JSON.parse(galleryInfoMatch[1]);
            if (info.files && Array.isArray(info.files)) {
              for (let i = 0; i < info.files.length; i++) {
                const file = info.files[i];
                const hash = file.hash;
                const haswebp = file.haswebp;
                const hasavif = file.hasavif;
                
                // Determine extension
                let ext = 'webp';
                if (hasavif) ext = 'avif';
                else if (haswebp) ext = 'webp';
                else if (file.name) {
                  const extMatch = file.name.match(/\.(\w+)$/);
                  if (extMatch) ext = extMatch[1];
                }
                
                // Build image URL using Hitomi's subdomain system
                const hashDir = hash.slice(-1) + '/' + hash.slice(-3, -1);
                
                // Determine subdomain
                let subdomain = 'a';
                const g = parseInt(hash.slice(-3, -1), 16);
                if (!isNaN(g)) {
                  subdomain = String.fromCharCode(97 + (g % 3));
                }
                
                const imageUrl = `https://${subdomain}a.hitomi.la/${ext}/${hashDir}/${hash}.${ext}`;
                
                pages.push({
                  page: i + 1,
                  url: this.proxyUrl(imageUrl),
                  originalUrl: imageUrl,
                });
              }
            }
          } catch (e) {
            console.error('[Hitomi] Failed to parse galleryinfo:', e.message);
          }
        }
      }
      
      // Method 3: Extract from thumbnail images and convert to full size
      if (pages.length === 0) {
        const thumbRegex = /(?:data-src|src)="([^"]*(?:tn\.hitomi\.la|smalltn|bigtn)[^"]*)"/gi;
        while ((match = thumbRegex.exec(html)) !== null) {
          let src = match[1];
          if (src.startsWith('//')) src = 'https:' + src;
          
          // Convert thumbnail to full image
          // tn.hitomi.la/smalltn/hash/hash/hash.jpg -> aa.hitomi.la/webp/hash/hash/hash.webp
          if (src.includes('smalltn') || src.includes('bigtn')) {
            // Extract hash from thumbnail URL
            const hashMatch = src.match(/\/([0-9a-f]{64})\./i);
            if (hashMatch) {
              const hash = hashMatch[1];
              const hashDir = hash.slice(-1) + '/' + hash.slice(-3, -1);
              const g = parseInt(hash.slice(-3, -1), 16);
              const subdomain = String.fromCharCode(97 + (g % 3));
              src = `https://${subdomain}a.hitomi.la/webp/${hashDir}/${hash}.webp`;
            }
          }
          
          if (src.match(/\.(jpg|jpeg|png|gif|webp|avif)/i)) {
            pages.push({
              page: pages.length + 1,
              url: this.proxyUrl(src),
              originalUrl: src,
            });
          }
        }
      }

      console.log(`[Hitomi] Found ${pages.length} pages for gallery ${gid}`);
      return pages;
    } catch (e) {
      console.error('[Hitomi] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    return [
      'big breasts', 'sole female', 'sole male', 'translated', 'stockings',
      'schoolgirl uniform', 'glasses', 'full color', 'anal', 'nakadashi',
      'blowjob', 'paizuri', 'ahegao', 'femdom', 'group', 'incest'
    ];
  }
}

export default HitomiScraper;
