import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const MANGADEX_API = 'https://api.mangadex.org';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '36', 10), 100);

    // Build MangaDex API URL
    const params = new URLSearchParams({
      limit: limit.toString(),
      'includes[]': 'cover_art',
      'order[followedCount]': 'desc',
      'contentRating[]': 'safe',
      'hasAvailableChapters': 'true',
    });
    
    if (query) {
      params.set('title', query);
    }

    const response = await fetch(`${MANGADEX_API}/manga?${params}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      throw new Error('MangaDex API error');
    }

    const data = await response.json();
    
    // Transform MangaDex response
    const manga = data.data?.map((item: any) => {
      const cover = item.relationships?.find((r: any) => r.type === 'cover_art');
      const coverFile = cover?.attributes?.fileName;
      
      return {
        id: item.id,
        title: item.attributes?.title?.en || item.attributes?.title?.['ja-ro'] || Object.values(item.attributes?.title || {})[0] || 'Unknown',
        coverUrl: coverFile ? `https://uploads.mangadex.org/covers/${item.id}/${coverFile}.256.jpg` : null,
        status: item.attributes?.status || 'unknown',
        rating: item.attributes?.rating?.average?.toFixed(1),
        sourceId: 'mangadex',
        author: item.relationships?.find((r: any) => r.type === 'author')?.attributes?.name,
        chapterCount: item.attributes?.lastChapter ? parseInt(item.attributes.lastChapter) : null,
      };
    }) || [];

    return NextResponse.json({ success: true, data: manga });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
