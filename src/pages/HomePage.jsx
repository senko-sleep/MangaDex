import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, X, Eye, EyeOff, Sparkles, TrendingUp,
  BookOpen, Grid3X3, LayoutGrid, Shield, ShieldOff, ShieldAlert,
  Clock, CheckCircle2, Loader2, Filter, ChevronDown, ArrowUpDown,
  Plus, Star, RefreshCw, Layers, Database, ImageIcon, Gamepad2,
  Globe, Palette, Camera, Book
} from 'lucide-react';
import { apiUrl } from '../lib/api';
import { getCoverUrl } from '../lib/imageUtils';
import Logo from '../components/Logo';

// Save state before navigating to manga details
const saveHomeState = (state, mangaId) => {
  sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
  sessionStorage.setItem('homeState', JSON.stringify(state));
  sessionStorage.setItem('homeStateTimestamp', Date.now().toString());
  // Save the manga ID to scroll to when returning
  if (mangaId) {
    sessionStorage.setItem('scrollToMangaId', mangaId);
  }
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
  sessionStorage.removeItem('scrollToMangaId');
};

// Create a safe DOM ID from manga ID
const getMangaElementId = (mangaId) => {
  return `manga-${mangaId.replace(/[^a-zA-Z0-9]/g, '-')}`;
};

