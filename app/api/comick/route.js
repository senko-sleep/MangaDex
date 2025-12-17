import { NextResponse } from 'next/server';
import comickSource, { COMICK_TYPES, COMICK_SORT } from '@/lib/manga/sources/comick';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:COMICK');

export const dynamic = 'force-dynamic';

/**
 * Comick API - Large mainstream manga aggregator
 * 
 * Query params:
 * - type: all, manga, manhwa, manhua, comic
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 100)
 * - sort: follow, view, rating, uploaded, created_at (default: uploaded)
 * - tag: filter by genre/tag
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') || 'all';
    const query = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const sort = searchParams.get('sort') || 'uploaded';
    const tag = searchParams.get('tag') || '';

    // Validate type
    const validTypes = Object.values(COMICK_TYPES);
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid type. Valid types: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    let results = [];

    if (query) {
      // Search mode
      results = await comickSource.search(query, { 
        limit, 
        page, 
        type
      });
    } else if (tag) {
      // Tag search
      results = await comickSource.searchByTag(tag, {
        limit,
        page
      });
    } else if (sort === 'follow' || sort === 'popular') {
      // Popular mode
      results = await comickSource.getPopular({ 
        limit, 
        page,
        type
      });
    } else if (sort === 'rating') {
      // Top rated
      results = await comickSource.getTopRated({ 
        limit, 
        page
      });
    } else if (sort === 'created_at') {
      // Recently added
      results = await comickSource.getRecentlyAdded({ 
        limit, 
        page
      });
    } else {
      // Latest updates
      results = await comickSource.getLatest({ 
        limit, 
        page, 
        type
      });
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/comick', 200, duration);

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        type,
        query: query || null,
        tag: tag || null,
        page,
        limit,
        sort,
        count: results.length,
        hasMore: results.length === limit,
        source: 'comick',
        adult: false
      },
      availableTypes: validTypes,
      availableSorts: Object.values(COMICK_SORT)
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Comick API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch from Comick',
      details: error.message
    }, { status: 500 });
  }
}
