import { NextResponse } from 'next/server';
import comickSource from '@/lib/manga/sources/comick';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:COMICK');

export const dynamic = 'force-dynamic';

/**
 * Get Comick chapter pages
 */
export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const hid = params.hid;
    
    // Get chapter pages
    const pages = await comickSource.getChapterPages(hid);
    
    const duration = Date.now() - startTime;
    log.api('GET', `/api/comick/chapter/${hid}`, 200, duration);

    return NextResponse.json({
      success: true,
      data: pages,
      meta: {
        chapterId: hid,
        pageCount: pages.length,
        source: 'comick'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Comick chapter error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Chapter not found',
      details: error.message
    }, { status: 404 });
  }
}
