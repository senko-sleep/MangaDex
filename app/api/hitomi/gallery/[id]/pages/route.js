import { NextResponse } from 'next/server';
import hitomiSource from '@/lib/manga/sources/hitomi';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:HITOMI_PAGES');

export const dynamic = 'force-dynamic';

/**
 * Hitomi.la Gallery Pages API
 * GET /api/hitomi/gallery/[id]/pages - Get all page URLs for a gallery
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Gallery ID is required'
      }, { status: 400 });
    }

    const pages = await hitomiSource.getChapterPages(id);
    
    if (!pages || pages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No pages found for this gallery'
      }, { status: 404 });
    }

    const duration = Date.now() - startTime;
    log.api('GET', `/api/hitomi/gallery/${id}/pages`, 200, duration);

    return NextResponse.json({
      success: true,
      data: pages,
      meta: {
        galleryId: id,
        pageCount: pages.length,
        source: 'hitomi',
        adult: true
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Hitomi pages API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch gallery pages',
      details: error.message
    }, { status: 500 });
  }
}
