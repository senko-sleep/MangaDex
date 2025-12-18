import BaseScraper from './base.js';

// API base URL for proxy (set via environment variable in production)
const API_BASE = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';

// Bato.to - Large manga library with multiple languages
// Note: bato.to redirects to batotoo.com
export class BatoScraper extends BaseScraper {
  constructor() {
    super('Bato', 'https://batotoo.com', false);
  }

  // Return direct URL for Bato - their CDN blocks server requests
  // Browser must load with referrerPolicy="no-referrer" to bypass hotlink protection
  proxyUrl(url) {
    if (!url) return url || '';
    return url;
  }

  async search(query, page = 1, includeAdult = true, tags = [], excludeTags = [], status = null, adultOnly = false, language = null, sort = 'popular') {
    try {
      const params = new URLSearchParams();
      if (query) params.set('word', query);
      params.set('page', String(page));

      // Language filter - default to English
      params.set('langs', 'en');

      // Status filter
      if (status) {
        const statusMap = {
          'ongoing': 'ongoing',
          'completed': 'completed',
          'hiatus': 'hiatus',
          'cancelled': 'cancelled',
        };
        if (statusMap[status]) {
          params.set('release', statusMap[status]);
        }
      }

      // Map sort option to Bato's sort values
      const sortMap = {
        'popular': 'views_a',   // Most views all time
        'latest': 'create',      // Newest added
        'updated': 'update',     // Recently updated
        'rating': 'score',       // Highest rated
      };
      params.set('sort', sortMap[sort] || 'views_a');

      const searchUrl = `${this.baseUrl}/v3x-search?${params}`;
      console.log('[Bato] Searching:', searchUrl, 'sort:', sort);

      const $ = await this.fetch(searchUrl);
      if (!$) return [];

      let results = this.parseSearchResults($);

      if (adultOnly) {
        results = results.filter(m => m.isAdult);
      } else if (!includeAdult) {
        results = results.filter(m => !m.isAdult);
      }

      return results;
    } catch (e) {
      console.error('[Bato] Search error:', e.message);
      return [];
    }
  }

  async getPopular(page = 1, includeAdult = true, sort = 'popular', adultOnly = false) {
    try {
      // Map sort option to Bato's sort values
      const sortMap = {
        'popular': 'views_a',   // Most views all time
        'latest': 'create',      // Newest added
        'updated': 'update',     // Recently updated
        'rating': 'score',       // Highest rated
      };
      const batoSort = sortMap[sort] || 'views_a';
      const url = `${this.baseUrl}/v3x-search?langs=en&sort=${batoSort}&page=${page}`;
      console.log('[Bato] Fetching:', url, 'sort:', sort);

      const $ = await this.fetch(url);
      if (!$) return [];

      let results = this.parseSearchResults($);

      if (adultOnly) {
        results = results.filter(m => m.isAdult);
      } else if (!includeAdult) {
        results = results.filter(m => !m.isAdult);
      }

      return results;
    } catch (e) {
      console.error('[Bato] Popular error:', e.message);
      return [];
    }
  }

  async getLatest(page = 1, includeAdult = true, adultOnly = false) {
    try {
      // Bato browse page with sorting by latest update
      const url = `${this.baseUrl}/v3x-search?langs=en&sort=update&page=${page}`;
      console.log('[Bato] Fetching latest:', url);

      const $ = await this.fetch(url);
      if (!$) return [];

      let results = this.parseSearchResults($);

      if (adultOnly) {
        results = results.filter(m => m.isAdult);
      } else if (!includeAdult) {
        results = results.filter(m => !m.isAdult);
      }

      return results;
    } catch (e) {
      console.error('[Bato] Latest error:', e.message);
      return [];
    }
  }

