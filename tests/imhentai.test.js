/**
 * IMHentai Source Test File
 * Tests the imhentai.xxx integration
 * 
 * Run with: node tests/imhentai.test.js
 */

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return { name, fn };
}

async function runTests(tests) {
  console.log('\n🧪 IMHentai Source Tests\n');
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

// Mock logger
const mockLogger = {
  info: () => {},
  warn: (...args) => console.log('   [WARN]', ...args),
  error: () => {},
  debug: () => {}
};

// Test IMHentai scraper
class TestIMHentaiScraper {
  constructor() {
    this.name = 'IMHentai';
    this.baseUrl = 'https://imhentai.xxx';
    this.isAdult = true;
    this.imageServer = 'https://m1.imhentai.xxx';
    this.log = mockLogger;
  }

  async fetchHtml(url) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  }

  async checkConnectivity() {
    try {
      const response = await fetch(this.baseUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  parseGalleryList(html) {
    const results = [];
    
    // Match thumb divs - IMHentai structure
    const thumbRegex = /<div[^>]*class="thumb"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    const linkRegex = /<a[^>]*href="\/gallery\/(\d+)\/"[^>]*>/i;
    const imgRegex = /<img[^>]*data-src="([^"]*)"[^>]*>/i;
    const titleRegex = /<h2[^>]*class="gallery_title"[^>]*><a[^>]*>([^<]*)<\/a><\/h2>/i;
    const categoryRegex = /class="thumb_cat"[^>]*>([^<]*)<\/a>/i;
    
    let match;
    while ((match = thumbRegex.exec(html)) !== null) {
      const content = match[1];
      const linkMatch = linkRegex.exec(content);
      const imgMatch = imgRegex.exec(content);
      const titleMatch = titleRegex.exec(content);
      const catMatch = categoryRegex.exec(content);
      
      if (linkMatch) {
        const id = linkMatch[1];
        const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : `Gallery ${id}`;
        const coverUrl = imgMatch ? imgMatch[1] : '';
        const category = catMatch ? catMatch[1].toLowerCase() : 'doujinshi';
        
        results.push({
          id: `imhentai:${id}`,
          sourceId: 'imhentai',
          slug: id,
          title,
          cover: coverUrl ? `/api/proxy/image?url=${encodeURIComponent(coverUrl)}` : '',
          category,
          isAdult: true,
        });
      }
    }
    return results;
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/search/?key=${encodeURIComponent(query)}&page=${page}`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryList(html);
    } catch (e) {
      console.error('[IMHentai] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1) {
    try {
      const url = `${this.baseUrl}/popular/?page=${page}`;
      const html = await this.fetchHtml(url);
      return this.parseGalleryList(html);
    } catch (e) {
      console.error('[IMHentai] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1) {
    try {
      const url = page > 1 ? `${this.baseUrl}/?page=${page}` : this.baseUrl;
      const html = await this.fetchHtml(url);
      return this.parseGalleryList(html);
    } catch (e) {
      console.error('[IMHentai] Latest error:', e.message);
      return [];
    }
  }

  async getMangaDetails(id) {
    const galleryId = id.replace('imhentai:', '');
    
    try {
      const url = `${this.baseUrl}/gallery/${galleryId}/`;
      const html = await this.fetchHtml(url);
      
      // Parse title
      const titleMatch = /<h1[^>]*>([^<]*)<\/h1>/i.exec(html);
      const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : `Gallery ${galleryId}`;
      
      // Parse pages
      const pagesMatch = /(\d+)\s*Pages/i.exec(html);
      const pageCount = pagesMatch ? parseInt(pagesMatch[1]) : 0;
      
      // Parse cover
      const coverMatch = /<div[^>]*class="[^"]*cover[^"]*"[^>]*>[\s\S]*?<img[^>]*(?:src|data-src)="([^"]*)"[^>]*>/i.exec(html);
      const cover = coverMatch ? coverMatch[1] : '';
      
      // Parse tags
      const tags = [];
      const tagRegex = /<a[^>]*href="\/tag\/[^"]*"[^>]*class="[^"]*tag[^"]*"[^>]*>([^<]*)<\/a>/gi;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(html)) !== null) {
        const tag = tagMatch[1].trim().replace(/\s*\d+$/, '');
        if (tag) tags.push(tag);
      }

      return {
        id,
        sourceId: 'imhentai',
        slug: galleryId,
        title,
        cover: cover ? `/api/proxy/image?url=${encodeURIComponent(cover)}` : '',
        tags,
        pageCount,
        isAdult: true,
      };
    } catch (e) {
      console.error('[IMHentai] Detail error:', e.message);
      return null;
    }
  }

  async getChapterPages(galleryId) {
    const gid = galleryId.replace('imhentai:', '');
    
    try {
      const url = `${this.baseUrl}/gallery/${gid}/`;
      const html = await this.fetchHtml(url);
      
      const pages = [];
      
      // IMHentai embeds page info in hidden inputs:
      // load_server, load_dir, load_id, load_pages
      const serverMatch = html.match(/id=['"]load_server['"][^>]*value=['"]([^'"]*)['"]/i);
      const dirMatch = html.match(/id=['"]load_dir['"][^>]*value=['"]([^'"]*)['"]/i);
      const loadIdMatch = html.match(/id=['"]load_id['"][^>]*value=['"]([^'"]*)['"]/i);
      const pagesMatch = html.match(/id=['"]load_pages['"][^>]*value=['"]([^'"]*)['"]/i);
      
      const server = serverMatch ? serverMatch[1] : null;
      const dir = dirMatch ? dirMatch[1] : null;
      const loadId = loadIdMatch ? loadIdMatch[1] : null;
      const totalPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
      
      if (server && dir && loadId && totalPages > 0) {
        // Build all page URLs using the pattern
        // Note: Extension detection happens at proxy level with fallback
        for (let i = 1; i <= totalPages; i++) {
          const fullUrl = `https://m${server}.imhentai.xxx/${dir}/${loadId}/${i}.jpg`;
          pages.push({ 
            page: i, 
            url: `/api/proxy/image?url=${encodeURIComponent(fullUrl)}`,
            originalUrl: fullUrl,
          });
        }
      }
      
      // Fallback: Parse thumbnail links and convert to full image URLs
      if (pages.length === 0) {
        const thumbRegex = /class=['"][^'"]*gthumb[^'"]*['"][^>]*>[\s\S]*?<img[^>]*data-src=['"]([^'"]*)['"]/gi;
        let match;
        let pageNum = 1;
        
        while ((match = thumbRegex.exec(html)) !== null) {
          const thumbUrl = match[1];
          // Convert thumbnail to full image: 1t.jpg -> 1.jpg
          const fullUrl = thumbUrl.replace(/(\d+)t\./, '$1.');
          
          pages.push({ 
            page: pageNum++, 
            url: `/api/proxy/image?url=${encodeURIComponent(fullUrl)}`,
            originalUrl: fullUrl,
          });
        }
      }

      return pages;
    } catch (e) {
      console.error('[IMHentai] Pages error:', e.message);
      return [];
    }
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
    const source = new TestIMHentaiScraper();
    
    if (source.baseUrl !== 'https://imhentai.xxx') {
      throw new Error(`Expected baseUrl to be https://imhentai.xxx, got ${source.baseUrl}`);
    }
    if (!source.isAdult) {
      throw new Error('Expected isAdult flag to be true');
    }
  }),

  test('Can connect to imhentai.xxx', async () => {
    const source = new TestIMHentaiScraper();
    const connected = await source.checkConnectivity();
    
    if (!connected) {
      throw new Error('Failed to connect to imhentai.xxx');
    }
  }),

  test('Can fetch latest galleries', async () => {
    const source = new TestIMHentaiScraper();
    const results = await source.getLatest();
    
    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array');
    }
    
    console.log(`   Found ${results.length} galleries`);
    
    if (results.length === 0) {
      throw new Error('No galleries found - parsing may have failed');
    }
    
    const first = results[0];
    if (!first.id) throw new Error('Gallery missing id');
    if (!first.title) throw new Error('Gallery missing title');
    
    console.log(`   First gallery: ${first.title} (ID: ${first.id})`);
  }),

  test('Can fetch popular galleries', async () => {
    const source = new TestIMHentaiScraper();
    const results = await source.getPopular();
    
    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array');
    }
    
    console.log(`   Found ${results.length} popular galleries`);
    
    if (results.length === 0) {
      throw new Error('No popular galleries found');
    }
  }),

  test('Can search for galleries', async () => {
    const source = new TestIMHentaiScraper();
    const results = await source.search('english');
    
    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array');
    }
    
    console.log(`   Found ${results.length} search results`);
  }),

  test('Can get gallery details', async () => {
    const source = new TestIMHentaiScraper();
    
    // First get a valid gallery ID from latest
    const latest = await source.getLatest();
    if (latest.length === 0) {
      throw new Error('Could not get a gallery ID to test details');
    }
    
    const galleryId = latest[0].id;
    console.log(`   Testing with gallery ID: ${galleryId}`);
    
    const details = await source.getMangaDetails(galleryId);
    
    if (!details) {
      throw new Error('No details returned');
    }
    if (!details.title) throw new Error('Details missing title');
    
    console.log(`   Gallery: ${details.title}`);
    console.log(`   Pages: ${details.pageCount}`);
  }),

  test('No Cloudflare blocking', async () => {
    const response = await fetch('https://imhentai.xxx', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await response.text();
    
    if (html.includes('Cloudflare') && html.includes('cf-browser-verification')) {
      throw new Error('Site appears to be blocked by Cloudflare');
    }
  }),

  test('Can get chapter pages with correct URLs', async () => {
    const source = new TestIMHentaiScraper();
    
    // Get a valid gallery ID from latest
    const latest = await source.getLatest();
    if (latest.length === 0) {
      throw new Error('Could not get a gallery ID to test pages');
    }
    
    const galleryId = latest[0].id;
    console.log(`   Testing pages for gallery: ${galleryId}`);
    
    const pages = await source.getChapterPages(galleryId);
    
    if (!Array.isArray(pages)) {
      throw new Error('Expected pages to be an array');
    }
    
    console.log(`   Found ${pages.length} pages`);
    
    if (pages.length === 0) {
      throw new Error('No pages found - parsing may have failed');
    }
    
    // Verify first page URL is accessible
    const firstPage = pages[0];
    if (!firstPage.originalUrl) {
      throw new Error('Page missing originalUrl');
    }
    
    console.log(`   First page URL: ${firstPage.originalUrl}`);
    
    // Test if the image is accessible
    const imgResponse = await fetch(firstPage.originalUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://imhentai.xxx/'
      }
    });
    
    if (imgResponse.status === 404) {
      // Try webp fallback
      const webpUrl = firstPage.originalUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
      const webpResponse = await fetch(webpUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://imhentai.xxx/'
        }
      });
      
      if (webpResponse.status !== 200) {
        throw new Error(`Image not accessible: ${firstPage.originalUrl} (also tried .webp)`);
      }
      console.log(`   Image accessible (webp fallback worked)`);
    } else if (imgResponse.status !== 200) {
      throw new Error(`Image not accessible: status ${imgResponse.status}`);
    } else {
      console.log(`   Image accessible: status ${imgResponse.status}`);
    }
  })
];

// Run tests
runTests(tests).then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
