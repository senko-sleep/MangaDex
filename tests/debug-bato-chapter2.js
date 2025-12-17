import axios from 'axios';

async function debugBatoChapter() {
  // Try a different chapter format
  const urls = [
    'https://batotoo.com/chapter/1559540',  // Old /chapter/ format
    'https://batotoo.com/title/81514-solo-leveling-official/1559540',  // New format
    'https://batotoo.com/title/81514-solo-leveling-official/1559540-ch_100',  // With chapter suffix
  ];
  
  for (const url of urls) {
    console.log('\n' + '='.repeat(70));
    console.log('Trying:', url);
    console.log('='.repeat(70));
    
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 30000,
        maxRedirects: 5,
      });
      
      console.log('Status:', res.status);
      console.log('Final URL:', res.request?.res?.responseUrl || 'unknown');
      
      const html = res.data;
      
      // Check for imgHttps
      const imgHttpsMatch = html.match(/(?:const|var|let)\s+imgHttps\s*=\s*(\[[\s\S]*?\]);/);
      console.log('imgHttps found:', !!imgHttpsMatch);
      
      // Check for astro component data
      const astroDataMatch = html.match(/data-astro-cid-[a-z0-9]+/g);
      console.log('Astro components:', astroDataMatch?.length || 0);
      
      // Look for any image array patterns
      const patterns = [
        { name: 'images array', pattern: /images\s*[=:]\s*\[[\s\S]*?\]/ },
        { name: 'pageImages', pattern: /pageImages\s*[=:]\s*\[[\s\S]*?\]/ },
        { name: 'chapterImages', pattern: /chapterImages\s*[=:]\s*\[[\s\S]*?\]/ },
        { name: 'imgList', pattern: /imgList\s*[=:]\s*\[[\s\S]*?\]/ },
        { name: 'imageList', pattern: /imageList\s*[=:]\s*\[[\s\S]*?\]/ },
      ];
      
      for (const {name, pattern} of patterns) {
        const match = html.match(pattern);
        if (match) {
          console.log(`Found ${name}:`, match[0].substring(0, 100) + '...');
        }
      }
      
      // Check page title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      console.log('Page title:', titleMatch?.[1] || 'unknown');
      
      // Count image URLs
      const imgPattern = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi;
      const imgUrls = [...new Set(html.match(imgPattern) || [])];
      console.log('Unique image URLs:', imgUrls.length);
      if (imgUrls.length > 0 && imgUrls.length <= 10) {
        imgUrls.forEach(u => console.log('  -', u.substring(0, 70)));
      }
      
    } catch (e) {
      console.log('Error:', e.message);
      if (e.response) {
        console.log('Response status:', e.response.status);
      }
    }
  }
}

debugBatoChapter();
