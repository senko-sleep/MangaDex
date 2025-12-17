import { KitsuScraper } from '../server/scrapers/kitsu.js';
import { BatoScraper } from '../server/scrapers/bato.js';

console.log('\n╔════════════════════════════════════════════╗');
console.log('║  Testing Kitsu & Bato Scraper Fix        ║');
console.log('╚════════════════════════════════════════════╝\n');

const kitsu = new KitsuScraper();
const bato = new BatoScraper();

// Test 1: Kitsu getPopular with correct signature
console.log('TEST 1: Kitsu getPopular(page, includeAdult, sort)');
console.log('─────────────────────────────────────────────────');
try {
  const result = await kitsu.getPopular(1, true, 'popular');
  console.log(`✅ SUCCESS: Received ${result.length} manga`);
  if (result.length > 0) {
    console.log(`   First: ${result[0].title}`);
  }
} catch (e) {
  console.error(`❌ FAILED: ${e.message}`);
}

// Test 2: Kitsu getLatest with correct signature
console.log('\nTEST 2: Kitsu getLatest(page, includeAdult)');
console.log('─────────────────────────────────────────────────');
try {
  const result = await kitsu.getLatest(1, true);
  console.log(`✅ SUCCESS: Received ${result.length} manga`);
  if (result.length > 0) {
    console.log(`   First: ${result[0].title}`);
  }
} catch (e) {
  console.error(`❌ FAILED: ${e.message}`);
}

// Test 3: Kitsu search with correct signature
console.log('\nTEST 3: Kitsu search(query, page, includeAdult, sort)');
console.log('─────────────────────────────────────────────────');
try {
  const result = await kitsu.search('demon', 1, true, 'popular');
  console.log(`✅ SUCCESS: Received ${result.length} manga`);
  if (result.length > 0) {
    console.log(`   First: ${result[0].title}`);
  }
} catch (e) {
  console.error(`❌ FAILED: ${e.message}`);
}

// Test 4: Bato getPopular with correct signature
console.log('\nTEST 4: Bato getPopular(page, includeAdult, sort)');
console.log('─────────────────────────────────────────────────');
try {
  const result = await bato.getPopular(1, true, 'popular');
  console.log(`✅ SUCCESS: Received ${result.length} manga`);
  if (result.length > 0) {
    console.log(`   First: ${result[0].title}`);
  }
} catch (e) {
  console.error(`❌ FAILED: ${e.message}`);
}

// Test 5: Bato getLatest with correct signature
console.log('\nTEST 5: Bato getLatest(page, includeAdult)');
console.log('─────────────────────────────────────────────────');
try {
  const result = await bato.getLatest(1, true);
  console.log(`✅ SUCCESS: Received ${result.length} manga`);
  if (result.length > 0) {
    console.log(`   First: ${result[0].title}`);
  }
} catch (e) {
  console.error(`❌ FAILED: ${e.message}`);
}

// Test 6: Bato search with correct signature
console.log('\nTEST 6: Bato search(query, page, includeAdult, ..., sort)');
console.log('─────────────────────────────────────────────────');
try {
  const result = await bato.search('one piece', 1, true, [], [], null, false, null, 'popular');
  console.log(`✅ SUCCESS: Received ${result.length} manga`);
  if (result.length > 0) {
    console.log(`   First: ${result[0].title}`);
  }
} catch (e) {
  console.error(`❌ FAILED: ${e.message}`);
}

console.log('\n╔════════════════════════════════════════════╗');
console.log('║  All tests completed!                    ║');
console.log('╚════════════════════════════════════════════╝\n');