// Manga Card Component
function MangaCard({ manga, index, onNavigate }) {
  const cover = getCoverUrl(manga);
  const sourceId = manga.sourceId || manga.id?.split(':')[0];
  const elementId = getMangaElementId(manga.id);
  
  return (
    <Link 
      id={elementId}
      to={`/manga/${encodeURIComponent(manga.id)}`}
      state={{ sourceId }}
      className="group relative fade-in"
      style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
      onClick={() => onNavigate(manga.id)}
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
  const sourceId = manga.sourceId || manga.id?.split(':')[0];
  return (
    <Link 
      to={`/manga/${encodeURIComponent(manga.id)}`}
      state={{ sourceId }}
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
  const location = useLocation();
  
  // Check if we need to restore scroll (check sessionStorage directly)
  // This must be checked BEFORE any state initialization
  const scrollToMangaIdRef = useRef(sessionStorage.getItem('scrollToMangaId'));
  const shouldRestore = !!scrollToMangaIdRef.current;
  
  // Get saved state for restoration (only on initial mount)
  const savedStateRef = useRef(getSavedState());
  const savedState = savedStateRef.current;
  
  // Determine if we should skip fetch - we have saved manga AND a manga to scroll to
  const shouldSkipFetch = shouldRestore && !!savedState?.manga?.length;
  
  // Check if we're navigating back from manga details
  const restoreScrollFromNav = location.state?.restoreScroll || shouldRestore;
  const filterSourceFromNav = location.state?.filterSource;
  
  // Initialize state from saved state if restoring
  const [manga, setManga] = useState(savedState?.manga || []);
  const [newManga, setNewManga] = useState([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  // If we're restoring, don't show initial load skeleton
  const [initialLoad, setInitialLoad] = useState(shouldSkipFetch ? false : !savedState?.manga?.length);
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
  // showAdult is derived from contentRating, not a separate state
  const [statusFilter, setStatusFilter] = useState(savedState?.statusFilter || 'all');
  const [sortBy, setSortBy] = useState(savedState?.sortBy || 'popular');
  const [allTags, setAllTags] = useState([]);
  const [tagsBySource, setTagsBySource] = useState({});
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState(savedState?.selectedTags || []);
  const [excludedTags, setExcludedTags] = useState(savedState?.excludedTags || []);
  const [showFilters, setShowFilters] = useState(false);
  const [gridSize, setGridSize] = useState(savedState?.gridSize || 'normal');
  const [expandedSection, setExpandedSection] = useState('type');
  
  const loader = useRef(null);
  const newMangaRef = useRef(null);
  const recentlyUpdatedRef = useRef(null);
  
  // Function to save current state before navigating
  const handleNavigateToManga = useCallback((mangaId) => {
    saveHomeState({
      search,
      contentRating,
      contentType,
      selectedSources,
      statusFilter,
      sortBy,
      selectedTags,
      excludedTags,
      gridSize,
      manga,
      page,
      hasMore,
    }, mangaId);
  }, [search, contentRating, contentType, selectedSources, statusFilter, sortBy, selectedTags, excludedTags, gridSize, manga, page, hasMore]);

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

  // Load sources based on content rating
  // safe → SFW only, all → all sources, adult → NSFW only
  useEffect(() => {
    let adult = 'false';
    let adultOnly = 'false';
    
    if (contentRating === 'safe') {
      adult = 'false';
      adultOnly = 'false';
    } else if (contentRating === 'all') {
      adult = 'true';
      adultOnly = 'false';
    } else if (contentRating === 'adult') {
      adult = 'true';
      adultOnly = 'true';
    }
    
    fetch(apiUrl(`/api/sources?adult=${adult}&adultOnly=${adultOnly}`)).then(r => r.json()).then(d => {
      setSources(d.sources || []);
      setEnabledSources(d.enabled || []);
      setContentTypes(d.contentTypes || []);
      // Clear selected sources when switching modes to avoid selecting unavailable sources
      setSelectedSources([]);
    }).catch(() => {});
  }, [contentRating]);

  // Fetch tags when selected sources or content rating changes
  useEffect(() => {
    const fetchTags = async () => {
      setTagsLoading(true);
      try {
        const sourcesParam = selectedSources.length > 0 ? `&sources=${selectedSources.join(',')}` : '';
        const adultParam = contentRating !== 'safe';
        const res = await fetch(apiUrl(`/api/tags?adult=${adultParam}${sourcesParam}`));
        const data = await res.json();
        setAllTags(data.tags || []);
        setTagsBySource(data.bySource || {});
      } catch (e) {
        console.error('[MangaFox] Error fetching tags:', e);
      }
      setTagsLoading(false);
    };
    fetchTags();
  }, [selectedSources, contentRating]);
  
  // Handle source filter from navigation (when coming back from manga details)
  useEffect(() => {
    if (filterSourceFromNav) {
      // Check if the source matches what we had saved - if so, keep the saved state
      const savedSourceMatches = savedState?.selectedSources?.length === 1 && 
                                  savedState.selectedSources[0] === filterSourceFromNav;
      
      if (!savedSourceMatches) {
        // Source is different or no saved state - apply the new filter
        // This will trigger a re-fetch with the new source
        setSelectedSources([filterSourceFromNav]);
      }
      // Clear the navigation state to prevent re-applying on refresh
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSourceFromNav]);

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

  // Prefetch cache for next page
  const prefetchCache = useRef(new Map());
  const prefetchInProgress = useRef(new Set());

  // Prefetch next page in background
  const prefetchNextPage = useCallback(async (nextPage) => {
    const url = buildUrl(nextPage);
    const cacheKey = url;
    
    // Skip if already cached or in progress
    if (prefetchCache.current.has(cacheKey) || prefetchInProgress.current.has(cacheKey)) {
      return;
    }
    
    prefetchInProgress.current.add(cacheKey);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        prefetchCache.current.set(cacheKey, json.data || []);
      }
    } catch {
      // Silent fail for prefetch
    } finally {
      prefetchInProgress.current.delete(cacheKey);
    }
  }, [buildUrl]);

  const fetchManga = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const p = reset ? 1 : page;
      const url = buildUrl(p);
      const cacheKey = url;
      
      // Check prefetch cache first
      let data;
      if (!reset && prefetchCache.current.has(cacheKey)) {
        data = prefetchCache.current.get(cacheKey);
        prefetchCache.current.delete(cacheKey);
        console.log('[MangaFox] Using prefetched data for page', p);
      } else {
        console.log('[MangaFox] Fetching manga:', url);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();
        data = json.data || [];
      }
      
      // Filter out safe content when 18+ only is selected
      if (contentRating === 'adult') {
        data = data.filter(m => m.isAdult || m.contentRating === 'erotica' || m.contentRating === 'pornographic');
      }
      
      if (data.length === 0 && reset) {
        console.log('[MangaFox] No results found for current filters');
      }
      
      setManga(prev => reset ? data : [...prev, ...data]);
      const nextPage = p + 1;
      setPage(nextPage);
      setHasMore(data.length >= 20);
      setInitialLoad(false);
      
      // Prefetch next page immediately after loading current
      if (data.length >= 20) {
        prefetchNextPage(nextPage);
      }
    } catch (e) {
      console.error('[MangaFox] Error fetching manga:', e.message);
      console.error('[MangaFox] Full error:', e);
      setInitialLoad(false);
    }
    setLoading(false);
  }, [page, loading, buildUrl, contentRating, prefetchNextPage]);
  
  // Clear prefetch cache when filters change
  useEffect(() => {
    prefetchCache.current.clear();
  }, [search, contentRating, contentType, selectedSources, statusFilter, sortBy, selectedTags, excludedTags]);

  // Track if this is the initial mount to prevent double-fetch
  const isInitialMount = useRef(true);
  const didSkipInitialFetch = useRef(false);
  
  // Reset and fetch when filters change (skip if restoring from saved state)
  useEffect(() => {
    // Skip the first fetch if we're restoring from saved state with manga loaded
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // If we determined at mount time that we should skip fetch, do so
      if (shouldSkipFetch) {
        didSkipInitialFetch.current = true;
        console.log('[MangaFox] Restoring from saved state, skipping initial fetch. Manga count:', savedState?.manga?.length);
        return;
      }
    }
    
    // If we skipped initial fetch and this is a subsequent render with same filters, skip
    if (didSkipInitialFetch.current) {
      didSkipInitialFetch.current = false;
      return;
    }
    
    console.log('[MangaFox] Filters changed, fetching...');
    setManga([]);
    setPage(1);
    setHasMore(true);
    fetchManga(true);
  }, [search, contentRating, contentType, selectedSources, statusFilter, sortBy, selectedTags, excludedTags]);

  // Infinite scroll - trigger early with larger rootMargin for smoother loading
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchManga();
    }, { 
      threshold: 0.1,
      rootMargin: '400px' // Start loading 400px before reaching the loader
    });
    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
  }, [hasMore, loading, fetchManga]);

  // Track if scroll has been restored to prevent multiple attempts
  const hasRestoredScroll = useRef(false);
  
  // Scroll to the specific manga element when we have content
  useEffect(() => {
    // Use the ref we captured at mount time
    const savedMangaId = scrollToMangaIdRef.current;
    
    // Only attempt restoration once per mount when we have content and a saved ID
    if (hasRestoredScroll.current || manga.length === 0 || !savedMangaId) return;
    
    const elementId = getMangaElementId(savedMangaId);
    console.log('[MangaFox] Attempting to scroll to manga:', savedMangaId, 'element:', elementId);
    
    // Mark as restored immediately to prevent re-runs
    hasRestoredScroll.current = true;
    
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Function to attempt scroll to element
    const attemptScroll = (attempts = 0) => {
      const element = document.getElementById(elementId);
      
      if (element) {
        console.log('[MangaFox] Found element, scrolling to it');
        // Found the element - scroll to it with some offset from top
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
        // Add a highlight effect
        element.classList.add('ring-2', 'ring-orange-500');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-orange-500');
        }, 1500);
        // Clear saved state after successful scroll
        clearSavedState();
        scrollToMangaIdRef.current = null;
      } else if (attempts < 50) {
        // Element not found yet, wait for render
        requestAnimationFrame(() => {
          setTimeout(() => attemptScroll(attempts + 1), 50);
        });
      } else {
        console.log('[MangaFox] Could not find element after 50 attempts');
        clearSavedState();
      }
    };
    
    // Start attempting scroll after a brief delay for initial render
    setTimeout(() => attemptScroll(), 100);
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
  };

  // Toggle source selection
  const toggleSource = (sourceId) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(s => s !== sourceId) 
        : [...prev, sourceId]
    );
  };

  // Compute available content types based on selected sources
  const availableContentTypes = useMemo(() => {
    // If no sources selected, use all content types from all sources
    const relevantSources = selectedSources.length > 0 
      ? sources.filter(s => selectedSources.includes(s.id))
      : sources;
    
    // Collect all content types from relevant sources
    const typeSet = new Set();
    relevantSources.forEach(s => {
      (s.contentTypes || ['manga']).forEach(t => typeSet.add(t));
    });
    
    // Filter contentTypes to only those available
    return contentTypes.filter(t => typeSet.has(t.id));
  }, [selectedSources, sources, contentTypes]);

  // Reset content type if it's no longer available
  useEffect(() => {
    if (contentType !== 'all' && availableContentTypes.length > 0) {
      const isAvailable = availableContentTypes.some(t => t.id === contentType);
      if (!isAvailable) {
        setContentType('all');
      }
    }
  }, [availableContentTypes, contentType]);

  // Compute available filters based on selected sources
  const availableFilters = useMemo(() => {
    const relevantSources = selectedSources.length > 0 
      ? sources.filter(s => selectedSources.includes(s.id))
      : sources;
    
    // Check if ANY selected source supports each filter
    // Default to true if filters metadata not present (backward compatibility)
    const supportsTags = relevantSources.length === 0 || relevantSources.some(s => s.filters?.tags !== false);
    const supportsStatus = relevantSources.some(s => s.filters?.status);
    
    // Collect all supported sort options across selected sources
    const sortOptions = new Set();
    relevantSources.forEach(s => {
      (s.filters?.sort || ['popular', 'latest', 'updated']).forEach(opt => sortOptions.add(opt));
    });
    
    // If no sources or no filters metadata, provide defaults
    if (sortOptions.size === 0) {
      ['popular', 'latest', 'updated'].forEach(opt => sortOptions.add(opt));
    }
    
    return {
      tags: supportsTags,
      status: supportsStatus,
      sort: Array.from(sortOptions),
    };
  }, [selectedSources, sources]);

  // Reset filters when they become unavailable
  useEffect(() => {
    if (!availableFilters.status && statusFilter !== 'all') {
      setStatusFilter('all');
    }
    if (!availableFilters.sort.includes(sortBy)) {
      setSortBy(availableFilters.sort[0] || 'popular');
    }
    // Clear tags when tags filter becomes unavailable
    if (!availableFilters.tags && (selectedTags.length > 0 || excludedTags.length > 0)) {
      setSelectedTags([]);
      setExcludedTags([]);
    }
  }, [availableFilters, statusFilter, sortBy, selectedTags.length, excludedTags.length]);

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!availableFilters.tags) return [];
    if (!tagSearch.trim()) return allTags;
    const query = tagSearch.toLowerCase().trim();
    return allTags.filter(tag => tag.toLowerCase().includes(query));
  }, [availableFilters.tags, allTags, tagSearch]);

  // Determine if we need searchable interface (over 50 tags)
  const needsTagSearch = allTags.length > 50;

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
              <Logo size={36} />
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
              <div className="max-w-7xl mx-auto px-4 py-3 slide-up">
              {/* Filter Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold">Filters</h3>
                </div>
                <div className="flex items-center gap-2">
                  {hasFilters && (
                    <button onClick={clearFilters} className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-md flex items-center gap-1 transition-colors">
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Filters Row */}
              <div className={`grid grid-cols-1 gap-3 mb-3 ${
                availableFilters.status && availableFilters.sort.length > 1 
                  ? 'md:grid-cols-3' 
                  : availableFilters.status || availableFilters.sort.length > 1 
                    ? 'md:grid-cols-2' 
                    : ''
              }`}>
                {/* Content Rating */}
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Rating</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setContentRating('safe')}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        contentRating === 'safe' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                      <Shield className="w-3 h-3" />Safe
                    </button>
                    <button onClick={() => setContentRating('all')}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        contentRating === 'all' ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                      <Eye className="w-3 h-3" />All
                    </button>
                    <button onClick={() => setContentRating('adult')}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        contentRating === 'adult' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                      <ShieldAlert className="w-3 h-3" />18+
                    </button>
                  </div>
                </div>

                {/* Status Filter */}
                {availableFilters.status && (
                  <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Status</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setStatusFilter('all')}
                        className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          statusFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                        All
                      </button>
                      <button onClick={() => setStatusFilter('ongoing')}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          statusFilter === 'ongoing' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                        <Loader2 className="w-3 h-3" />Ongoing
                      </button>
                      <button onClick={() => setStatusFilter('completed')}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          statusFilter === 'completed' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                        <CheckCircle2 className="w-3 h-3" />Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Sort By */}
                {availableFilters.sort.length > 1 && (
                  <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpDown className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Sort</span>
                    </div>
                    <div className="flex gap-1.5">
                      {['popular', 'latest', 'updated', 'rating'].filter(s => availableFilters.sort.includes(s)).map(s => (
                        <button key={s} onClick={() => setSortBy(s)}
                          className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium capitalize transition-all ${
                            sortBy === s ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Content Type & Sources - Inline */}
              <div className="flex flex-wrap items-start gap-3 mb-3">
                {/* Content Type */}
                {availableContentTypes.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-zinc-500">Type:</span>
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => setContentType('all')}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${contentType === 'all' ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>All</button>
                      {availableContentTypes.map(type => (
                        <button key={type.id} onClick={() => setContentType(type.id)}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${contentType === type.id ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                          {type.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Sources */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-zinc-500">Source:</span>
                  <div className="flex flex-wrap gap-1">
                    {sources.length > 0 ? sources.map(source => (
                      <button key={source.id} onClick={() => toggleSource(source.id)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${selectedSources.includes(source.id) ? 'bg-pink-500 text-white' : source.adult ? 'bg-red-950/50 text-red-300/70 hover:bg-red-900/50' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                        {source.name}
                      </button>
                    )) : <span className="text-[11px] text-zinc-500">Loading...</span>}
                    {selectedSources.length > 0 && (
                      <button onClick={() => setSelectedSources([])} className="text-[11px] text-zinc-500 hover:text-zinc-300 ml-1">✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags Section - Compact collapsible */}
              {availableFilters.tags && allTags.length > 0 && (
                <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                  <button onClick={() => setExpandedSection(expandedSection === 'tags' ? '' : 'tags')}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-medium">Tags</span>
                      <span className="text-[11px] text-zinc-500">{tagsLoading ? 'Loading...' : `(${allTags.length})`}</span>
                      {(selectedTags.length > 0 || excludedTags.length > 0) && (
                        <span className="text-[11px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">{selectedTags.length + excludedTags.length} selected</span>
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${expandedSection === 'tags' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSection === 'tags' && (
                    <div className="px-3 pb-3 border-t border-zinc-800/50">
                      {needsTagSearch && (
                        <div className="pt-2 pb-1">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                            <input type="text" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Search tags..."
                              className="w-full h-7 pl-7 pr-6 bg-zinc-800 border border-zinc-700 rounded-md text-xs placeholder-zinc-500 focus:outline-none focus:border-orange-500/50" />
                            {tagSearch && <button onClick={() => setTagSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-zinc-400" /></button>}
                          </div>
                        </div>
                      )}
                      {(selectedTags.length > 0 || excludedTags.length > 0) && (
                        <div className="flex flex-wrap gap-1 pt-2 pb-2 border-b border-zinc-800/50 mb-2">
                          {selectedTags.map(tag => (
                            <button key={`s-${tag}`} onClick={() => toggleTag(tag, 'include')} className="px-2 py-1 text-[11px] rounded-md bg-emerald-500 text-white flex items-center gap-1">
                              +{tag}<X className="w-2.5 h-2.5" />
                            </button>
                          ))}
                          {excludedTags.map(tag => (
                            <button key={`e-${tag}`} onClick={() => toggleTag(tag, 'exclude')} className="px-2 py-1 text-[11px] rounded-md bg-red-500 text-white flex items-center gap-1">
                              −{tag}<X className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>
                      )}
                      {tagsLoading ? (
                        <div className="py-4 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-orange-500" /></div>
                      ) : (
                        <div className="flex flex-wrap gap-1 pt-2 max-h-40 overflow-y-auto">
                          {(needsTagSearch ? filteredTags : allTags).map(tag => (
                            <button key={tag} onClick={() => toggleTag(tag, 'include')} onContextMenu={(e) => { e.preventDefault(); toggleTag(tag, 'exclude'); }}
                              className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${selectedTags.includes(tag) ? 'bg-emerald-500 text-white' : excludedTags.includes(tag) ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                              {tag}
                            </button>
                          ))}
                          {needsTagSearch && filteredTags.length === 0 && tagSearch && <div className="py-2 text-xs text-zinc-500">No match</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-end gap-2">
                <button onClick={() => setShowFilters(false)} className="px-4 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-md font-medium transition-colors">
                  Apply
                </button>
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
              <section className="py-6">
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
              <section className="py-6">
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
