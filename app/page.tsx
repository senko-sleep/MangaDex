'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import MangaCard from '@/components/manga/MangaCard';

interface MangaItem {
  id: string;
  title: string;
  [key: string]: unknown;
}

export default function HomePage() {
  const [manga, setManga] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchManga = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '36' });
      if (searchQuery) params.set('q', searchQuery);
      
      const res = await fetch(`/api/manga/search?${params}`);
      const data = await res.json();
      if (data.success) setManga(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchManga();
  }, [fetchManga]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
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
          {!loading && <p className="text-sm text-gray-500 mt-1">{manga.length} titles</p>}
        </div>

        {/* Grid - 5 cards per row, responsive */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(15)].map((_, i) => (
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

        {/* Load More */}
        {!loading && manga.length >= 36 && (
          <div className="mt-8 text-center">
            <button
              onClick={fetchManga}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Loader2 className="w-4 h-4" />
              Load More
            </button>
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
