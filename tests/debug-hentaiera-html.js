// Debug Hentaiera gallery HTML structure
async function run() {
  const url = 'https://hentaiera.com/gallery/1702623/';
  console.log('Fetching:', url);
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await r.text();
  console.log('status:', r.status, 'len:', html.length);

  // Look for load_* hidden inputs
  const inputs = html.match(/<input[^>]*load_[^>]*>/gi);
  console.log('\nHIDDEN INPUTS:', inputs ? inputs.slice(0, 10) : 'NONE');

  // Look for image extensions in the page (full image URLs)
  const exts = html.match(/m\d+\.hentaiera\.com[^"' ]*\.(jpg|png|webp|gif)/gi);
  console.log('\nEXT SAMPLES (full):', exts ? exts.slice(0, 10) : 'NONE');

  // Look for thumbnail image data-src
  const thumbs = html.match(/data-src="([^"]*hentaiera[^"]*)"/gi);
  console.log('\nTHUMB data-src:', thumbs ? thumbs.slice(0, 5) : 'NONE');

  // Look for gthumb class structure
  const gthumb = html.match(/class="[^"]*gthumb[^"]*"[^>]*>[\s\S]{0,500}/i);
  console.log('\nGTHUMB sample:', gthumb ? gthumb[0].slice(0, 500) : 'NONE');

  // Extract each input value
  ['load_server', 'load_dir', 'load_id', 'load_pages', 'load_ext'].forEach(id => {
    const m = html.match(new RegExp(`id=["']${id}["'][^>]*value=["']([^"']*)["']`, 'i'));
    console.log(`\n${id}:`, m ? m[1] : 'NONE');
  });

  // Look for any extension hints near load inputs
  const loadArea = html.match(/<input[^>]*load_[^>]*>/g);
  if (loadArea) {
    console.log('\nFull input tags:');
    loadArea.forEach(t => console.log(' ', t.trim()));
  }
}

run().catch(e => console.error('Error:', e.message));

