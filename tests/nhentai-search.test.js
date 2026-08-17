/**
 * NHentai Search Verification Test
 * Verifies that search results match search query and are not just homepage / latest galleries
 */

import { NHentaiScraper } from '../server/scrapers/nhentai.js';
import * as scrapersAggregator from '../server/scrapers/index.js';

const scraper = new NHentaiScraper();

async function run() {
  console.log('🧪 Testing NHentai Search Accuracy...\n');

  // Test 1: Search 'naruto'
  console.log('1. Testing search("naruto")...');
  const narutoResults = await scraper.search('naruto', 1);
  console.log(`   Found ${narutoResults.length} results`);
  if (narutoResults.length === 0) throw new Error('No naruto results returned');
  
  const narutoMatches = narutoResults.filter(r => 
    r.title.toLowerCase().includes('naruto') || 
    r.title.toLowerCase().includes('hinata') ||
    r.title.toLowerCase().includes('sasuke') ||
    r.title.toLowerCase().includes('tsunade') ||
    r.title.toLowerCase().includes('sakura') ||
    r.title.toLowerCase().includes('kakashi') ||
    r.title.toLowerCase().includes('ナルト')
  );
  console.log(`   Naruto related titles: ${narutoMatches.length} / ${narutoResults.length}`);
  narutoResults.slice(0, 3).forEach(r => console.log('   -', r.title));
  if (narutoMatches.length < 5) throw new Error('Search results do not match query "naruto"');

  // Test 2: Search 'one piece'
  console.log('\n2. Testing search("one piece")...');
  const opResults = await scraper.search('one piece', 1);
  console.log(`   Found ${opResults.length} results`);
  if (opResults.length === 0) throw new Error('No one piece results returned');
  const opMatches = opResults.filter(r =>
    r.title.toLowerCase().includes('one piece') ||
    r.title.toLowerCase().includes('nami') ||
    r.title.toLowerCase().includes('robin') ||
    r.title.toLowerCase().includes('luffy') ||
    r.title.toLowerCase().includes('zoro') ||
    r.title.toLowerCase().includes('hancock') ||
    r.title.toLowerCase().includes('yamato') ||
    r.title.toLowerCase().includes('ワンピース')
  );
  console.log(`   One Piece related titles: ${opMatches.length} / ${opResults.length}`);
  opResults.slice(0, 3).forEach(r => console.log('   -', r.title));
  if (opMatches.length < 5) throw new Error('Search results do not match query "one piece"');

  // Test 3: Search with popular sort
  console.log('\n3. Testing search("naruto", 1, true, [], [], null, true, null, "popular")...');
  const popularNaruto = await scraper.search('naruto', 1, true, [], [], null, true, null, 'popular');
  console.log(`   Found ${popularNaruto.length} results for popular naruto`);
  popularNaruto.slice(0, 3).forEach(r => console.log('   -', r.title));

  // Test 4: Search through aggregator
  console.log('\n4. Testing search through scrapersAggregator...');
  const aggResults = await scrapersAggregator.search('naruto', {
    sourceIds: ['nhentai'],
    adultOnly: true,
    page: 1,
    sort: 'popular'
  });
  console.log(`   Aggregator returned ${aggResults.length} results`);
  aggResults.slice(0, 3).forEach(r => console.log('   -', r.title));
  if (aggResults.length === 0 || aggResults[0].sourceId !== 'nhentai') {
    throw new Error('Aggregator search failed');
  }

  // Test 5: Verify latest galleries are DIFFERENT from search results
  console.log('\n5. Verifying latest galleries differ from naruto search results...');
  const latest = await scraper.getLatest({ page: 1 });
  const latestIds = new Set(latest.map(l => l.slug || l.id));
  const searchIds = narutoResults.map(r => r.slug || r.id);
  const overlap = searchIds.filter(id => latestIds.has(id));
  console.log(`   Overlap with latest: ${overlap.length} / ${searchIds.length} items`);
  if (overlap.length >= searchIds.length - 2) {
    throw new Error('Search returned latest homepage items instead of search results!');
  }

  console.log('\n✅ All NHentai search tests PASSED successfully!');
}

run().catch(e => {
  console.error('\n❌ TEST FAILED:', e.message);
  process.exit(1);
});
