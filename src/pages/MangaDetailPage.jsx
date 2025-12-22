import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, BookOpen, Play, ChevronDown, SortAsc, SortDesc,
  Heart, Share2, BookMarked, Globe, Info, ArrowLeft
} from 'lucide-react';
import { apiUrl } from '../lib/api';
import { getCoverUrl, getAnilistCoverUrl, PLACEHOLDER_COVER } from '../lib/imageUtils';
import { LANGUAGES, getLanguageDisplay } from '../lib/languages';

// Save detail page scroll position before navigating to chapter
const saveDetailScrollPosition = (mangaId) => {
  const key = `detailScrollPosition_${mangaId}`;
  sessionStorage.setItem(key, window.scrollY.toString());
};

// Get saved scroll position for detail page
const getDetailScrollPosition = (mangaId) => {
  const key = `detailScrollPosition_${mangaId}`;
  const saved = sessionStorage.getItem(key);
  return saved ? parseInt(saved, 10) : null;
};

// Clear saved scroll position
const clearDetailScrollPosition = (mangaId) => {
  const key = `detailScrollPosition_${mangaId}`;
  sessionStorage.removeItem(key);
};

// Compact Chapter Row Component
function ChapterRow({ chapter, mangaId, isLongStrip, onNavigate, preferredLang }) {
  const timeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
    return then.toLocaleDateString('en', { month: 'short', year: '2-digit' });
  };

  return (
    <Link
      to={`/manga/${mangaId}/${chapter.id}`}
      state={{ isLongStrip, preferredLang }}
      className="group flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      onClick={onNavigate}
    >
      {/* Chapter Number */}
      <span className="w-14 text-sm font-semibold text-zinc-300 group-hover:text-orange-400 transition-colors shrink-0">
        Ch. {chapter.chapter || '?'}
      </span>
      
      {/* Title */}
      <span className="flex-1 text-sm text-zinc-500 truncate">
        {chapter.title || ''}
      </span>
      
      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-zinc-600 shrink-0">
        {chapter.group && (
          <span className="hidden sm:block max-w-[100px] truncate">{chapter.group}</span>
        )}
        {chapter.date && (
          <span className="w-12 text-right">{timeAgo(chapter.date)}</span>
        )}
      </div>
      
      {/* Hover indicator */}
      <Play className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-orange-500 transition-all shrink-0" />
    </Link>
  );
}

