'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import MangaCard from '@/components/manga/MangaCard';

interface MangaItem {
  id: string;
  title: string;
  [key: string]: unknown;
}

// Calculate items per page based on grid columns and desired rows
function useItemsPerPage() {
  const [itemsPerPage, setItemsPerPage] = useState(30);

  useEffect(() => {
    const calculateItems = () => {
      const width = window.innerWidth;
      let columns: number;
      if (width >= 1024) columns = 5;      // lg: 5 columns
      else if (width >= 768) columns = 4;   // md: 4 columns
      else if (width >= 640) columns = 3;   // sm: 3 columns
      else columns = 2;                      // default: 2 columns

      // Show 6 rows of content per page
      const rows = 6;
      setItemsPerPage(columns * rows);
    };

    calculateItems();
    window.addEventListener('resize', calculateItems);
    return () => window.removeEventListener('resize', calculateItems);
  }, []);

  return itemsPerPage;
}

export default function HomePage() {
  const [manga, setManga] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const itemsPerPage = useItemsPerPage();

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalResults / itemsPerPage));
  }, [totalResults, itemsPerPage]);

  const fetchManga = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(itemsPerPage),
        page: String(currentPage)
      });
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/manga/search?${params}`);
      const data = await res.json();
      if (data.success) {
        setManga(data.data || []);
        setTotalResults(data.meta?.total || data.data?.length || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchManga();
  }, [fetchManga]);

  // Reset to page 1 when search query or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Clean Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">MangaVerse</span>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search manga..."
                  className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {searchQuery ? `Search: "${searchQuery}"` : 'Popular Manga'}
          </h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">
              {totalResults} titles • Page {currentPage} of {totalPages}
            </p>
          )}
        </div>

        {/* Grid - 5 cards per row, responsive */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(itemsPerPage)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 rounded-lg" />
                <div className="mt-2 h-4 bg-gray-200 rounded w-3/4" />
                <div className="mt-1 h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : manga.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {manga.map((item) => (
              <MangaCard key={item.id} manga={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No manga found</p>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="mt-10 flex flex-col items-center gap-4">
            {/* Page Info */}
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}
            </p>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* First Page */}
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page as number)}
                      className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              {/* Next Page */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Jump to Page */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Go to page:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) goToPage(val);
                }}
                className="w-16 h-8 px-2 text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          MangaVerse — Read manga from multiple sources
        </div>
      </footer>
    </div>
  );
}

