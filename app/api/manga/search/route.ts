import { NextResponse, NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import sourcesModule from '@/lib/manga/sources/index';

const log = createLogger('API:SEARCH');

// Destructure what we need from sources module
const { SOURCES, getAvailableSources } = sourcesModule;

export const dynamic = 'force-dynamic';

// Content type to source mapping
const CONTENT_TYPE_SOURCES: Record<string, string[]> = {
  manga: ['mangadex', 'mangakakalot', 'mangasee', 'mangapark', 'fanfox', 'comick', 'ehentai', 'imhentai', 'hitomi', 'anchira'],
  manhwa: ['mangadex', 'mangakakalot', 'mangasee', 'mangapark', 'comick'],
  manhua: ['mangadex', 'mangakakalot', 'mangasee', 'mangapark', 'comick'],
  doujinshi: ['nhentai', 'hentairead', 'hitomi', 'ehentai', 'imhentai', 'anchira'],
  artistcg: ['hitomi', 'ehentai', 'imhentai'],
  gamecg: ['hitomi', 'ehentai', 'imhentai'],
  western: ['ehentai', 'imhentai'],
  imageset: ['hitomi', 'ehentai', 'imhentai'],
  cosplay: ['ehentai'],
  artbook: ['anchira'],
};

// Adult sources list
const ADULT_SOURCES = ['nhentai', 'hentairead', 'hitomi', 'ehentai', 'imhentai', 'anchira'];

/**
 * GET /api/manga/search
 * Comprehensive search across all sources with filtering
 * 
 * Query params:
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 100)
 * - adult: true/false/only - include adult content (default: false)
 * - type: content type filter (manga, doujinshi, artistcg, etc.)
 * - source: specific source to search (mangadex, nhentai, hitomi, etc.)
 * - sources: comma-separated list of sources to search
 * - sort: popular, latest, rating (default: popular)
 * - status: ongoing, completed, hiatus, cancelled, all (default: all)
 * - tags: comma-separated list of tags to include
 * - exclude: comma-separated list of tags to exclude
 * - language: language filter (en, ja, etc.)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const query = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const adultParam = searchParams.get('adult') || 'false';
    const contentType = searchParams.get('type') || '';
    const specificSource = searchParams.get('source') || '';
    const sourcesParam = searchParams.get('sources') || '';
    const sort = searchParams.get('sort') || 'popular';
    const status = searchParams.get('status') || 'all';
    const tagsParam = searchParams.get('tags') || '';
    const excludeParam = searchParams.get('exclude') || '';
    const language = searchParams.get('language') || '';

    // Parse adult filter
    const includeAdult = adultParam === 'true' || adultParam === 'only';
    const adultOnly = adultParam === 'only';

    // Parse tags
    const includeTags = tagsParam ? tagsParam.split(',').map(t => t.trim()).filter(Boolean) : [];
    const excludeTags = excludeParam ? excludeParam.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Determine which sources to search
    let targetSources: string[] = [];

    if (specificSource) {
      // Single specific source
      targetSources = [specificSource];
    } else if (sourcesParam) {
      // Multiple specific sources
      targetSources = sourcesParam.split(',').map(s => s.trim()).filter(Boolean);
    } else if (contentType && CONTENT_TYPE_SOURCES[contentType]) {
      // Filter by content type
      targetSources = CONTENT_TYPE_SOURCES[contentType];
    } else {
      // All available sources
      targetSources = getAvailableSources(includeAdult);
    }

    // Filter sources based on adult setting
    if (!includeAdult) {
      targetSources = targetSources.filter(s => !ADULT_SOURCES.includes(s));
    } else if (adultOnly) {
      targetSources = targetSources.filter(s => ADULT_SOURCES.includes(s));
    }

    // Get all available sources info
    const allSources = SOURCES as Record<string, any>;
    let allResults: any[] = [];
    const sourceResults: Record<string, any[]> = {};

    // Search each target source in parallel
    const searchPromises = targetSources.map(async (sourceName) => {
      const source = allSources[sourceName];
      if (!source) return { source: sourceName, results: [] };

      try {
        let results: any[] = [];

        // Build search options - give each source enough results
        const searchOptions: any = {
          limit: limit, // Don't divide - let each source return full results
          page,
          language: language || undefined
        };

        // Add content type filter for sources that support it
        if (contentType) {
          searchOptions.type = contentType;
          searchOptions.category = contentType;
        }

        // Perform search or browse based on sort preference
        if (query) {
          // Special-case: IMHentai - if query is a simple artist name, use artist page instead of generic search
          if (sourceName === 'imhentai' && /^[\w-]+$/.test(query)) {
            try {
              const pageNum = page || 1;
              const artistResults = await source.fetchArtistGalleries(query.toLowerCase(), pageNum);
              results = artistResults || [];
            } catch (e) {
              results = [];
            }
          } else {
            // Search with query
            results = await source.search(query, searchOptions);
          }
        } else if (sort === 'latest') {
          // Latest/newest first
          results = await (source.getLatest?.(searchOptions) || source.search?.('', searchOptions) || []);
        } else {
          // Default to popular
          results = await (source.getPopular?.(searchOptions) || source.search?.('', searchOptions) || []);
        }

        // Add source ID to each result
        results = (results || []).map(r => ({
          ...r,
          sourceId: sourceName,
          isAdult: ADULT_SOURCES.includes(sourceName)
        }));

        log.info(`[${sourceName}] returned ${results.length} results`);
        return { source: sourceName, results };
      } catch (error) {
        log.warn(`Search failed for ${sourceName}`, { error: (error as Error).message });
        return { source: sourceName, results: [] };
      }
    });

    // Wait for all searches with longer timeout for slow sources
    const searchResults = await Promise.race([
      Promise.allSettled(searchPromises),
      new Promise<any[]>(resolve => setTimeout(() => resolve([]), 15000))
    ]);

    // Aggregate results - use ID-based deduplication instead of title
    const seenIds = new Set<string>();

    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value) {
        const { source, results } = result.value;
        sourceResults[source] = results;

        for (const manga of results) {
          // Deduplicate by full ID (includes source prefix like imhentai:12345)
          const mangaId = manga.id || '';
          if (mangaId && !seenIds.has(mangaId)) {
            seenIds.add(mangaId);
            allResults.push(manga);
          }
        }
      }
    }

    // Filter by status if specified
    if (status !== 'all') {
      allResults = allResults.filter(m => {
        const mangaStatus = (m.status || '').toLowerCase();
        return mangaStatus.includes(status);
      });
    }

    // Filter by tags if specified
    if (includeTags.length > 0) {
      allResults = allResults.filter(m => {
        const mangaTags = (m.tags || []).map((t: string) => t.toLowerCase());
        return includeTags.some(tag => mangaTags.includes(tag.toLowerCase()));
      });
    }

    if (excludeTags.length > 0) {
      allResults = allResults.filter(m => {
        const mangaTags = (m.tags || []).map((t: string) => t.toLowerCase());
        return !excludeTags.some(tag => mangaTags.includes(tag.toLowerCase()));
      });
    }

    // Sort results
    if (sort === 'rating') {
      allResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'latest') {
      allResults.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
    }

    // Paginate
    const paginatedResults = allResults.slice(0, limit);

    const duration = Date.now() - startTime;
    log.api('GET', '/api/manga/search', 200, duration);

    return NextResponse.json({
      success: true,
      data: paginatedResults,
      meta: {
        query: query || null,
        page,
        limit,
        total: allResults.length,
        hasMore: allResults.length > limit,
        sources: targetSources,
        sourceResultCounts: Object.fromEntries(
          Object.entries(sourceResults).map(([k, v]) => [k, v.length])
        ),
        filters: {
          adult: adultParam,
          type: contentType || null,
          status: status !== 'all' ? status : null,
          sort,
          tags: includeTags.length > 0 ? includeTags : null,
          excludedTags: excludeTags.length > 0 ? excludeTags : null
        },
        duration
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Search API error (${duration}ms): ${(error as Error).message}`);

    return NextResponse.json({
      success: false,
      data: [],
      error: 'Search failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}
