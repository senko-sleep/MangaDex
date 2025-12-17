import { NextResponse } from 'next/server';
import ehentaiSource, { EHENTAI_CATEGORIES } from '@/lib/manga/sources/ehentai';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:EHENTAI');

export const dynamic = 'force-dynamic';

/**
 * E-Hentai API - Largest doujinshi/manga/CG repository
 * 
 * Query params:
 * - category: all, doujinshi, manga, artistcg, gamecg, western, non-h, imageset, cosplay, misc
 * - q: search query
 * - page: page number (default: 0, 0-indexed)
 * - limit: results per page (default: 24, max: 50)
 * - sort: latest, popular (default: latest)
 * - rating: minimum star rating (1-5)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category') || 'all';
    const query = searchParams.get('q') || '';
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const sort = searchParams.get('sort') || 'latest';
    const minimumRating = parseInt(searchParams.get('rating') || '0', 10);

    // Validate category
    const validCategories = Object.values(EHENTAI_CATEGORIES);
    if (!validCategories.includes(category)) {
      return NextResponse.json({
        success: false,
        error: `Invalid category. Valid categories: ${validCategories.join(', ')}`
      }, { status: 400 });
    }

    let results = [];

    if (query) {
      // Search mode
      results = await ehentaiSource.search(query, { 
        limit, 
        page, 
        category,
        minimumRating
      });
    } else if (sort === 'popular') {
      // Popular mode
      results = await ehentaiSource.getPopular({ 
        limit, 
        category
      });
    } else {
      // Latest browse
      results = await ehentaiSource.getLatest({ 
        limit, 
        page, 
        category
      });
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/ehentai', 200, duration);

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        category,
        query: query || null,
        page,
        limit,
        sort,
        count: results.length,
        hasMore: results.length === limit,
        source: 'ehentai',
        adult: true
      },
      availableCategories: validCategories
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`E-Hentai API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch from E-Hentai',
      details: error.message
    }, { status: 500 });
  }
}
