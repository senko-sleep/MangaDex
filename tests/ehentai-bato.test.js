/**
 * E-Hentai and Bato.to Comprehensive Tests
 * Tests search results, manga details, chapters, and page images
 * 
 * Run with: node tests/ehentai-bato.test.js
 */

import { BatoScraper } from '../server/scrapers/bato.js';
import { EHentaiScraper } from '../server/scrapers/ehentai.js';

const batoScraper = new BatoScraper();
const ehentaiScraper = new EHentaiScraper();

// Utility for colored output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

// ==================== BATO TESTS ====================

async function testBatoSearch() {
  log('cyan', '\n=== Testing Bato Search ===');
  try {
    const results = await batoScraper.search('one piece', 1);
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log('First result:', {
        id: results[0].id,
        title: results[0].title,
        cover: results[0].cover?.substring(0, 60) + '...',
        status: results[0].status,
      });
      return { success: true, data: results };
    }
    
    log('yellow', 'No results found');
    return { success: false, data: [] };
  } catch (e) {
    log('red', 'Search failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function testBatoPopular() {
  log('cyan', '\n=== Testing Bato Popular ===');
  try {
    const results = await batoScraper.getPopular(1);
    console.log(`Found ${results.length} popular manga`);
    
    if (results.length > 0) {
      console.log('First 3 results:');
      results.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.title} (${r.id})`);
      });
      return { success: true, data: results };
    }
    
    log('yellow', 'No results found');
    return { success: false, data: [] };
  } catch (e) {
    log('red', 'Popular failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function testBatoDetails(mangaId) {
  log('cyan', '\n=== Testing Bato Manga Details ===');
  console.log('Testing with ID:', mangaId);
  
  try {
    const details = await batoScraper.getMangaDetails(mangaId);
    
    if (details) {
      console.log('Manga details:', {
        id: details.id,
        title: details.title,
        status: details.status,
        author: details.author,
        genres: details.genres?.slice(0, 5),
        cover: details.cover?.substring(0, 60) + '...',
        isLongStrip: details.isLongStrip,
      });
      return { success: true, data: details };
    }
    
    log('yellow', 'No details found');
    return { success: false };
  } catch (e) {
    log('red', 'Details failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function testBatoChapters(mangaId) {
  log('cyan', '\n=== Testing Bato Chapters ===');
  console.log('Testing with ID:', mangaId);
  
  try {
    const chapters = await batoScraper.getChapters(mangaId);
    console.log(`Found ${chapters.length} chapters`);
    
    if (chapters.length > 0) {
      console.log('First 3 chapters:');
      chapters.slice(0, 3).forEach((ch, i) => {
        console.log(`  ${i + 1}. Ch ${ch.chapter}: ${ch.title || '(no title)'} [ID: ${ch.id}]`);
      });
      return { success: true, data: chapters };
    }
    
    log('yellow', 'No chapters found');
    return { success: false, data: [] };
  } catch (e) {
    log('red', 'Chapters failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function testBatoPages(chapterId, mangaId) {
  log('cyan', '\n=== Testing Bato Chapter Pages ===');
  console.log('Testing with chapter ID:', chapterId);
  
  try {
    const pages = await batoScraper.getChapterPages(chapterId, mangaId);
    console.log(`Found ${pages.length} pages`);
    
    if (pages.length > 0) {
      console.log('First 5 pages:');
      pages.slice(0, 5).forEach(p => {
        const url = p.originalUrl || p.url;
        console.log(`  Page ${p.page}: ${url?.substring(0, 70)}...`);
      });
      
      // Verify image URLs look valid
      const validUrls = pages.filter(p => {
        const url = p.originalUrl || p.url;
        return url && 
               url.startsWith('http') && 
               (url.match(/\.(jpg|jpeg|png|gif|webp)/i) || url.includes('media'));
      });
      
      log('green', `✓ Valid image URLs: ${validUrls.length}/${pages.length}`);
      return { success: validUrls.length > 0, data: pages, validCount: validUrls.length };
    }
    
    log('yellow', 'No pages found');
    return { success: false, data: [] };
  } catch (e) {
    log('red', 'Pages failed:', e.message);
    return { success: false, error: e.message };
  }
}

// ==================== E-HENTAI TESTS ====================

async function testEhentaiSearch() {
  log('cyan', '\n=== Testing E-Hentai Search ===');
  try {
    const results = await ehentaiScraper.search('naruto', 1);
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log('First result:', {
        id: results[0].id,
        title: results[0].title?.substring(0, 50) + '...',
        cover: results[0].cover?.substring(0, 50) + '...',
        category: results[0].category,
      });
      return { success: true, data: results };
    }
    
    log('yellow', 'No results found');
    return { success: false, data: [] };
  } catch (e) {
    log('red', 'Search failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function testEhentaiPopular() {
  log('cyan', '\n=== Testing E-Hentai Popular ===');
  try {
    const results = await ehentaiScraper.getPopular(1);
    console.log(`Found ${results.length} popular galleries`);
    
    if (results.length > 0) {
      console.log('First 3 results:');
      results.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.title?.substring(0, 50)}... (${r.category})`);
      });
      return { success: true, data: results };
    }
    
    log('yellow', 'No results found');
    return { success: false, data: [] };
  } catch (e) {
    log('red', 'Popular failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function testEhentaiDetails(galleryId) {
  log('cyan', '\n=== Testing E-Hentai Gallery Details ===');
  console.log('Testing with ID:', galleryId);
  
  try {
    const details = await ehentaiScraper.getMangaDetails(galleryId);
    
    if (details) {
      console.log('Gallery details:', {
        id: details.id,
        title: details.title?.substring(0, 50) + '...',
        category: details.category,
        pageCount: details.pageCount,
        rating: details.rating,
        artists: details.artists?.slice(0, 3),
        tags: details.tags?.slice(0, 5),
      });
      return { success: true, data: details };
    }
    
    log('yellow', 'No details found');
    return { success: false };
  } catch (e) {
    log('red', 'Details failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function testEhentaiChapters(galleryId) {
  log('cyan', '\n=== Testing E-Hentai Chapters ===');
  console.log('Testing with ID:', galleryId);
  
  try {
    const chapters = await ehentaiScraper.getChapters(galleryId);
    console.log(`Found ${chapters.length} chapters`);
    
    if (chapters.length > 0) {
      console.log('Chapter info:', {
        id: chapters[0].id,
        title: chapters[0].title,
        chapter: chapters[0].chapter,
      });
      return { success: true, data: chapters };
    }
    
    return { success: true, data: chapters }; // E-Hentai galleries are single "chapters"
  } catch (e) {
    log('red', 'Chapters failed:', e.message);
    return { success: false, error: e.message };
  }
}

async function testEhentaiPages(chapterId, galleryId) {
  log('cyan', '\n=== Testing E-Hentai Chapter Pages ===');
  console.log('Testing with chapter ID:', chapterId);
  
  try {
    const pages = await ehentaiScraper.getChapterPages(chapterId, galleryId);
    console.log(`Found ${pages.length} pages`);
    
    if (pages.length > 0) {
      console.log('First 5 pages:');
      pages.slice(0, 5).forEach(p => {
        const url = p.originalUrl || p.url;
        console.log(`  Page ${p.page || p.index}: ${url?.substring(0, 70)}...`);
      });
      
      // Verify image URLs look valid
      const validUrls = pages.filter(p => {
        const url = p.originalUrl || p.url;
        return url && url.startsWith('http');
      });
      
      log('green', `✓ Valid image URLs: ${validUrls.length}/${pages.length}`);
      return { success: validUrls.length > 0, data: pages, validCount: validUrls.length };
    }
    
    log('yellow', 'No pages found');
    return { success: false, data: [] };
  } catch (e) {
    log('red', 'Pages failed:', e.message);
    return { success: false, error: e.message };
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     E-Hentai & Bato.to Comprehensive Test Suite            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    bato: {
      search: false,
      popular: false,
      details: false,
      chapters: false,
      pages: false,
    },
    ehentai: {
      search: false,
      popular: false,
      details: false,
      chapters: false,
      pages: false,
    },
  };
  
  // ==================== BATO TESTS ====================
  console.log('\n' + '═'.repeat(60));
  log('blue', '                    BATO.TO TESTS');
  console.log('═'.repeat(60));
  
  // Test Bato search
  const batoSearch = await testBatoSearch();
  results.bato.search = batoSearch.success;
  
  // Test Bato popular
  const batoPopular = await testBatoPopular();
  results.bato.popular = batoPopular.success;
  
  // Use a manga from popular results for further tests
  let batoTestManga = null;
  if (batoPopular.success && batoPopular.data.length > 0) {
    batoTestManga = batoPopular.data[0];
    console.log(`\n>>> Using test manga: "${batoTestManga.title}" (${batoTestManga.id})`);
    
    // Test details
    const batoDetails = await testBatoDetails(batoTestManga.id);
    results.bato.details = batoDetails.success;
    
    // Test chapters
    const batoChapters = await testBatoChapters(batoTestManga.id);
    results.bato.chapters = batoChapters.success;
    
    // Test pages (if chapters found)
    if (batoChapters.success && batoChapters.data.length > 0) {
      const firstChapter = batoChapters.data[0];
      const batoPages = await testBatoPages(firstChapter.id, batoTestManga.id);
      results.bato.pages = batoPages.success;
    }
  }
  
  // ==================== E-HENTAI TESTS ====================
  console.log('\n' + '═'.repeat(60));
  log('blue', '                   E-HENTAI TESTS');
  console.log('═'.repeat(60));
  
  // Test E-Hentai search
  const ehentaiSearch = await testEhentaiSearch();
  results.ehentai.search = ehentaiSearch.success;
  
  // Test E-Hentai popular
  const ehentaiPopular = await testEhentaiPopular();
  results.ehentai.popular = ehentaiPopular.success;
  
  // Use a gallery from results for further tests
  let ehentaiTestGallery = null;
  if (ehentaiPopular.success && ehentaiPopular.data.length > 0) {
    ehentaiTestGallery = ehentaiPopular.data[0];
    console.log(`\n>>> Using test gallery: "${ehentaiTestGallery.title?.substring(0, 40)}..." (${ehentaiTestGallery.id})`);
    
    // Test details
    const ehentaiDetails = await testEhentaiDetails(ehentaiTestGallery.id);
    results.ehentai.details = ehentaiDetails.success;
    
    // Test chapters
    const ehentaiChapters = await testEhentaiChapters(ehentaiTestGallery.id);
    results.ehentai.chapters = ehentaiChapters.success;
    
    // Test pages (if chapters found)
    if (ehentaiChapters.success && ehentaiChapters.data.length > 0) {
      const chapter = ehentaiChapters.data[0];
      const ehentaiPages = await testEhentaiPages(chapter.id, ehentaiTestGallery.id);
      results.ehentai.pages = ehentaiPages.success;
    }
  }
  
  // ==================== SUMMARY ====================
  console.log('\n' + '═'.repeat(60));
  log('blue', '                    TEST SUMMARY');
  console.log('═'.repeat(60));
  
  console.log('\nBato.to Results:');
  Object.entries(results.bato).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log('\nE-Hentai Results:');
  Object.entries(results.ehentai).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  });
  
  const batoAllPassed = Object.values(results.bato).every(v => v);
  const ehentaiAllPassed = Object.values(results.ehentai).every(v => v);
  const allPassed = batoAllPassed && ehentaiAllPassed;
  
  console.log('\n' + '─'.repeat(60));
  console.log(`Bato.to:   ${batoAllPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  console.log(`E-Hentai:  ${ehentaiAllPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  console.log('─'.repeat(60));
  console.log(`Overall:   ${allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
