/**
 * Test suite to verify all sources return proper author and manga information
 * Run with: node tests/sources-author-info.test.js
 */

import MangaDexScraper from '../server/scrapers/mangadex.js';
import { KitsuScraper } from '../server/scrapers/kitsu.js';
import NHentaiScraper from '../server/scrapers/nhentai.js';
import { EHentaiScraper } from '../server/scrapers/ehentai.js';
import { IMHentaiScraper } from '../server/scrapers/imhentai.js';
import { BatoScraper } from '../server/scrapers/bato.js';

const scrapers = {
    mangadex: new MangaDexScraper(),
    kitsu: new KitsuScraper(),
    nhentai: new NHentaiScraper(),
    ehentai: new EHentaiScraper(),
    imhentai: new IMHentaiScraper(),
    bato: new BatoScraper(),
};

// Test configuration
const TEST_TIMEOUT = 15000;

// Helper to format results nicely
const formatResult = (name, result, details) => {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${name}: ${details || (result ? 'PASS' : 'FAIL')}`);
};

// Test a single source
async function testSource(name, scraper) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing: ${name.toUpperCase()}`);
    console.log('='.repeat(50));

    const results = {
        search: false,
        popular: false,
        latest: false,
        details: false,
        hasAuthor: false,
        hasCover: false,
        hasTitle: false,
        hasValidId: false,
    };

    try {
        // Test 1: Search
        console.log('\n📝 Testing search...');
        const searchTimeout = setTimeout(() => {
            console.log(`   ⏱️ Search taking longer than ${TEST_TIMEOUT}ms...`);
        }, TEST_TIMEOUT);

        const searchResults = await Promise.race([
            scraper.search('test', 1),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUT * 2))
        ]).catch(e => []);
        clearTimeout(searchTimeout);

        results.search = searchResults.length > 0;
        formatResult('Search', results.search, `${searchResults.length} results`);

        // Test 2: Popular
        console.log('\n📈 Testing popular...');
        const popularTimeout = setTimeout(() => {
            console.log(`   ⏱️ Popular taking longer than ${TEST_TIMEOUT}ms...`);
        }, TEST_TIMEOUT);

        const popularResults = await Promise.race([
            scraper.getPopular({ page: 1 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUT * 2))
        ]).catch(e => []);
        clearTimeout(popularTimeout);

        // Handle both array and object responses
        const popularData = Array.isArray(popularResults) ? popularResults : (popularResults?.results || []);
        results.popular = popularData.length > 0;
        formatResult('Popular', results.popular, `${popularData.length} results`);

        // Test 3: Latest
        console.log('\n🕐 Testing latest...');
        const latestTimeout = setTimeout(() => {
            console.log(`   ⏱️ Latest taking longer than ${TEST_TIMEOUT}ms...`);
        }, TEST_TIMEOUT);

        const latestResults = await Promise.race([
            scraper.getLatest({ page: 1 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUT * 2))
        ]).catch(e => []);
        clearTimeout(latestTimeout);

        // Handle both array and object responses  
        const latestData = Array.isArray(latestResults) ? latestResults : (latestResults?.results || []);
        results.latest = latestData.length > 0;
        formatResult('Latest', results.latest, `${latestData.length} results`);

        // Test 4: Manga Details (if we have any manga)
        const testManga = popularData[0] || latestData[0] || searchResults[0];
        if (testManga && testManga.id) {
            console.log('\n📖 Testing manga details...');
            console.log(`   Using manga: ${testManga.title || testManga.id}`);

            const detailsTimeout = setTimeout(() => {
                console.log(`   ⏱️ Details taking longer than ${TEST_TIMEOUT}ms...`);
            }, TEST_TIMEOUT);

            const details = await Promise.race([
                scraper.getMangaDetails(testManga.id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUT * 2))
            ]).catch(e => null);
            clearTimeout(detailsTimeout);

            if (details) {
                results.details = true;
                results.hasTitle = !!details.title;
                results.hasCover = !!details.cover;
                results.hasValidId = !!details.id;

                // Check for author information (different sources use different fields)
                const hasArtist = details.artists && details.artists.length > 0;
                const hasAuthorField = !!details.author || (details.authors && details.authors.length > 0);
                const hasGroups = details.groups && details.groups.length > 0;
                results.hasAuthor = hasArtist || hasAuthorField || hasGroups;

                console.log(`   📝 Title: ${details.title || 'N/A'}`);
                console.log(`   🖼️ Cover: ${details.cover ? 'YES' : 'NO'}`);
                console.log(`   🎨 Artists: ${details.artists?.join(', ') || 'N/A'}`);
                console.log(`   ✍️ Author: ${details.author || details.authors?.join(', ') || 'N/A'}`);
                console.log(`   👥 Groups: ${details.groups?.join(', ') || 'N/A'}`);
                console.log(`   🏷️ Tags: ${(details.tags || []).slice(0, 5).join(', ') || 'N/A'}`);
                console.log(`   📄 Pages: ${details.pageCount || details.pages || 'N/A'}`);

                formatResult('Details', results.details, 'Retrieved successfully');
                formatResult('Has Title', results.hasTitle);
                formatResult('Has Cover', results.hasCover);
                formatResult('Has Author/Artist', results.hasAuthor);
            } else {
                formatResult('Details', false, 'Could not retrieve');
            }
        } else {
            console.log('\n⚠️ No manga available to test details');
        }

        // Summary
        console.log('\n📊 Summary for ' + name);
        const passCount = Object.values(results).filter(Boolean).length;
        const totalCount = Object.keys(results).length;
        console.log(`   ${passCount}/${totalCount} tests passed`);

        return results;
    } catch (error) {
        console.error(`\n❌ Error testing ${name}:`, error.message);
        return results;
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting Source Information Tests');
    console.log('='.repeat(60));
    console.log('Testing all sources for author/manga information availability\n');

    const allResults = {};

    for (const [name, scraper] of Object.entries(scrapers)) {
        try {
            allResults[name] = await testSource(name, scraper);
        } catch (error) {
            console.error(`Failed to test ${name}:`, error.message);
            allResults[name] = { error: error.message };
        }
    }

    // Final summary
    console.log('\n');
    console.log('='.repeat(60));
    console.log('🏁 FINAL SUMMARY');
    console.log('='.repeat(60));

    for (const [name, results] of Object.entries(allResults)) {
        if (results.error) {
            console.log(`❌ ${name}: ERROR - ${results.error}`);
        } else {
            const passCount = Object.values(results).filter(Boolean).length;
            const totalCount = Object.keys(results).length;
            const percentage = Math.round((passCount / totalCount) * 100);
            const emoji = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
            console.log(`${emoji} ${name}: ${passCount}/${totalCount} (${percentage}%)`);
        }
    }

    console.log('\n');
}

// Run tests
runAllTests().catch(console.error);
