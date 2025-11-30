/**
 * Simplified Catch-all API Route
 * Most routes are now handled by dedicated route files:
 * - /api/manga/* - Manga listing, search, details
 * - /api/status - Source connectivity status
 * - /api/cache - Image cache management  
 * - /api/tags - Tag management
 * 
 * This catch-all handles legacy routes for backwards compatibility
 */

import { NextResponse } from 'next/server';
import * as sources from '@/lib/manga/sources/index';
import { getCacheStats } from '@/lib/manga/imageCache';
import { getTagStats } from '@/lib/manga/tagManager';

export const dynamic = 'force-dynamic';

// GET /api/stats - Get statistics (legacy support)
async function getStats() {
  try {
    const availableSources = sources.getAvailableSources(true);
    const cacheStats = getCacheStats();
    const tagStats = getTagStats();
    
    return NextResponse.json({
      success: true,
      data: {
        mangaCount: cacheStats.mangaCount,
        chapterCount: cacheStats.chapterCount,
        totalViews: 0, // Not tracked in simplified version
        cacheSize: cacheStats.sizeFormatted,
        tagCount: tagStats.totalTags,
        sourceAvailable: availableSources.length > 0
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// Main route handler
export async function GET(request, { params }) {
  const path = params?.path || [];
  
  if (path.length === 0) {
    return NextResponse.json({ 
      message: 'MangaDex API',
      version: '2.0.0',
      source: 'MangaDex',
      endpoints: [
        '/api/manga - Search and list manga',
        '/api/manga/search - Search manga',
        '/api/manga/:id - Get manga details',
        '/api/manga/:id/chapters - List chapters',
        '/api/manga/:id/chapters/:chapterId - Get chapter pages',
        '/api/status - Check source connectivity',
        '/api/cache - Manage image cache',
        '/api/tags - Manage tags'
      ]
    });
  }
  
  // Legacy stats endpoint
  if (path[0] === 'stats') {
    return getStats();
  }
  
  return NextResponse.json(
    { success: false, error: 'Route not found. Use dedicated endpoints.' },
    { status: 404 }
  );
}

export async function POST(request, { params }) {
  return NextResponse.json(
    { success: false, error: 'POST operations removed. Use MangaDex source directly.' },
    { status: 404 }
  );
}

export async function DELETE(request, { params }) {
  return NextResponse.json(
    { success: false, error: 'DELETE operations removed. Use MangaDex source directly.' },
    { status: 404 }
  );
}
