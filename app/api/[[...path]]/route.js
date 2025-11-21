import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Manga from '@/lib/models/Manga';
import Chapter from '@/lib/models/Chapter';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';
import { saveImage, saveCoverImage } from '@/lib/imageStorage';
import { getServerSession } from 'next-auth';

const ITEMS_PER_PAGE = 20;

// Helper function to check auth
async function checkAuth(request) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'admin') {
    return false;
  }
  return true;
}

// GET /api/manga - List all manga with pagination and filters
async function getMangaList(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || ITEMS_PER_PAGE.toString());
    const search = searchParams.get('q') || '';
    const genre = searchParams.get('genre') || '';
    const status = searchParams.get('status') || '';
    const includeHentai = searchParams.get('includeHentai') === 'true';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;
    
    const query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (!includeHentai) {
      query.isHentai = false;
    }
    
    if (genre) {
      query.genres = genre;
    }
    
    if (status) {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: order };
    
    const [mangaList, total] = await Promise.all([
      Manga.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      Manga.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      data: mangaList,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching manga list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manga list' },
      { status: 500 }
    );
  }
}

// GET /api/manga/:id - Get manga details
async function getMangaById(id) {
  try {
    await connectDB();
    
    const manga = await Manga.findOne({ id }).lean();
    
    if (!manga) {
      return NextResponse.json(
        { success: false, error: 'Manga not found' },
        { status: 404 }
      );
    }
    
    // Increment views
    await Manga.updateOne({ id }, { $inc: { views: 1 } });
    
    return NextResponse.json({
      success: true,
      data: manga,
    });
  } catch (error) {
    console.error('Error fetching manga:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manga' },
      { status: 500 }
    );
  }
}

// GET /api/manga/:id/chapters - Get chapters for a manga
async function getMangaChapters(mangaId) {
  try {
    await connectDB();
    
    const chapters = await Chapter.find({ mangaId })
      .sort({ chapterNumber: 1 })
      .select('-pages')
      .lean();
    
    return NextResponse.json({
      success: true,
      data: chapters,
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

// GET /api/manga/:mangaId/chapters/:chapterId - Get chapter with pages
async function getChapter(mangaId, chapterId) {
  try {
    await connectDB();
    
    const chapter = await Chapter.findOne({ id: chapterId, mangaId }).lean();
    
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }
    
    // Increment views
    await Chapter.updateOne({ id: chapterId }, { $inc: { views: 1 } });
    
    return NextResponse.json({
      success: true,
      data: chapter,
    });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapter' },
      { status: 500 }
    );
  }
}

// POST /api/manga - Create new manga
async function createManga(request) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const title = formData.get('title');
    const description = formData.get('description') || '';
    const tags = formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [];
    const genres = formData.get('genres') ? formData.get('genres').split(',').map(g => g.trim()) : [];
    const isHentai = formData.get('isHentai') === 'true';
    const status = formData.get('status') || 'ongoing';
    const author = formData.get('author') || '';
    const artist = formData.get('artist') || '';
    const coverFile = formData.get('cover');
    
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    
    const mangaId = uuidv4();
    let coverUrl = '';
    
    if (coverFile) {
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      coverUrl = await saveCoverImage(buffer, mangaId);
    }
    
    const manga = await Manga.create({
      id: mangaId,
      title,
      description,
      tags,
      genres,
      isHentai,
      status,
      author,
      artist,
      coverUrl,
    });
    
    return NextResponse.json({
      success: true,
      data: manga,
    });
  } catch (error) {
    console.error('Error creating manga:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create manga' },
      { status: 500 }
    );
  }
}

