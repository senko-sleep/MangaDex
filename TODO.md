# TODO: Fix Hentaiera Gallery Reader

## Root Cause
Hentaiera CDN serves gallery images with **mixed extensions** (verified for gallery 1702623:
pages 1,3,4,6,7,8,9,10 = `.webp`, pages 2,5 = `.jpg`; cover = `.jpg`). Blindly converting
everything to `.webp` breaks some pages/covers.

The backend image proxy `/api/proxy/image?url=...` has **extension fallback**
(`.webp` -> `.jpg` -> `.png` -> `.gif`) and is proven to return 200 for ALL pages + covers.

## Steps
- [x] **Investigate** - Root cause analysis completed
  - Hentaiera CDN serves mixed `.webp`/`.jpg` image extensions
  - Backend `/api/proxy/image` with extension fallback resolves ALL images correctly
  - `/api/manga/:id/chapters` and `/api/pages/:mangaId/:chapterId` work correctly

- [x] **Fix `server/scrapers/hentaiera.js`**
  - Removed `toWebpUrl()` blanket conversion (broke pages 2/5 of mixed galleries)
  - Emit original-extension URLs (`.jpg`) — proxy handles extension fallback
  - Improved cover extraction: `data-src` on `.cover img`, `img[data-src*="cover."]`,
    `img[data-src*="hentaiera"]`, then `.g_thumb img` fallback
  - Thumbnail fallback keeps original extension (no forced `.webp`)

- [x] **Fix `src/pages/ChapterReaderPage.jsx`**
  - Add `toProxyUrl()` helper to route Hentaiera CDN images through `/api/proxy/image`
  - Apply in `fetchFromBackend()` for Hentaiera page URLs
  - Apply in `fetchHentaieraClientSide()` fallback URLs (primary loop + thumbnails)

- [x] **Fix `src/lib/imageUtils.js`**
  - Route Hentaiera cover URLs through the backend proxy in `normalizeCoverUrl()` /
    `proxyHentaieraUrl()` — MangaCard, MangaGrid, MangaDetailPage all covered

- [x] **Verify grid cards** - MangaCard uses `getCoverUrl()` which routes Hentaiera covers
  through proxy (verified no change needed)

- [x] **Run tests**
  - `node tests/hentaiera-backend.test.js` → **7 passed, 0 failed**
  - `node tests/hentaiera.test.js` → **7 passed, 0 failed**
  - Verified `/api/proxy/image` returns 200 for all 10 pages of gallery 1702623
    (pages 2 & 5 → `image/jpeg`, rest → `image/webp`)
  - Cover proxy → `200 image/jpeg`
  - Restarted backend + started Vite dev server; verified full flow via port 3000 proxy

## Completed
- Confirmed mixed extension behavior (pages 2,5 are `.jpg`, rest `.webp`)
- Confirmed proxy extension fallback returns 200 for all pages + covers + thumbnails
- Confirmed Express route ordering works (chapters + pages endpoints respond)
- Detail endpoint returns coverUrl + title for gallery 1702623
- All 10 chapter pages resolve through the reader path

## Verification Commands
```bash
# Backend scraper tests
node tests/hentaiera-backend.test.js

# Source-level tests
node tests/hentaiera.test.js

# Check ports (3000 = Vite, 3002 = backend)
node tests/check-ports.js
```

