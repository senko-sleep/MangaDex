/**
 * HentaiForce Backend Integration Test
 * Tests aggregator methods with hentaiforce source
 */

const results = { passed: 0, failed: 0, tests: [] };

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

async function runTests(tests) {
  console.log('\n🧪 HentaiForce Backend Integration Tests\n');
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

const scraperIndex = await import('../server/scrapers/index.js');
const { getSources, getEnabledSources, getPopular, getLatest, search, getMangaDetails, getChapters, getChapterPages, getTagsForSources } = scraperIndex;

const tests = [
  {
    name: 'getSources: includes hentaiforce when adult is true',
    async fn() {
      const adultSources = getSources(true, true);
      const hf = adultSources.find(s => s.id === 'hentaiforce');
      assert(hf !== undefined, 'hentaiforce source not found in adult sources');
      assert(hf.name === 'HentaiForce', `Incorrect name: ${hf.name}`);
      assert(hf.isAdult === true, 'hentaiforce should be isAdult: true');
    },
  },

  {
    name: 'getSources: excludes hentaiforce when adult is false',
    async fn() {
      const sfwSources = getSources(false, false);
      const hf = sfwSources.find(s => s.id === 'hentaiforce');
      assert(hf === undefined, 'hentaiforce source should not be in SFW sources');
    },
  },

  {
    name: 'getEnabledSources: includes hentaiforce when adult is true',
    async fn() {
      const enabled = getEnabledSources(true, true);
      const hf = enabled.find(s => s.id === 'hentaiforce');
      assert(hf !== undefined, 'hentaiforce should be enabled by default for adult mode');
    },
  },

  {
    name: 'getPopular: returns items with sourceId="hentaiforce"',
    async fn() {
      const items = await getPopular({ sourceIds: ['hentaiforce'], adultOnly: true, page: 1 });
      console.log(`   → Got ${items.length} popular items`);
      assert(items.length > 0, 'Should return popular items');
      assert(items[0].sourceId === 'hentaiforce', `Wrong sourceId: ${items[0].sourceId}`);
    },
  },

  {
    name: 'getLatest: returns items with sourceId="hentaiforce"',
    async fn() {
      const items = await getLatest({ sourceIds: ['hentaiforce'], adultOnly: true, page: 1 });
      console.log(`   → Got ${items.length} latest items`);
      assert(items.length > 0, 'Should return latest items');
      assert(items[0].sourceId === 'hentaiforce', `Wrong sourceId: ${items[0].sourceId}`);
    },
  },

  {
    name: 'search: returns search results with sourceId="hentaiforce"',
    async fn() {
      const items = await search('naruto', { sourceIds: ['hentaiforce'], adultOnly: true, page: 1 });
      console.log(`   → Got ${items.length} search items for naruto`);
      assert(items.length > 0, 'Should return search items');
      assert(items[0].sourceId === 'hentaiforce', `Wrong sourceId: ${items[0].sourceId}`);
    },
  },

  {
    name: 'getMangaDetails: returns manga details through aggregator',
    async fn() {
      const details = await getMangaDetails('hentaiforce:59000');
      assert(details !== null, 'Details should not be null');
      assert(details.id === 'hentaiforce:59000', `ID mismatch: ${details.id}`);
      assert(details.pageCount > 0, `Page count should be > 0: ${details.pageCount}`);
    },
  },

  {
    name: 'getChapters: returns chapters through aggregator',
    async fn() {
      const chapters = await getChapters('hentaiforce:59000');
      assert(Array.isArray(chapters) && chapters.length === 1, 'Should return 1 chapter');
      assert(chapters[0].sourceId === 'hentaiforce', 'Chapter sourceId mismatch');
    },
  },

  {
    name: 'getChapterPages: returns chapter pages through aggregator',
    async fn() {
      const pages = await getChapterPages('59000', 'hentaiforce:59000');
      assert(Array.isArray(pages) && pages.length > 0, 'Should return pages');
      assert(pages[0].page === 1, 'First page should be 1');
    },
  },

  {
    name: 'getTagsForSources: returns tags for hentaiforce',
    async fn() {
      const tags = await getTagsForSources(['hentaiforce'], true);
      assert(tags && tags.tags.length > 0, 'Should return tags list');
      assert(tags.bySource.hentaiforce && tags.bySource.hentaiforce.length > 0, 'Should return hentaiforce tags');
    },
  },
];

await runTests(tests);
