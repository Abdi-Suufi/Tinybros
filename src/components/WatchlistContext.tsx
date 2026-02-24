'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { TMDBShow } from '@/lib/tmdb';

export type WatchlistItem = Pick<
  TMDBShow,
  'id' | 'title' | 'name' | 'overview' | 'poster_path' | 'backdrop_path' | 'media_type'
>;

interface WatchlistContextValue {
  items: WatchlistItem[];
  toggleItem: (item: WatchlistItem) => void;
  isSaved: (id: number, mediaType: WatchlistItem['media_type']) => boolean;
}

const WatchlistContext = createContext<WatchlistContextValue | undefined>(undefined);

const STORAGE_KEY = 'tinybros_watchlist_v1';

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  // Load from localStorage on first client render
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setItems(
          parsed.filter(
            (item) =>
              typeof item?.id === 'number' &&
              (item.media_type === 'movie' || item.media_type === 'tv') &&
              typeof item.poster_path === 'string'
          )
        );
      }
    } catch (error) {
      console.error('Failed to load watchlist from localStorage', error);
    }
  }, []);

  // Persist to localStorage whenever items change
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save watchlist to localStorage', error);
    }
  }, [items]);

  const isSaved = (id: number, mediaType: WatchlistItem['media_type']) =>
    items.some((item) => item.id === id && item.media_type === mediaType);

  const toggleItem = (item: WatchlistItem) => {
    setItems((prev) => {
      const exists = prev.some((existing) => existing.id === item.id && existing.media_type === item.media_type);
      if (exists) {
        return prev.filter((existing) => !(existing.id === item.id && existing.media_type === item.media_type));
      }
      const safeItem: WatchlistItem = {
        id: item.id,
        media_type: item.media_type,
        title: item.title,
        name: item.name,
        overview: item.overview,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
      };
      return [safeItem, ...prev];
    });
  };

  const value = useMemo(
    () => ({
      items,
      toggleItem,
      isSaved,
    }),
    [items]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return ctx;
}

