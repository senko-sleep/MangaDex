import { useState, useEffect, useCallback } from 'react';
import { X, Grid3X3, Loader2, ZoomIn, ExternalLink, ArrowLeft, ArrowRight } from 'lucide-react';
import { apiUrl } from '../lib/api';

export default function ChapterGallery({ mangaId, chapter, isOpen, onClose, onNavigateToPage }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [preloadImages, setPreloadImages] = useState(new Set());

  // Fetch chapter pages when gallery opens
  useEffect(() => {
    if (!isOpen || !mangaId || !chapter?.id) return;

    const fetchPages = async () => {
      setLoading(true);
      setError(null);
      setPages([]);
      setSelectedPage(null);
      setPreloadImages(new Set());

      try {
        console.log('[Gallery] Fetching pages for:', mangaId, chapter.id);
        
        const response = await fetch(apiUrl(`/api/pages/${mangaId}/${chapter.id}`));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const pageData = Array.isArray(data) ? data : (data?.pages || []);
        
        console.log('[Gallery] Loaded', pageData.length, 'pages');
        setPages(pageData);
        
        // Preload first few images for better UX
        if (pageData.length > 0) {
          preloadPageImages(pageData.slice(0, 6));
        }
      } catch (err) {
        console.error('[Gallery] Error fetching pages:', err);
        setError('Failed to load chapter pages');
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [isOpen, mangaId, chapter?.id]);

  // Preload page images
  const preloadPageImages = useCallback((pagesToPreload) => {
    pagesToPreload.forEach((page, index) => {
      if (preloadImages.has(page)) return;
      
      const img = new Image();
      img.onload = () => {
        setPreloadImages(prev => new Set(prev).add(page));
      };
      img.src = page;
    });
  }, [preloadImages]);

  // Handle page selection
  const handlePageSelect = useCallback((pageUrl, pageIndex) => {
    setSelectedPage({ url: pageUrl, index: pageIndex });
    
    // Preload nearby pages
    const nearbyPages = pages.slice(
      Math.max(0, pageIndex - 2),
      Math.min(pages.length, pageIndex + 3)
    );
    preloadPageImages(nearbyPages);
  }, [pages, preloadPageImages]);

  // Navigate to specific page in reader
  const handleReadFromPage = useCallback((pageIndex) => {
    if (onNavigateToPage) {
      onNavigateToPage(pageIndex + 1); // Pages are 1-indexed in reader
    }
    onClose();
  }, [onNavigateToPage, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedPage) {
          setSelectedPage(null);
        } else {
          onClose();
        }
      } else if (selectedPage) {
        if (e.key === 'ArrowLeft' && selectedPage.index > 0) {
          handlePageSelect(pages[selectedPage.index - 1], selectedPage.index - 1);
        } else if (e.key === 'ArrowRight' && selectedPage.index < pages.length - 1) {
          handlePageSelect(pages[selectedPage.index + 1], selectedPage.index + 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedPage, pages, handlePageSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={selectedPage ? () => setSelectedPage(null) : onClose}
      />
      
      {/* Gallery Container */}
      <div className="relative w-full h-full max-w-7xl max-h-[95vh] bg-zinc-900/95 rounded-2xl border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Grid3X3 className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="text-lg font-bold">Chapter Preview</h2>
              <p className="text-sm text-zinc-400">
                Ch. {chapter?.chapter || '?'} {chapter?.title && `- ${chapter.title}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {pages.length > 0 && (
              <span className="text-sm text-zinc-400 px-3 py-1 bg-zinc-800 rounded-lg">
                {pages.length} pages
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative h-[calc(100%-80px)] overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
              <p className="text-zinc-400">Loading chapter pages...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && pages.length > 0 && (
            <>
              {/* Page Grid */}
              {!selectedPage && (
                <div className="h-full overflow-y-auto p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {pages.map((pageUrl, index) => (
                      <div
                        key={index}
                        className="relative aspect-[3/4] bg-zinc-800 rounded-lg overflow-hidden cursor-pointer group hover:ring-2 hover:ring-orange-500/50 transition-all"
                        onClick={() => handlePageSelect(pageUrl, index)}
                      >
                        {/* Page Number */}
                        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-black/70 text-white text-xs rounded-md">
                          {index + 1}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReadFromPage(index);
                            }}
                            className="p-1.5 bg-black/70 text-white rounded-md hover:bg-orange-500 transition-colors"
                            title="Read from this page"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Image */}
                        <img
                          src={pageUrl}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        
                        {/* Fallback */}
                        <div 
                          className="absolute inset-0 bg-zinc-800 flex items-center justify-center"
                          style={{ display: 'none' }}
                        >
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-zinc-600 mx-auto mb-2" />
                            <p className="text-xs text-zinc-500">Loading...</p>
                          </div>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Page View */}
              {selectedPage && (
                <div className="h-full flex flex-col">
                  {/* Page Navigation Header */}
                  <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedPage(null)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-zinc-400">
                        Page {selectedPage.index + 1} of {pages.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Navigation */}
                      <button
                        onClick={() => selectedPage.index > 0 && handlePageSelect(pages[selectedPage.index - 1], selectedPage.index - 1)}
                        disabled={selectedPage.index === 0}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => selectedPage.index < pages.length - 1 && handlePageSelect(pages[selectedPage.index + 1], selectedPage.index + 1)}
                        disabled={selectedPage.index === pages.length - 1}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      {/* Read Button */}
                      <button
                        onClick={() => handleReadFromPage(selectedPage.index)}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Read from here
                      </button>
                    </div>
                  </div>

                  {/* Page Image */}
                  <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                    <img
                      src={selectedPage.url}
                      alt={`Page ${selectedPage.index + 1}`}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                      onClick={() => setSelectedPage(null)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
