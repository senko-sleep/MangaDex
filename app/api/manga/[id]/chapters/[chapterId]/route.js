import { createLogger } from '@/lib/logger';
import * as sources from '@/lib/manga/sources/index';
import * as db from '@/lib/manga/database';
import * as imageCache from '@/lib/manga/imageCache';
import { NextResponse } from 'next/server';

const log = createLogger('API:CHAPTER_PAGES');

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { id: mangaId, chapterId } = params;
    
    if (!mangaId || !chapterId) {
      return NextResponse.json(
        { error: 'Manga ID and Chapter ID are required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dataSaver = searchParams.get('dataSaver') === 'true';
    const download = searchParams.get('download') === 'true';

    let pages = [];
    let fromCache = false;

    // Check local cache first
    const cachedImages = db.getChapterImages(mangaId, chapterId);
    if (cachedImages.length > 0) {
      pages = cachedImages.map(img => ({
        index: img.pageIndex,
        url: imageCache.getCachedImageUrl(mangaId, chapterId, img.pageIndex, img.url),
        originalUrl: img.url,
        cached: img.cached
      }));
      fromCache = true;
    }

    // If no cached pages, fetch from source
    if (pages.length === 0) {
      try {
        // Get chapter info to find source
        const chapter = db.getChapter(mangaId, chapterId);
        const sourceId = chapter?.sourceId || 'mangadex';
        
        const chapterData = await sources.getChapterPages(chapterId, sourceId);
        
        pages = chapterData.map(page => ({
          index: page.index,
          url: imageCache.getCachedImageUrl(mangaId, chapterId, page.index, dataSaver ? (page.dataSaverUrl || page.url) : page.url),
          originalUrl: page.url,
          dataSaverUrl: page.dataSaverUrl
        }));

        // Save image references
        for (const page of chapterData) {
          db.saveImageRef(mangaId, chapterId, page.index, {
            url: page.url,
            cached: false
          });
        }
      } catch (error) {
        log.warn(`Failed to fetch pages from source: ${error.message}`);
      }
    }

    // Trigger background download if requested
    if (download && pages.length > 0) {
      const pagesToDownload = pages.map(p => ({
        index: p.index,
        url: p.originalUrl || p.url,
        dataSaverUrl: p.dataSaverUrl
      }));
      
      imageCache.downloadChapter(mangaId, chapterId, pagesToDownload, { dataSaver })
        .then(result => {
          log.info(`Downloaded chapter ${chapterId}: ${result.success} success, ${result.failed} failed`);
        })
        .catch(err => {
          log.warn(`Download failed for ${chapterId}: ${err.message}`);
        });
    }

    const duration = Date.now() - startTime;
    log.info(`GET /api/manga/${mangaId}/chapters/${chapterId} - ${pages.length} pages (${duration}ms)`);

    return NextResponse.json({
      success: true,
      data: {
        chapterId,
        mangaId,
        pageCount: pages.length,
        pages
      },
      cached: fromCache,
      sources: sources.getSourceStatus()
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Chapter Pages API Error (${duration}ms): ${error.message}`);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapter pages', details: error.message },
      { status: 500 }
    );
  }
}
