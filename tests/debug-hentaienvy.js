// Debug HentaiEnvy site structure
async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  return { status: r.status, html: await r.text() };
}

async function run() {
  console.log('======== HentaiEnvy Homepage ========');
  const { status, html } = await fetchText('https://hentaienvy.com/');
  console.log('status:', status, 'len:', html.length);

  // Extract gallery links
  const galLinks = [...new Set([...html.matchAll(/href=['"]([^'"]*gallery[^'"]*)['"]/gi)].map(m => m[1]))];
  console.log('\n--- Gallery links (unique) ---');
  galLinks.slice(0, 20).forEach(l => console.log(' ', l));

  // Extract img tags
  console.log('\n--- Sample img tags ---');
  [...html.matchAll(/<img[^>]*>/gi)].slice(0, 15).forEach(m => console.log(' ', m[0].substring(0, 250)));

  // Extract title anchors
  console.log('\n--- Title anchors ---');
  const titleAnchors = [...html.matchAll(/<a[^>]*href=['"]([^'"]*gallery[^'"]*)['"][^>]*>([^<]{1,120})<\/a>/gi)].slice(0, 15);
  titleAnchors.forEach(m => console.log('  href:', m[1], '| text:', m[2].trim().substring(0, 80)));

  // Look for cover images
  console.log('\n--- Cover image URLs ---');
  const covers = [...html.matchAll(/(?:data-src|src)=['"]([^'"]*(?:cover|thumbs?|media|img)[^'"]*)['"]/gi)].map(m => m[1]);
  [...new Set(covers)].slice(0, 15).forEach(c => console.log(' ', c.substring(0, 150)));

  // Find pagination
  console.log('\n--- Pagination ---');
  const pag = [...html.matchAll(/<a[^>]*class=['"][^'"]*page[^'"]*['"][^>]*href=['"]([^'"]*)['"]/gi)].slice(0, 10);
  pag.forEach(m => console.log(' ', m[1]));

  // Find the main content container classes
  console.log('\n--- Content container classes ---');
  const containers = [...html.matchAll(/class=['"]([^'"]*(?:gallery|grid|item|thumb|card|list|row)[^'"]*)['"]/gi)].map(m => m[1]);
  [...new Set(containers)].slice(0, 20).forEach(c => console.log(' ', c));

  console.log('\n\n======== HentaiEnvy Gallery Page ========');
  // Get first gallery link
  if (galLinks.length > 0) {
    const galUrl = galLinks[0].startsWith('http') ? galLinks[0] : 'https://hentaienvy.com' + galLinks[0];
    console.log('Testing gallery URL:', galUrl);
    const { status: s2, html: h2 } = await fetchText(galUrl);
    console.log('status:', s2, 'len:', h2.length);

    // Look for image patterns
    console.log('\n--- Full-size image URLs ---');
    const imgs = [...h2.matchAll(/(?:src|data-src)=['"]([^'"]+\.(?:jpg|jpeg|png|gif|webp)[^'"]*)['"]/gi)].map(m => m[1]);
    [...new Set(imgs)].slice(0, 20).forEach(u => console.log(' ', u.substring(0, 180)));

    // Look for hidden inputs or JS config
    console.log('\n--- Config/hidden inputs ---');
    ['load_server', 'load_dir', 'load_id', 'load_pages', 'load_ext', 'server', 'dir', 'config', 'base_url'].forEach(key => {
      const m = h2.match(new RegExp(`(?:id|name)=['"]${key}['"][^>]*value=['"]([^'"]*)['"]`, 'i')) ||
                h2.match(new RegExp(`['"]${key}['"]\\s*[:=]\\s*['"]([^'"]+)['"]`, 'i'));
      if (m) console.log(`  ${key}: ${m[1].substring(0, 120)}`);
    });

    // Look for thumbnail grid
    console.log('\n--- Thumbnail img tags ---');
    [...h2.matchAll(/<img[^>]*>/gi)].slice(0, 10).forEach(m => console.log(' ', m[0].substring(0, 250)));

    // Look for slider/reader scripts
    console.log('\n--- Script references ---');
    const scripts = [...h2.matchAll(/<script[^>]*src=['"]([^'"]+)['"]/gi)].map(m => m[1]);
    scripts.forEach(s => console.log(' ', s));

    // Search for json config like {p: [urls]}
    console.log('\n--- Possible JSON page configs ---');
    const jsonCfg = h2.match(/\{['"]pages?['"]\s*:\s*\[[^\]]{0,500}/i) ||
                    h2.match(/var\s+\w+\s*=\s*\{[^}]{0,500}/i);
    if (jsonCfg) console.log(' ', jsonCfg[0].substring(0, 500));
  }
}

run().catch(e => console.error('ERR:', e.message));

