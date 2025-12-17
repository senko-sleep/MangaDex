import { NextResponse } from 'next/server';
import comickSource from '@/lib/manga/sources/comick';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:COMICK');

export const dynamic = 'force-dynamic';

/**
 * Get Comick manga chapters
 * 
 * Query params:
 * - lang: language code (default: en)
 * - page: page number (default: 1)
 * - limit: results per page (default: 100, max: 300)
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const slug = params.slug;
    const { searchParams } = new URL(request.url);
    
    const language = searchParams.get('lang') || 'en';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(300, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));
    
    // Get chapters
    const chapters = await comickSource.getChapters(slug, {
      language,
      page,
      limit
    });
    
    const duration = Date.now() - startTime;
    log.api('GET', `/api/comick/manga/${slug}/chapters`, 200, duration);

    return NextResponse.json({
      success: true,
      data: chapters,
      meta: {
        slug,
        language,
        page,
        limit,
        count: chapters.length,
        hasMore: chapters.length === limit,
        source: 'comick'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Comick chapters error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chapters',
      details: error.message
    }, { status: 500 });
  }
}
