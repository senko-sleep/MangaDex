import { NextResponse } from 'next/server';
import { getSourceStatus, getAvailableSources, SOURCES } from '@/lib/manga/sources/index';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:SOURCES');

export const dynamic = 'force-dynamic';

// Content type mappings per source
const SOURCE_CONTENT_TYPES = {
  // Mainstream manga sources
  mangadex: ['manga', 'manhwa', 'manhua', 'oneshot'],
  mangakakalot: ['manga', 'manhwa', 'manhua'],
  mangasee: ['manga', 'manhwa', 'manhua'],
  mangapark: ['manga', 'manhwa', 'manhua'],
  comick: ['manga', 'manhwa', 'manhua', 'comic'],
  
  // Adult content sources
  nhentai: ['doujinshi', 'manga'],
  hentairead: ['doujinshi', 'manga'],
  hitomi: ['doujinshi', 'manga', 'artistcg', 'gamecg', 'anime', 'imageset'],
  ehentai: ['doujinshi', 'manga', 'artistcg', 'gamecg', 'western', 'imageset', 'cosplay', 'non-h'],
  imhentai: ['doujinshi', 'manga', 'artistcg', 'gamecg', 'western', 'imageset'],
  anchira: ['doujinshi', 'manga', 'artbook', 'webtoon'],
};

// All available content types
const ALL_CONTENT_TYPES = [
  { id: 'manga', name: 'Manga', description: 'Japanese comics' },
  { id: 'manhwa', name: 'Manhwa', description: 'Korean comics' },
  { id: 'manhua', name: 'Manhua', description: 'Chinese comics' },
  { id: 'doujinshi', name: 'Doujinshi', description: 'Fan-made/indie works' },
  { id: 'artistcg', name: 'Artist CG', description: 'Artist illustrations/CG sets' },
  { id: 'gamecg', name: 'Game CG', description: 'Game CG/illustrations' },
  { id: 'western', name: 'Western', description: 'Western comics/art' },
  { id: 'imageset', name: 'Image Set', description: 'Image collections' },
  { id: 'cosplay', name: 'Cosplay', description: 'Cosplay photo sets' },
  { id: 'comic', name: 'Comic', description: 'General comics' },
  { id: 'artbook', name: 'Artbook', description: 'Art books' },
  { id: 'webtoon', name: 'Webtoon', description: 'Web comics' },
  { id: 'oneshot', name: 'One-shot', description: 'Single chapter works' },
  { id: 'anime', name: 'Anime', description: 'Anime-related content' },
  { id: 'non-h', name: 'Non-H', description: 'Non-adult content' },
];

/**
 * GET /api/sources
 * Returns all available sources with their status and content types
 * 
 * Query params:
 * - adult: true/false - include adult sources (default: true)
 * - type: filter by content type (manga, doujinshi, artistcg, etc.)
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const includeAdult = searchParams.get('adult') !== 'false';
    const contentType = searchParams.get('type');
    
    // Get all source statuses
    const allStatus = getSourceStatus();
    const availableSources = getAvailableSources(includeAdult);
    
    // Build detailed source info
    const sources = availableSources.map(name => {
      const status = allStatus[name];
      const source = SOURCES[name];
      
      return {
        id: name,
        name: status?.name || source?.name || name,
        url: source?.baseUrl || '',
        available: status?.available ?? true,
        adult: status?.adult ?? source?.adult ?? false,
        contentTypes: SOURCE_CONTENT_TYPES[name] || ['manga'],
        features: source?.features || [],
        lastCheck: status?.lastCheck || Date.now()
      };
    });
    
    // Filter by content type if specified
    let filteredSources = sources;
    if (contentType) {
      filteredSources = sources.filter(s => s.contentTypes.includes(contentType));
    }
    
    // Get available content types based on current sources
    const availableContentTypes = ALL_CONTENT_TYPES.filter(type => 
      filteredSources.some(s => s.contentTypes.includes(type.id))
    );
    
    // Separate into mainstream and adult sources
    const mainstreamSources = filteredSources.filter(s => !s.adult);
    const adultSources = filteredSources.filter(s => s.adult);
    
    const duration = Date.now() - startTime;
    log.api('GET', '/api/sources', 200, duration);

    return NextResponse.json({
      success: true,
      sources: filteredSources,
      mainstream: mainstreamSources,
      adult: adultSources,
      enabled: filteredSources.map(s => s.id),
      contentTypes: availableContentTypes,
      allContentTypes: ALL_CONTENT_TYPES,
      meta: {
        totalSources: filteredSources.length,
        mainstreamCount: mainstreamSources.length,
        adultCount: adultSources.length,
        includeAdult
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(`Sources API error (${duration}ms):`, error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sources',
      details: error.message
    }, { status: 500 });
  }
}
