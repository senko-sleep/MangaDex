import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:HITOMI_TYPE');

export const dynamic = 'force-dynamic';

/**
 * Hitomi.la Type-specific API
 * GET /api/hitomi/doujinshi
 * GET /api/hitomi/manga
 * GET /api/hitomi/artistcg
 * GET /api/hitomi/gamecg
 * GET /api/hitomi/anime
 * GET /api/hitomi/imageset
 */
 export async function GET(request, { params }) {
  return NextResponse.json(
    {
      success: false,
      error: 'Hitomi source has been removed'
    },
    { status: 410 }
  );
 }
