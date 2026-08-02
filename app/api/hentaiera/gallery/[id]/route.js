import { NextResponse } from 'next/server';
import HentaieraScraper from '@/server/scrapers/hentaiera';

const scraper = new HentaieraScraper();

export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log('[Hentaiera Gallery API] Request for ID:', id);

    const details = await scraper.getGalleryDetails(id);

    if (!details) {
      return NextResponse.json(
        { error: 'Gallery not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error('[Hentaiera Gallery API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery details' },
      { status: 500 }
    );
  }
}