  async getNewlyAdded(page = 1, includeAdult = true, adultOnly = false) {
    try {
      // Bato browse page with sorting by create date
      const url = `${this.baseUrl}/v3x-search?langs=en&sort=create&page=${page}`;
      console.log('[Bato] Fetching newly added:', url);

      const $ = await this.fetch(url);
      if (!$) return [];

      let results = this.parseSearchResults($);

      if (adultOnly) {
        results = results.filter(m => m.isAdult);
      } else if (!includeAdult) {
        results = results.filter(m => !m.isAdult);
      }

      return results;
    } catch (e) {
      console.error('[Bato] NewlyAdded error:', e.message);
      return [];
    }
  }

  async getTopRated(page = 1, includeAdult = true, adultOnly = false) {
    try {
      // Bato browse page with sorting by rating
      const url = `${this.baseUrl}/v3x-search?langs=en&sort=score&page=${page}`;
      console.log('[Bato] Fetching top rated:', url);

      const $ = await this.fetch(url);
      if (!$) return [];

      let results = this.parseSearchResults($);

      if (adultOnly) {
        results = results.filter(m => m.isAdult);
      } else if (!includeAdult) {
        results = results.filter(m => !m.isAdult);
      }

      return results;
    } catch (e) {
      console.error('[Bato] TopRated error:', e.message);
      return [];
    }
  }

  parseSearchResults($) {
    const results = [];
    const seen = new Set();

    // Bato v3 search results - each manga card contains title link and cover
    // Look for the manga title link which goes to /title/ or /series/
    // Format: /title/173794-on-the-way-to-meet-mom-utoon (manga)
    // vs /title/173794-on-the-way-to-meet-mom-utoon/3400704-ch_22 (chapter)
    $('a[href*="/title/"], a[href*="/series/"]').each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href') || '';

      // Skip chapter links (they have an additional path segment with chapter ID)
      // Chapter URLs: /title/slug/chapterid-ch_number
      if (href.match(/\/title\/[^/]+\/\d+-/)) return;

      // Extract slug from URL like /title/12345-manga-name
      const match = href.match(/\/(?:title|series)\/(\d+[-\w]*)/);
      if (!match) return;

      const slug = match[1];

      // Skip if we've already seen this manga
      if (seen.has(slug)) return;

      // Get the card/container element - go up to find a container with an image
      let $card = $link.parent();
      let attempts = 0;
      while ($card.length && !$card.find('img').length && attempts < 5) {
        $card = $card.parent();
        attempts++;
      }

      // Get title - prefer the link's own text or title attribute
      // Skip if it looks like a chapter title (contains "Chapter", "Ch.", numbers only)
      let title = $link.attr('title') || '';
      const linkText = $link.text().trim();

      // Check if text looks like a chapter title
      const isChapterTitle = /^(chapter|ch\.?)\s*\d+/i.test(linkText) ||
        /^\d+(\.\d+)?$/.test(linkText) ||
        linkText.toLowerCase().includes('[end]');

      if (!isChapterTitle && linkText) {
        title = linkText;
      }

      // If still no good title, try to extract from slug
      if (!title || isChapterTitle) {
        // Convert slug like "83510-one-piece-official" to "One Piece Official"
        const slugParts = slug.split('-').slice(1); // Remove numeric ID
        if (slugParts.length > 0) {
          title = slugParts
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }

      if (!title) return;

      // Get cover image from the card
      let cover = '';
      const $img = $card.find('img').first();
      if ($img.length) {
        cover = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || '';
      }

      // Handle relative URLs
      if (cover && cover.startsWith('/')) {
        cover = `${this.baseUrl}${cover}`;
      }

      // Get status if available
      const cardText = $card.text().toLowerCase();
      let status = 'unknown';
      if (cardText.includes('ongoing')) status = 'ongoing';
      else if (cardText.includes('completed') || cardText.includes('[end]')) status = 'completed';
      else if (cardText.includes('hiatus')) status = 'hiatus';

      // Detect if adult/mature
      const genres = [];
      $card.find('.genres a, .item-genre, a[href*="genre"]').each((_, g) => {
        genres.push($(g).text().trim().toLowerCase());
      });

      const isAdult = genres.some(g =>
        ['smut', 'mature', 'adult', 'hentai', 'yaoi', 'yuri', 'bara', 'gore'].includes(g)
      ) || cardText.includes('smut') || cardText.includes('mature') || cardText.includes('18+');

      seen.add(slug);
      results.push({
        id: `bato:${slug}`,
        sourceId: 'bato',
        slug,
        title,
        cover: this.proxyUrl(cover),
        status,
        genres: genres.map(g => g.charAt(0).toUpperCase() + g.slice(1)),
        isAdult,
      });
    });

