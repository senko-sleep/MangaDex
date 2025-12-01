import { NextResponse } from 'next/server';
import hitomiSource, { HITOMI_TYPES, HITOMI_LANGUAGES } from '@/lib/manga/sources/hitomi';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:HITOMI');

export const dynamic = 'force-dynamic';

/**
 * Hitomi.la API - Adult content: manga, doujinshi, CG sets, anime
 * 
 * Query params:
 * - type: all, doujinshi, manga, artistcg, gamecg, anime, imageset
 * - language: all, japanese, english, chinese, korean, spanish, russian
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 100)
 * - sort: latest, popular (default: latest)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') || 'all';
    const language = searchParams.get('language') || 'all';
    const query = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const sort = searchParams.get('sort') || 'latest';

    // Validate type
    const validTypes = Object.values(HITOMI_TYPES);
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid type. Valid types: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    // Validate language
    const validLanguages = Object.values(HITOMI_LANGUAGES);
    if (!validLanguages.includes(language)) {
      return NextResponse.json({
        success: false,
        error: `Invalid language. Valid languages: ${validLanguages.join(', ')}`
      }, { status: 400 });
    }

    let results = [];

    if (query) {
      // Search mode
      results = await hitomiSource.search(query, { 
        limit, 
        page, 
        type, 
        language 
      });
    } else if (sort === 'popular') {
      // Popular mode
      results = await hitomiSource.getPopular({ 
        limit, 
        type, 
        language 
      });
    } else if (type === 'all') {
      // Latest from all types (mixed)
      results = await hitomiSource.getLatest({ 
        limit, 
        page, 
        language 
      });
    } else {
      // Type-specific browse
      results = await hitomiSource.getByType(type, { 
        limit, 
        page, 
        language 
      });
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/hitomi', 200, duration);

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        type,
        language,
        query: query || null,
        page,
        limit,
        sort,
        count: results.length,
        hasMore: results.length === limit,
        source: 'hitomi',
        adult: true
      },
      availableTypes: validTypes,
      availableLanguages: validLanguages
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Hitomi API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch from Hitomi',
      details: error.message
    }, { status: 500 });
  }
}
