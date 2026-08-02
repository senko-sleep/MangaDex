import { NextResponse } from 'next/server';
import imhentaiSource from '@/lib/manga/sources/imhentai';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:IMHENTAI');

export const dynamic = 'force-dynamic';

/**
 * Get IMHentai gallery details and pages
 * Note: IMHentai currently has Cloudflare protection on gallery pages (403 errors)
 * This endpoint returns direct URLs so the frontend can make requests directly from the browser
 * which should pass Cloudflare naturally since it's a real browser request.
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const galleryId = params.id;
    const { searchParams } = new URL(request.url);
    const includePages = searchParams.get('pages') === 'true';
    
    // Get gallery details (may fail due to Cloudflare)
    let details = null;
    let pages = [];
    
    try {
      details = await imhentaiSource.getMangaDetails(galleryId);
      
      // Optionally get pages (may fail due to Cloudflare)
      if (includePages && details) {
        pages = await imhentaiSource.getChapterPages(galleryId);
      }
    } catch (error) {
      // Handle Cloudflare 403 errors by returning direct URLs for client-side fetching
      if (error.message.includes('403') || error.message.includes('Cloudflare')) {
        log.warn(`IMHentai gallery blocked by Cloudflare, returning direct URLs: ${galleryId}`);
        
        // Return direct URLs that the frontend can fetch from the browser
        const directGalleryUrl = `https://imhentai.xxx/gallery/${galleryId.replace('imhentai:', '')}/`;
        
        return NextResponse.json({
          success: true,
          data: {
            id: galleryId,
            sourceId: 'imhentai',
            title: `Gallery ${galleryId}`,
            // Return direct URL for client-side fetching
            directUrl: directGalleryUrl,
            requiresClientSide: true,
            pages: includePages ? [] : undefined
          },
          meta: {
            galleryId,
            includePages,
            pageCount: 0,
            source: 'imhentai',
            adult: true,
            note: 'Gallery requires client-side fetching due to Cloudflare protection'
          }
        });
      }
      throw error;
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
