/**
 * IMHentai Search Test
 * Tests that search, popular, and latest are working correctly
 */

import { IMHentaiScraper } from '../server/scrapers/imhentai.js';

async function testIMHentai() {
  const scraper = new IMHentaiScraper();
  
  console.log('Testing IMHentai scraper...\n');
  
  // Test search with "dagasi"
  console.log('1. Testing search for "dagasi"...');
  try {
    const searchResults = await scraper.search('dagasi', { page: 1 });
    console.log(`Found ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log('First 5 results:');
      searchResults.slice(0, 5).forEach((result, i) => {
        console.log(`  ${i + 1}. [${result.contentType}] ${result.title}`);
      });
    }
  } catch (e) {
    console.error('Search test failed:', e.message);
  }
  
  console.log('\n2. Testing popular (should use popular endpoint)...');
  try {
    const popularResults = await scraper.getPopular({ page: 1 });
    console.log(`Found ${popularResults.length} results`);
    if (popularResults.length > 0) {
      console.log('First 5 results:');
      popularResults.slice(0, 5).forEach((result, i) => {
        console.log(`  ${i + 1}. [${result.contentType}] ${result.title}`);
      });
    }
  } catch (e) {
    console.error('Popular test failed:', e.message);
  }
  
  console.log('\n3. Testing latest (should use homepage)...');
  try {
    const latestResults = await scraper.getLatest({ page: 1 });
    console.log(`Found ${latestResults.length} results`);
    if (latestResults.length > 0) {
      console.log('First 5 results:');
      latestResults.slice(0, 5).forEach((result, i) => {
        console.log(`  ${i + 1}. [${result.contentType}] ${result.title}`);
      });
    }
  } catch (e) {
    console.error('Latest test failed:', e.message);
  }
  
  console.log('\n4. Testing search with empty query (should fallback to popular)...');
  try {
    const emptySearchResults = await scraper.search('', { page: 1 });
    console.log(`Found ${emptySearchResults.length} results`);
    if (emptySearchResults.length > 0) {
      console.log('First 3 results:');
      emptySearchResults.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i + 1}. [${result.contentType}] ${result.title}`);
      });
    }
  } catch (e) {
    console.error('Empty search test failed:', e.message);
  }
  
  console.log('\nTest complete!');
}

// Run the test
testIMHentai().catch(console.error);
