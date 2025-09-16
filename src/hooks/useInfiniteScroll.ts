import { useState, useEffect, useCallback, useRef } from 'react';
import type { PagedResponse } from '../types';

interface UseInfiniteScrollOptions<T> {
  fetcher: (page: number, size: number) => Promise<PagedResponse<T>>;
  pageSize?: number;
  initialPage?: number;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  addItem: (item: T) => void; // 새로운 아이템 추가 함수
  observerTarget: React.RefObject<HTMLDivElement | null>;
}

export function useInfiniteScroll<T>({
  fetcher,
  pageSize = 20,
  initialPage = 0,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const fetcherRef = useRef(fetcher);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await fetcherRef.current(page, pageSize);
      
      setItems(prev => [...prev, ...response.content]);
      setHasMore(!response.last);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [page, pageSize, hasMore]); // fetcher 제거하여 무한 루프 방지

  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setLoading(false);
    setError(null);
    setHasMore(true);
    isLoadingRef.current = false;
  }, [initialPage]);

  const addItem = useCallback((item: T) => {
    setItems(prev => [item, ...prev]);
  }, []);

  // Intersection Observer for automatic loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingRef.current) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore]);

  // Update fetcher ref
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    if (mounted && items.length === 0 && hasMore && !isLoadingRef.current) {
      loadMore();
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
    addItem, // 새로운 함수 추가
    observerTarget,
  };
}