// Skeleton Loader
function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Skeleton */}
      <div className="relative h-[50vh] bg-zinc-900">
        <div className="absolute inset-0 shimmer" />
      </div>
      <div className="max-w-5xl mx-auto px-4 -mt-32 relative z-10">
        <div className="flex gap-6">
          <div className="w-48 aspect-[2/3] rounded-2xl bg-zinc-800 shimmer" />
          <div className="flex-1 pt-4 space-y-3">
            <div className="h-8 w-3/4 bg-zinc-800 rounded shimmer" />
            <div className="h-4 w-1/2 bg-zinc-800 rounded shimmer" />
            <div className="h-4 w-1/3 bg-zinc-800 rounded shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MangaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chapterSearch, setChapterSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' (oldest first) or 'desc'
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [langFilter, setLangFilter] = useState('en'); // Default to English
  const [coverUrl, setCoverUrl] = useState(null);
  const hasRestoredScroll = useRef(false);

  // Save scroll position when navigating to a chapter
  const handleChapterNavigate = () => {
    saveDetailScrollPosition(id);
  };

  // Restore scroll position when returning from chapter reader
  useEffect(() => {
    // Wait until loading is done and we have manga data
    if (loading || !manga || hasRestoredScroll.current) return;
    
    const savedPosition = getDetailScrollPosition(id);
    if (savedPosition === null || savedPosition <= 0) {
      hasRestoredScroll.current = true;
      return;
    }
    
    // Mark as restored immediately to prevent re-runs
    hasRestoredScroll.current = true;
    
    // Use setTimeout to ensure DOM is fully painted
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
      clearDetailScrollPosition(id);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [loading, manga, id]);

  // Reset scroll restoration flag when manga changes
  useEffect(() => {
    hasRestoredScroll.current = false;
  }, [id]);

  useEffect(() => {
    const mangaId = decodeURIComponent(id);
    setLoading(true);
    Promise.all([
      fetch(apiUrl(`/api/manga/${mangaId}`)).then(r => r.json()),
      fetch(apiUrl(`/api/chapters/${mangaId}`)).then(r => r.json())
    ]).then(([m, c]) => {
      setManga(m);
      const chapterData = c.data || [];
      setChapters(chapterData);
      
      // Check if English chapters exist, otherwise show all
      const hasEnglish = chapterData.some(ch => ch.language === 'en' || !ch.language);
      if (!hasEnglish && chapterData.length > 0) {
        // Get the most common language
        const langs = chapterData.map(ch => ch.language).filter(Boolean);
        const langCount = langs.reduce((acc, l) => ({ ...acc, [l]: (acc[l] || 0) + 1 }), {});
        const mostCommon = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];
        setLangFilter(mostCommon ? mostCommon[0] : 'all');
      }
      setLoading(false);
    }).catch((e) => {
      console.error(e);
      setLoading(false);
    });
  }, [id]);

  // Fetch cover from Anilist if MangaDex cover is missing
  useEffect(() => {
    if (!manga) return;
    
    const syncCover = getCoverUrl(manga);
    if (syncCover) {
      setCoverUrl(syncCover);
      return;
    }
    
    // Fetch from Anilist
    getAnilistCoverUrl(manga).then(url => {
      setCoverUrl(url);
    }).catch(() => {
      setCoverUrl(PLACEHOLDER_COVER);
    });
  }, [manga]);

  // Update document title and meta for SEO/embeds
  useEffect(() => {
    if (manga) {
      document.title = `${manga.title} - MangaFox`;
      
      // Update meta tags for social sharing
      const updateMeta = (property, content) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };
      
      updateMeta('og:title', `${manga.title} - MangaFox`);
      updateMeta('og:description', manga.description?.slice(0, 200) || `Read ${manga.title} online`);
      updateMeta('og:image', coverUrl || '');
      updateMeta('og:type', 'article');
    }
    
    return () => {
      document.title = 'MangaFox - Read Manga Online';
    };
  }, [manga, coverUrl]);

  // Get available languages
  const availableLanguages = useMemo(() => {
    const langs = new Set(chapters.map(ch => ch.language || 'en'));
    return Array.from(langs).sort();
  }, [chapters]);

  // Filter and sort chapters
  const filteredChapters = useMemo(() => {
    let result = [...chapters];
    
    // Filter by language
    if (langFilter !== 'all') {
      result = result.filter(ch => (ch.language || 'en') === langFilter);
    }
    
    // Filter by search
    if (chapterSearch) {
      result = result.filter(ch => 
        ch.chapter?.toString().includes(chapterSearch) ||
        ch.title?.toLowerCase().includes(chapterSearch.toLowerCase())
      );
    }
    
    // Sort
    result.sort((a, b) => {
      const aNum = parseFloat(a.chapter) || 0;
      const bNum = parseFloat(b.chapter) || 0;
      return sortOrder === 'desc' ? bNum - aNum : aNum - bNum;
    });
    
    return result;
  }, [chapters, chapterSearch, sortOrder, langFilter]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center slide-up">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-zinc-700" />
          </div>
          <p className="text-xl font-semibold mb-2">Manga not found</p>
          <p className="text-zinc-500 mb-6">The manga you're looking for doesn't exist or has been removed.</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const genres = manga.genres || manga.tags?.filter(t => t.group === 'genre').map(t => t.name) || [];
  const tags = manga.tags?.filter(t => typeof t === 'string') || [];
  const sourceId = manga.sourceId || manga.id?.split(':')[0];
  
  // Use filtered chapters for Start/Latest buttons to respect language filter
  const firstChapter = filteredChapters[filteredChapters.length - 1];
  const latestChapter = filteredChapters[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Background */}
      <div className="relative h-[45vh] md:h-[55vh] overflow-hidden">
        {/* Blurred Cover Background */}
        {coverUrl && (
          <img 
            src={coverUrl} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 to-transparent" />
        
        {/* Navigation */}
        <header className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl glass hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 -mt-48 md:-mt-56 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Cover */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="w-44 md:w-52 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt={manga.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    setCoverUrl(PLACEHOLDER_COVER);
                  }}
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-zinc-700" />
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="mt-4 space-y-2">
              {firstChapter && (
                <Link
                  to={`/manga/${id}/${firstChapter.id}`}
                  state={{ isLongStrip: manga.isLongStrip, preferredLang: langFilter }}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold transition-colors shadow-lg shadow-orange-500/25"
                  onClick={handleChapterNavigate}
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Reading
                </Link>
              )}
              {latestChapter && latestChapter !== firstChapter && (
                <Link
                  to={`/manga/${id}/${latestChapter.id}`}
                  state={{ isLongStrip: manga.isLongStrip, preferredLang: langFilter }}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                  onClick={handleChapterNavigate}
                >
                  <BookMarked className="w-4 h-4" />
                  Latest Ch. {latestChapter.chapter}
                </Link>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2 md:pt-8">
            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{manga.title}</h1>
            
            {/* Alternative Titles */}
            {manga.altTitles && manga.altTitles.length > 0 && (
              <p className="text-sm text-zinc-500 mb-3 line-clamp-1">
                Also known as: {manga.altTitles.slice(0, 2).join(', ')}
              </p>
            )}
            
            {/* Badges Row - Clean and minimal */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Status */}
              {manga.status && (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                  manga.status.toLowerCase() === 'completed' 
                    ? 'bg-emerald-500/15 text-emerald-400' 
                    : manga.status.toLowerCase() === 'ongoing' 
                      ? 'bg-blue-500/15 text-blue-400' 
                      : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {manga.status}
                </span>
              )}
              {/* Type */}
              {manga.isLongStrip && (
                <span className="px-2.5 py-1 text-xs font-medium bg-blue-500/15 text-blue-400 rounded-lg">
                  Webtoon
                </span>
              )}
              {/* Content Rating */}
              {manga.contentRating && manga.contentRating !== 'safe' && (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                  manga.contentRating === 'pornographic' || manga.contentRating === 'erotica'
                    ? 'bg-red-500/15 text-red-400'
                    : manga.contentRating === 'suggestive'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {manga.contentRating === 'pornographic' ? '18+' : 
                   manga.contentRating === 'erotica' ? 'Mature' :
                   manga.contentRating.charAt(0).toUpperCase() + manga.contentRating.slice(1)}
                </span>
              )}
              {manga.isAdult && !manga.contentRating && (
                <span className="px-2.5 py-1 text-xs font-medium bg-red-500/15 text-red-400 rounded-lg">
                  18+
                </span>
              )}
              {/* Source */}
              <span className="px-2.5 py-1 text-xs font-medium bg-zinc-800 text-zinc-400 rounded-lg capitalize">
                {sourceId}
              </span>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              {manga.author && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-zinc-600">Author:</span>
                  <span>{manga.author}</span>
                </div>
              )}
              {manga.artist && manga.artist !== manga.author && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-zinc-600">Artist:</span>
                  <span>{manga.artist}</span>
                </div>
              )}
              {manga.year && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-zinc-600">Year:</span>
                  <span>{manga.year}</span>
                </div>
              )}
            </div>

            {/* Available Languages */}
            {availableLanguages.length > 0 && (
              <div className="mb-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-zinc-400">Available Languages</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {/* Show English first if available */}
                  {availableLanguages.includes('en') && (
                    <span className="px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-md flex items-center gap-1.5">
                      {LANGUAGES.en}
                      <span className="text-[10px] bg-emerald-500/30 px-1 rounded">Primary</span>
                    </span>
                  )}
                  {/* Other languages sorted alphabetically */}
                  {availableLanguages
                    .filter(l => l !== 'en')
                    .sort((a, b) => (LANGUAGES[a] || a).localeCompare(LANGUAGES[b] || b))
                    .map(lang => (
                      <span 
                        key={lang}
                        className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded-md"
                      >
                        {LANGUAGES[lang] || getLanguageDisplay(lang)}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {genres.slice(0, 8).map(g => (
                  <span 
                    key={g} 
                    className="px-2 py-1 text-xs bg-zinc-800/60 text-zinc-300 rounded-md"
                  >
                    {g}
                  </span>
                ))}
                {genres.length > 8 && (
                  <span className="px-2 py-1 text-xs bg-zinc-800/40 text-zinc-500 rounded-md">
                    +{genres.length - 8} more
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {manga.description && (
              <details className="mb-4 group" open>
                <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300 flex items-center gap-1.5 select-none font-medium">
                  <Info className="w-4 h-4" />
                  <span>Synopsis</span>
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-sm text-zinc-400 leading-relaxed mt-2 whitespace-pre-line">
                  {manga.description}
                </p>
              </details>
            )}
          </div>
        </div>

        {/* Chapters Section - Containerized */}
        <div className="mt-6 pb-8">
          {/* Chapter Header & Controls */}
          <div className="bg-zinc-900/50 rounded-t-2xl border border-zinc-800 border-b-0 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold">{filteredChapters.length} Chapters</h2>
                {filteredChapters.length !== chapters.length && (
                  <span className="text-xs text-zinc-500">({chapters.length} total)</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Language Filter */}
                {availableLanguages.length > 1 && (
                  <select
                    value={langFilter}
                    onChange={(e) => setLangFilter(e.target.value)}
                    className="h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="all">All Languages</option>
                    {availableLanguages.map(lang => (
                      <option key={lang} value={lang}>
                        {LANGUAGES[lang] || getLanguageDisplay(lang)}
                      </option>
                    ))}
                  </select>
                )}
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    placeholder="Ch #"
                    className="w-20 h-9 pl-8 pr-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                
                {/* Sort */}
                <button
                  onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
                  className="h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center gap-1.5 text-xs hover:bg-zinc-700 transition-colors"
                  title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                >
                  {sortOrder === 'desc' ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Chapter List Container - Scrollable */}
          <div className="bg-zinc-900/30 rounded-b-2xl border border-zinc-800 border-t-0 overflow-hidden">
            {chapters.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                <p className="text-zinc-500 text-sm">No chapters available yet</p>
              </div>
            ) : filteredChapters.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                <p className="text-zinc-500 text-sm">No chapters found</p>
                <button 
                  onClick={() => { setChapterSearch(''); setLangFilter('all'); }}
                  className="mt-2 text-xs text-orange-500 hover:text-orange-400"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                <div className="divide-y divide-zinc-800/50">
                  {filteredChapters.map((ch, i) => (
                    <ChapterRow 
                      key={ch.id} 
                      chapter={ch} 
                      mangaId={id} 
                      isLongStrip={manga.isLongStrip}
                      onNavigate={handleChapterNavigate}
                      preferredLang={langFilter}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}