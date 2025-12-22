import { HitomiScraper } from '../server/scrapers/hitomi.js';

const scraper = new HitomiScraper();

async function testLatest() {
  console.log('\n=== Testing getLatest ===');
  const results = await scraper.getLatest(1);
  console.log(`Got ${results.length} results`);
  if (results.length > 0) {
    console.log('First result:', JSON.stringify(results[0], null, 2));
  }
  return results.length > 0;
}

async function testDetails() {
  console.log('\n=== Testing getMangaDetails ===');
  // Get a gallery ID from latest first
  const latest = await scraper.getLatest(1);
  if (latest.length === 0) {
    console.log('No galleries to test details with');
    return false;
  }
  
  const id = latest[0].id;
  console.log(`Testing details for: ${id}`);
  const details = await scraper.getMangaDetails(id);
  console.log('Details:', JSON.stringify(details, null, 2));
  return details !== null;
}

async function testPages() {
  console.log('\n=== Testing getChapterPages ===');
  // Get a gallery ID from latest first
  const latest = await scraper.getLatest(1);
  if (latest.length === 0) {
    console.log('No galleries to test pages with');
    return false;
  }
  
  const mangaId = latest[0].id;
  const gid = mangaId.replace('hitomi:', '');
  console.log(`Testing pages for gallery: ${gid}`);
  
  const pages = await scraper.getChapterPages(gid, mangaId);
  console.log(`Got ${pages.length} pages`);
  if (pages.length > 0) {
    console.log('First page:', pages[0]);
    console.log('Last page:', pages[pages.length - 1]);
  }
  return pages.length > 0;
}

async function runTests() {
  console.log('Hitomi.la Scraper Test (No Playwright - Direct API)');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  try {
    if (await testLatest()) passed++; else failed++;
  } catch (e) {
    console.error('Latest test failed:', e.message);
    failed++;
  }
  
  try {
    if (await testDetails()) passed++; else failed++;
  } catch (e) {
    console.error('Details test failed:', e.message);
    failed++;
  }
  
  try {
    if (await testPages()) passed++; else failed++;
  } catch (e) {
    console.error('Pages test failed:', e.message);
    failed++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
