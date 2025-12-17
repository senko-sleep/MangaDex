import { NextResponse } from 'next/server';
import BatoSource from '@/lib/manga/sources/bato';
import { createLogger } from '@/lib/logger';

const batoSource = BatoSource;

const log = createLogger('API:BATO');

export const dynamic = 'force-dynamic';

/**
 * Bato.to API - Large manga library with multiple languages
 * 
 * Query params:
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 100)
 * - sort: popular, latest, updated, rating (default: popular)
 * - status: ongoing, completed, hiatus, cancelled, all (default: all)
 * - language: language filter (default: en)
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
    const language = searchParams.get('language') || 'en';

    let results = [];

    if (query) {
      // Search mode
      results = await batoSource.search(query, { 
        limit, 
        page,
        status: status || undefined,
        language
      });
    } else if (sort === 'latest') {
      // Latest mode
      results = await (batoSource.getLatest?.({ limit, page, language }) || batoSource.search('', { limit, page, language }));
    } else if (sort === 'updated') {
      // Updated mode
      results = await (batoSource.getLatest?.({ limit, page, language }) || batoSource.search('', { limit, page, language }));
    } else {
      // Popular mode (default)
      results = await (batoSource.getPopular?.({ limit, page, sort, language }) || batoSource.search('', { limit, page, language }));
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/bato', 200, duration);

    return NextResponse.json({
      success: true,
      data: results.slice(0, limit),
      query,
      page,
      limit,
      sort,
      language,
      source: 'bato',
      duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Bato API error', { error: error.message, duration });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch from Bato.to',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
