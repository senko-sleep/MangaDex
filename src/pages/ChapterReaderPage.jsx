import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, Play } from 'lucide-react';
import { apiUrl } from '../lib/api';

export default function ChapterReaderPage() {
  const { id, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const isLongStrip = location.state?.isLongStrip;

  useEffect(() => {
    setLoading(true);
    const mangaId = decodeURIComponent(id);
    fetch(apiUrl(`/api/chapters/${mangaId}`))
      .then(r => r.json())
      .then(c => {
        setChapters(c.data || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [id]);

  const currentIdx = chapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
  const nextChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const currentChapter = chapters[currentIdx];

  // Build MangaDex chapter URL
  const getMangaDexChapterUrl = (chapId) => {
    return `https://mangadex.org/chapter/${chapId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 text-center">
        <BookOpen className="w-16 h-16 mx-auto mb-6 text-orange-500" />
        
        <h1 className="text-xl font-bold mb-2">
          Chapter {currentChapter?.chapter || '?'}
        </h1>
        {currentChapter?.title && (
          <p className="text-zinc-400 mb-6">{currentChapter.title}</p>
        )}
        
        <a
          href={getMangaDexChapterUrl(chapterId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold transition-colors shadow-lg shadow-orange-500/25 mb-4"
        >
          <Play className="w-5 h-5 fill-current" />
          Read on MangaDex
        </a>
        
        <div className="flex gap-3">
          {prevChapter && (
            <button
              onClick={() => navigate(`/manga/${id}/${prevChapter.id}`, { state: { isLongStrip } })}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center gap-1 text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Ch. {prevChapter.chapter}
            </button>
          )}
          {nextChapter && (
            <button
              onClick={() => navigate(`/manga/${id}/${nextChapter.id}`, { state: { isLongStrip } })}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center gap-1 text-sm transition-colors"
            >
              Ch. {nextChapter.chapter}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Link
          to={`/manga/${id}`}
          className="block mt-6 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back to manga
        </Link>
      </div>
    </div>
  );
}
