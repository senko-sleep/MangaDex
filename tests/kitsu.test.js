import { KitsuScraper } from '../server/scrapers/kitsu.js';

const kitsu = new KitsuScraper();

console.log('\n=== Testing Kitsu Scraper ===\n');

// Test getPopular
console.log('Testing getPopular()...');
try {
  const popular = await kitsu.getPopular(1, true, 'popular');
  console.log(`✓ getPopular returned ${popular.length} results`);
  if (popular.length > 0) {
    console.log(`  First result: ${popular[0].title}`);
  }
} catch (e) {
  console.error(`✗ getPopular error: ${e.message}`);
}

// Test getLatest
console.log('\nTesting getLatest()...');
try {
  const latest = await kitsu.getLatest(1, true);
  console.log(`✓ getLatest returned ${latest.length} results`);
  if (latest.length > 0) {
    console.log(`  First result: ${latest[0].title}`);
  }
} catch (e) {
  console.error(`✗ getLatest error: ${e.message}`);
}

// Test search
console.log('\nTesting search()...');
try {
  const search = await kitsu.search('naruto', 1, true, 'popular');
  console.log(`✓ search returned ${search.length} results`);
  if (search.length > 0) {
    console.log(`  First result: ${search[0].title}`);
  }
} catch (e) {
  console.error(`✗ search error: ${e.message}`);
}

console.log('\n=== Tests Complete ===\n');
