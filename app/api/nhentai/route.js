import { NextResponse } from 'next/server';
import NHentaiSource from '@/lib/manga/sources/nhentai';
import { createLogger } from '@/lib/logger';

const nhentaiSource = NHentaiSource;

const log = createLogger('API:NHENTAI');

export const dynamic = 'force-dynamic';

/**
 * nhentai API - Adult doujinshi library
 * 
 * Query params:
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 100)
 * - sort: latest, popular (default: latest)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const sort = searchParams.get('sort') || 'latest';

    let results = [];

    if (query) {
      // Search mode
      const searchResults = await nhentaiSource.search(query, { 
        limit, 
        page
      });
      results = searchResults;
    } else if (sort === 'popular') {
      // Popular mode
      const popularResults = await nhentaiSource.getPopular({ limit, page });
      results = popularResults.results;
    } else {
      // Latest mode (default)
      const latestResults = await nhentaiSource.getLatest({ limit, page });
      results = latestResults.results;
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/nhentai', 200, duration);

    return NextResponse.json({
      success: true,
      data: results.slice(0, limit),
      query,
      page,
      limit,
      sort,
      source: 'nhentai',
      duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('nhentai API error', { error: error.message, duration });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch from nhentai',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
