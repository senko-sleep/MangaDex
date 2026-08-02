import { createLogger } from '@/lib/logger';
import * as sources from '@/lib/manga/sources/index';
import * as db from '@/lib/manga/database';
import { NextResponse } from 'next/server';

const log = createLogger('API:CHAPTERS');

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { id } = params;
    const mangaId = decodeURIComponent(id);
    
    if (!mangaId) {
      return NextResponse.json(
        { error: 'Manga ID is required' },
        { status: 400 }
      );
    }

    let chapters = [];
    let fromCache = false;

    // Check local database first
    const localChapters = db.getChapters(mangaId);
    if (localChapters.length > 0) {
      chapters = localChapters;
      fromCache = true;
    }

    // If no local chapters, fetch from sources
    if (chapters.length === 0) {
      try {
        const manga = db.getManga(mangaId);
        const title = manga?.title || '';
        
        chapters = await sources.getChaptersFromAllSources(mangaId, title);
        
        // Save to local database
        if (chapters.length > 0) {
          db.saveChapters(mangaId, chapters);
        }
      } catch (error) {
        log.warn(`Failed to fetch chapters from sources: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;
    log.info(`GET /api/manga/${mangaId}/chapters - ${chapters.length} chapters (${duration}ms)`);

    return NextResponse.json({
      success: true,
      data: chapters,
      cached: fromCache,
      sources: sources.getSourceStatus(),
      pagination: {
        total: chapters.length
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Chapters API Error (${duration}ms): ${error.message}`);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapters', details: error.message },
      { status: 500 }
    );
  }
}
