import axios from 'axios';

async function debugBatoChapter() {
  const chapterId = '1559540';  // Solo Leveling chapter
  const mangaSlug = '81514-solo-leveling-official';
  
  const url = `https://batotoo.com/title/${mangaSlug}/${chapterId}`;
  console.log('Fetching:', url);
  
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 30000,
    });
    
    const html = res.data;
    
    // Look for imgHttps patterns
    console.log('\n--- Looking for imgHttps array ---');
    const imgHttpsMatch = html.match(/(?:const|var|let)\s+imgHttps\s*=\s*(\[[\s\S]*?\]);/);
    if (imgHttpsMatch) {
      console.log('Found imgHttps array!');
      console.log('Content preview:', imgHttpsMatch[1].substring(0, 200) + '...');
    } else {
      console.log('No imgHttps array found');
    }
    
    // Look for imgHttpLis
    console.log('\n--- Looking for imgHttpLis array ---');
    const imgHttpLisMatch = html.match(/(?:const|var|let)\s+imgHttpLis\s*=\s*(\[[\s\S]*?\]);/);
    if (imgHttpLisMatch) {
      console.log('Found imgHttpLis array!');
      console.log('Content preview:', imgHttpLisMatch[1].substring(0, 200) + '...');
    } else {
      console.log('No imgHttpLis array found');
    }
    
    // Look for batoWord/batoPass (encrypted)
    console.log('\n--- Looking for encryption patterns ---');
    const batoWordMatch = html.match(/const\s+batoWord\s*=\s*["']([^"']+)["']/);
    const batoPassMatch = html.match(/const\s+batoPass\s*=\s*["']([^"']+)["']/);
    if (batoWordMatch) console.log('Found batoWord:', batoWordMatch[1].substring(0, 50) + '...');
    if (batoPassMatch) console.log('Found batoPass:', batoPassMatch[1].substring(0, 50) + '...');
    
    // Look for any image URLs in scripts
    console.log('\n--- Looking for image URLs in scripts ---');
    const imgUrlPattern = /(https?:\/\/[^\s"'<>]+(?:mbimg|mbeaj|mbwnp|mbwww|mbtba|mbmyj|mbzcp|mbopg)[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp))/gi;
    const imgUrls = html.match(imgUrlPattern) || [];
    console.log(`Found ${imgUrls.length} potential image URLs`);
    if (imgUrls.length > 0) {
      console.log('First 5 URLs:');
      imgUrls.slice(0, 5).forEach((url, i) => console.log(`  ${i + 1}. ${url.substring(0, 70)}...`));
    }
    
    // Look for data attributes
    console.log('\n--- Looking for data attributes with images ---');
    const dataImgPattern = /data-(?:src|url|image)\s*=\s*["']([^"']+)/gi;
    const dataImgs = html.match(dataImgPattern) || [];
    console.log(`Found ${dataImgs.length} data attributes with images`);
    
    // Look for JSON objects with image arrays
    console.log('\n--- Looking for JSON image arrays ---');
    const jsonArrayPattern = /\[\s*["']https?:\/\/[^"']+["'](?:\s*,\s*["']https?:\/\/[^"']+["'])+\s*\]/g;
    const jsonArrays = html.match(jsonArrayPattern) || [];
    console.log(`Found ${jsonArrays.length} JSON arrays with URLs`);
    if (jsonArrays.length > 0) {
      jsonArrays.forEach((arr, i) => {
        if (i < 3) console.log(`Array ${i + 1} preview: ${arr.substring(0, 150)}...`);
      });
    }
    
    // Check for astro/SvelteKit patterns
    console.log('\n--- Checking for framework patterns ---');
    if (html.includes('__ASTRO')) console.log('Found Astro framework markers');
    if (html.includes('__SVELTE')) console.log('Found Svelte framework markers');
    if (html.includes('__NEXT')) console.log('Found Next.js framework markers');
    if (html.includes('__NUXT')) console.log('Found Nuxt.js framework markers');
    
    // Look at script tags
    console.log('\n--- Script tag analysis ---');
    const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    console.log(`Found ${scriptMatches.length} script tags`);
    
    // Find inline scripts with image data
    scriptMatches.forEach((script, i) => {
      if (script.includes('http') && (script.includes('.jpg') || script.includes('.png') || script.includes('.webp'))) {
        console.log(`\nScript ${i + 1} contains image URLs:`);
        console.log(script.substring(0, 500) + '...');
      }
    });
    
    // Print a sample of the HTML for inspection
    console.log('\n--- HTML sample (searching for reader content) ---');
    const readerIndex = html.indexOf('reader');
    if (readerIndex !== -1) {
      console.log('Found "reader" at index', readerIndex);
      console.log(html.substring(Math.max(0, readerIndex - 100), readerIndex + 500));
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

debugBatoChapter();
