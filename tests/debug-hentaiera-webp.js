// Test WebP URLs for Hentaiera galleries and browser-like behavior
async function test() {
  console.log('=== Gallery 1702056 (test gallery) ===');
  const r1 = await fetch('https://hentaiera.com/gallery/1702056/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const h1 = await r1.text();
  const sid = (h1.match(/id="load_server"[^>]*value="([^"]*)"/i) || [])[1];
  const dir = (h1.match(/id="load_dir"[^>]*value="([^"]*)"/i) || [])[1];
  const lid = (h1.match(/id="load_id"[^>]*value="([^"]*)"/i) || [])[1];
  const n = (h1.match(/id="load_pages"[^>]*value="([^"]*)"/i) || [])[1];
  console.log('server:', sid, 'dir:', dir, 'id:', lid, 'pages:', n);
  for (const ext of ['jpg', 'webp']) {
    const u = 'https://m' + sid + '.hentaiera.com/' + dir + '/' + lid + '/1.' + ext;
    const rr = await fetch(u, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://hentaiera.com/' }
    });
    console.log('1.' + ext, '->', rr.status, rr.headers.get('content-type'));
  }

  console.log('\n=== Gallery 1702623 WebP no referer (hotlink check) ===');
  const r3 = await fetch('https://m11.hentaiera.com/032/jog0u1fbh6/1.webp', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('no referer webp:', r3.status, r3.headers.get('content-type'));

  console.log('\n=== WebP browser-like request ===');
  const r4 = await fetch('https://m11.hentaiera.com/032/jog0u1fbh6/1.webp', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer': 'http://localhost:3000/',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site'
    }
  });
  console.log('browser-like webp:', r4.status, r4.headers.get('content-type'));

  console.log('\n=== Proxy with .webp URL ===');
  const r5 = await fetch('http://localhost:3002/api/proxy/image?url=' + encodeURIComponent('https://m11.hentaiera.com/032/jog0u1fbh6/1.webp'));
  console.log('proxy webp:', r5.status, r5.headers.get('content-type'));

  console.log('\n=== Check if pages endpoint returns URLs we can proxy ===');
  const r6 = await fetch('http://localhost:3002/api/pages/hentaiera%3A1702623/hentaiera%3A1702623');
  const d6 = await r6.json();
  console.log('pages:', d6.pages?.length, 'first url:', d6.pages?.[0]?.url);
}

test().catch(e => console.error('Error:', e.message));

