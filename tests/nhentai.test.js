/**
 * NHentai Source Test File
 * Tests the nhentai.to mirror integration
 * 
 * Run with: node tests/nhentai.test.js
 */

// Simple test runner without external dependencies
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return { name, fn };
}

async function runTests(tests) {
  console.log('\n🧪 NHentai Source Tests\n');
  console.log('=' .repeat(50));
  
  for (const t of tests) {
    try {
      await t.fn();
      results.passed++;
      results.tests.push({ name: t.name, status: 'PASS' });
      console.log(`✅ PASS: ${t.name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name: t.name, status: 'FAIL', error: error.message });
      console.log(`❌ FAIL: ${t.name}`);
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`   Total: ${results.passed + results.failed} tests\n`);
  
  return results;
}

// Mock logger for testing
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

// Create a test version of the source
class TestNHentaiSource {
  constructor() {
    this.name = 'nhentai';
    this.baseUrl = 'https://nhentai.xxx';
    this.adult = true;
    this.features = ['search', 'popular', 'latest', 'tags', 'doujinshi'];
    this.rateLimit = 1500;
    this.imageServer = 'https://i5.nhentaimg.com';
    this.thumbServer = 'https://i5.nhentaimg.com';
    this.lastRequest = 0;
    this.log = mockLogger;
  }

  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, Math.min(this.rateLimit - elapsed, 50)));
    }
    this.lastRequest = Date.now();
  }

  async fetch(url, options = {}) {
    await this.waitForRateLimit();
    
    const defaultOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }

  async fetchHtml(url, options = {}) {
    const response = await this.fetch(url, options);
    return response.text();
  }

  async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(this.baseUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeout);
      
      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query, options = {}) {
    const { limit = 24, page = 1 } = options;
    
    try {
      const url = `${this.baseUrl}/search/?q=${encodeURIComponent(query)}&page=${page}`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Search failed', { query, error: error.message });
      return [];
    }
  }

  async getPopular(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(`${this.baseUrl}/?sort=popular`);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get popular failed', { error: error.message });
      return [];
    }
  }

  async getLatest(options = {}) {
    const { limit = 24 } = options;
    
    try {
      const html = await this.fetchHtml(this.baseUrl);
      return this.parseGalleryList(html).slice(0, limit);
    } catch (error) {
      this.log.warn('Get latest failed', { error: error.message });
      return [];
    }
  }

  async getMangaDetails(mangaId) {
    try {
      const url = `${this.baseUrl}/g/${mangaId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryDetails(html, mangaId);
    } catch (error) {
      this.log.warn('Get details failed', { mangaId, error: error.message });
      throw error;
    }
  }

  async getChapterPages(galleryId) {
    try {
      const url = `${this.baseUrl}/g/${galleryId}/`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryPages(html, galleryId);
    } catch (error) {
      this.log.warn('Get pages failed', { galleryId, error: error.message });
      throw error;
    }
  }

  parseGalleryPages(html, galleryId) {
    const pages = [];
    
    // nhentai.xxx uses gt_th divs with thumbnail images
    const thumbRegex = /<a[^>]*href="\/g\/\d+\/(\d+)\/"[^>]*><img[^>]*data-src="([^"]*)"[^>]*>/gi;
    let match;
    
    while ((match = thumbRegex.exec(html)) !== null) {
      const pageNum = parseInt(match[1]);
      const thumbUrl = match[2];
      // Convert thumbnail URL to full image URL
      const fullUrl = thumbUrl.replace(/(\d+)t\.(jpg|png|gif|webp)$/, '$1.$2');
      pages.push({
        index: pageNum,
        url: fullUrl
      });
    }
    
    return pages.sort((a, b) => a.index - b.index);
  }

  parseGalleryList(html) {
    const results = [];
    
    // Match gallery_item containers for nhentai.xxx
    const galleryRegex = /<div[^>]*class="gallery_item"[^>]*>([\s\S]*?)<\/div>\s*<\/a>\s*<\/div>/gi;
    const linkRegex = /<a[^>]*href="\/g\/(\d+)\/"[^>]*(?:title="([^"]*)")?/i;
    const imgRegex = /<img[^>]*data-src="([^"]*)"[^>]*>/i;
    const captionRegex = /<div[^>]*class="caption"[^>]*>([^<]*)<\/div>/i;
    
    let match;
    while ((match = galleryRegex.exec(html)) !== null) {
      const content = match[1];
      const linkMatch = linkRegex.exec(content);
      const imgMatch = imgRegex.exec(content);
      const captionMatch = captionRegex.exec(content);
      
      if (linkMatch) {
        const id = linkMatch[1];
        let title = linkMatch[2] || (captionMatch ? captionMatch[1] : `Gallery ${id}`);
        title = this.decodeHtml(title.trim());
        let coverUrl = imgMatch ? imgMatch[1] : '';
        
        results.push({
          id,
          title,
          coverUrl,
          adult: true
        });
      }
    }
    
    return results;
  }

  parseGalleryDetails(html, galleryId) {
    // nhentai.xxx uses simple <h1> tag for title
    const titleMatch = /<h1>([^<]*)<\/h1>/i.exec(html);
    // Pages are in format: pages">41</span>
    const pagesMatch = /pages">(\d+)<\/span>/i.exec(html);
    // Cover image - look for main gallery image
    const coverMatch = /<img[^>]*class="[^"]*lazyload[^"]*"[^>]*data-src="([^"]*)"[^>]*>/i.exec(html);
    
    // Extract tags - nhentai.xxx uses tag_btn class
    const tags = [];
    const tagRegex = /<a[^>]*class='tag_btn[^']*'[^>]*href='\/tag\/([^']*)\/[^>]*>[\s\S]*?<span[^>]*class='tag_name'[^>]*>([^<]*)<\/span>/gi;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(html)) !== null) {
      tags.push(tagMatch[2].trim());
    }
    
    // Extract artists - nhentai.xxx uses artist path
    const artistMatch = /<a[^>]*href='\/artist\/[^']*'[^>]*>[\s\S]*?<span[^>]*class='tag_name'[^>]*>([^<]*)<\/span>/i.exec(html);
    
    return {
      id: galleryId,
      title: titleMatch ? this.decodeHtml(titleMatch[1].trim()) : `Gallery ${galleryId}`,
      coverUrl: coverMatch ? coverMatch[1] : '',
      author: artistMatch ? artistMatch[1].trim() : 'Unknown',
      artist: artistMatch ? artistMatch[1].trim() : 'Unknown',
      tags,
      pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
      adult: true
    };
  }

  decodeHtml(html) {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}

