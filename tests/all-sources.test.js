import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Import all scrapers
import MangaDexScraper from '../server/scrapers/mangadex.js';
import { KitsuScraper } from '../server/scrapers/kitsu.js';
import { BatoScraper } from '../server/scrapers/bato.js';
import { ComickScraper } from '../server/scrapers/comick.js';
import NHentaiScraper from '../server/scrapers/nhentai.js';
import { EHentaiScraper } from '../server/scrapers/ehentai.js';
import { IMHentaiScraper } from '../server/scrapers/imhentai.js';
import MangakakalotScraper from '../server/scrapers/mangakakalot.js';
import MangaSeeSScraper from '../server/scrapers/mangasee.js';
import ManganotoScraper from '../server/scrapers/manganato.js';

const TIMEOUT = 15000; // 15 seconds per source

const scrapers = {
  mangadex: new MangaDexScraper(),
  kitsu: new KitsuScraper(),
  bato: new BatoScraper(),
  comick: new ComickScraper(),
  nhentai: new NHentaiScraper(),
  ehentai: new EHentaiScraper(),
  imhentai: new IMHentaiScraper(),
  mangakakalot: new MangakakalotScraper(),
  mangasee: new MangaSeeSScraper(),
  manganato: new ManganotoScraper(),
};

const results = {
  passed: [],
  failed: [],
};

const logTest = (name, status, message = '') => {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${name.padEnd(30)} ${message}`);
  if (status === 'PASS') {
    results.passed.push(name);
  } else {
    results.failed.push({ name, message });
  }
};

const testWithTimeout = (promise, name) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
    ),
  ]).catch(err => {
    throw err;
  });
};

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         COMPREHENSIVE SOURCE TEST SUITE                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

for (const [name, scraper] of Object.entries(scrapers)) {
  console.log(`\n📖 Testing ${name.toUpperCase()}`);
  console.log('─'.repeat(60));

  // Test getPopular
  try {
    const result = await testWithTimeout(
      scraper.getPopular(1, true, 'popular'),
      `${name}-getPopular`
    );
    logTest(
      `${name}.getPopular()`,
      'PASS',
      `${result?.length || 0} results`
    );
  } catch (e) {
    logTest(
      `${name}.getPopular()`,
      'FAIL',
      e.message.substring(0, 50)
    );
  }

  // Test getLatest
  try {
    const result = await testWithTimeout(
      scraper.getLatest(1, true),
      `${name}-getLatest`
    );
    logTest(
      `${name}.getLatest()`,
      'PASS',
      `${result?.length || 0} results`
    );
  } catch (e) {
    logTest(
      `${name}.getLatest()`,
      'FAIL',
      e.message.substring(0, 50)
    );
  }

  // Test search
  try {
    const result = await testWithTimeout(
      scraper.search('test', 1, true),
      `${name}-search`
    );
    logTest(
      `${name}.search()`,
      'PASS',
      `${result?.length || 0} results`
    );
  } catch (e) {
    logTest(
      `${name}.search()`,
      'FAIL',
      e.message.substring(0, 50)
    );
  }
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                     TEST SUMMARY                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}\n`);

if (results.failed.length > 0) {
  console.log('Failed tests:');
  results.failed.forEach(({ name, message }) => {
    console.log(`  - ${name}: ${message}`);
  });
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED!\n');
  process.exit(0);
}
