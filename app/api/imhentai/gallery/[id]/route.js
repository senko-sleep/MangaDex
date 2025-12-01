import { NextResponse } from 'next/server';
import imhentaiSource from '@/lib/manga/sources/imhentai';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:IMHENTAI');

export const dynamic = 'force-dynamic';

/**
 * Get IMHentai gallery details and pages
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const galleryId = params.id;
    const { searchParams } = new URL(request.url);
    const includePages = searchParams.get('pages') === 'true';
    
    // Get gallery details
    const details = await imhentaiSource.getMangaDetails(galleryId);
    
    // Optionally get pages
    let pages = [];
    if (includePages) {
      pages = await imhentaiSource.getChapterPages(galleryId);
    }
    
    const duration = Date.now() - startTime;
    log.api('GET', `/api/imhentai/gallery/${galleryId}`, 200, duration);

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
        source: 'imhentai',
        adult: true
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`IMHentai gallery error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Gallery not found',
      details: error.message
    }, { status: 404 });
  }
}
