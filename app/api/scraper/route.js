import { createLogger } from '@/lib/logger';
import * as scraper from '@/lib/manga/scraper';
import { NextResponse } from 'next/server';

const log = createLogger('API:SCRAPER');

export const dynamic = 'force-dynamic';

// GET - Get scraper status
export async function GET() {
  try {
    const status = scraper.getStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    log.error(`Scraper status error: ${error.message}`);
    return NextResponse.json(
      { success: false, error: 'Failed to get scraper status' },
      { status: 500 }
    );
  }
}

// POST - Trigger a scrape
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      action = 'full',
      query = '',
      limit = 50,
      includeAdult = true,
      updateChapters = true
    } = body;

    let result;

    switch (action) {
      case 'full':
        log.info('Starting full scrape...');
        result = await scraper.runFullScrape({ limit, includeAdult, updateChapters });
        break;
        
      case 'search':
        if (!query) {
          return NextResponse.json(
            { success: false, error: 'Query required for search scrape' },
            { status: 400 }
          );
        }
        log.info(`Starting search scrape for: ${query}`);
        result = await scraper.scrapeMangaBySearch(query, { limit, includeAdult, updateChapters });
        break;
        
      case 'update':
        log.info('Starting update of existing manga...');
        result = await scraper.updateExistingManga({ limit });
        break;
        
      case 'initialize':
        log.info('Initializing scraper...');
        await scraper.initialize();
        result = { initialized: true };
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      data: result
    });
  } catch (error) {
    log.error(`Scraper error: ${error.message}`);
    return NextResponse.json(
      { success: false, error: 'Scraper operation failed', details: error.message },
      { status: 500 }
    );
  }
}