// POST /api/manga/:id/chapters - Upload chapter
async function uploadChapter(mangaId, request) {
  try {
    await connectDB();
    
    const manga = await Manga.findOne({ id: mangaId });
    if (!manga) {
      return NextResponse.json(
        { success: false, error: 'Manga not found' },
        { status: 404 }
      );
    }
    
    const formData = await request.formData();
    const chapterNumber = parseFloat(formData.get('chapterNumber'));
    const title = formData.get('title') || '';
    const zipFile = formData.get('zipFile');
    
    if (!chapterNumber || !zipFile) {
      return NextResponse.json(
        { success: false, error: 'Chapter number and ZIP file are required' },
        { status: 400 }
      );
    }
    
    // Check if chapter already exists
    const existingChapter = await Chapter.findOne({ mangaId, chapterNumber });
    if (existingChapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter already exists' },
        { status: 400 }
      );
    }
    
    const chapterId = uuidv4();
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    
    // Filter and sort image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const imageEntries = zipEntries
      .filter(entry => {
        const ext = entry.entryName.toLowerCase().slice(entry.entryName.lastIndexOf('.'));
        return !entry.isDirectory && imageExtensions.includes(ext);
      })
      .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));
    
    if (imageEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images found in ZIP file' },
        { status: 400 }
      );
    }
    
    const pages = [];
    
    // Process each image
    for (let i = 0; i < imageEntries.length; i++) {
      const entry = imageEntries[i];
      const imageBuffer = entry.getData();
      const pageNumber = i + 1;
      
      const { url } = await saveImage(imageBuffer, mangaId, chapterNumber, pageNumber);
      
      pages.push({
        pageNumber,
        imageUrl: url,
      });
    }
    
    const chapter = await Chapter.create({
      id: chapterId,
      mangaId,
      chapterNumber,
      title,
      pageCount: pages.length,
      pages,
    });
    
    // Update manga chapter count
    await Manga.updateOne(
      { id: mangaId },
      { 
        $inc: { chapterCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );
    
    return NextResponse.json({
      success: true,
      data: chapter,
    });
  } catch (error) {
    console.error('Error uploading chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload chapter' },
      { status: 500 }
    );
  }
}

// DELETE /api/manga/:id - Delete manga
async function deleteManga(id) {
  try {
    await connectDB();
    
    const manga = await Manga.findOne({ id });
    if (!manga) {
      return NextResponse.json(
        { success: false, error: 'Manga not found' },
        { status: 404 }
      );
    }
    
    // Delete all chapters
    await Chapter.deleteMany({ mangaId: id });
    
    // Delete manga
    await Manga.deleteOne({ id });
    
    return NextResponse.json({
      success: true,
      message: 'Manga deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting manga:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete manga' },
      { status: 500 }
    );
  }
}

// GET /api/search - Search manga
async function searchManga(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const includeHentai = searchParams.get('includeHentai') === 'true';
    
    if (!q) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
    
    const query = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { genres: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } },
      ],
    };
    
    if (!includeHentai) {
      query.isHentai = false;
    }
    
    const results = await Manga.find(query).limit(20).lean();
    
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error searching manga:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search manga' },
      { status: 500 }
    );
  }
}

// GET /api/stats - Get statistics
async function getStats() {
  try {
    await connectDB();
    
    const [mangaCount, chapterCount, totalViews] = await Promise.all([
      Manga.countDocuments(),
      Chapter.countDocuments(),
      Manga.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        mangaCount,
        chapterCount,
        totalViews: totalViews[0]?.total || 0,
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
    return NextResponse.json({ message: 'Manga API' });
  }
  
  if (path[0] === 'manga') {
    if (path.length === 1) {
      return getMangaList(request);
    } else if (path.length === 2) {
      return getMangaById(path[1]);
    } else if (path.length === 3 && path[2] === 'chapters') {
      return getMangaChapters(path[1]);
    } else if (path.length === 4 && path[2] === 'chapters') {
      return getChapter(path[1], path[3]);
    }
  }
  
  if (path[0] === 'search') {
    return searchManga(request);
  }
  
  if (path[0] === 'stats') {
    return getStats();
  }
  
  return NextResponse.json(
    { success: false, error: 'Route not found' },
    { status: 404 }
  );
}

export async function POST(request, { params }) {
  const path = params?.path || [];
  
  if (path[0] === 'manga') {
    if (path.length === 1) {
      return createManga(request);
    } else if (path.length === 3 && path[2] === 'chapters') {
      return uploadChapter(path[1], request);
    }
  }
  
  return NextResponse.json(
    { success: false, error: 'Route not found' },
    { status: 404 }
  );
}

export async function DELETE(request, { params }) {
  const path = params?.path || [];
  
  if (path[0] === 'manga' && path.length === 2) {
    return deleteManga(path[1]);
  }
  
  return NextResponse.json(
    { success: false, error: 'Route not found' },
    { status: 404 }
  );
}
