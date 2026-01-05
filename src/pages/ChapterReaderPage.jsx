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
  backgroundColor: '#09090b',
  gapSize: 0,             // gap between pages in scroll mode
  preloadPages: 3,
  tapToNavigate: true,    // tap left/right side to navigate
  autoNextChapter: true,  // auto-navigate to next chapter at end
  // UI visibility: 'always', 'hover', 'never'
  headerVisibility: 'always',
  footerVisibility: 'always',
  navButtonsVisibility: 'always',
  pageNumberVisibility: 'always',
};

// Background presets - simplified
const BG_PRESETS = [
  { 
    name: 'Blur', 
    value: 'blur', 
    type: 'dynamic',
    preview: 'linear-gradient(135deg, #374151 0%, #1f2937 50%, #111827 100%)',
    description: 'Blurred manga page'
  },
  { 
    name: 'Void', 
    value: '#000000', 
    type: 'solid',
    preview: '#000000',
    description: 'Pure black'
  },
  { 
    name: 'Theme', 
    value: '#09090b', 
    type: 'solid',
    preview: '#09090b',
    description: 'Website theme'
  },
  { 
    name: 'White', 
    value: '#f5f5f4', 
    type: 'solid',
    preview: '#f5f5f4',
    description: 'Clean white'
  },
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

          {/* Background Theme */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-3 block">Background Theme</label>
            <div className="grid grid-cols-4 gap-2">
              {BG_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => updateSetting('backgroundColor', preset.value)}
                  className={`relative group rounded-xl border-2 transition-all overflow-hidden ${
                    settings.backgroundColor === preset.value 
                      ? 'border-orange-500 ring-2 ring-orange-500/30' 
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                  title={preset.description}
                >
                  {/* Visual Preview */}
                  <div 
                    className="w-full aspect-square"
                    style={{ background: preset.preview }}
                  >
                    {/* Blur preview shows a mini page icon */}
                    {preset.type === 'dynamic' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-6 h-8 bg-white/20 rounded-sm backdrop-blur-sm border border-white/10" />
                      </div>
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className={`text-[10px] font-medium py-1 text-center ${
                    preset.value === '#f5f5f4' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-800/80 text-zinc-300'
                  }`}>
                    {preset.name}
                  </div>
                  
                  {/* Selected indicator */}
                  {settings.backgroundColor === preset.value && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />
                  )}
                </button>
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

          {/* Preload Pages */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-3 block">
              Preload Pages: {settings.preloadPages}
            </label>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.preloadPages}
                onChange={(e) => updateSetting('preloadPages', parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
          </div>

          {/* UI Visibility Settings */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-3 block">UI Visibility</label>
            <div className="space-y-3">
              {[
                { key: 'headerVisibility', label: 'Header', desc: 'Top bar with chapter info', options: ['always', 'hover'] },
                { key: 'footerVisibility', label: 'Progress Bar', desc: 'Bottom page slider', options: ['always', 'hover', 'never'] },
                { key: 'pageNumberVisibility', label: 'Page Number', desc: 'Current page indicator', options: ['always', 'hover', 'never'] },
              ].map(({ key, label, desc, options }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-zinc-300">{label}</span>
                    <p className="text-xs text-zinc-500">{desc}</p>
                  </div>
                  <div className="flex bg-zinc-800 rounded-lg p-0.5">
                    {options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => updateSetting(key, opt)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          settings[key] === opt 
                            ? 'bg-orange-500 text-white' 
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-3">
            {/* Tap to Navigate */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-zinc-300">Tap to Navigate</span>
                <p className="text-xs text-zinc-500">Tap sides of screen to turn pages</p>
              </div>
              <button
                onClick={() => updateSetting('tapToNavigate', !settings.tapToNavigate)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.tapToNavigate ? 'bg-orange-500' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.tapToNavigate ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Auto Next Chapter */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-zinc-300">Auto Next Chapter</span>
                <p className="text-xs text-zinc-500">Go to next chapter at end</p>
              </div>
              <button
                onClick={() => updateSetting('autoNextChapter', !settings.autoNextChapter)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoNextChapter ? 'bg-orange-500' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.autoNextChapter ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
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


// Helper to get image fit styles for page modes
const getPageImageStyle = (fitMode, isDouble = false, headerVisible = false) => {
  const baseMaxWidth = isDouble ? 'calc(50vw - 2rem)' : 'calc(100vw - 4rem)';
  const baseMaxHeight = headerVisible ? 'calc(100vh - 11rem)' : 'calc(100vh - 6rem)';
  
  switch (fitMode) {
    case 'width':
      return {
        className: 'w-full h-auto object-contain select-none',
        style: { maxWidth: isDouble ? '50vw' : '100vw' }
      };
    case 'height':
      return {
        className: 'h-full w-auto object-contain select-none',
        style: { maxHeight: baseMaxHeight }
      };
    case 'original':
      return {
        className: 'object-none select-none',
        style: { maxWidth: 'none', maxHeight: 'none' }
      };
    case 'contain':
    default:
      return {
        className: 'object-contain select-none',
        style: { maxHeight: baseMaxHeight, maxWidth: baseMaxWidth }
      };
  }
};

// Page Image Component with loading state and retry
function PageImage({ src, alt, fitMode, onLoad, isVisible, onImageError, pageIndex }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imageSrc, setImageSrc] = useState(src);

  const handleError = () => {
    setError(true);
    onImageError?.(src, pageIndex);
  };

  const handleRetry = () => {
    setError(false);
    setLoaded(false);
    setRetryCount(c => c + 1);
    // Add cache buster to force reload
    setImageSrc(`${src}${src.includes('?') ? '&' : '?'}retry=${retryCount + 1}`);
  };

  return (
    <div className="relative flex items-center justify-center min-h-[200px]">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <X className="w-12 h-12 mb-2 text-red-500/50" />
          <p className="font-medium">Failed to load image</p>
          <p className="text-xs mt-1 mb-3">Page {pageIndex + 1}</p>
          <p className="text-xs text-zinc-600 mb-4 max-w-xs text-center">
            Source server may be temporarily unavailable
          </p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          className={`select-none ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${
            fitMode === 'width' ? 'w-full h-auto' :
            fitMode === 'height' ? 'h-screen w-auto' :
            fitMode === 'original' ? 'max-w-none' :
            'w-full h-auto max-w-5xl mx-auto' // contain (default)
          }`}
          style={fitMode === 'original' ? { maxWidth: 'none' } : {}}
          onLoad={() => { setLoaded(true); onLoad?.(); }}
          onError={handleError}
          loading={isVisible ? 'eager' : 'lazy'}
          draggable={false}
          referrerPolicy="no-referrer"
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
  const [showHeader, setShowHeader] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('');
  const pageInputRef = useRef(null);
  
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('readerSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration: if headerVisibility is 'never', update it to 'hover'
        if (parsed.headerVisibility === 'never') {
          parsed.headerVisibility = 'hover';
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }, [settings]);

  // Track reported images to avoid duplicate reports
  const reportedImages = useRef(new Set());
  
  // Report failed images to the server
  const handleImageError = useCallback((url, pageIndex) => {
    if (!url || reportedImages.current.has(url)) return;
    reportedImages.current.add(url);
    
    const mangaId = decodeURIComponent(id);
    console.warn('[Reader] Image failed to load:', { page: pageIndex + 1, url: url.substring(0, 80) });
    
    // Report to server
    fetch(apiUrl('/api/report/image-fail'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        mangaId,
        chapterId,
        page: pageIndex + 1,
        error: 'load_error'
      })
    }).catch(() => {}); // Silent fail
  }, [id, chapterId]);

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
          // Transform relative proxy URLs to use full backend URL
          // This is needed because on Firebase hosting, /api/proxy/image won't work
          const pages = (data.pages || []).map(page => ({
            ...page,
            url: page.url?.startsWith('/api/') ? apiUrl(page.url) : page.url
          }));
          return pages;
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

  // Preload upcoming pages when current page changes - aggressive preloading for smooth experience
  useEffect(() => {
    if (pages.length === 0) return;
    
    // Preload next N pages based on settings (minimum 5 for smooth reading)
    const preloadCount = Math.max(settings.preloadPages || 3, 5);
    
    // Preload forward pages with priority
    for (let i = 1; i <= preloadCount; i++) {
      const nextIdx = currentPage + i;
      if (nextIdx < pages.length) {
        const img = new Image();
        img.fetchPriority = i <= 2 ? 'high' : 'low';
        img.src = pages[nextIdx].url;
      }
    }
    
    // Also preload 2 previous pages for back navigation
    for (let i = 1; i <= 2; i++) {
      const prevIdx = currentPage - i;
      if (prevIdx >= 0) {
        const img = new Image();
        img.fetchPriority = 'low';
        img.src = pages[prevIdx].url;
      }
    }
  }, [currentPage, pages, settings.preloadPages]);

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
    
    // Check if it's a tap (small movement) and tapToNavigate is enabled
    if (settings.tapToNavigate && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
      const screenWidth = window.innerWidth;
      const tapX = touchEnd.x;
      
      // Left third of screen = previous page, right third = next page
      if (tapX < screenWidth * 0.33) {
        goPage(-1);
      } else if (tapX > screenWidth * 0.67) {
        goPage(1);
      }
    }
    // Horizontal swipe (more significant than vertical)
    else if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
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

  // Hover zones for header/footer reveal
  useEffect(() => {
    if (actualMode === 'scroll') {
      setShowHeader(true);
      setShowFooter(true);
      return;
    }
    
    const handleMouseMove = (e) => {
      const y = e.clientY;
      const windowHeight = window.innerHeight;
      
      // Show header when mouse is in top 80px
      setShowHeader(y < 80);
      
      // Show footer when mouse is in bottom 120px
      setShowFooter(y > windowHeight - 120);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
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

  // Get the current page image URL for blur background
  const currentPageUrl = pages[currentPage]?.url;
  
  // Determine if background is a gradient
  const bg = settings.backgroundColor;
  const isGradient = bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient');
  const isBlur = bg === 'blur';

  return (
    <div 
      ref={containerRef}
      className="min-h-screen text-white reader-page select-none relative"
      style={{ backgroundColor: isBlur || isGradient ? '#000000' : bg }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fixed background layer for gradients */}
      {isGradient && (
        <div 
          className="fixed inset-0 z-0"
          style={{ background: bg }}
        />
      )}
      
      {/* Blurred page background */}
      {isBlur && currentPageUrl && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-500"
          style={{
            backgroundImage: `url(${currentPageUrl})`,
            filter: 'blur(40px) brightness(0.25) saturate(1.2)',
            transform: 'scale(1.15)',
          }}
        />
      )}
      {/* Header - Always visible (either always or on hover) */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          settings.headerVisibility === 'always' || showHeader 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0'
        }`}
        onMouseEnter={() => settings.headerVisibility === 'hover' && setShowHeader(true)}
      >
        <div className="backdrop-blur-md bg-black/40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
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
            {filteredChapters.length > 1 && (
              <>
                {/* Mobile */}
                <div className="flex md:hidden items-center gap-2">
                  <button
                    onClick={() => prevChapter && navigate(`/manga/${id}/${prevChapter.id}`, { state: { isLongStrip, preferredLang } })}
                    disabled={!prevChapter}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous Chapter"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <div className="relative flex-1 min-w-0">
                    <select
                      value={filteredChapters.find(c => parseFloat(c.chapter) === currentChapterNum)?.id || chapterId}
                      onChange={(e) => navigate(`/manga/${id}/${e.target.value}`, { state: { isLongStrip, preferredLang } })}
                      className="h-10 w-full pl-3 pr-8 bg-zinc-900/80 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500 appearance-none"
                    >
                      {filteredChapters.map(c => (
                        <option key={c.id} value={c.id}>Ch. {c.chapter}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  </div>

                  <button
                    onClick={() => nextChapter && navigate(`/manga/${id}/${nextChapter.id}`, { state: { isLongStrip, preferredLang } })}
                    disabled={!nextChapter}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next Chapter"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Desktop */}
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
              </>
            )}
            
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
        <div className="max-w-4xl mx-auto pt-16 relative z-10" style={{ gap: `${settings.gapSize}px` }}>
          <div className="flex flex-col" style={{ gap: `${settings.gapSize}px` }}>
            {pages.map((p, i) => (
              <PageImage 
                key={i}
                src={p.url}
                alt={`Page ${i + 1}`}
                fitMode={settings.fitMode}
                isVisible={i < settings.preloadPages}
                onImageError={handleImageError}
                pageIndex={i}
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
        // Double Page Mode - Two pages side by side
        <div 
          className={`min-h-screen flex items-center justify-center pb-24 px-12 relative z-10 ${
            settings.headerVisibility === 'always' ? 'pt-20' : 'pt-4'
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-center gap-1" style={{ 
            maxHeight: settings.fitMode === 'original' ? 'none' : 
              settings.headerVisibility === 'always' ? 'calc(100vh - 11rem)' : 'calc(100vh - 6rem)'
          }}>
            {pages[currentPage] && (
              <img
                src={pages[currentPage].url}
                alt={`Page ${currentPage + 1}`}
                className={getPageImageStyle(settings.fitMode, true, settings.headerVisibility === 'always').className}
                style={getPageImageStyle(settings.fitMode, true, settings.headerVisibility === 'always').style}
                draggable={false}
                onError={() => handleImageError(pages[currentPage].url, currentPage)}
                referrerPolicy="no-referrer"
              />
            )}
            {pages[currentPage + 1] && (
              <img
                src={pages[currentPage + 1].url}
                alt={`Page ${currentPage + 2}`}
                className={getPageImageStyle(settings.fitMode, true, settings.headerVisibility === 'always').className}
                style={getPageImageStyle(settings.fitMode, true, settings.headerVisibility === 'always').style}
                draggable={false}
                onError={() => handleImageError(pages[currentPage + 1].url, currentPage + 1)}
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>
      ) : (
        // Single Page Mode - Clean view
        <div 
          className={`min-h-screen flex items-center justify-center pb-24 relative z-10 ${
            settings.headerVisibility === 'always' ? 'pt-20' : 'pt-4'
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {pages[currentPage] && (
            <img
              src={pages[currentPage].url}
              alt={`Page ${currentPage + 1}`}
              className={getPageImageStyle(settings.fitMode, false, settings.headerVisibility === 'always').className}
              style={getPageImageStyle(settings.fitMode, false, settings.headerVisibility === 'always').style}
              draggable={false}
              onError={() => handleImageError(pages[currentPage].url, currentPage)}
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      )}

      {/* Floating Page Number - Only show when footer is hidden to avoid redundancy */}
      {actualMode !== 'scroll' && settings.pageNumberVisibility !== 'never' && settings.footerVisibility !== 'always' && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-sm font-medium transition-opacity duration-200 ${
          (settings.pageNumberVisibility === 'always' && !showFooter) || 
          (settings.pageNumberVisibility === 'hover' && !showFooter)
            ? 'opacity-100' 
            : 'opacity-0 pointer-events-none'
        }`}>
          {currentPage + 1} / {pages.length}
        </div>
      )}

      {/* Page Navigation for Page Modes - Visibility based on settings */}
      {actualMode !== 'scroll' && settings.footerVisibility !== 'never' && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-200 ${
            settings.footerVisibility === 'always' || showFooter 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-full opacity-0'
          }`}
          onMouseEnter={() => settings.footerVisibility === 'hover' && setShowFooter(true)}
        >
          <div className="py-4 px-4 backdrop-blur-md bg-black/40">
            <div className="max-w-4xl mx-auto">
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
                  {/* Page number in footer - clickable to jump */}
                  <div className="flex justify-center mt-2">
                    {showPageInput ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const pageNum = parseInt(pageInputValue, 10);
                          if (pageNum >= 1 && pageNum <= pages.length) {
                            goToPage(pageNum - 1);
                          }
                          setShowPageInput(false);
                          setPageInputValue('');
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          ref={pageInputRef}
                          type="number"
                          min="1"
                          max={pages.length}
                          value={pageInputValue}
                          onChange={(e) => setPageInputValue(e.target.value)}
                          onBlur={() => {
                            setShowPageInput(false);
                            setPageInputValue('');
                          }}
                          className="w-14 px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-center text-white text-sm focus:outline-none focus:border-orange-500"
                          autoFocus
                        />
                        <span className="text-white text-sm">/ {pages.length}</span>
                      </form>
                    ) : (
                      <button
                        className="px-3 py-1 bg-zinc-800/80 rounded-full text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
                        onClick={() => {
                          setPageInputValue(String(currentPage + 1));
                          setShowPageInput(true);
                        }}
                        title="Click to jump to page"
                      >
                        {currentPage + 1} / {pages.length}
                      </button>
                    )}
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