// Define tests
const tests = [
  test('Source configuration is correct', async () => {
    const source = new TestNHentaiSource();
    
    if (source.baseUrl !== 'https://nhentai.xxx') {
      throw new Error(`Expected baseUrl to be https://nhentai.xxx, got ${source.baseUrl}`);
    }
    if (source.imageServer !== 'https://i5.nhentaimg.com') {
      throw new Error(`Expected imageServer to be https://i5.nhentaimg.com, got ${source.imageServer}`);
    }
    if (!source.adult) {
      throw new Error('Expected adult flag to be true');
    }
  }),

  test('Can connect to nhentai.xxx', async () => {
    const source = new TestNHentaiSource();
    const connected = await source.checkConnectivity();
    
    if (!connected) {
      throw new Error('Failed to connect to nhentai.xxx - site may be down or blocked');
    }
  }),

  test('Can fetch latest galleries', async () => {
    const source = new TestNHentaiSource();
    const results = await source.getLatest({ limit: 5 });
    
    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array');
    }
    
    console.log(`   Found ${results.length} galleries`);
    
    if (results.length === 0) {
      throw new Error('No galleries found - parsing may have failed');
    }
    
    // Check first result has required fields
    const first = results[0];
    if (!first.id) throw new Error('Gallery missing id');
    if (!first.title) throw new Error('Gallery missing title');
    
    console.log(`   First gallery: ${first.title} (ID: ${first.id})`);
  }),

  test('Can search for galleries', async () => {
    const source = new TestNHentaiSource();
    const results = await source.search('english', { limit: 5 });
    
    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array');
    }
    
    console.log(`   Found ${results.length} search results`);
    
    if (results.length === 0) {
      // Search might return empty for some queries, this is a soft warning
      console.log('   ⚠️ Warning: No search results found (may be normal for this query)');
    }
  }),

  test('Can get gallery details', async () => {
    const source = new TestNHentaiSource();
    
    // First get a valid gallery ID from latest
    const latest = await source.getLatest({ limit: 1 });
    if (latest.length === 0) {
      throw new Error('Could not get a gallery ID to test details');
    }
    
    const galleryId = latest[0].id;
    console.log(`   Testing with gallery ID: ${galleryId}`);
    
    const details = await source.getMangaDetails(galleryId);
    
    if (!details) {
      throw new Error('No details returned');
    }
    if (!details.id) throw new Error('Details missing id');
    if (!details.title) throw new Error('Details missing title');
    
    console.log(`   Gallery: ${details.title}`);
    console.log(`   Pages: ${details.pages}`);
    console.log(`   Tags: ${details.tags.slice(0, 3).join(', ')}${details.tags.length > 3 ? '...' : ''}`);
  }),

  test('Image URLs use correct CDN', async () => {
    const source = new TestNHentaiSource();
    
    // Verify the CDN is configured correctly
    if (!source.imageServer.includes('nhentaimg.com')) {
      throw new Error(`Image server should use nhentaimg.com, got ${source.imageServer}`);
    }
  }),

  test('Old nhentai.net URLs are not used', async () => {
    const source = new TestNHentaiSource();
    
    if (source.baseUrl.includes('nhentai.net')) {
      throw new Error('baseUrl should not use nhentai.net (has Cloudflare protection)');
    }
    if (source.imageServer.includes('nhentai.net')) {
      throw new Error('imageServer should not use nhentai.net');
    }
  }),

  test('Can get chapter pages', async () => {
    const source = new TestNHentaiSource();
    
    // First get a valid gallery ID from latest
    const latest = await source.getLatest({ limit: 1 });
    if (latest.length === 0) {
      throw new Error('Could not get a gallery ID to test pages');
    }
    
    const galleryId = latest[0].id;
    console.log(`   Testing pages for gallery ID: ${galleryId}`);
    
    const pages = await source.getChapterPages(galleryId);
    
    if (!Array.isArray(pages)) {
      throw new Error('Expected pages to be an array');
    }
    
    if (pages.length === 0) {
      throw new Error('No pages found');
    }
    
    console.log(`   Found ${pages.length} pages`);
    
    // Check first page has required fields
    const firstPage = pages[0];
    if (!firstPage.index) throw new Error('Page missing index');
    if (!firstPage.url) throw new Error('Page missing url');
    
    // Verify URL format is correct (should be full image, not thumbnail)
    if (firstPage.url.includes('t.jpg') || firstPage.url.includes('t.png')) {
      throw new Error('Page URL appears to be thumbnail, not full image');
    }
    
    console.log(`   First page URL: ${firstPage.url}`);
  })
];

// Run tests
runTests(tests).then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
