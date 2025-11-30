import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, X, Eye, EyeOff, Sparkles, TrendingUp,
  BookOpen, Grid3X3, LayoutGrid
} from 'lucide-react';
import { apiUrl } from '../lib/api';
import { getCoverUrl } from '../lib/imageUtils';

// Manga Card Component
function MangaCard({ manga, index }) {
  const cover = getCoverUrl(manga);
  return (
    <Link 
      to={`/manga/${encodeURIComponent(manga.id)}`} 
      className="group relative fade-in"
      style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
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

// Featured Card for Hero Section
function FeaturedCard({ manga }) {
  const cover = getCoverUrl(manga);
  return (
    <Link 
      to={`/manga/${encodeURIComponent(manga.id)}`}
      className="relative flex-shrink-0 w-[260px] md:w-[300px] group"
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
  const [manga, setManga] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Sources & Filters
  const [sources, setSources] = useState([]);
  const [enabledSources, setEnabledSources] = useState([]);
  const [showAdult, setShowAdult] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [adultTags, setAdultTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [excludedTags, setExcludedTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [gridSize, setGridSize] = useState('normal'); // 'compact', 'normal', 'large'
  
  const loader = useRef(null);
  const featuredRef = useRef(null);

  // Load sources and tags on mount
  useEffect(() => {
    fetch(apiUrl(`/api/sources?adult=${showAdult}`)).then(r => r.json()).then(d => {
      setSources(d.sources || []);
      setEnabledSources(d.enabled || []);
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
    params.set('adult', showAdult);
    if (selectedTags.length) params.set('tags', selectedTags.join(','));
    if (excludedTags.length) params.set('exclude', excludedTags.join(','));
    return apiUrl(`/api/manga/search?${params}`);
  }, [search, showAdult, selectedTags, excludedTags]);

  const fetchManga = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const p = reset ? 1 : page;
      const res = await fetch(buildUrl(p));
      const { data } = await res.json();
      setManga(prev => reset ? data : [...prev, ...data]);
      if (reset && data.length > 0) {
        setFeatured(data.slice(0, 6));
      }
      setPage(p + 1);
      setHasMore(data.length >= 20);
      setInitialLoad(false);
    } catch (e) {
      console.error(e);
      setInitialLoad(false);
    }
    setLoading(false);
  }, [page, loading, buildUrl]);

  // Reset and fetch when filters change
  useEffect(() => {
    setManga([]);
    setPage(1);
    setHasMore(true);
    fetchManga(true);
  }, [search, showAdult, selectedTags, excludedTags]);

  // Infinite scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchManga();
    }, { threshold: 0.1 });
    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
  }, [hasMore, loading, fetchManga]);

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
  };

  const hasFilters = selectedTags.length > 0 || excludedTags.length > 0;

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
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl transition-all ${
                  showFilters || hasFilters 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowAdult(!showAdult)}
                className={`p-2.5 rounded-xl transition-all ${
                  showAdult 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title={showAdult ? 'Hide adult content' : 'Show adult content'}
              >
                {showAdult ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t border-white/5 bg-zinc-950/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-4 slide-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold">Filter by Tags</span>
                  <span className="text-xs text-zinc-500">(Click to include, right-click to exclude)</span>
                </div>
                {hasFilters && (
                  <button 
                    onClick={clearFilters} 
                    className="text-xs text-orange-500 hover:text-orange-400 font-medium flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
              
              {/* Active Filters */}
              {(selectedTags.length > 0 || excludedTags.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTags.map(tag => (
                    <span 
                      key={tag} 
                      className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-1.5 border border-emerald-500/30"
                    >
                      <span className="font-bold">+</span>{tag}
                      <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => toggleTag(tag, 'include')} />
                    </span>
                  ))}
                  {excludedTags.map(tag => (
                    <span 
                      key={tag} 
                      className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg flex items-center gap-1.5 border border-red-500/30"
                    >
                      <span className="font-bold">-</span>{tag}
                      <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => toggleTag(tag, 'exclude')} />
                    </span>
                  ))}
                </div>
              )}

              {/* Tag List */}
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto scrollbar-thin pr-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag, 'include')}
                    onContextMenu={(e) => { e.preventDefault(); toggleTag(tag, 'exclude'); }}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      selectedTags.includes(tag) 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' 
                        : excludedTags.includes(tag) 
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                          : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Adult Tags */}
              {showAdult && adultTags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-red-400">Adult Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto scrollbar-thin">
                    {adultTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag, 'include')}
                        onContextMenu={(e) => { e.preventDefault(); toggleTag(tag, 'exclude'); }}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          selectedTags.includes(tag) 
                            ? 'bg-emerald-500 text-white' 
                            : excludedTags.includes(tag) 
                              ? 'bg-red-500 text-white' 
                              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="relative">
        {/* Featured Section - Only show when not searching */}
        {!search && featured.length > 0 && (
          <section className="py-6 border-b border-zinc-900">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold">Featured</h2>
                </div>
              </div>
              <div 
                ref={featuredRef}
                className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
              >
                {featured.map((m) => (
                  <FeaturedCard key={m.id} manga={m} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main Grid */}
        <section className="max-w-7xl mx-auto px-4 py-6">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {search ? (
                <>
                  <Search className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold">
                    Results for "<span className="text-orange-500">{search}</span>"
                  </h2>
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold">Browse All</h2>
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
                <MangaCard key={m.id} manga={m} index={i} />
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
