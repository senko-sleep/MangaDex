import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, X, Eye, EyeOff, Sparkles, TrendingUp,
  BookOpen, Grid3X3, LayoutGrid, Shield, ShieldOff, ShieldAlert,
  Clock, CheckCircle2, Loader2, Filter, ChevronDown, ArrowUpDown,
  Plus, Star, RefreshCw, Layers, Database, ImageIcon, Gamepad2,
  Globe, Palette, Camera, Book
} from 'lucide-react';
import { apiUrl } from '../lib/api';
import { getCoverUrl } from '../lib/imageUtils';

// Save state before navigating to manga details
const saveHomeState = (state) => {
  sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
  sessionStorage.setItem('homeState', JSON.stringify(state));
  sessionStorage.setItem('homeStateTimestamp', Date.now().toString());
};

// Get saved state from sessionStorage
const getSavedState = () => {
  try {
    const saved = sessionStorage.getItem('homeState');
    const timestamp = sessionStorage.getItem('homeStateTimestamp');
    // Only restore state if it was saved recently (within 30 minutes)
    if (saved && timestamp && (Date.now() - parseInt(timestamp, 10)) < 30 * 60 * 1000) {
      return JSON.parse(saved);
    }
    return null;
  } catch {
    return null;
  }
};

// Clear saved state after restoration
const clearSavedState = () => {
  sessionStorage.removeItem('homeState');
  sessionStorage.removeItem('homeScrollPosition');
  sessionStorage.removeItem('homeStateTimestamp');
};

