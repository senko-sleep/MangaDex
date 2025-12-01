import { NextResponse } from 'next/server';
import ehentaiSource from '@/lib/manga/sources/ehentai';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:EHENTAI');

export const dynamic = 'force-dynamic';

/**
 * Get E-Hentai gallery details and pages
 * ID format: gid/token (e.g., 123456/abcdef1234)
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const galleryId = params.id;
    const { searchParams } = new URL(request.url);
    const includePages = searchParams.get('pages') === 'true';
    
    // Get gallery details
    const details = await ehentaiSource.getMangaDetails(galleryId);
    
    // Optionally get pages
    let pages = [];
    if (includePages) {
      pages = await ehentaiSource.getChapterPages(galleryId);
    }
    
    const duration = Date.now() - startTime;
    log.api('GET', `/api/ehentai/gallery/${galleryId}`, 200, duration);

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
        source: 'ehentai',
        adult: true
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`E-Hentai gallery error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Gallery not found',
      details: error.message
    }, { status: 404 });
  }
}
