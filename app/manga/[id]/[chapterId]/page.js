'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ChapterReaderPage() {
  const params = useParams();
  const router = useRouter();
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [manga, setManga] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChapter();
    fetchChapters();
    fetchManga();
  }, [params.id, params.chapterId]);

  const fetchChapter = async () => {
    try {
      // Fetch chapter with download=true to cache images locally
      const response = await fetch(`/api/manga/${params.id}/chapters/${params.chapterId}?download=true`);
      const data = await response.json();

      if (data.success) {
        // Transform API response to match expected format
        setChapter({
          id: data.data.chapterId,
          chapterNumber: data.data.chapterId,
          pageCount: data.data.pageCount,
          pages: data.data.pages.map(p => ({
            imageUrl: p.url
          }))
        });
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch(`/api/manga/${params.id}/chapters`);
      const data = await response.json();

      if (data.success) {
        setChapters(data.data);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchManga = async () => {
    try {
      const response = await fetch(`/api/manga/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setManga(data.data);
      }
    } catch (error) {
      console.error('Error fetching manga:', error);
    }
  };

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= (chapter?.pageCount || 0)) {
      setCurrentPage(pageNum);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToChapter = (chapterId) => {
    router.push(`/manga/${params.id}/${chapterId}`);
  };

  const getCurrentChapterIndex = () => {
    return chapters.findIndex((ch) => ch.id === params.chapterId);
  };

  const getPrevChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex > 0 ? chapters[currentIndex - 1] : null;
  };

  const getNextChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Chapter not found</h2>
          <Button onClick={() => router.push(`/manga/${params.id}`)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentPageData = chapter.pages?.[currentPage - 1];
  const prevChapter = getPrevChapter();
  const nextChapter = getNextChapter();

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-black/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <Link href={`/manga/${params.id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="text-white">
                <p className="font-semibold">{manga?.title}</p>
                <p className="text-sm text-gray-400">
                  Chapter {chapter.chapterNumber}
                  {chapter.title && `: ${chapter.title}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={params.chapterId}
                onValueChange={goToChapter}
              >
                <SelectTrigger className="w-[200px] bg-gray-900 text-white border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 text-white border-gray-700">
                  {chapters.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      Chapter {ch.chapterNumber}
                      {ch.title && `: ${ch.title}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Reader */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Navigation */}
          <div className="flex items-center justify-between mb-6 text-white">
            <Button
              variant="outline"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-gray-900 border-gray-700 hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm">
                Page {currentPage} of {chapter.pageCount}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === chapter.pageCount}
              className="bg-gray-900 border-gray-700 hover:bg-gray-800"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Page Image */}
          {currentPageData && (
            <Card className="overflow-hidden bg-gray-900 border-gray-800">
              <div className="relative w-full" style={{ minHeight: '600px' }}>
                <Image
                  src={currentPageData.imageUrl}
                  alt={`Page ${currentPage}`}
                  width={1200}
                  height={1600}
                  className="w-full h-auto"
                  priority
                  unoptimized={currentPageData.imageUrl.includes('cloudinary')}
                />
              </div>
            </Card>
          )}

          {/* Page Navigation Bottom */}
          <div className="flex items-center justify-between mt-6 text-white">
            <Button
              variant="outline"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-gray-900 border-gray-700 hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm">
                Page {currentPage} of {chapter.pageCount}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === chapter.pageCount}
              className="bg-gray-900 border-gray-700 hover:bg-gray-800"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Chapter Navigation */}
          <div className="flex items-center justify-between mt-8 pb-8">
            {prevChapter ? (
              <Button
                onClick={() => goToChapter(prevChapter.id)}
                className="bg-primary hover:bg-primary/90"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Chapter
              </Button>
            ) : (
              <div />
            )}

            {nextChapter ? (
              <Button
                onClick={() => goToChapter(nextChapter.id)}
                className="bg-primary hover:bg-primary/90"
              >
                Next Chapter
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