// Manga Card Component
function MangaCard({ manga, index, onNavigate }) {
  const cover = getCoverUrl(manga);
  return (
    <Link 
      to={`/manga/${encodeURIComponent(manga.id)}`} 
      className="group relative fade-in"
      style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
      onClick={onNavigate}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 card-lift">
        {/* Cover Image */}
        {cover ? (
          <img 
            src={cover} 
            alt="" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <BookOpen className="w-8 h-8 text-zinc-700" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        
        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <div className="flex gap-1">
            {manga.isLongStrip && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-blue-500 rounded">
                WEBTOON
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {manga.isAdult && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 rounded">
                18+
              </span>
            )}
            {manga.status?.toLowerCase() === 'completed' && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500 rounded">
                END
              </span>
            )}
          </div>
        </div>
        
        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h3 className="text-xs font-semibold text-white line-clamp-2 leading-tight group-hover:text-orange-400 transition-colors">
            {manga.title}
          </h3>
        </div>
        
        {/* Hover Border */}
        <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-orange-500/50 transition-all" />
      </div>
    </Link>
  );
}

// Section Card for horizontal scrolling sections
function SectionCard({ manga, onNavigate }) {
  const cover = getCoverUrl(manga);
  return (
    <Link 
      to={`/manga/${encodeURIComponent(manga.id)}`}
      className="relative flex-shrink-0 w-[260px] md:w-[300px] group"
      onClick={onNavigate}
    >
      <div className="relative h-[160px] md:h-[180px] rounded-2xl overflow-hidden card-hover">
        {cover ? (
          <img 
            src={cover} 
            alt="" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {manga.isLongStrip && (
            <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-blue-500 rounded mb-1.5">WEBTOON</span>
          )}
          <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">
            {manga.title}
          </h3>
        </div>
        
        {/* Hover ring */}
        <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-orange-500/50 transition-all" />
      </div>
    </Link>
  );
}

// Loading Skeleton
function MangaSkeleton() {
  return (
    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900">
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}

export default function HomePage() {
  // Get saved state for restoration (only on initial mount)
  const savedStateRef = useRef(getSavedState());
  const savedState = savedStateRef.current;
  const shouldSkipInitialFetch = useRef(!!savedState?.manga?.length);
  
  const [manga, setManga] = useState(savedState?.manga || []);
  const [newManga, setNewManga] = useState([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!savedState?.manga?.length);
  const [query, setQuery] = useState(savedState?.search || '');
  const [search, setSearch] = useState(savedState?.search || '');
  const [page, setPage] = useState(savedState?.page || 1);
  const [hasMore, setHasMore] = useState(savedState?.hasMore ?? true);
  
  // Sources & Filters - initialize from saved state if available
  const [sources, setSources] = useState([]);
  const [enabledSources, setEnabledSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState(savedState?.selectedSources || []);
  const [contentTypes, setContentTypes] = useState([]);
  const [contentType, setContentType] = useState(savedState?.contentType || 'all');
  const [contentRating, setContentRating] = useState(savedState?.contentRating || 'safe');
  const [showAdult, setShowAdult] = useState(savedState?.showAdult || false);
  const [statusFilter, setStatusFilter] = useState(savedState?.statusFilter || 'all');
  const [sortBy, setSortBy] = useState(savedState?.sortBy || 'popular');
  const [allTags, setAllTags] = useState([]);
  const [adultTags, setAdultTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(savedState?.selectedTags || []);
  const [excludedTags, setExcludedTags] = useState(savedState?.excludedTags || []);
  const [showFilters, setShowFilters] = useState(false);
  const [gridSize, setGridSize] = useState(savedState?.gridSize || 'normal');
  const [expandedSection, setExpandedSection] = useState('type');
  
  const loader = useRef(null);
  const newMangaRef = useRef(null);
  const recentlyUpdatedRef = useRef(null);
  
  // Function to save current state before navigating
  const handleNavigateToManga = useCallback(() => {
    saveHomeState({
      search,
      contentRating,
      contentType,
      selectedSources,
      showAdult,
      statusFilter,
      sortBy,
      selectedTags,
      excludedTags,
      gridSize,
      manga,
      page,
      hasMore,
    });
  }, [search, contentRating, contentType, selectedSources, showAdult, statusFilter, sortBy, selectedTags, excludedTags, gridSize, manga, page, hasMore]);

  // Fetch homepage sections (new manga, recently updated)
  useEffect(() => {
    const fetchSections = async () => {
      setSectionsLoading(true);
      try {
        const [newRes, latestRes] = await Promise.all([
          fetch(apiUrl('/api/manga/new?adult=false')),
          fetch(apiUrl('/api/manga/latest?adult=false'))
        ]);
        
        const [newData, latestData] = await Promise.all([
          newRes.json(),
          latestRes.json()
        ]);
        
        setNewManga((newData.data || []).slice(0, 12));
        setRecentlyUpdated((latestData.data || []).slice(0, 12));
      } catch (e) {
        console.error('[MangaFox] Error fetching sections:', e);
      }
      setSectionsLoading(false);
    };
    
    fetchSections();
  }, []);

  // Load sources and tags on mount
  useEffect(() => {
    fetch(apiUrl(`/api/sources?adult=${showAdult}`)).then(r => r.json()).then(d => {
      setSources(d.sources || []);
      setEnabledSources(d.enabled || []);
      setContentTypes(d.contentTypes || []);
    }).catch(() => {});
    fetch(apiUrl(`/api/tags?adult=${showAdult}`)).then(r => r.json()).then(d => {
      setAllTags(d.tags || []);
      setAdultTags(d.adultTags || []);
    }).catch(() => {});
  }, [showAdult]);

  const buildUrl = useCallback((p = 1) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('page', p);
    
    // Content rating filter - simple approach like safe filter
    // adult=false → safe+suggestive only
    // adult=true → all content
    // adult=only → erotica+pornographic only
    if (contentRating === 'safe') {
      params.set('adult', 'false');
    } else if (contentRating === 'adult') {
      params.set('adult', 'only');
    } else {
      params.set('adult', 'true');
    }
    
    // Content type filter (manga, doujinshi, artistcg, etc.)
    if (contentType && contentType !== 'all') {
      params.set('type', contentType);
    }
    
    // Source filter
    if (selectedSources.length > 0) {
      params.set('sources', selectedSources.join(','));
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    
    // Sort filter
    if (sortBy) {
      params.set('sort', sortBy);
    }
    
    // Tag filters
    if (selectedTags.length) params.set('tags', selectedTags.join(','));
    if (excludedTags.length) params.set('exclude', excludedTags.join(','));
    
    return apiUrl(`/api/manga/search?${params}`);
  }, [search, selectedTags, excludedTags, contentRating, contentType, selectedSources, statusFilter, sortBy]);

  const fetchManga = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const p = reset ? 1 : page;
      const url = buildUrl(p);
      console.log('[MangaFox] Fetching manga:', url);
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const json = await res.json();
      let data = json.data || [];
      
      // Filter out safe content when 18+ only is selected
      if (contentRating === 'adult') {
        data = data.filter(m => m.isAdult || m.contentRating === 'erotica' || m.contentRating === 'pornographic');
      }
      
      if (data.length === 0 && reset) {
        console.log('[MangaFox] No results found for current filters');
      }
      
      setManga(prev => reset ? data : [...prev, ...data]);
      setPage(p + 1);
      setHasMore(data.length >= 20);
      setInitialLoad(false);
    } catch (e) {
      console.error('[MangaFox] Error fetching manga:', e.message);
      console.error('[MangaFox] Full error:', e);
      setInitialLoad(false);
    }
    setLoading(false);
  }, [page, loading, buildUrl, contentRating]);

  // Track if this is the initial mount to prevent double-fetch
  const isInitialMount = useRef(true);
  
  // Reset and fetch when filters change (skip if restoring from saved state)
  useEffect(() => {
    // Skip the first fetch if we're restoring from saved state with manga loaded
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (shouldSkipInitialFetch.current && manga.length > 0) {
        shouldSkipInitialFetch.current = false;
        console.log('[MangaFox] Restored from saved state, skipping initial fetch');
        return;
      }
      shouldSkipInitialFetch.current = false;
    }
    
    console.log('[MangaFox] Filters changed:', { search, contentRating, contentType, selectedSources, statusFilter, sortBy, selectedTags, excludedTags });
    setManga([]);
    setPage(1);
    setHasMore(true);
    fetchManga(true);
  }, [search, contentRating, contentType, selectedSources, statusFilter, sortBy, selectedTags, excludedTags]);

  // Infinite scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchManga();
    }, { threshold: 0.1 });
    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
  }, [hasMore, loading, fetchManga]);

  // Track if scroll has been restored to prevent multiple attempts
  const hasRestoredScroll = useRef(false);
  
  // Restore scroll position when returning from manga details
  useEffect(() => {
    // Only attempt restoration once per mount when we have content
    if (hasRestoredScroll.current || manga.length === 0) return;
    
    const savedPosition = sessionStorage.getItem('homeScrollPosition');
    if (!savedPosition) return;
    
    const scrollY = parseInt(savedPosition, 10);
    if (scrollY <= 0) {
      clearSavedState();
      return;
    }
    
    // Mark as restored immediately to prevent re-runs
    hasRestoredScroll.current = true;
    
    // Function to attempt scroll restoration
    const attemptScroll = (attempts = 0) => {
      // Check if document is tall enough to scroll to the saved position
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      
      if (scrollY <= maxScroll || attempts >= 10) {
        // Can scroll to position or max attempts reached
        window.scrollTo({ top: Math.min(scrollY, maxScroll), behavior: 'instant' });
        clearSavedState();
      } else {
        // Document not tall enough yet, wait for more content to load
        requestAnimationFrame(() => {
          setTimeout(() => attemptScroll(attempts + 1), 50);
        });
      }
    };
    
    // Start attempting scroll after a brief delay for initial render
    const timeoutId = setTimeout(() => attemptScroll(), 50);
    
    return () => clearTimeout(timeoutId);
  }, [manga.length]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(query);
  };

  const toggleTag = (tag, type) => {
    if (type === 'include') {
      setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
      setExcludedTags(prev => prev.filter(t => t !== tag));
    } else {
      setExcludedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
      setSelectedTags(prev => prev.filter(t => t !== tag));
    }
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setExcludedTags([]);
    setContentRating('safe');
    setContentType('all');
    setSelectedSources([]);
    setStatusFilter('all');
    setSortBy('popular');
    setShowAdult(false);
  };

  // Toggle source selection
  const toggleSource = (sourceId) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(s => s !== sourceId) 
        : [...prev, sourceId]
    );
  };

  // Check if any filters are active (non-default values)
  const hasFilters = selectedTags.length > 0 || excludedTags.length > 0 || selectedSources.length > 0;
  const hasAdvancedFilters = contentRating !== 'safe' || statusFilter !== 'all' || sortBy !== 'popular' || contentType !== 'all';
  const isInBrowserMode = search || hasFilters || hasAdvancedFilters;

  const gridCols = {
    compact: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2',
    normal: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4',
    large: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5'
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient Background */}
      <div className="fixed inset-0 gradient-radial pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass-dark">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center relative overflow-hidden">
                <BookOpen className="w-5 h-5 text-white" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-300 rounded-full opacity-60" />
              </div>
              <span className="text-xl font-bold hidden sm:block">
                <span className="text-gradient">Manga</span>
                <span className="text-white">Fox</span>
              </span>
            </Link>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for manga, manhwa, webtoons..."
                  className="w-full h-11 pl-12 pr-4 bg-zinc-900/80 border border-zinc-800 rounded-xl text-sm placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                  showFilters || hasFilters 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Filters</span>
                {hasFilters && (
                  <span className="w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center font-bold">
                    {selectedTags.length + excludedTags.length}
                  </span>
                )}
              </button>

              {/* Grid Size Toggle */}
              <div className="hidden md:flex items-center bg-zinc-900 rounded-xl p-1">
                <button
                  onClick={() => setGridSize('compact')}
                  className={`p-2 rounded-lg transition-all ${gridSize === 'compact' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Compact grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize('normal')}
                  className={`p-2 rounded-lg transition-all ${gridSize === 'normal' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Normal grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <>
            {/* Backdrop overlay - click to close */}
            <div 
              className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
              onClick={() => setShowFilters(false)}
            />
            <div className="relative z-50 border-t border-white/5 bg-zinc-950/98 backdrop-blur-xl shadow-2xl shadow-black/50">
              <div className="max-w-7xl mx-auto px-4 py-5 slide-up">
              {/* Filter Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Advanced Filters</h3>
                    <p className="text-xs text-zinc-500">Refine your search results</p>
                  </div>
                </div>
                {hasFilters && (
                  <button 
                    onClick={clearFilters} 
                    className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear All
                  </button>
                )}
              </div>

              {/* Quick Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* Content Rating */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Content Rating</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setContentRating('safe'); setShowAdult(false); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        contentRating === 'safe' 
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Safe
                    </button>
                    <button
                      onClick={() => { setContentRating('all'); setShowAdult(true); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        contentRating === 'all' 
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      All
                    </button>
                    <button
                      onClick={() => { setContentRating('adult'); setShowAdult(true); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        contentRating === 'adult' 
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      18+
                    </button>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Status</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === 'all' 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter('ongoing')}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === 'ongoing' 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <Loader2 className="w-3 h-3" />
                      Ongoing
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === 'completed' 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </button>
                  </div>
                </div>

                {/* Sort By */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowUpDown className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Sort By</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy('popular')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        sortBy === 'popular' 
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      Popular
                    </button>
                    <button
                      onClick={() => setSortBy('latest')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        sortBy === 'latest' 
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      Latest
                    </button>
                    <button
                      onClick={() => setSortBy('updated')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        sortBy === 'updated' 
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      Updated
                    </button>
                  </div>
                </div>
              </div>

              {/* Content Type & Sources Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Content Type Filter */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Content Type</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setContentType('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === 'all' 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setContentType('manga')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === 'manga' 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <Book className="w-3 h-3" />
                      Manga
                    </button>
                    <button
                      onClick={() => setContentType('doujinshi')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === 'doujinshi' 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      Doujinshi
                    </button>
                    <button
                      onClick={() => setContentType('artistcg')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === 'artistcg' 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <Palette className="w-3 h-3" />
                      Artist CG
                    </button>
                    <button
                      onClick={() => setContentType('gamecg')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === 'gamecg' 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <Gamepad2 className="w-3 h-3" />
                      Game CG
                    </button>
                    <button
                      onClick={() => setContentType('imageset')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === 'imageset' 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" />
                      Image Set
                    </button>
                    <button
                      onClick={() => setContentType('western')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === 'western' 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      Western
                    </button>
                    <button
                      onClick={() => setContentType('cosplay')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === 'cosplay' 
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      <Camera className="w-3 h-3" />
                      Cosplay
                    </button>
                  </div>
                </div>

                {/* Sources Filter */}
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Sources</span>
                    {selectedSources.length > 0 && (
                      <span className="text-xs text-pink-400">({selectedSources.length} selected)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sources.length > 0 ? (
                      sources.map(source => (
                        <button
                          key={source.id}
                          onClick={() => toggleSource(source.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedSources.includes(source.id)
                              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                              : source.adult 
                                ? 'bg-red-950/50 text-red-300/70 hover:text-red-200 hover:bg-red-900/50 border border-red-900/30'
                                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                          }`}
                          title={source.adult ? '18+ Source' : 'Safe Source'}
                        >
                          {source.name}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-500">Loading sources...</span>
                    )}
                  </div>
                  {selectedSources.length > 0 && (
                    <button
                      onClick={() => setSelectedSources([])}
                      className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Clear source selection
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              {(selectedTags.length > 0 || excludedTags.length > 0 || selectedSources.length > 0 || contentType !== 'all') && (
                <div className="mb-4 p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-zinc-400">Active Filters:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Content Type Badge */}
                    {contentType !== 'all' && (
                      <span className="px-2.5 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center gap-1.5 border border-cyan-500/30">
                        <Layers className="w-3 h-3" />{contentType}
                        <X className="w-3 h-3 cursor-pointer hover:text-white transition-colors" onClick={() => setContentType('all')} />
                      </span>
                    )}
                    {/* Source Badges */}
                    {selectedSources.map(sourceId => {
                      const source = sources.find(s => s.id === sourceId);
                      return (
                        <span 
                          key={sourceId} 
                          className="px-2.5 py-1 text-xs bg-pink-500/20 text-pink-400 rounded-lg flex items-center gap-1.5 border border-pink-500/30"
                        >
                          <Database className="w-3 h-3" />{source?.name || sourceId}
                          <X className="w-3 h-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSource(sourceId)} />
                        </span>
                      );
                    })}
                    {/* Tag Badges */}
                    {selectedTags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-1.5 border border-emerald-500/30"
                      >
                        <span className="text-emerald-500 font-bold">+</span>{tag}
                        <X className="w-3 h-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleTag(tag, 'include')} />
                      </span>
                    ))}
                    {excludedTags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2.5 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg flex items-center gap-1.5 border border-red-500/30"
                      >
                        <span className="text-red-500 font-bold">−</span>{tag}
                        <X className="w-3 h-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleTag(tag, 'exclude')} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Section */}
              <div className="bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'tags' ? '' : 'tags')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center">
                      <Filter className="w-3 h-3 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium">Genre & Tags</span>
                    <span className="text-xs text-zinc-500 hidden sm:inline">(Click to include, right-click to exclude)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedSection === 'tags' ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedSection === 'tags' && (
                  <div className="px-4 pb-4 border-t border-zinc-800/50">
                    {/* Main Tags */}
                    <div className="pt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {allTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag, 'include')}
                            onContextMenu={(e) => { e.preventDefault(); toggleTag(tag, 'exclude'); }}
                            className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all ${
                              selectedTags.includes(tag) 
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25' 
                                : excludedTags.includes(tag) 
                                  ? 'bg-red-500 text-white shadow-md shadow-red-500/25' 
                                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Adult Tags */}
                    {showAdult && adultTags.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Adult Content Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {adultTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag, 'include')}
                              onContextMenu={(e) => { e.preventDefault(); toggleTag(tag, 'exclude'); }}
                              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all ${
                                selectedTags.includes(tag) 
                                  ? 'bg-emerald-500 text-white' 
                                  : excludedTags.includes(tag) 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-red-950/50 text-red-300/70 hover:text-red-200 hover:bg-red-900/50 border border-red-900/30'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="mt-5 pt-4 border-t border-zinc-800/50 flex items-center justify-between gap-4">
                <div className="text-xs text-zinc-500">
                  {hasFilters ? (
                    <span>{selectedTags.length + excludedTags.length} filter(s) active</span>
                  ) : (
                    <span>No filters applied</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      clearFilters();
                      setShowFilters(false);
                    }}
                    className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-5 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-orange-500/25 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </header>

      <main className="relative">
        {/* Homepage Sections - Only show when NOT in browser mode */}
        {!isInBrowserMode && (
          <>
            {/* New Manga Section */}
            {(sectionsLoading || newManga.length > 0) && (
              <section className="py-6 border-b border-zinc-900">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-emerald-500" />
                      <h2 className="text-lg font-bold">New Manga</h2>
                    </div>
                  </div>
                  {sectionsLoading ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[260px] md:w-[300px] h-[160px] md:h-[180px] rounded-2xl bg-zinc-900 shimmer" />
                      ))}
                    </div>
                  ) : (
                    <div ref={newMangaRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {newManga.map((m) => (
                        <SectionCard key={m.id} manga={m} onNavigate={handleNavigateToManga} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Recently Updated Section */}
            {(sectionsLoading || recentlyUpdated.length > 0) && (
              <section className="py-6 border-b border-zinc-900">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-500" />
                      <h2 className="text-lg font-bold">Recently Updated</h2>
                    </div>
                  </div>
                  {sectionsLoading ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[260px] md:w-[300px] h-[160px] md:h-[180px] rounded-2xl bg-zinc-900 shimmer" />
                      ))}
                    </div>
                  ) : (
                    <div ref={recentlyUpdatedRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {recentlyUpdated.map((m) => (
                        <SectionCard key={m.id} manga={m} onNavigate={handleNavigateToManga} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

          </>
        )}

        {/* Browser Mode Header - Show active filters summary */}
        {isInBrowserMode && (
          <div className="bg-zinc-900/50 border-b border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Filter className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">Browsing:</span>
                  </div>
                  {search && (
                    <span className="px-2 py-1 bg-zinc-800 rounded-lg text-xs">
                      Search: <span className="text-orange-400">{search}</span>
                    </span>
                  )}
                  {contentRating === 'adult' && (
                    <span className="px-2 py-1 rounded-lg text-xs bg-red-500/20 text-red-400">
                      18+ Only
                    </span>
                  )}
                  {contentRating === 'all' && (
                    <span className="px-2 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-400">
                      All Content
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs capitalize">
                      {statusFilter}
                    </span>
                  )}
                  {sortBy !== 'popular' && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs capitalize">
                      Sort: {sortBy}
                    </span>
                  )}
                  {selectedTags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-1">
                      +{tag}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-white" 
                        onClick={() => toggleTag(tag, 'include')} 
                      />
                    </span>
                  ))}
                  {excludedTags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-1">
                      -{tag}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-white" 
                        onClick={() => toggleTag(tag, 'exclude')} 
                      />
                    </span>
                  ))}
                </div>
                <button
                  onClick={clearFilters}
                  className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <section className="max-w-7xl mx-auto px-4 py-6">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {isInBrowserMode ? (
                <>
                  <Filter className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold">Browse Results</h2>
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold">Popular Manga</h2>
                </>
              )}
              {manga.length > 0 && (
                <span className="text-sm text-zinc-500">({manga.length}+ titles)</span>
              )}
            </div>
            
            {/* Grid Size Toggle */}
            <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
              <button
                onClick={() => setGridSize('compact')}
                className={`p-1.5 rounded-md transition-colors ${gridSize === 'compact' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'}`}
                title="Compact grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridSize('normal')}
                className={`p-1.5 rounded-md transition-colors ${gridSize === 'normal' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'}`}
                title="Normal grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridSize('large')}
                className={`p-1.5 rounded-md transition-colors ${gridSize === 'large' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'}`}
                title="Large grid"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="8" height="8" rx="1" />
                  <rect x="13" y="3" width="8" height="8" rx="1" />
                  <rect x="3" y="13" width="8" height="8" rx="1" />
                  <rect x="13" y="13" width="8" height="8" rx="1" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Initial Loading State */}
          {initialLoad && (
            <div className={`grid ${gridCols[gridSize]}`}>
              {Array.from({ length: 12 }).map((_, i) => (
                <MangaSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Manga Grid */}
          {!initialLoad && manga.length > 0 && (
            <div className={`grid ${gridCols[gridSize]}`}>
              {manga.map((m, i) => (
                <MangaCard key={m.id} manga={m} index={i} onNavigate={handleNavigateToManga} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !initialLoad && manga.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
                <Search className="w-8 h-8 text-zinc-700" />
              </div>
              <p className="text-zinc-400 text-lg mb-2">No manga found</p>
              <p className="text-zinc-600 text-sm mb-4">Try adjusting your search or filters</p>
              {hasFilters && (
                <button 
                  onClick={clearFilters} 
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Loader */}
          <div ref={loader} className="py-12 text-center">
            {loading && !initialLoad && (
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-zinc-500 text-sm">Loading more...</span>
              </div>
            )}
            {!hasMore && manga.length > 0 && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-1 bg-zinc-800 rounded-full" />
                <p className="text-zinc-600 text-sm">You've reached the end</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
