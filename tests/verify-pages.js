/**
 * Verify page extraction is working correctly for both sources
 */

import { BatoScraper } from '../server/scrapers/bato.js';
import { EHentaiScraper } from '../server/scrapers/ehentai.js';

const batoScraper = new BatoScraper();
const ehentaiScraper = new EHentaiScraper();

async function verifyBatoPages() {
  console.log('\n=== Verifying Bato Page Extraction ===\n');
  
  try {
    // Search for a popular manga with known chapters
    const results = await batoScraper.search('solo leveling', 1);
    
    if (results.length === 0) {
      console.log('No search results found');
      return;
    }
    
    const manga = results[0];
    console.log(`Testing: ${manga.title} (${manga.id})`);
    
    // Get chapters
    const chapters = await batoScraper.getChapters(manga.id);
    console.log(`Found ${chapters.length} chapters`);
    
    if (chapters.length === 0) {
      console.log('No chapters found');
      return;
    }
    
    // Test a middle chapter (should have more pages)
    const testChapter = chapters[Math.floor(chapters.length / 2)];
    console.log(`\nTesting chapter ${testChapter.chapter} (ID: ${testChapter.id})`);
    
    const pages = await batoScraper.getChapterPages(testChapter.id, manga.id);
    console.log(`Found ${pages.length} pages`);
    
    if (pages.length > 0) {
      console.log('\nFirst 3 pages:');
      pages.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${(p.originalUrl || p.url).substring(0, 70)}...`);
      });
      
      console.log('\nLast 3 pages:');
      pages.slice(-3).forEach((p, i) => {
        console.log(`  ${pages.length - 2 + i}. ${(p.originalUrl || p.url).substring(0, 70)}...`);
      });
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

async function verifyEhentaiPages() {
  console.log('\n=== Verifying E-Hentai Page Extraction ===\n');
  
  try {
    // Get popular galleries
    const results = await ehentaiScraper.getLatest(1);
    
    if (results.length === 0) {
      console.log('No results found');
      return;
    }
    
    // Find a gallery with moderate page count (not too large)
    let testGallery = null;
    for (const gallery of results.slice(0, 10)) {
      const details = await ehentaiScraper.getMangaDetails(gallery.id);
      if (details && parseInt(details.pageCount) > 10 && parseInt(details.pageCount) < 100) {
        testGallery = { ...gallery, pageCount: details.pageCount };
        break;
      }
    }
    
    if (!testGallery) {
      testGallery = results[0];
    }
    
    console.log(`Testing: ${testGallery.title?.substring(0, 50)}... (${testGallery.id})`);
    console.log(`Expected pages: ${testGallery.pageCount || 'unknown'}`);
    
    // Get chapters
    const chapters = await ehentaiScraper.getChapters(testGallery.id);
    
    if (chapters.length === 0) {
      console.log('No chapters found');
      return;
    }
    
    // Get pages
    const pages = await ehentaiScraper.getChapterPages(chapters[0].id, testGallery.id);
    console.log(`Found ${pages.length} pages`);
    
    if (pages.length > 0) {
      console.log('\nFirst 3 pages:');
      pages.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${(p.originalUrl || p.url).substring(0, 70)}...`);
      });
      
      if (pages.length > 3) {
        console.log('\nLast 3 pages:');
        pages.slice(-3).forEach((p, i) => {
          console.log(`  ${pages.length - 2 + i}. ${(p.originalUrl || p.url).substring(0, 70)}...`);
        });
      }
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Page Extraction Verification                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  await verifyBatoPages();
  await verifyEhentaiPages();
  
  console.log('\n✓ Verification complete');
}

main().catch(console.error);
