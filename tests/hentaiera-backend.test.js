// Hentaiera backend scraper tests
import scrapers from '../server/scrapers/index.js';

const TEST_GALLERY_ID = 'hentaiera:1702056';

async function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log('🧪 Hentaiera Backend Scraper Tests');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: 'Hentaiera source is available',
      fn: async () => {
        const details = await scrapers.getMangaDetails(TEST_GALLERY_ID);
        await assert(details, 'Expected details to be returned');
        await assert(details.id === TEST_GALLERY_ID, `Expected id ${TEST_GALLERY_ID}, got ${details.id}`);
        await assert(details.source === 'hentaiera' || details.sourceId === 'hentaiera', 'Expected source to be hentaiera');
        await assert(typeof details.title === 'string' && details.title.length > 0, 'Expected a non-empty title');
        await assert(details.tags && Array.isArray(details.tags), 'Expected tags to be an array');
      }
    },
    {
      name: 'Hentaiera chapters can be loaded',
      fn: async () => {
        const chapters = await scrapers.getChapters(TEST_GALLERY_ID);
        await assert(Array.isArray(chapters), 'Expected chapters to be an array');
        await assert(chapters.length === 1, `Expected exactly one chapter, got ${chapters.length}`);
        await assert(chapters[0].id === TEST_GALLERY_ID, `Expected chapter id ${TEST_GALLERY_ID}, got ${chapters[0].id}`);
        await assert(typeof chapters[0].title === 'string' && chapters[0].title.length > 0, 'Expected chapter title to be present');
      }
    },
    {
      name: 'Hentaiera chapter pages can be parsed',
      fn: async () => {
        const pages = await scrapers.getChapterPages(TEST_GALLERY_ID, TEST_GALLERY_ID);
        await assert(Array.isArray(pages), 'Expected pages to be an array');
        await assert(pages.length > 0, `Expected at least one page, got ${pages.length}`);
        await assert(typeof pages[0].url === 'string' && pages[0].url.length > 0, 'Expected page url to be present');
      }
    },
    {
      name: 'Hentaiera latest galleries can be fetched',
      fn: async () => {
        const results = await scrapers.getLatest({ sourceIds: ['hentaiera'], includeAdult: true, adultOnly: true });
        await assert(Array.isArray(results), 'Expected latest to return an array');
        await assert(results.length > 0, `Expected at least one result, got ${results.length}`);
        await assert(results[0].sourceId === 'hentaiera', `Expected sourceId hentaiera, got ${results[0].sourceId}`);
        await assert(typeof results[0].title === 'string' && results[0].title.length > 0, 'Expected non-empty title');
      }
    },
    {
      name: 'Hentaiera popular galleries can be fetched',
      fn: async () => {
        const results = await scrapers.getPopular({ sourceIds: ['hentaiera'], includeAdult: true, adultOnly: true });
        await assert(Array.isArray(results), 'Expected popular to return an array');
        await assert(results.length > 0, `Expected at least one result, got ${results.length}`);
        await assert(results[0].sourceId === 'hentaiera', `Expected sourceId hentaiera, got ${results[0].sourceId}`);
      }
    },
    {
      name: 'Hentaiera search returns results',
      fn: async () => {
        const results = await scrapers.search('english', { sourceIds: ['hentaiera'], includeAdult: true });
        await assert(Array.isArray(results), 'Expected search to return an array');
        await assert(results.length > 0, `Expected at least one result, got ${results.length}`);
        await assert(results.every(r => r.sourceId === 'hentaiera'), 'Expected all results to have sourceId hentaiera');
      }
    },
    {
      name: 'Hentaiera tags can be fetched',
      fn: async () => {
        const tagData = await scrapers.getTagsForSources(['hentaiera'], true);
        await assert(tagData, 'Expected tag data to be returned');
        await assert(tagData.bySource && typeof tagData.bySource === 'object', 'Expected bySource to be an object');
      }
    }
  ];

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✅ PASS: ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   ${error.message}`);
      failed++;
    }
  }

  console.log('==================================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('Test suite failed unexpectedly:', error);
  process.exit(1);
});
