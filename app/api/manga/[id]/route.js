import { createLogger } from '@/lib/logger';
import * as sources from '@/lib/manga/sources/index';
import * as db from '@/lib/manga/database';
import { getMangaTags, syncMangaDexTags } from '@/lib/manga/tagManager';
import { NextResponse } from 'next/server';

const log = createLogger('API:MANGA_DETAIL');

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Manga ID is required' },
        { status: 400 }
      );
    }

    let manga = null;
    let fromCache = false;

    // Check local database first
    const localManga = db.getManga(id);
    if (localManga) {
      manga = localManga;
      fromCache = true;
      db.incrementViews(id);
    }

    // If not found locally, fetch from sources
    if (!manga) {
      try {
        manga = await sources.getMangaDetails(id);
        
        // Save to local database
        if (manga) {
          db.saveManga(manga);
          
          // Sync tags
          if (manga.tags && manga.tags.length > 0) {
            syncMangaDexTags(id, manga.tags);
          }
        }
      } catch (error) {
        log.warn(`Failed to fetch from sources: ${error.message}`);
      }
    }

    if (!manga) {
      return NextResponse.json(
        { success: false, error: 'Manga not found' },
        { status: 404 }
      );
    }
    
    // Get local tags
    const localTags = getMangaTags(id);
    
    const duration = Date.now() - startTime;
    log.info(`GET /api/manga/${id} - ${duration}ms (cached: ${fromCache})`);

    return NextResponse.json({
      success: true,
      data: {
        ...manga,
        localTags
      },
      cached: fromCache,
      sources: sources.getSourceStatus()
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`API Error (${duration}ms): ${error.message}`);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manga', details: error.message },
      { status: 500 }
    );
  }
}
