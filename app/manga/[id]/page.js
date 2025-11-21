'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Eye, Calendar, User, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function MangaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMangaDetails();
    fetchChapters();
  }, [params.id]);

  const fetchMangaDetails = async () => {
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

  const fetchChapters = async () => {
    try {
      const response = await fetch(`/api/manga/${params.id}/chapters`);
      const data = await response.json();

      if (data.success) {
        setChapters(data.data);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Manga not found</h2>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                MangaDex
              </h1>
            </Link>
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Cover Image */}
          <div>
            <Card className="overflow-hidden sticky top-24">
              <div className="relative aspect-[2/3] bg-muted">
                {manga.coverUrl ? (
                  <Image
                    src={manga.coverUrl}
                    alt={manga.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-600/20">
                    <BookOpen className="h-24 w-24 text-muted-foreground" />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold">{manga.title}</h1>
                {manga.isHentai && <Badge className="bg-red-500">18+</Badge>}
              </div>
              {manga.altTitles && manga.altTitles.length > 0 && (
                <p className="text-muted-foreground">{manga.altTitles.join(', ')}</p>
              )}
            </div>

            {/* Tags */}
            {(manga.genres?.length > 0 || manga.tags?.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {manga.genres?.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
                {manga.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Author</p>
                      <p className="font-medium">{manga.author || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Artist</p>
                      <p className="font-medium">{manga.artist || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{manga.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Views</p>
                      <p className="font-medium">{manga.views || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {manga.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {manga.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Chapters */}
            <Card>
              <CardHeader>
                <CardTitle>Chapters ({chapters.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {chapters.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No chapters available yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {chapters.map((chapter) => (
                      <Link
                        key={chapter.id}
                        href={`/manga/${manga.id}/${chapter.id}`}
                      >
                        <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted transition-colors group">
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">
                              Chapter {chapter.chapterNumber}
                              {chapter.title && `: ${chapter.title}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {chapter.pageCount} pages
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{chapter.views || 0}</span>
                            </div>
                            <span>
                              {new Date(chapter.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