    console.log(`[Bato] Parsed ${results.length} results`);
    return results;
  }

  async getMangaDetails(id) {
    const slug = id.replace('bato:', '');

    try {
      const url = `${this.baseUrl}/title/${slug}`;
      console.log('[Bato] Fetching details:', url);

      const $ = await this.fetch(url);
      if (!$) return null;

      // Get title - usually in h3 or main heading
      const title = $('h3.item-title a, h3 a, .detail-info h1, .item-title').first().text().trim() ||
        $('title').text().replace(' - Bato.To', '').trim();

      // Get cover - try multiple selectors for Bato's page structure
      let cover = '';

      // Try common Bato cover image selectors
      const coverSelectors = [
        'img.shadow-6',
        '.detail-set img',
        'div[data-hk] img',
        '.item-cover img',
        'img[src*="/ampi/"]',
        'img[src*="/thumb/"]',
        'img[src*="cover"]',
      ];

      for (const selector of coverSelectors) {
        const img = $(selector).first();
        const src = img.attr('src') || img.attr('data-src') || '';
        if (src && (src.includes('http') || src.startsWith('/'))) {
          cover = src;
          break;
        }
      }

      if (cover && cover.startsWith('/')) {
        cover = `${this.baseUrl}${cover}`;
      }

      console.log('[Bato] Cover found:', cover ? cover.substring(0, 80) + '...' : 'none');

      // Get description
      const description = $('div.limit-html, .detail-info .summary, .description').first().text().trim() ||
        $('meta[name="description"]').attr('content') || '';

      // Get status
      const statusText = $('div.attr-item:contains("Status"), .detail-info .status').text().toLowerCase();
      let status = 'unknown';
      if (statusText.includes('ongoing')) status = 'ongoing';
      else if (statusText.includes('completed')) status = 'completed';
      else if (statusText.includes('hiatus')) status = 'hiatus';

      // Get genres/tags
      const tags = [];
      $('div.attr-item:contains("Genres") a, .genres a, .tags a').each((_, el) => {
        const tag = $(el).text().trim();
        if (tag) tags.push(tag);
      });

      // Get authors
      const authors = [];
      $('div.attr-item:contains("Authors") a, .authors a').each((_, el) => {
        const author = $(el).text().trim();
        if (author) authors.push(author);
      });

      // Get artists
      const artists = [];
      $('div.attr-item:contains("Artists") a, .artists a').each((_, el) => {
        const artist = $(el).text().trim();
        if (artist) artists.push(artist);
      });

      // Get alternative titles
      const altTitles = [];
      $('div.attr-item:contains("Alt") span, .alt-titles span').each((_, el) => {
        const alt = $(el).text().trim();
        if (alt && alt !== title) altTitles.push(alt);
      });

      // Check if it's a long strip (webtoon/manhwa)
      const isLongStrip = tags.some(t =>
        t.toLowerCase().includes('long strip') ||
        t.toLowerCase().includes('webtoon') ||
        t.toLowerCase().includes('manhwa')
      );

      return {
        id,
        sourceId: 'bato',
        slug,
        title,
        altTitles,
        description,
        cover: this.proxyUrl(cover),
        status,
        author: authors.join(', ') || null,
        artist: artists.join(', ') || null,
        genres: tags.filter(t => !t.toLowerCase().includes('long strip')),
        tags,
        isAdult: tags.some(t =>
          ['smut', 'mature', 'adult', 'hentai', 'yaoi', 'yuri', 'bara', 'gore'].includes(t.toLowerCase())
        ),
        isLongStrip,
      };
    } catch (e) {
      console.error('[Bato] Detail error:', e.message);
      return null;
    }
  }

  async getChapters(mangaId) {
    const slug = mangaId.replace('bato:', '');
    // Extract numeric ID from slug like "81930-one-piece-official" -> "81930"
    const numericId = slug.split('-')[0];

    try {
      // Use /series/ URL which shows chapter list properly
      const url = `${this.baseUrl}/series/${numericId}/${slug.substring(numericId.length + 1) || 'manga'}`;
      console.log('[Bato] Fetching chapters:', url);

      const $ = await this.fetch(url);
      if (!$) {
        // Fallback to /title/ URL
        const fallbackUrl = `${this.baseUrl}/title/${slug}`;
        console.log('[Bato] Trying fallback URL:', fallbackUrl);
        const $fallback = await this.fetch(fallbackUrl);
        if (!$fallback) return [];
        return this.parseChaptersFromHtml($fallback, mangaId);
      }

      return this.parseChaptersFromHtml($, mangaId);
    } catch (e) {
      console.error('[Bato] Chapters error:', e.message);
      return [];
    }
  }

  parseChaptersFromHtml($, mangaId) {
    const chapters = [];
    const slug = mangaId.replace('bato:', '');

    // Method 1: Look for chapter links in the new URL format
    // New format: /title/slug/chapterid-ch_number or /title/slug/chapterid-vol_X-ch_Y
    $('a[href*="/title/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';

      // Match chapter URLs: /title/slug/chapterid-ch_XX or /title/slug/chapterid-vol_X-ch_Y
      const match = href.match(/\/title\/[^/]+\/(\d+)(?:-vol_(\d+))?-ch_([\d.]+)/i);
      if (!match) return;

      const chapterId = match[1];
      const volume = match[2] || null;
      const chapterNum = match[3];

      // Get chapter text for title
      const text = $el.text().trim();

      // Extract title (text after "Chapter XX:" pattern)
      let chapterTitle = text.replace(/^(chapter|ch\.?)\s*[\d.]+\s*[:.-]?\s*/i, '').trim();
      if (chapterTitle.match(/^[\d.]+$/)) chapterTitle = '';

      // Get date from parent/sibling elements
      const $row = $el.closest('div[data-hk], div.flex, tr');
      const dateText = $row.find('time').attr('datetime') ||
        $row.find('time').text().trim() ||
        $row.text().match(/(\d+\s*(?:days?|hours?|mins?|weeks?|months?|years?)\s*ago)/i)?.[1] || '';

      // Get scanlation group
      const groupText = $row.find('a[href*="/group/"]').text().trim() ||
        $row.find('.group').text().trim() || 'Unknown';

      // Avoid duplicates
      if (chapters.some(c => c.id === chapterId)) return;

      chapters.push({
        id: chapterId,
        mangaId,
        chapter: chapterNum,
        volume,
        title: chapterTitle || '',
        date: dateText || null,
        scanlationGroup: groupText,
        language: 'en',
        sourceId: 'bato',
      });
    });

    // Method 2: Also check for /chapter/ links (old format)
    if (chapters.length === 0) {
      $('a[href*="/chapter/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';

        const match = href.match(/\/chapter\/(\d+)/);
        if (!match) return;

        const chapterId = match[1];
        const text = $el.text().trim();

        const chapterMatch = text.match(/(?:chapter|ch\.?)\s*([\d.]+)/i) || text.match(/^([\d.]+)$/);
        const chapterNum = chapterMatch ? chapterMatch[1] : '0';

        if (!chapters.some(c => c.id === chapterId)) {
          chapters.push({
            id: chapterId,
            mangaId,
            chapter: chapterNum,
            volume: null,
            title: '',
            date: null,
            scanlationGroup: 'Unknown',
            language: 'en',
            sourceId: 'bato',
          });
        }
      });
    }

    // Method 3: Parse from raw HTML for any remaining patterns
    if (chapters.length === 0) {
      const html = $.html();
      // Pattern: /title/slug/chapterid-ch_num
      const chapterPattern = /href="\/title\/[^"]+\/(\d+)(?:-vol_\d+)?-ch_([\d.]+)"/gi;
      let match;
      while ((match = chapterPattern.exec(html)) !== null) {
        const chapterId = match[1];
        const chapterNum = match[2];

        if (!chapters.some(c => c.id === chapterId)) {
          chapters.push({
            id: chapterId,
            mangaId,
            chapter: chapterNum,
            volume: null,
            title: '',
            date: null,
            scanlationGroup: 'Unknown',
            language: 'en',
            sourceId: 'bato',
          });
        }
      }
    }

    // Sort by chapter number (descending)
    chapters.sort((a, b) => {
      const aNum = parseFloat(a.chapter) || 0;
      const bNum = parseFloat(b.chapter) || 0;
      return bNum - aNum;
    });

    console.log(`[Bato] Found ${chapters.length} chapters for ${slug}`);
    return chapters;
  }

  async getChapterPages(chapterId, mangaId) {
    try {
      // Use /chapter/chapterId format - this returns the imgHttps array
      // The /title/slug/chapterId format is just a preview page without images
      const url = `${this.baseUrl}/chapter/${chapterId}`;

      console.log('[Bato] Fetching pages:', url);

      const $ = await this.fetch(url);
      if (!$) return [];

      const pages = [];
      const html = $.html();

      // Method 1: Look for imgHttps array in script (most common for Bato v3)
      // Pattern: const imgHttps = ["url1", "url2", ...]
      // Also handles: var imgHttps = [...] or let imgHttps = [...]
      const imgHttpsMatch = html.match(/(?:const|var|let)\s+imgHttps\s*=\s*(\[[\s\S]*?\]);/);
      if (imgHttpsMatch) {
        try {
          // Clean up the JSON - handle escaped quotes and newlines
          let jsonStr = imgHttpsMatch[1]
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\n/g, '')
            .replace(/,\s*]/g, ']'); // Remove trailing commas

          const imgList = JSON.parse(jsonStr);
          imgList.forEach((src, i) => {
            if (typeof src === 'string' && src.startsWith('http')) {
              pages.push({
                page: i + 1,
                url: this.proxyUrl(src),
                originalUrl: src,
              });
            }
          });
          console.log(`[Bato] Method 1 (imgHttps): Found ${pages.length} images`);
        } catch (e) {
          console.log('[Bato] Failed to parse imgHttps JSON:', e.message);
        }
      }

      // Method 2: Look for imgHttpLis array (older format)
      if (pages.length === 0) {
        const imgHttpLisMatch = html.match(/(?:const|var|let)\s+imgHttpLis\s*=\s*(\[[\s\S]*?\]);/);
        if (imgHttpLisMatch) {
          try {
            let jsonStr = imgHttpLisMatch[1]
              .replace(/'/g, '"')
              .replace(/\n/g, '')
              .replace(/,\s*]/g, ']');
            const imgList = JSON.parse(jsonStr);
            imgList.forEach((src, i) => {
              if (typeof src === 'string' && src.startsWith('http')) {
                pages.push({
                  page: i + 1,
                  url: this.proxyUrl(src),
                  originalUrl: src,
                });
              }
            });
            console.log(`[Bato] Method 2 (imgHttpLis): Found ${pages.length} images`);
          } catch (e) {
            console.log('[Bato] Failed to parse imgHttpLis JSON:', e.message);
          }
        }
      }

      // Method 3: Look for batoWord/batoPass decryption pattern (encrypted chapters)
      if (pages.length === 0) {
        // Some chapters use encrypted image URLs that need decryption
        // Pattern: const batoWord = "..."; const batoPass = "...";
        const batoWordMatch = html.match(/const\s+batoWord\s*=\s*["']([^"']+)["']/);
        const batoPassMatch = html.match(/const\s+batoPass\s*=\s*["']([^"']+)["']/);

        if (batoWordMatch && batoPassMatch) {
          console.log('[Bato] Found encrypted chapter, attempting decryption');
          // For now, log this - decryption would require crypto-js
          // The imgHttps array should still be present after page JS execution
        }
      }

      // Method 4: Extract image URLs from HTML using CDN patterns
      if (pages.length === 0) {
        // Bato uses various CDN subdomains: s01.meo.org, s02.meo.org, etc.
        // Pattern: https://s01.meo.org/media/... or similar
        const cdnPatterns = [
          // Standard Bato CDN: s01.meo.org/media/...
          /https?:\/\/s\d+\.[a-z]+\.org\/media\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi,
          // XFS CDN pattern
          /https?:\/\/xfs-s\d+\.[a-z]+\.org\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi,
          // Legacy patterns with mbch/mbimg
          /https?:\/\/[^\s"'<>]+(?:mbimg|mbch|mbuul|mbznp|mbcej|mbeaj|mbwnp)[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/gi,
        ];

        const allMatches = [];
        for (const pattern of cdnPatterns) {
          const matches = html.match(pattern) || [];
          allMatches.push(...matches);
        }

        // Deduplicate and filter
        const uniqueUrls = [...new Set(allMatches)];

        // Filter out thumbnails (usually contain 'thumb' or 't.' in path)
        const chapterImages = uniqueUrls.filter(url =>
          !url.includes('/thumb') &&
          !url.includes('/t.') &&
          !url.includes('_thumb') &&
          !url.includes('cover')
        );

        // Sort by any numeric sequence in the URL (page numbers)
        chapterImages.sort((a, b) => {
          const numA = a.match(/(\d+)\.(jpg|jpeg|png|gif|webp)$/i)?.[1] || '0';
          const numB = b.match(/(\d+)\.(jpg|jpeg|png|gif|webp)$/i)?.[1] || '0';
          return parseInt(numA) - parseInt(numB);
        });

        chapterImages.forEach((src, i) => {
          pages.push({
            page: i + 1,
            url: this.proxyUrl(src),
            originalUrl: src,
          });
        });

        if (pages.length > 0) {
          console.log(`[Bato] Method 4 (CDN regex): Found ${pages.length} images`);
        }
      }

      // Method 5: Look for images in the reader DOM
      if (pages.length === 0) {
        const selectors = [
          'img.page-img',
          '.reader-main img',
          '.chapter-img img',
          '[data-page] img',
          '.image-horizontal img',
          '.image-vertical img',
          'img[data-src*="media"]',
          'img[src*="media"]',
        ];

        $(selectors.join(', ')).each((i, el) => {
          const $img = $(el);
          let src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || '';

          // Skip thumbnails, icons, etc.
          if (!src || src.includes('logo') || src.includes('icon') || src.includes('avatar')) return;
          if (src.includes('data:image')) return;
          if (src.includes('thumb') || src.includes('cover')) return;

          // Handle relative URLs
          if (src.startsWith('/')) {
            src = `${this.baseUrl}${src}`;
          } else if (src.startsWith('//')) {
            src = `https:${src}`;
          }

          // Only add valid image URLs
          if (src.match(/\.(jpg|jpeg|png|gif|webp)/i) && !pages.some(p => p.originalUrl === src)) {
            pages.push({
              page: pages.length + 1,
              url: this.proxyUrl(src),
              originalUrl: src,
            });
          }
        });

        if (pages.length > 0) {
          console.log(`[Bato] Method 5 (DOM): Found ${pages.length} images`);
        }
      }

      console.log(`[Bato] Total: Found ${pages.length} pages for chapter ${chapterId}`);
      return pages;
    } catch (e) {
      console.error('[Bato] Pages error:', e.message);
      return [];
    }
  }

  async getTags() {
    // Common manga genres/tags
    return [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
      'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life',
      'Sports', 'Supernatural', 'Thriller', 'Tragedy', 'Isekai',
      'Martial Arts', 'School Life', 'Shounen', 'Shoujo', 'Seinen',
      'Josei', 'Mecha', 'Historical', 'Military', 'Music', 'Harem',
      'Ecchi', 'Gender Bender', 'Cooking', 'Medical', 'Webtoon',
      'Manhwa', 'Manhua', 'Long Strip'
    ];
  }
}

export default BatoScraper;
