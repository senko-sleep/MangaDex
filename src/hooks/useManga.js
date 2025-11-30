import { useState, useEffect } from 'react';

export function useManga(id) {
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchManga = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/manga/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch manga');
        }
        const data = await response.json();
        setManga(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchManga();
  }, [id]);

  return { manga, loading, error };
}

export function useSearchManga(query, options = {}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    hasNextPage: false,
  });

  useEffect(() => {
    const searchManga = async () => {
      if (!query) return;

      try {
        setLoading(true);
        const params = new URLSearchParams({
          q: query,
          page: options.page || 1,
          type: options.type || 'manga',
          language: options.language || 'all',
          sort: options.sort || 'popular',
          order: options.order || 'desc',
        });

        const response = await fetch(`/api/manga/search?${params}`);
        if (!response.ok) {
          throw new Error('Failed to search manga');
        }
        const data = await response.json();
        setResults(data.results);
        setPagination({
          page: data.pagination.page,
          hasNextPage: data.pagination.hasNextPage,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchManga, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, options]);

  return { results, loading, error, pagination };
}
