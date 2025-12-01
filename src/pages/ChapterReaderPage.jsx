import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Settings, X, Maximize, Minimize,
  BookOpen, Layers, Sun, Moon, RotateCcw, ZoomIn, ZoomOut, Home,
  SkipBack, SkipForward, Rows3, Columns3, GalleryHorizontal, GalleryVerticalEnd,
  Monitor, Smartphone, ArrowLeftRight, ChevronUp, ChevronDown, Eye
} from 'lucide-react';
import { apiUrl } from '../lib/api';
import { getChapterPages as getMangaDexPages } from '../lib/mangadex';

// Reading settings defaults
const DEFAULT_SETTINGS = {
  mode: 'auto',           // auto, scroll, page, double
  direction: 'ltr',       // ltr (left-to-right), rtl (right-to-left)
  fitMode: 'contain',     // width, height, original, contain (fit to screen)
  backgroundColor: '#000000',
  gapSize: 0,             // gap between pages in scroll mode
  showProgress: true,
  autoScroll: false,
  autoScrollSpeed: 50,
  preloadPages: 3,
};

// Background color presets
const BG_PRESETS = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#18181b' },
  { name: 'Gray', value: '#27272a' },
  { name: 'Sepia', value: '#1a1814' },
  { name: 'Dark Blue', value: '#0f172a' },
];

