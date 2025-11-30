import { 
  searchTags,
  getPopularTags,
  getTagsByGroup,
  getTagStats,
  createTag
} from '@/lib/manga/tagManager';
import { NextResponse } from 'next/server';

// Tag groups for organization
const TAG_GROUPS = [
  'genre',
  'theme', 
  'demographic',
  'format',
  'content',
  'character',
  'setting',
  'mood',
  'artist',
  'author',
  'year',
  'status',
  'language',
  'source',
  'custom'
];

export const dynamic = 'force-dynamic';

// GET - Search or list tags
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const group = searchParams.get('group');
    const popular = searchParams.get('popular') === 'true';
    const stats = searchParams.get('stats') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get stats
    if (stats) {
      const tagStats = getTagStats();
      return NextResponse.json({
        success: true,
        data: tagStats
      });
    }

    // Get popular tags
    if (popular) {
      const tags = getPopularTags(limit);
      return NextResponse.json({
        success: true,
        data: tags,
        total: tags.length
      });
    }

    // Get tags by group
    if (group && !query) {
      const result = getTagsByGroup(group, { limit, offset });
      return NextResponse.json({
        success: true,
        ...result
      });
    }

    // Search tags
    if (query) {
      const result = searchTags(query, { group, limit, offset });
      return NextResponse.json({
        success: true,
        ...result
      });
    }

    // Return available groups and stats
    const tagStats = getTagStats();
    return NextResponse.json({
      success: true,
      data: {
        groups: TAG_GROUPS,
        stats: tagStats
      }
    });
  } catch (error) {
    console.error('Tags API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST - Create a new tag
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, group, ...metadata } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const result = createTag(name, group, metadata);

    return NextResponse.json({
      success: true,
      created: !result.exists,
      tag: result.tag
    });
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
