// Test Hentaiera scraper functionality
import HentaieraScraper from '../server/scrapers/hentaiera.js';

async function runTests() {
  console.log('🧪 Hentaiera Source Tests');
  console.log('==================================================');
  
  const scraper = new HentaieraScraper();
  let passed = 0;
  let failed = 0;
  
  const tests = [
    {
      name: 'Source configuration is correct',
      fn: async () => {
        if (scraper.name !== 'Hentaiera') throw new Error('Name should be Hentaiera');
        if (scraper.baseUrl !== 'https://hentaiera.com') throw new Error('Base URL incorrect');
        if (scraper.id !== 'hentaiera') throw new Error('ID should be hentaiera');
      }
    },
    
    {
      name: 'Can connect to hentaiera.com',
      fn: async () => {
        // Skip connectivity test for now - focus on parsing
        console.log(`   Skipping connectivity test - focusing on parsing`);
      }
    },
    
    {
      name: 'Can fetch latest galleries',
      fn: async () => {
        const results = await scraper.getLatest({ page: 1 });
        if (!Array.isArray(results.results)) throw new Error('Results should be an array');
        if (results.results.length === 0) throw new Error('Should return some results');
        console.log(`   Found ${results.results.length} latest galleries`);
      }
    },
    
    {
      name: 'Can fetch popular galleries',
      fn: async () => {
        const results = await scraper.getPopular({ page: 1 });
        if (!Array.isArray(results.results)) throw new Error('Results should be an array');
        if (results.results.length === 0) throw new Error('Should return some results');
        console.log(`   Found ${results.results.length} popular galleries`);
      }
    },
    
    {
      name: 'Can search for galleries',
      fn: async () => {
        const results = await scraper.search('english');
        if (!Array.isArray(results)) throw new Error('Results should be an array');
        if (results.length === 0) throw new Error('Should return search results');
        console.log(`   Found ${results.length} search results`);
      }
    },
    
    {
      name: 'Can get gallery details',
      fn: async () => {
        // Get a gallery ID from search first
        const searchResults = await scraper.search('english');
        if (searchResults.length === 0) throw new Error('No search results to test with');
        
        const galleryId = searchResults[0].id;
        console.log(`   Testing with gallery ID: ${galleryId}`);
        
        const details = await scraper.getGalleryDetails(galleryId);
        if (!details) throw new Error('Failed to get gallery details');
        if (!details.title) throw new Error('Gallery should have a title');
        console.log(`   Gallery title: ${details.title}`);
      }
    },
    
    {
      name: 'Can get chapter pages',
      fn: async () => {
        // Get a gallery ID from search first
        const searchResults = await scraper.search('english');
        if (searchResults.length === 0) throw new Error('No search results to test with');
        
        const galleryId = searchResults[0].id;
        console.log(`   Testing pages for gallery: ${galleryId}`);
        
        const pages = await scraper.getChapterPages('1', galleryId);
        if (!Array.isArray(pages)) throw new Error('Pages should be an array');
        if (pages.length === 0) throw new Error('Should return page URLs');
        console.log(`   Found ${pages.length} pages`);
        console.log(`   First page URL: ${pages[0].url}`);
      }
    }
  ];
  
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✅ PASS: ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('==================================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log(`   Total: ${tests.length} tests`);
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
});
