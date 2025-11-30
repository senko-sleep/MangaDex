import { createLogger } from '@/lib/logger';
import * as sources from '@/lib/manga/sources/index';
import * as imageCache from '@/lib/manga/imageCache';
import * as db from '@/lib/manga/database';
import { getTagStats } from '@/lib/manga/tagManager';
import { getRecentLogs } from '@/lib/logger';
import { NextResponse } from 'next/server';

const log = createLogger('API:STATUS');

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get('logs') === 'true';
    const logLines = parseInt(searchParams.get('logLines') || '50');
    
    // Get all source statuses
    const sourceStatus = sources.getSourceStatus();
    const availableSources = sources.getAvailableSources(true);
    
    // Get cache stats
    const cacheStats = imageCache.getCacheStats();
    
    // Get database stats
    const dbStats = db.getStats();
    
    // Get tag stats
    const tagStats = getTagStats();

    const response = {
      success: true,
      status: availableSources.length > 0 ? 'online' : 'offline',
      sources: {
        available: availableSources.length,
        total: Object.keys(sourceStatus).length,
        details: sourceStatus
      },
      database: {
        manga: dbStats.totalManga,
        chapters: dbStats.totalChapters,
        lastScrape: dbStats.lastScrape
      },
      cache: cacheStats,
      tags: {
        total: tagStats.totalTags,
        groups: tagStats.groupCounts
      },
      timestamp: new Date().toISOString()
    };

    // Include recent logs if requested
    if (includeLogs) {
      response.logs = getRecentLogs(logLines);
    }

    return NextResponse.json(response);
  } catch (error) {
    log.error(`Status check error: ${error.message}`);
    return NextResponse.json({
      success: false,
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}
