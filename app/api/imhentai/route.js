import { NextResponse } from 'next/server';
import imhentaiSource, { IMHENTAI_CATEGORIES } from '@/lib/manga/sources/imhentai';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:IMHENTAI');

export const dynamic = 'force-dynamic';

/**
 * IMHentai API - Large adult content collection
 * 
 * Query params:
 * - category: all, manga, doujinshi, western, imageset, artistcg, gamecg
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 50)
 * - sort: latest, popular (default: latest)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category') || 'all';
    const query = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const sort = searchParams.get('sort') || 'popular';

    // Validate category
    const validCategories = Object.values(IMHENTAI_CATEGORIES);
    if (!validCategories.includes(category)) {
      return NextResponse.json({
        success: false,
        error: `Invalid category. Valid categories: ${validCategories.join(', ')}`
      }, { status: 400 });
    }

    let results = [];

    if (query) {
      // Search mode
      results = await imhentaiSource.search(query, { 
        limit, 
        page, 
        category
      });
    } else if (sort === 'popular') {
      // Popular mode
      results = await imhentaiSource.getPopular({ 
        limit, 
        category
      });
    } else if (category !== 'all') {
      // Category browse
      results = await imhentaiSource.getByCategory(category, { 
        limit, 
        page
      });
    } else {
      // Latest browse
      results = await imhentaiSource.getLatest({ 
        limit, 
        page
      });
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/imhentai', 200, duration);

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        category,
        query: query || null,
        page,
        limit,
        sort,
        count: results.length,
        hasMore: results.length === limit,
        source: 'imhentai',
        adult: true
      },
      availableCategories: validCategories
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`IMHentai API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch from IMHentai',
      details: error.message
    }, { status: 500 });
  }
}