// Settings Panel Component
function SettingsPanel({ settings, setSettings, onClose, isLongStrip }) {
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl p-6 slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-500" />
            Reader Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Reading Mode */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-3 block">Reading Mode</label>
            
            {/* Webtoon Notice */}
            {isLongStrip ? (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <GalleryVerticalEnd className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-400">Webtoon Mode</p>
                    <p className="text-xs text-zinc-500 mt-0.5">This manga is optimized for vertical scrolling</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'auto', icon: Eye, label: 'Auto' },
                  { value: 'scroll', icon: GalleryVerticalEnd, label: 'Scroll' },
                  { value: 'page', icon: Columns3, label: 'Single' },
                  { value: 'double', icon: GalleryHorizontal, label: 'Double' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => updateSetting('mode', value)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                      settings.mode === value 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reading Direction - Only show for non-webtoon */}
          {!isLongStrip && (
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-3 block">Reading Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSetting('direction', 'ltr')}
                  className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    settings.direction === 'ltr' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Left to Right
                </button>
                <button
                  onClick={() => updateSetting('direction', 'rtl')}
                  className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    settings.direction === 'rtl' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4 scale-x-[-1]" />
                  Right to Left
                </button>
              </div>
            </div>
          )}

          {/* Fit Mode */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-3 block">Image Fit</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'width', icon: Smartphone, label: 'Width' },
                { value: 'height', icon: Monitor, label: 'Height' },
                { value: 'contain', icon: Maximize, label: 'Fit' },
                { value: 'original', icon: ZoomIn, label: 'Original' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => updateSetting('fitMode', value)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                    settings.fitMode === value 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-3 block">Background</label>
            <div className="flex gap-2">
              {BG_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => updateSetting('backgroundColor', preset.value)}
                  className={`w-10 h-10 rounded-xl border-2 transition-all ${
                    settings.backgroundColor === preset.value 
                      ? 'border-orange-500 scale-110' 
                      : 'border-transparent hover:border-zinc-600'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Gap Size (Scroll Mode) */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-3 block">
              Page Gap: {settings.gapSize}px
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={settings.gapSize}
              onChange={(e) => updateSetting('gapSize', parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          {/* Progress Bar Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-400">Show Progress Bar</span>
            <button
              onClick={() => updateSetting('showProgress', !settings.showProgress)}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.showProgress ? 'bg-orange-500' : 'bg-zinc-700'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.showProgress ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ current, total, onSeek }) {
  const progressPercent = ((current + 1) / total) * 100;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="max-w-4xl mx-auto glass rounded-2xl p-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-12 text-center">{current + 1}</span>
          <div 
            className="flex-1 h-2 bg-zinc-800 rounded-full cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = x / rect.width;
              onSeek(Math.floor(percent * total));
            }}
          >
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium w-12 text-center text-zinc-500">{total}</span>
        </div>
      </div>
    </div>
  );
}

// Page Image Component with loading state
function PageImage({ src, alt, fitMode, onLoad, isVisible }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative flex items-center justify-center min-h-[200px]">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <X className="w-12 h-12 mb-2" />
          <p>Failed to load image</p>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-auto max-w-5xl mx-auto select-none ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={() => { setLoaded(true); onLoad?.(); }}
          onError={() => setError(true)}
          loading={isVisible ? 'eager' : 'lazy'}
          draggable={false}
        />
      )}
    </div>
  );
}

export default function ChapterReaderPage() {
  const { id, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('readerSettings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }, [settings]);

  const isLongStrip = location.state?.isLongStrip;
  const preferredLang = location.state?.preferredLang || 'en';

  // Determine actual reading mode
  // Force scroll mode for long strip/webtoon manga - they're designed for vertical reading
  const actualMode = isLongStrip ? 'scroll' : (
    settings.mode === 'auto' ? 'page' : settings.mode
  );

  useEffect(() => {
    setLoading(true);
    setCurrentPage(0);
    const mangaId = decodeURIComponent(id);
    
    // Check if this is a MangaDex manga (UUID format or starts with mangadex:)
    const isMangaDex = mangaId.startsWith('mangadex:') || 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mangaId) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId);
    
    // Function to fetch pages from backend API
    const fetchFromBackend = () => {
      console.log('[Reader] Fetching pages from backend for:', mangaId, chapterId);
      return fetch(apiUrl(`/api/pages/${mangaId}/${chapterId}`))
        .then(r => r.json())
        .then(data => {
          console.log('[Reader] Backend returned:', data.pages?.length || 0, 'pages');
          return data.pages || [];
        });
    };
    
    // Fetch pages - try MangaDex directly for MangaDex content, otherwise use backend
    const pagesPromise = isMangaDex 
      ? getMangaDexPages(chapterId).catch(err => {
          console.error('[Reader] MangaDex pages error:', err);
          return fetchFromBackend();
        })
      : fetchFromBackend();
    
    // Fetch pages and chapters
    Promise.all([
      pagesPromise,
      fetch(apiUrl(`/api/chapters/${mangaId}`)).then(r => r.json())
    ]).then(([pageData, c]) => {
      // Handle both array format and {pages: []} format
      const pages = Array.isArray(pageData) ? pageData : (pageData?.pages || []);
      console.log('[Reader] Loaded', pages.length, 'pages');
      setPages(pages);
      setChapters(c.data || []);
      setLoading(false);
      window.scrollTo(0, 0);
      
      // Preload first few pages immediately
      pages.slice(0, 5).forEach(page => {
        const img = new Image();
        img.src = page.url;
      });
    }).catch((e) => {
      console.error('[Reader] Error loading chapter:', e);
      setLoading(false);
    });
  }, [id, chapterId]);

  // Preload upcoming pages when current page changes
  useEffect(() => {
    if (pages.length === 0) return;
    
    // Preload next 3 pages
    const preloadCount = 3;
    for (let i = 1; i <= preloadCount; i++) {
      const nextIdx = currentPage + i;
      if (nextIdx < pages.length) {
        const img = new Image();
        img.src = pages[nextIdx].url;
      }
    }
    
    // Also preload previous page for back navigation
    if (currentPage > 0) {
      const img = new Image();
      img.src = pages[currentPage - 1].url;
    }
  }, [currentPage, pages]);

  const currentChapter = chapters.find(c => c.id === chapterId);
  const currentChapterNum = parseFloat(currentChapter?.chapter) || 0;
  
  // Use preferred language from navigation state, fallback to current chapter's language
  const targetLang = preferredLang !== 'all' ? preferredLang : (currentChapter?.language || 'en');
  
  // Filtered chapters - only show chapters in the selected language
  // This is used for the chapter dropdown
  const filteredChapters = useMemo(() => {
    // Filter to selected language only (unless "all" is selected)
    let filtered = preferredLang !== 'all' 
      ? chapters.filter(c => c.language === targetLang)
      : chapters;
    
    // Deduplicate by chapter number (keep first occurrence)
    const chapterMap = new Map();
    for (const ch of filtered) {
      const rawNum = parseFloat(ch.chapter) || 0;
      const key = rawNum.toString();
      if (!chapterMap.has(key)) {
        chapterMap.set(key, ch);
      }
    }
    
    // Convert back to array and sort by chapter number descending
    return Array.from(chapterMap.values()).sort((a, b) => {
      const numA = parseFloat(a.chapter) || 0;
      const numB = parseFloat(b.chapter) || 0;
      return numB - numA;
    });
  }, [chapters, targetLang, preferredLang]);
  
  // Find next/prev chapters by chapter NUMBER, not array position
  // Only navigate to chapters in the selected language (strict filtering)
  const getNextChapter = () => {
    // Find all chapters with a higher chapter number
    let higherChapters = chapters.filter(c => {
      const num = parseFloat(c.chapter) || 0;
      return num > currentChapterNum;
    });
    if (higherChapters.length === 0) return null;
    
    // Strictly filter to selected language (no fallback)
    if (preferredLang !== 'all') {
      higherChapters = higherChapters.filter(c => c.language === targetLang);
      if (higherChapters.length === 0) return null;
    }
    
    // Sort by chapter number ascending to get closest next chapter
    higherChapters.sort((a, b) => {
      const numA = parseFloat(a.chapter) || 0;
      const numB = parseFloat(b.chapter) || 0;
      return numA - numB;
    });
    return higherChapters[0];
  };
  
  const getPrevChapter = () => {
    // Find all chapters with a lower chapter number
    let lowerChapters = chapters.filter(c => {
      const num = parseFloat(c.chapter) || 0;
      return num < currentChapterNum;
    });
    if (lowerChapters.length === 0) return null;
    
    // Strictly filter to selected language (no fallback)
    if (preferredLang !== 'all') {
      lowerChapters = lowerChapters.filter(c => c.language === targetLang);
      if (lowerChapters.length === 0) return null;
    }
    
    // Sort by chapter number descending to get closest prev chapter
    lowerChapters.sort((a, b) => {
      const numA = parseFloat(a.chapter) || 0;
      const numB = parseFloat(b.chapter) || 0;
      return numB - numA;
    });
    return lowerChapters[0];
  };
  
  const nextChapter = getNextChapter();
  const prevChapter = getPrevChapter();

  // Navigation functions
  const goPage = useCallback((dir) => {
    const effectiveDir = settings.direction === 'rtl' ? -dir : dir;
    const next = currentPage + effectiveDir;
    
    if (next >= 0 && next < pages.length) {
      setCurrentPage(next);
      window.scrollTo(0, 0);
    } else if (effectiveDir > 0 && nextChapter) {
      navigate(`/manga/${id}/${nextChapter.id}`, { state: { isLongStrip, preferredLang } });
    } else if (effectiveDir < 0 && prevChapter) {
      navigate(`/manga/${id}/${prevChapter.id}`, { state: { isLongStrip, preferredLang } });
    }
  }, [currentPage, pages.length, settings.direction, nextChapter, prevChapter, navigate, id, isLongStrip, preferredLang]);

  const goToPage = (pageNum) => {
    if (pageNum >= 0 && pageNum < pages.length) {
      setCurrentPage(pageNum);
      window.scrollTo(0, 0);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (showSettings) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case 'd':
          if (actualMode !== 'scroll') goPage(1);
          break;
        case 'ArrowLeft':
        case 'a':
          if (actualMode !== 'scroll') goPage(-1);
          break;
        case ' ':
          e.preventDefault();
          if (actualMode !== 'scroll') goPage(1);
          break;
        case 'ArrowUp':
          if (actualMode !== 'scroll') goPage(-1);
          break;
        case 'ArrowDown':
          if (actualMode !== 'scroll') goPage(1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) toggleFullscreen();
          else if (showSettings) setShowSettings(false);
          break;
        case 's':
          setShowSettings(prev => !prev);
          break;
        case 'Home':
          goToPage(0);
          break;
        case 'End':
          goToPage(pages.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [actualMode, goPage, showSettings, isFullscreen, pages.length]);

  // Touch gestures
  const handleTouchStart = (e) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e) => {
    if (!touchStart || actualMode === 'scroll') return;
    
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const diffX = touchStart.x - touchEnd.x;
    const diffY = touchStart.y - touchEnd.y;
    
    // Horizontal swipe (more significant than vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      goPage(diffX > 0 ? 1 : -1);
    }
    
    setTouchStart(null);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide UI
  useEffect(() => {
    if (actualMode === 'scroll') return;
    
    let timeout;
    const handleMove = () => {
      setShowUI(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowUI(false), 3000);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleMove);
      clearTimeout(timeout);
    };
  }, [actualMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Loading chapter...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen text-white reader-page select-none"
      style={{ backgroundColor: settings.backgroundColor }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header - Auto-hides in page modes to not block content */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          actualMode === 'scroll' 
            ? 'translate-y-0 opacity-100' 
            : (showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0')
        }`}
      >
        <div className="bg-black/90 backdrop-blur-sm border-b border-zinc-800/50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              <Link 
                to={`/manga/${id}`} 
                className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    Chapter {currentChapter?.chapter || '?'}
                  </p>
                  {isLongStrip && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded-full shrink-0">
                      WEBTOON
                    </span>
                  )}
                </div>
                {currentChapter?.title && (
                  <p className="text-xs text-zinc-500 truncate">{currentChapter.title}</p>
                )}
              </div>
            </div>
            
            {/* Center - Chapter Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => prevChapter && navigate(`/manga/${id}/${prevChapter.id}`, { state: { isLongStrip, preferredLang } })}
                disabled={!prevChapter}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Chapter"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <select
                value={filteredChapters.find(c => parseFloat(c.chapter) === currentChapterNum)?.id || chapterId}
                onChange={(e) => navigate(`/manga/${id}/${e.target.value}`, { state: { isLongStrip, preferredLang } })}
                className="h-10 px-4 bg-zinc-900/80 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500"
              >
                {filteredChapters.map(c => (
                  <option key={c.id} value={c.id}>Ch. {c.chapter}</option>
                ))}
              </select>
              
              <button
                onClick={() => nextChapter && navigate(`/manga/${id}/${nextChapter.id}`, { state: { isLongStrip, preferredLang } })}
                disabled={!nextChapter}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Chapter"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            
            {/* Right */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Settings (S)"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors hidden sm:block"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
              <Link
                to="/"
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Reader Area */}
      {actualMode === 'scroll' ? (
        // Scroll Mode (Webtoon)
        <div className="max-w-4xl mx-auto pt-16" style={{ gap: `${settings.gapSize}px` }}>
          <div className="flex flex-col" style={{ gap: `${settings.gapSize}px` }}>
            {pages.map((p, i) => (
              <PageImage 
                key={i}
                src={p.url}
                alt={`Page ${i + 1}`}
                fitMode={settings.fitMode}
                isVisible={i < settings.preloadPages}
              />
            ))}
          </div>
          
          {/* End of Chapter */}
          <div className="py-16 text-center">
            <div className="glass rounded-2xl p-8 max-w-md mx-auto">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-orange-500" />
              <p className="text-lg font-semibold mb-2">Chapter {currentChapter?.chapter} Complete</p>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {prevChapter && (
                  <button
                    onClick={() => navigate(`/manga/${id}/${prevChapter.id}`, { state: { isLongStrip, preferredLang } })}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Ch. {prevChapter.chapter}
                  </button>
                )}
                {nextChapter ? (
                  <button
                    onClick={() => navigate(`/manga/${id}/${nextChapter.id}`, { state: { isLongStrip, preferredLang } })}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors shadow-lg shadow-orange-500/25"
                  >
                    Next Chapter
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    to={`/manga/${id}`}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    Back to Manga
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : actualMode === 'double' ? (
        // Double Page Mode
        <div 
          className="min-h-screen flex items-center justify-center pt-14 pb-24 px-12"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Left Navigation Button */}
          <button
            onClick={() => goPage(-1)}
            disabled={currentPage === 0 && !prevChapter}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex items-center justify-center gap-1" style={{ maxHeight: 'calc(100vh - 9rem)' }}>
            {pages[currentPage] && (
              <img
                src={pages[currentPage].url}
                alt={`Page ${currentPage + 1}`}
                className="object-contain select-none"
                style={{ maxHeight: 'calc(100vh - 9rem)', maxWidth: 'calc(50vw - 2rem)' }}
                draggable={false}
              />
            )}
            {pages[currentPage + 1] && (
              <img
                src={pages[currentPage + 1].url}
                alt={`Page ${currentPage + 2}`}
                className="object-contain select-none"
                style={{ maxHeight: 'calc(100vh - 9rem)', maxWidth: 'calc(50vw - 2rem)' }}
                draggable={false}
              />
            )}
          </div>

          {/* Right Navigation Button */}
          <button
            onClick={() => goPage(1)}
            disabled={currentPage >= pages.length - 1 && !nextChapter}
            className="fixed right-2 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      ) : (
        // Single Page Mode - Clean view with navigation buttons
        <div 
          className="min-h-screen flex items-center justify-center pt-14 pb-24"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Left Navigation Button */}
          <button
            onClick={() => goPage(-1)}
            disabled={currentPage === 0 && !prevChapter}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {pages[currentPage] && (
            <img
              src={pages[currentPage].url}
              alt={`Page ${currentPage + 1}`}
              className="select-none object-contain"
              style={{ 
                maxHeight: 'calc(100vh - 9rem)',
                maxWidth: 'calc(100vw - 4rem)'
              }}
              draggable={false}
            />
          )}

          {/* Right Navigation Button */}
          <button
            onClick={() => goPage(1)}
            disabled={currentPage === pages.length - 1 && !nextChapter}
            className="fixed right-2 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Page Navigation for Page Modes - Always visible */}
      {actualMode !== 'scroll' && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="bg-black/90 backdrop-blur-sm border-t border-zinc-800/50 py-4 px-4">
            <div className="max-w-4xl mx-auto">
              {/* Mobile Chapter Nav */}
              <div className="flex md:hidden items-center justify-between mb-3">
                <button
                  onClick={() => prevChapter && navigate(`/manga/${id}/${prevChapter.id}`, { state: { isLongStrip, preferredLang } })}
                  disabled={!prevChapter}
                  className="px-4 py-2 bg-zinc-800 rounded-lg text-sm disabled:opacity-30 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev Ch.
                </button>
                <span className="text-sm text-zinc-400">Ch. {currentChapter?.chapter}</span>
                <button
                  onClick={() => nextChapter && navigate(`/manga/${id}/${nextChapter.id}`, { state: { isLongStrip, preferredLang } })}
                  disabled={!nextChapter}
                  className="px-4 py-2 bg-zinc-800 rounded-lg text-sm disabled:opacity-30 flex items-center gap-1"
                >
                  Next Ch. <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Page Slider */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => goPage(-1)}
                  disabled={currentPage === 0 && !prevChapter}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex-1">
                  <div 
                    className="h-2 bg-zinc-800 rounded-full cursor-pointer overflow-hidden"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percent = x / rect.width;
                      goToPage(Math.floor(percent * pages.length));
                    }}
                  >
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-150"
                      style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>1</span>
                    <span className="text-white font-medium">{currentPage + 1} / {pages.length}</span>
                    <span>{pages.length}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => goPage(1)}
                  disabled={currentPage === pages.length - 1 && !nextChapter}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
          isLongStrip={isLongStrip}
        />
      )}

    </div>
  );
}
