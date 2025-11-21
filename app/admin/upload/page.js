'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Upload, Plus, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function AdminUploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [manga, setManga] = useState([]);
  const [selectedManga, setSelectedManga] = useState('');

  // Manga form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [genres, setGenres] = useState('');
  const [isHentai, setIsHentai] = useState(false);
  const [status, setStatus] = useState('ongoing');
  const [author, setAuthor] = useState('');
  const [artist, setArtist] = useState('');
  const [coverFile, setCoverFile] = useState(null);

  // Chapter form
  const [chapterNumber, setChapterNumber] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [zipFile, setZipFile] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/admin/login');
      return;
    }

    fetchManga();
  }, [session, status]);

  const fetchManga = async () => {
    try {
      const response = await fetch('/api/manga?limit=1000');
      const data = await response.json();

      if (data.success) {
        setManga(data.data);
      }
    } catch (error) {
      console.error('Error fetching manga:', error);
    }
  };

  const handleCreateManga = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('tags', tags);
      formData.append('genres', genres);
      formData.append('isHentai', isHentai);
      formData.append('status', status);
      formData.append('author', author);
      formData.append('artist', artist);

      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const response = await fetch('/api/manga', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Manga created successfully',
        });
        setTitle('');
        setDescription('');
        setTags('');
        setGenres('');
        setIsHentai(false);
        setStatus('ongoing');
        setAuthor('');
        setArtist('');
        setCoverFile(null);
        fetchManga();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to create manga',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadChapter = async (e) => {
    e.preventDefault();

    if (!selectedManga) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a manga',
      });
      return;
    }

    if (!zipFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a ZIP file',
      });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('chapterNumber', chapterNumber);
      formData.append('title', chapterTitle);
      formData.append('zipFile', zipFile);

      const response = await fetch(`/api/manga/${selectedManga}/chapters`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Chapter ${chapterNumber} uploaded successfully`,
        });
        setChapterNumber('');
        setChapterTitle('');
        setZipFile(null);
        // Reset file input
        const fileInput = document.getElementById('zipFile');
        if (fileInput) fileInput.value = '';
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to upload chapter',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Upload className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Upload Content</h1>
            </div>
            <Link href="/admin">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Create Manga */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Manga</CardTitle>
              <CardDescription>Add a new manga to the database</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateManga} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="artist">Artist</Label>
                    <Input
                      id="artist"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genres">Genres (comma separated)</Label>
                  <Input
                    id="genres"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                    placeholder="Action, Adventure, Fantasy"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Magic, School Life, Romance"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="hiatus">Hiatus</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isHentai"
                    checked={isHentai}
                    onCheckedChange={setIsHentai}
                  />
                  <Label htmlFor="isHentai">18+ Content</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover">Cover Image</Label>
                  <Input
                    id="cover"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files[0])}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Manga
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Upload Chapter */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Chapter</CardTitle>
              <CardDescription>Add a new chapter to existing manga</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadChapter} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manga">Select Manga *</Label>
                  <Select value={selectedManga} onValueChange={setSelectedManga}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a manga" />
                    </SelectTrigger>
                    <SelectContent>
                      {manga.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapterNumber">Chapter Number *</Label>
                  <Input
                    id="chapterNumber"
                    type="number"
                    step="0.1"
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapterTitle">Chapter Title (Optional)</Label>
                  <Input
                    id="chapterTitle"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipFile">ZIP/CBZ File *</Label>
                  <Input
                    id="zipFile"
                    type="file"
                    accept=".zip,.cbz"
                    onChange={(e) => setZipFile(e.target.files[0])}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a ZIP or CBZ file containing manga pages (images)
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload Chapter
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Instructions:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Create manga first before uploading chapters</li>
                  <li>• ZIP file should contain only image files</li>
                  <li>• Images will be auto-sorted by filename</li>
                  <li>• Supported formats: JPG, PNG, WebP, GIF</li>
                  <li>• Images will be optimized automatically</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
