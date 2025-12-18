import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useSearchManga } from '@/hooks/useManga';
import { MangaGrid } from './MangaGrid';

export function MangaSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const { results, loading, error, pagination } = useSearchManga(activeSearch, {
    page: 1,
    language: 'english',
    sort: 'popular',
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search manga..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        <Button type="submit">
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </form>

      <div className="space-y-4">
        {loading && <div className="text-center py-8">Loading...</div>}
        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            Error: {error}
          </div>
        )}
        {!loading && activeSearch && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No results found for "{activeSearch}"
          </div>
        )}
        {!loading && results.length > 0 && (
          <>
            <h2 className="text-2xl font-bold">
              {activeSearch ? `Results for "${activeSearch}"` : 'Popular Manga'}
            </h2>
            <MangaGrid mangas={results} />
          </>
        )}
      </div>
    </div>
  );
}
