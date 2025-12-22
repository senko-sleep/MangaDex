import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:HITOMI_GALLERY');

export const dynamic = 'force-dynamic';

/**
 * Hitomi.la Gallery Details API
 * GET /api/hitomi/gallery/[id] - Get gallery details
 * GET /api/hitomi/gallery/[id]?pages=true - Include page URLs
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
