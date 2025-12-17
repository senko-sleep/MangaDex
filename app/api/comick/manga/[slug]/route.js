import { NextResponse } from 'next/server';
import comickSource from '@/lib/manga/sources/comick';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:COMICK');

export const dynamic = 'force-dynamic';

/**
 * Get Comick manga details
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const slug = params.slug;
    
    // Get manga details
    const details = await comickSource.getMangaDetails(slug);
    
    const duration = Date.now() - startTime;
    log.api('GET', `/api/comick/manga/${slug}`, 200, duration);

    return NextResponse.json({
      success: true,
      data: details,
      meta: {
        slug,
        source: 'comick'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Comick manga error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Manga not found',
      details: error.message
    }, { status: 404 });
  }
}
