import { NextResponse } from 'next/server';
import HentaieraScraper from '@/server/scrapers/hentaiera';

const scraper = new HentaieraScraper();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const sort = searchParams.get('sort') || 'latest';

    console.log('[Hentaiera API] Request:', { query, page, sort });

    let results;
    
    if (query) {
      results = await scraper.search(query, { page });
    } else if (sort === 'popular') {
      const popular = await scraper.getPopular({ page });
      results = popular.results;
    } else {
      const latest = await scraper.getLatest({ page });
      results = latest.results;
    }

    return NextResponse.json({
      results,
      page,
      hasMore: results.length >= 20
    });
  } catch (error) {
    console.error('[Hentaiera API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Hentaiera', results: [] },
      { status: 500 }
    );
  }
}
