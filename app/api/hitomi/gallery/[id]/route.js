import { NextResponse } from 'next/server';
import hitomiSource from '@/lib/manga/sources/hitomi';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:HITOMI_GALLERY');

export const dynamic = 'force-dynamic';

/**
 * Hitomi.la Gallery Details API
 * GET /api/hitomi/gallery/[id] - Get gallery details
 * GET /api/hitomi/gallery/[id]?pages=true - Include page URLs
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includePages = searchParams.get('pages') === 'true';

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Gallery ID is required'
      }, { status: 400 });
    }

    // Get gallery details
    const gallery = await hitomiSource.getMangaDetails(id);
    
    if (!gallery) {
      return NextResponse.json({
        success: false,
        error: 'Gallery not found'
      }, { status: 404 });
    }

    // Optionally include pages
    let pages = null;
    if (includePages) {
      try {
        pages = await hitomiSource.getChapterPages(id);
      } catch (error) {
        log.warn(`Failed to fetch pages for gallery ${id}:`, error.message);
      }
    }

    const duration = Date.now() - startTime;
    log.api('GET', `/api/hitomi/gallery/${id}`, 200, duration);

    return NextResponse.json({
      success: true,
      data: {
        ...gallery,
        pages: pages || undefined
      },
      meta: {
        id,
        source: 'hitomi',
        adult: true,
        pageCount: pages?.length || gallery.pages || 0
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Hitomi gallery API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch gallery',
      details: error.message
    }, { status: 500 });
  }
}
