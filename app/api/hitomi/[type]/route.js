import { NextResponse } from 'next/server';
import hitomiSource, { HITOMI_TYPES, HITOMI_LANGUAGES } from '@/lib/manga/sources/hitomi';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:HITOMI_TYPE');

export const dynamic = 'force-dynamic';

/**
 * Hitomi.la Type-specific API
 * GET /api/hitomi/doujinshi
 * GET /api/hitomi/manga
 * GET /api/hitomi/artistcg
 * GET /api/hitomi/gamecg
 * GET /api/hitomi/anime
 * GET /api/hitomi/imageset
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { type } = params;
    const { searchParams } = new URL(request.url);
    
    const language = searchParams.get('language') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const query = searchParams.get('q') || '';

    // Validate type
    const validTypes = Object.values(HITOMI_TYPES);
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid type "${type}". Valid types: ${validTypes.join(', ')}`
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
      // Search within type
      results = await hitomiSource.search(query, { limit, page, type, language });
    } else {
      // Get by type using specific methods for better caching
      switch (type) {
        case 'doujinshi':
          results = await hitomiSource.getDoujinshi({ limit, page, language });
          break;
        case 'manga':
          results = await hitomiSource.getManga({ limit, page, language });
          break;
        case 'artistcg':
          results = await hitomiSource.getArtistCG({ limit, page, language });
          break;
        case 'gamecg':
          results = await hitomiSource.getGameCG({ limit, page, language });
          break;
        case 'anime':
          results = await hitomiSource.getAnime({ limit, page, language });
          break;
        case 'imageset':
          results = await hitomiSource.getImageSet({ limit, page, language });
          break;
        default:
          results = await hitomiSource.getByType(type, { limit, page, language });
      }
    }

    const duration = Date.now() - startTime;
    log.api('GET', `/api/hitomi/${type}`, 200, duration);

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        type,
        language,
        query: query || null,
        page,
        limit,
        count: results.length,
        hasMore: results.length === limit,
        source: 'hitomi',
        adult: true
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Hitomi type API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch from Hitomi',
      details: error.message
    }, { status: 500 });
  }
}
