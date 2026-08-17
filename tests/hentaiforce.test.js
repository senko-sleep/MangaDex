/**
 * HentaiForce Source Test File
 * Tests gallery listing, details, and image pages
 *
 * Run with: node tests/hentaiforce.test.js
 */

const results = { passed: 0, failed: 0, tests: [] };

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

async function runTests(tests) {
  console.log('\n🧪 HentaiForce Source Tests\n');
  console.log('='.repeat(50));

  for (const { name, fn } of tests) {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✅ PASS: ${name}`);
    } catch (e) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: e.message });
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${e.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`   Total: ${results.passed + results.failed} tests\n`);
  return results;
}

// ─── Import scraper ─────────────────────────────────────────────────────────
const { HentaiForceScraper } = await import('../server/scrapers/hentaiforce.js');
const scraper = new HentaiForceScraper();

// ─── Tests ───────────────────────────────────────────────────────────────────
let sampleGalleryId = '59000';

const tests = [
  {
    name: 'Constructor: name and baseUrl are correct',
    async fn() {
      assert(scraper.name === 'HentaiForce', `Bad name: ${scraper.name}`);
      assert(scraper.baseUrl === 'https://hentaiforce.net', `Bad baseUrl: ${scraper.baseUrl}`);
      assert(scraper.isAdult === true, `isAdult should be true`);
    },
  },

  {
    name: 'getLatest: returns array of galleries',
    async fn() {
      const items = await scraper.getLatest({ page: 1 });
      console.log(`   → Got ${items.length} latest galleries`);
      assert(Array.isArray(items), 'Result should be an array');
      assert(items.length > 0, 'Should return at least 1 gallery');

      const first = items[0];
      console.log(`   → First: "${first.title}" (id=${first.id})`);
      assert(first.id.startsWith('hentaiforce:'), `ID should start with hentaiforce: — got: ${first.id}`);
      assert(first.title && first.title.length > 0, 'Title should not be empty');
      assert(first.sourceId === 'hentaiforce', `sourceId should be hentaiforce — got: ${first.sourceId}`);
      assert(first.isAdult === true, 'isAdult should be true');

      sampleGalleryId = first.slug || first.id.replace('hentaiforce:', '');
    },
  },

  {
    name: 'getLatest: cover URL is present and valid',
    async fn() {
      const items = await scraper.getLatest({ page: 1 });
      assert(items.length > 0, 'Should have items');
      const first = items[0];
      console.log(`   → Cover: ${first.cover}`);
      assert(
        first.cover.includes('/api/proxy/image') || first.cover.includes('hentaiforce.me') || first.cover.includes('hentaiforce.net'),
        `Cover should be proxied or direct — got: ${first.cover}`
      );
    },
  },

  {
    name: 'getPopular: returns array of popular galleries',
    async fn() {
      const items = await scraper.getPopular({ page: 1 });
      console.log(`   → Got ${items.length} popular galleries`);
      assert(Array.isArray(items), 'Result should be an array');
      assert(items.length > 0, 'Should return at least 1 gallery');
      assert(items[0].id.startsWith('hentaiforce:'), 'ID should start with hentaiforce:');
    },
  },

  {
    name: 'search: returns results for a search query',
    async fn() {
      const items = await scraper.search('naruto', { page: 1 });
      console.log(`   → Got ${items.length} search results for "naruto"`);
      assert(Array.isArray(items), 'Result should be an array');
      assert(items.length > 0, 'Should return search results');
      assert(items[0].id.startsWith('hentaiforce:'), 'ID should start with hentaiforce:');
    },
  },

  {
    name: 'getMangaDetails: returns detail object for a known gallery',
    async fn() {
      const id = `hentaiforce:${sampleGalleryId}`;
      const details = await scraper.getMangaDetails(id);
      console.log(`   → Details: "${details?.title}", pages=${details?.pageCount}, tags=${details?.tags?.length}`);
      assert(details !== null, 'Details should not be null');
      assert(details.id === id, `details.id mismatch: ${details.id}`);
      assert(details.title && details.title.length > 0, 'Title should not be empty');
      assert(typeof details.pageCount === 'number', `pageCount should be a number — got: ${typeof details.pageCount}`);
      assert(details.pageCount > 0, `pageCount should be > 0 — got: ${details.pageCount}`);
      assert(details.isAdult === true, 'isAdult should be true');
      assert(Array.isArray(details.tags), 'tags should be an array');
      assert(details._mediaId, `_mediaId should be extracted: ${details._mediaId}`);
    },
  },

  {
    name: 'getChapters: returns single chapter for gallery',
    async fn() {
      const mangaId = `hentaiforce:${sampleGalleryId}`;
      const chapters = await scraper.getChapters(mangaId);
      console.log(`   → Chapters: ${chapters.length}`);
      assert(Array.isArray(chapters), 'Should return array');
      assert(chapters.length === 1, `Should return exactly 1 chapter — got: ${chapters.length}`);
      assert(chapters[0].id === sampleGalleryId, `Chapter id mismatch: ${chapters[0].id}`);
      assert(chapters[0].title === 'Full Gallery', `Chapter title mismatch: ${chapters[0].title}`);
    },
  },

  {
    name: 'getChapterPages: returns page array with valid image URLs',
    async fn() {
      const mangaId = `hentaiforce:${sampleGalleryId}`;
      const chapters = await scraper.getChapters(mangaId);
      const pages = await scraper.getChapterPages(chapters[0].id, mangaId);
      console.log(`   → Pages: ${pages.length}`);
      assert(Array.isArray(pages), 'Should return array');
      assert(pages.length > 0, `Should have at least 1 page — got: ${pages.length}`);

      const p = pages[0];
      console.log(`   → Page 1 URL: ${p.url}`);
      assert(typeof p.page === 'number', `page should be a number — got: ${typeof p.page}`);
      assert(p.url && p.url.length > 0, 'url should not be empty');
      assert(
        p.url.includes('/api/proxy/image') || p.url.includes('hentaiforce.me'),
        `URL should be proxied or direct — got: ${p.url}`
      );
      assert(
        p.originalUrl && p.originalUrl.includes('hentaiforce.me'),
        `originalUrl should point to hentaiforce CDN — got: ${p.originalUrl}`
      );
    },
  },

  {
    name: 'getChapterPages: pages are sequential (1..N)',
    async fn() {
      const mangaId = `hentaiforce:${sampleGalleryId}`;
      const chapters = await scraper.getChapters(mangaId);
      const pages = await scraper.getChapterPages(chapters[0].id, mangaId);
      assert(pages.length > 0, 'Need pages to check sequence');
      for (let i = 0; i < pages.length; i++) {
        assert(pages[i].page === i + 1, `Page ${i} has wrong page number: ${pages[i].page}`);
      }
      console.log(`   → All ${pages.length} pages are sequential ✓`);
    },
  },

  {
    name: 'getTags: returns non-empty array of tags',
    async fn() {
      const tags = await scraper.getTags();
      console.log(`   → ${tags.length} tags`);
      assert(Array.isArray(tags) && tags.length > 0, 'Should return tags array');
    },
  },
];

await runTests(tests);
