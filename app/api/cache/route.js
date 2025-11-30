import { 
  getCacheStats, 
  clearAllCache, 
  clearMangaCache, 
  clearChapterCache,
  cleanCache 
} from '@/lib/manga/imageCache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Get cache statistics
export async function GET() {
  try {
    const stats = getCacheStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

// DELETE - Clear cache
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get('mangaId');
    const chapterId = searchParams.get('chapterId');
    const all = searchParams.get('all') === 'true';
    
    let cleared = false;
    
    if (all) {
      cleared = clearAllCache();
    } else if (mangaId && chapterId) {
      cleared = clearChapterCache(mangaId, chapterId);
    } else if (mangaId) {
      cleared = clearMangaCache(mangaId);
    } else {
      return NextResponse.json(
        { error: 'Specify mangaId, mangaId+chapterId, or all=true' },
        { status: 400 }
      );
    }
    
    const stats = getCacheStats();
    
    return NextResponse.json({
      success: true,
      cleared,
      stats
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

// POST - Clean old cache entries
export async function POST() {
  try {
    const result = await cleanCache();
    const stats = getCacheStats();
    
    return NextResponse.json({
      success: true,
      ...result,
      stats
    });
  } catch (error) {
    console.error('Cache clean error:', error);
    return NextResponse.json(
      { error: 'Failed to clean cache' },
      { status: 500 }
    );
  }
}
