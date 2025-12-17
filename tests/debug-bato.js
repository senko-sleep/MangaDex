import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugBato() {
  try {
    // Try different Bato domains
    const domains = [
      'https://bato.to',
      'https://batotoo.com',
      'https://dto.to',
      'https://mangatoto.com',
      'https://readbato.to',
    ];
    
    let url = '';
    let res = null;
    
    for (const domain of domains) {
      try {
        console.log('Trying domain:', domain);
        url = `${domain}/v3x-search?langs=en&sort=views_a&page=1`;
        res = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 15000,
        });
        console.log('Success with domain:', domain);
        break;
      } catch (e) {
        console.log('  Failed:', e.message.substring(0, 50));
      }
    }
    
    if (!res) {
      console.error('All domains failed');
      return;
    }
    
    const $ = cheerio.load(res.data);
    
    console.log('\n--- Link analysis ---');
    console.log('Total <a> tags:', $('a').length);
    console.log('Links with /title/:', $('a[href*="/title/"]').length);
    console.log('Links with /series/:', $('a[href*="/series/"]').length);
    
    // Sample some links
    console.log('\n--- Sample /title/ links ---');
    let count = 0;
    $('a[href*="/title/"]').each((i, el) => {
      if (count++ >= 10) return;
      const href = $(el).attr('href');
      const text = $(el).text().trim().substring(0, 40);
      console.log(`  ${href}`);
      console.log(`    text: "${text}"`);
    });
    
    // Check for images near title links
    console.log('\n--- Looking for manga cards ---');
    
    // Try different patterns
    const patterns = [
      'div[data-hk]',
      '.manga-item',
      '.item-cover',
      '.item',
      'article',
      '.card',
    ];
    
    for (const pattern of patterns) {
      const found = $(pattern).length;
      if (found > 0) {
        console.log(`Pattern "${pattern}": ${found} elements`);
      }
    }
    
    // Look at page structure
    console.log('\n--- Page structure ---');
    $('div').each((i, el) => {
      const classList = $(el).attr('class') || '';
      const dataHk = $(el).attr('data-hk') || '';
      if (classList && (classList.includes('item') || classList.includes('card') || classList.includes('manga'))) {
        console.log(`Found: div.${classList.split(' ')[0]}`);
      }
      if (dataHk && i < 20) {
        console.log(`data-hk: ${dataHk}`);
      }
    });
    
    // Check for specific selectors that work
    console.log('\n--- Testing specific selector ---');
    
    // The site might use different layouts. Let's look at what contains images
    const imgCount = $('img').length;
    console.log('Total images:', imgCount);
    
    // Find images that look like covers
    $('img').slice(0, 10).each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src && !src.includes('data:')) {
        console.log(`Img ${i}: ${src.substring(0, 60)}...`);
      }
    });
    
    // Save sample HTML for analysis
    const htmlSample = res.data.substring(0, 5000);
    console.log('\n--- HTML sample (first 2000 chars) ---');
    console.log(htmlSample.substring(0, 2000));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

debugBato();
