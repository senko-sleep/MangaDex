import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:IMHENTAI:CLIENT');

export const dynamic = 'force-dynamic';

/**
 * Client-side IMHentai proxy endpoint
 * Returns the direct URL that the frontend should fetch from the browser
 * This allows the browser to handle Cloudflare naturally
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const galleryId = params.id;
    const { searchParams } = new URL(request.url);
    const includePages = searchParams.get('pages') === 'true';
    
    // Return direct URL for client-side fetching
    const directGalleryUrl = `https://imhentai.xxx/gallery/${galleryId.replace('imhentai:', '')}/`;
    
    const duration = Date.now() - startTime;
    log.api('GET', `/api/imhentai/client/${galleryId}`, 200, duration);

    return NextResponse.json({
      success: true,
      data: {
        id: galleryId,
        sourceId: 'imhentai',
        directUrl: directGalleryUrl,
        requiresClientSide: true,
        message: 'Fetch this URL from the browser to bypass Cloudflare',
        clientSideInstructions: {
          step1: 'Use the directUrl provided',
          step2: 'Fetch from browser using normal fetch()',
          step3: 'Parse the HTML response for page information',
          step4: 'Build image URLs using the pattern: https://m{server}.imhentai.xxx/{dir}/{loadId}/{page}.{ext}'
        }
      },
      meta: {
        galleryId,
        source: 'imhentai',
        adult: true,
        note: 'Client-side fetching required due to Cloudflare protection'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`IMHentai client endpoint error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate client URL',
      details: error.message
    }, { status: 500 });
  }
}
