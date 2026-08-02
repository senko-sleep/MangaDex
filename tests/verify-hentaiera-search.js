// Verify the fixed Hentaiera search returns real matching results without duplicates
import HentaieraScraper from '../server/scrapers/hentaiera.js';

async function run() {
  const scraper = new HentaieraScraper();
  
  console.log('=== Testing search for "naruto" ===');
  const results = await scraper.search('naruto', { page: 1 });
  
  console.log(`Results: ${results.length}`);
  
  // Check for duplicates
  const ids = results.map(r => r.id);
  const uniqueIds = new Set(ids);
  console.log(`Unique IDs: ${uniqueIds.size}`);
  console.log(`Duplicates: ${results.length - uniqueIds.size}`);
  
  // Check titles match the query
  const matching = results.filter(r => r.title.toLowerCase().includes('naruto'));
  console.log(`Titles containing "naruto": ${matching.length}/${results.length}`);
  
  console.log('\nFirst 10 results:');
  results.slice(0, 10).forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.id}] ${r.title.substring(0, 70)}`);
    console.log(`     cover: ${r.coverImage ? r.coverImage.substring(0, 60) : 'NONE'}`);
  });

  // Also test another query
  console.log('\n=== Testing search for "futanari" ===');
  const results2 = await scraper.search('futanari', { page: 1 });
  console.log(`Results: ${results2.length}`);
  const ids2 = results2.map(r => r.id);
  console.log(`Unique IDs: ${new Set(ids2).size}`);
  const matching2 = results2.filter(r => r.title.toLowerCase().includes('futanari'));
  console.log(`Titles containing "futanari": ${matching2.length}/${results2.length}`);
  results2.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.id}] ${r.title.substring(0, 70)}`);
  });
}

run().catch(e => console.error('Error:', e.message));

