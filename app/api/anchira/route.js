import { NextResponse } from 'next/server';
import anchiraSource, { ANCHIRA_CATEGORIES } from '@/lib/manga/sources/anchira';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:ANCHIRA');

export const dynamic = 'force-dynamic';

/**
 * Anchira API - Quality doujinshi/manga source
 * 
 * Query params:
 * - category: all, doujinshi, manga, artbook, webtoon
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 50)
 * - sort: latest, popular, views, date (default: latest)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category') || 'all';
    const query = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const sort = searchParams.get('sort') || 'date';

    // Validate category
    const validCategories = Object.values(ANCHIRA_CATEGORIES);
    if (!validCategories.includes(category)) {
      return NextResponse.json({
        success: false,
        error: `Invalid category. Valid categories: ${validCategories.join(', ')}`
      }, { status: 400 });
    }

    let results = [];

    if (query) {
      // Search mode
      results = await anchiraSource.search(query, { 
        limit, 
        page, 
        category,
        sort
      });
    } else if (sort === 'popular' || sort === 'views') {
      // Popular mode
      results = await anchiraSource.getPopular({ 
        limit, 
        category
      });
    } else {
      // Latest browse
      results = await anchiraSource.getLatest({ 
        limit, 
        page, 
        category
      });
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/anchira', 200, duration);

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
        source: 'anchira',
        adult: true
      },
      availableCategories: validCategories
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Anchira API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch from Anchira',
      details: error.message
    }, { status: 500 });
  }
}
