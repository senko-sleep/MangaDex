import { NextResponse } from 'next/server';
import KitsuSource from '@/lib/manga/sources/kitsu';
import { createLogger } from '@/lib/logger';

const kitsuSource = KitsuSource;

const log = createLogger('API:KITSU');

export const dynamic = 'force-dynamic';

/**
 * Kitsu API - Anime/Manga database
 * 
 * Query params:
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 100)
 * - sort: latest, popular, rating (default: popular)
 * - status: ongoing, completed, hiatus, all (default: all)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const sort = searchParams.get('sort') || 'popular';
    const status = searchParams.get('status') || '';

    let results = [];

    if (query) {
      // Search mode
      results = await kitsuSource.search(query, { 
        limit, 
        page,
        status: status || undefined
      });
    } else if (sort === 'latest') {
      // Latest mode
      results = await (kitsuSource.getLatest?.({ limit, status: status || undefined }) || kitsuSource.search('', { limit, page, status: status || undefined }));
    } else if (sort === 'rating') {
      // Rating mode
      results = await (kitsuSource.getPopular?.({ limit, status: status || undefined }) || kitsuSource.search('', { limit, page, status: status || undefined }));
    } else {
      // Popular mode (default)
      results = await (kitsuSource.getPopular?.({ limit, status: status || undefined }) || kitsuSource.search('', { limit, page, status: status || undefined }));
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/kitsu', 200, duration);

    return NextResponse.json({
      success: true,
      data: results.slice(0, limit),
      query,
      page,
      limit,
      sort,
      source: 'kitsu',
      duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Kitsu API error', { error: error.message, duration });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch from Kitsu',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
