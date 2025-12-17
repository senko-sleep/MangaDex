import { NextResponse } from 'next/server';
import anchiraSource from '@/lib/manga/sources/anchira';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:ANCHIRA');

export const dynamic = 'force-dynamic';

/**
 * Get Anchira gallery details and pages
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const galleryId = params.id;
    const { searchParams } = new URL(request.url);
    const includePages = searchParams.get('pages') === 'true';
    
    // Get gallery details
    const details = await anchiraSource.getMangaDetails(galleryId);
    
    // Optionally get pages
    let pages = [];
    if (includePages) {
      pages = await anchiraSource.getChapterPages(galleryId);
    }
    
    const duration = Date.now() - startTime;
    log.api('GET', `/api/anchira/gallery/${galleryId}`, 200, duration);

    return NextResponse.json({
      success: true,
      data: {
        ...details,
        pages: includePages ? pages : undefined
      },
      meta: {
        galleryId,
        includePages,
        pageCount: pages.length,
        source: 'anchira',
        adult: true
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Anchira gallery error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Gallery not found',
      details: error.message
    }, { status: 404 });
  }
}
