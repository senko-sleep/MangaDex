# TODO: Fix Hentaiera Search

## Root Cause
Hentaiera search form uses `name="key"` as the search parameter, NOT `q`.
The current code builds `/search/?q=${query}` which Hentaiera ignores, returning
latest galleries instead of actual search matches.

Additionally, `parseGalleryList` matches ALL `a[href*="/gallery/"]` anchors. Each
gallery block has TWO anchors (thumbnail image link + title link), causing every
result to be duplicated.

## Steps
- [x] Investigate - Confirmed search form uses `key` param
- [x] Verify - `/search/?key=naruto` returns real Naruto results
- [x] Fix `server/scrapers/hentaiera.js`
  - [x] Change `search()` URL from `?q=` to `?key=`
  - [x] Rewrite `parseGalleryList` to parse `div.thumb` blocks (no duplicates)
- [x] Verify - Run `node tests/hentaiera.test.js` → 7 passed, 0 failed
- [x] Verify - Run `node tests/hentaiera-backend.test.js` → 7 passed, 0 failed
- [x] Verify - Backend `GET /api/manga/search?q=naruto&sources=hentaiera&adult=only` → 20 unique relevant results
- [x] Verify - `node tests/verify-hentaiera-search.js` → 20 unique IDs, 0 duplicates, real matches
- [x] Cleanup - Remove temporary debug scripts

## Verification Results
- Search "naruto" → 20 results, 20 unique IDs, 0 duplicates (NARUKO 4, Anko x Naruto & Sasuke, Jikage Rising, etc.)
- Search "futanari" → 20 results, 20 unique IDs, 0 duplicates
- Existing test suite still passes (7/7 in both test files)

