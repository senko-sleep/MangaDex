/**
 * Bato.to Scraper Tests
 * Run with: node tests/bato.test.js
 */

import { BatoScraper } from '../server/scrapers/bato.js';

const scraper = new BatoScraper();

async function testSearch() {
  console.log('\n=== Testing Bato Search ===');
  try {
    const results = await scraper.search('one piece', 1);
    console.log(`Found ${results.length} results`);
    if (results.length > 0) {
      console.log('First result:', {
        id: results[0].id,
        title: results[0].title,
        cover: results[0].cover?.substring(0, 80) + '...',
      });
    }
    return results.length > 0;
  } catch (e) {
    console.error('Search failed:', e.message);
    return false;
  }
}

async function testPopular() {
  console.log('\n=== Testing Bato Popular ===');
  try {
    const results = await scraper.getPopular(1);
    console.log(`Found ${results.length} popular manga`);
    if (results.length > 0) {
      console.log('First result:', {
        id: results[0].id,
        title: results[0].title,
      });
    }
    return results.length > 0;
  } catch (e) {
    console.error('Popular failed:', e.message);
    return false;
  }
}

async function testMangaDetails(mangaId) {
  console.log('\n=== Testing Bato Manga Details ===');
  try {
    const details = await scraper.getMangaDetails(mangaId);
    if (details) {
      console.log('Manga details:', {
        id: details.id,
        title: details.title,
        status: details.status,
        author: details.author,
        genres: details.genres?.slice(0, 5),
      });
      return true;
    }
    console.log('No details found');
    return false;
  } catch (e) {
    console.error('Details failed:', e.message);
    return false;
  }
}

async function testChapters(mangaId) {
  console.log('\n=== Testing Bato Chapters ===');
  try {
    const chapters = await scraper.getChapters(mangaId);
    console.log(`Found ${chapters.length} chapters`);
    if (chapters.length > 0) {
      console.log('First chapter:', {
        id: chapters[0].id,
        chapter: chapters[0].chapter,
        title: chapters[0].title,
      });
      return chapters[0];
    }
    return null;
  } catch (e) {
    console.error('Chapters failed:', e.message);
    return null;
  }
}

async function testChapterPages(chapterId, mangaId) {
  console.log('\n=== Testing Bato Chapter Pages ===');
  try {
    const pages = await scraper.getChapterPages(chapterId, mangaId);
    console.log(`Found ${pages.length} pages`);
    if (pages.length > 0) {
      console.log('First 3 pages:');
      pages.slice(0, 3).forEach(p => {
        console.log(`  Page ${p.page}: ${p.originalUrl?.substring(0, 80)}...`);
      });
      
      // Check if URLs look valid
      const validUrls = pages.filter(p => 
        p.originalUrl && 
        p.originalUrl.startsWith('http') &&
        p.originalUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)
      );
      console.log(`Valid image URLs: ${validUrls.length}/${pages.length}`);
      return pages.length > 0;
    }
    return false;
  } catch (e) {
    console.error('Pages failed:', e.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting Bato.to scraper tests...\n');
  
  const results = {
    search: false,
    popular: false,
    details: false,
    chapters: false,
    pages: false,
  };
  
  // Test search
  results.search = await testSearch();
  
  // Test popular
  results.popular = await testPopular();
  
  // Get a manga to test with
  const popular = await scraper.getPopular(1);
  if (popular.length > 0) {
    const testManga = popular[0];
    console.log(`\nUsing test manga: ${testManga.title} (${testManga.id})`);
    
    // Test details
    results.details = await testMangaDetails(testManga.id);
    
    // Test chapters
    const firstChapter = await testChapters(testManga.id);
    results.chapters = !!firstChapter;
    
    // Test pages
    if (firstChapter) {
      results.pages = await testChapterPages(firstChapter.id, testManga.id);
    }
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  const allPassed = Object.values(results).every(v => v);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  
  return allPassed;
}

runTests().catch(console.error);
