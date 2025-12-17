/**
 * Bato.to Source Test File
 * Tests the Bato.to integration with the actual scraper
 * 
 * Run with: node tests/bato-simple.test.js
 */

import { BatoScraper } from '../server/scrapers/bato.js';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return { name, fn };
}

async function runTests(tests) {
  console.log('\n🧪 Bato.to Source Tests\n');
  console.log('='.repeat(50));
  
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
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`   Total: ${results.passed + results.failed} tests\n`);
  
  return results;
}

// Create scraper instance
const scraper = new BatoScraper();

// Define tests
const tests = [
  test('Source configuration is correct', async () => {
    if (scraper.baseUrl !== 'https://bato.to') {
      throw new Error(`Expected baseUrl to be https://bato.to, got ${scraper.baseUrl}`);
    }
    if (scraper.isAdult !== false) {
      throw new Error('Expected isAdult flag to be false');
    }
    console.log(`   Name: ${scraper.name}`);
    console.log(`   Base URL: ${scraper.baseUrl}`);
  }),

  test('Can connect to Bato.to', async () => {
    const response = await fetch('https://bato.to', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to connect: HTTP ${response.status}`);
    }
    console.log(`   Status: ${response.status}`);
  }),

  test('Can fetch popular manga', async () => {
    const results = await scraper.getPopular(1, true);
    
    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array');
    }
    
    console.log(`   Found ${results.length} popular manga`);
    
    if (results.length === 0) {
      throw new Error('No popular manga found - parsing may have failed');
    }
    
    const first = results[0];
    if (!first.id) throw new Error('Manga missing id');
    if (!first.title) throw new Error('Manga missing title');
    
    console.log(`   First: ${first.title} (${first.id})`);
  }),

  test('Can fetch latest manga', async () => {
    const results = await scraper.getLatest(1, true);
    
    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array');
    }
    
    console.log(`   Found ${results.length} latest manga`);
    
    if (results.length === 0) {
      throw new Error('No latest manga found');
    }
  }),

  test('Can search for manga', async () => {
    const results = await scraper.search('one piece', 1, true);
    
    if (!Array.isArray(results)) {
      throw new Error('Expected results to be an array');
    }
    
    console.log(`   Found ${results.length} search results for "one piece"`);
    
    if (results.length > 0) {
      console.log(`   First result: ${results[0].title}`);
    }
  }),

  test('Can get manga details', async () => {
    // First get a valid manga ID from popular
    const popular = await scraper.getPopular(1, true);
    if (popular.length === 0) {
      throw new Error('Could not get a manga ID to test details');
    }
    
    const mangaId = popular[0].id;
    console.log(`   Testing with manga ID: ${mangaId}`);
    
    const details = await scraper.getMangaDetails(mangaId);
    
    if (!details) {
      throw new Error('No details returned');
    }
    if (!details.title) throw new Error('Details missing title');
    
    console.log(`   Title: ${details.title}`);
    console.log(`   Status: ${details.status || 'unknown'}`);
    if (details.tags && details.tags.length > 0) {
      console.log(`   Tags: ${details.tags.slice(0, 5).join(', ')}`);
    }
  }),

  test('Can get chapters', async () => {
    // Get a valid manga ID
    const popular = await scraper.getPopular(1, true);
    if (popular.length === 0) {
      throw new Error('Could not get a manga ID to test chapters');
    }
    
    const mangaId = popular[0].id;
    console.log(`   Testing chapters for: ${mangaId}`);
    
    const chapters = await scraper.getChapters(mangaId);
    
    if (!Array.isArray(chapters)) {
      throw new Error('Expected chapters to be an array');
    }
    
    console.log(`   Found ${chapters.length} chapters`);
    
    if (chapters.length > 0) {
      const first = chapters[0];
      console.log(`   First chapter: Ch. ${first.chapter} - ${first.title || 'No title'}`);
    }
  }),

  test('Can get chapter pages', async () => {
    // Get a valid manga and chapter
    const popular = await scraper.getPopular(1, true);
    if (popular.length === 0) {
      throw new Error('Could not get a manga ID');
    }
    
    const mangaId = popular[0].id;
    const chapters = await scraper.getChapters(mangaId);
    
    if (chapters.length === 0) {
      console.log('   ⚠️ Warning: No chapters available to test pages');
      return;
    }
    
    const chapterId = chapters[0].id;
    console.log(`   Testing pages for chapter: ${chapterId}`);
    
    const pages = await scraper.getChapterPages(chapterId, mangaId);
    
    if (!Array.isArray(pages)) {
      throw new Error('Expected pages to be an array');
    }
    
    console.log(`   Found ${pages.length} pages`);
    
    if (pages.length === 0) {
      throw new Error('No pages found - parsing may have failed');
    }
    
    const firstPage = pages[0];
    if (!firstPage.url) throw new Error('Page missing url');
    
    console.log(`   First page: ${firstPage.originalUrl?.substring(0, 60) || firstPage.url.substring(0, 60)}...`);
  }),

  test('Image URLs are accessible', async () => {
    // Get a chapter with pages
    const popular = await scraper.getPopular(1, true);
    if (popular.length === 0) {
      throw new Error('Could not get manga');
    }
    
    const mangaId = popular[0].id;
    const chapters = await scraper.getChapters(mangaId);
    
    if (chapters.length === 0) {
      console.log('   ⚠️ Warning: No chapters to test image accessibility');
      return;
    }
    
    const pages = await scraper.getChapterPages(chapters[0].id, mangaId);
    
    if (pages.length === 0) {
      console.log('   ⚠️ Warning: No pages to test');
      return;
    }
    
    // Test first image URL
    const imageUrl = pages[0].originalUrl || pages[0].url;
    console.log(`   Testing image: ${imageUrl.substring(0, 60)}...`);
    
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://bato.to/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Image not accessible: HTTP ${response.status}`);
    }
    
    console.log(`   Image accessible: HTTP ${response.status}`);
  }),

  test('Chapters are sorted correctly (descending)', async () => {
    const popular = await scraper.getPopular(1, true);
    if (popular.length === 0) {
      throw new Error('Could not get manga');
    }
    
    const chapters = await scraper.getChapters(popular[0].id);
    
    if (chapters.length < 2) {
      console.log('   ⚠️ Warning: Not enough chapters to test sorting');
      return;
    }
    
    // Check if sorted in descending order
    for (let i = 0; i < Math.min(chapters.length - 1, 5); i++) {
      const current = parseFloat(chapters[i].chapter) || 0;
      const next = parseFloat(chapters[i + 1].chapter) || 0;
      if (current < next) {
        throw new Error(`Chapters not sorted correctly: ${current} comes before ${next}`);
      }
    }
    
    console.log('   Chapters are properly sorted (descending)');
  })
];

// Run tests
runTests(tests).then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
