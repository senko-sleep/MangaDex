import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:HITOMI');

export const dynamic = 'force-dynamic';

/**
 * Hitomi.la API - Adult content: manga, doujinshi, CG sets, anime
 * 
 * Query params:
 * - type: all, doujinshi, manga, artistcg, gamecg, anime, imageset
 * - language: all, japanese, english, chinese, korean, spanish, russian
 * - q: search query
 * - page: page number (default: 1)
 * - limit: results per page (default: 24, max: 100)
 * - sort: latest, popular (default: latest)
 */
 export async function GET(request) {
  return NextResponse.json(
    {
      success: false,
      error: 'Hitomi source has been removed'
    },
    { status: 410 }
  );
 }
