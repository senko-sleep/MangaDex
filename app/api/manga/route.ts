import { createLogger } from '@/lib/logger';
import * as sources from '@/lib/manga/sources/index';
import * as db from '@/lib/manga/database';
import { getPopularTags } from '@/lib/manga/tagManager';

const log = createLogger('API:MANGA');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const includeAdult = searchParams.get('adult') !== 'false';
    const localOnly = searchParams.get('local') === 'true';

    let manga = [];
    let fromCache = false;

    // Try local database first
    if (query) {
      const localResults = db.searchLocalManga(query, { limit, adult: includeAdult });
      if (localResults.results.length > 0) {
        manga = localResults.results;
        fromCache = true;
      }
    } else {
      const localPopular = db.getPopularLocalManga({ limit, adult: includeAdult });
      if (localPopular.length > 0) {
        manga = localPopular;
        fromCache = true;
      }
    }

    // If not enough results or not local only, fetch from sources
    if (!localOnly && manga.length < limit) {
      try {
        if (query) {
          const sourceResults = await sources.searchAllSources(query, { 
            limit, 
            includeAdult,
            timeout: 8000
          });
          
          // Save to local database
          for (const m of sourceResults) {
            db.saveManga(m);
          }
          
          // Merge with local results (deduplicate)
          const existingIds = new Set(manga.map(m => m.id));
          for (const m of sourceResults) {
            if (!existingIds.has(m.id)) {
              manga.push(m);
            }
          }
        } else {
          const sourcePopular = await sources.getPopularManga({ limit, includeAdult });
          
          for (const m of sourcePopular) {
            db.saveManga(m);
          }
          
          const existingIds = new Set(manga.map(m => m.id));
          for (const m of sourcePopular) {
            if (!existingIds.has(m.id)) {
              manga.push(m);
            }
          }
        }
        fromCache = false;
      } catch (error) {
        log.warn('Source fetch failed, using cached results', { error: (error as Error).message });
      }
    }

    const duration = Date.now() - startTime;
    log.api('GET', '/api/manga', 200, duration);

    return NextResponse.json({
      success: true,
      data: manga.slice(0, limit),
      cached: fromCache,
      sources: sources.getSourceStatus(),
      pagination: {
        page,
        limit,
        total: manga.length,
        hasMore: manga.length >= limit
      }
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API:MANGA] Error (${duration}ms):`, errMessage);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manga', details: errMessage },
      { status: 500 }
    );
  }
}
