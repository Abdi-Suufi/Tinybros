'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  searchMulti,
  fetchMovieGenres,
  fetchTVGenres,
  getImageUrl,
  type TMDBSearchResult,
  type TMDBShow,
  type TMDBPerson,
} from '@/lib/tmdb';

interface SearchAutocompleteProps {
  isScrolled: boolean;
  /** Open with "/" or Ctrl/Cmd+K. Only one instance on the page should enable this. */
  enableShortcut?: boolean;
  /** Overrides the default trigger styling (used by the navbar pill). */
  triggerClassName?: string;
}

type SearchTab = 'all' | 'movies' | 'shows' | 'anime';

const TABS: { id: SearchTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movies', label: 'Movies' },
  { id: 'shows', label: 'Shows' },
  { id: 'anime', label: 'Anime' },
];

const ANIMATION_GENRE_ID = 16;

function isShow(item: TMDBSearchResult): item is TMDBShow {
  return item.media_type === 'movie' || item.media_type === 'tv';
}

function isAnime(item: TMDBShow) {
  return (
    (item.genre_ids ?? []).includes(ANIMATION_GENRE_ID) &&
    (item.original_language === 'ja' || (item.origin_country ?? []).includes('JP'))
  );
}

function matchesTab(item: TMDBSearchResult, tab: SearchTab) {
  if (tab === 'all') return true;
  if (!isShow(item)) return false;
  if (tab === 'anime') return isAnime(item);
  if (isAnime(item)) return false;
  return tab === 'movies' ? item.media_type === 'movie' : item.media_type === 'tv';
}

function detailsUrl(item: TMDBSearchResult) {
  if (!isShow(item)) {
    const department = item.known_for_department === 'Directing' ? '&department=directing' : '';
    return `/search?person=${item.id}&name=${encodeURIComponent(item.name)}${department}`;
  }
  return item.media_type === 'movie' ? `/movies/movie/${item.id}` : `/series/series/${item.id}`;
}

function watchUrl(item: TMDBShow) {
  return item.media_type === 'movie'
    ? `/watch/movie/${item.id}`
    : `/watch/tv/${item.id}?season=1&episode=1`;
}

function personMeta(item: TMDBPerson) {
  const role = item.known_for_department === 'Directing'
    ? 'Director'
    : item.known_for_department === 'Acting' || !item.known_for_department
      ? 'Actor'
      : item.known_for_department;
  const knownFor = item.known_for
    ?.slice(0, 2)
    .map((credit) => credit.title || credit.name)
    .filter(Boolean)
    .join(', ');
  return knownFor ? `${role} · ${knownFor}` : role;
}

export default function SearchAutocomplete({ isScrolled, enableShortcut = false, triggerClassName }: SearchAutocompleteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<SearchTab>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [genreNames, setGenreNames] = useState<Record<number, string>>({});
  // Where the bar starts (over the navbar pill) and how wide it grows to
  const [anchor, setAnchor] = useState<{ top: number; right: number; width: number; height: number; targetWidth: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => setMounted(true), []);

  const open = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const trigger = triggerRef.current;
    const source = trigger?.closest('[data-nav-pill]') ?? trigger;
    const rect = source?.getBoundingClientRect();
    if (rect) {
      const right = Math.max(12, window.innerWidth - rect.right);
      setAnchor({
        top: rect.top,
        right,
        width: rect.width,
        height: rect.height,
        targetWidth: Math.max(rect.width, Math.min(640, window.innerWidth - right - 12)),
      });
    }
    setIsOpen(true);
    // Start at the pill's size, then grow on the next frame so the width transition runs
    requestAnimationFrame(() => requestAnimationFrame(() => setIsExpanded(true)));
  }, []);

  const close = useCallback(() => {
    setIsExpanded(false);
    requestIdRef.current += 1;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    // Let the bar shrink back into the pill before unmounting
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setQuery('');
      setResults([]);
      setTab('all');
      setExpanded(null);
      setHighlightedIndex(-1);
    }, 280);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // Focus the field and lock page scroll while the search is open
  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Escape closes from anywhere in the overlay, not just the text field
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  // Genre names for the meta line, loaded the first time search opens
  useEffect(() => {
    if (!isOpen || Object.keys(genreNames).length > 0) return;
    void Promise.all([fetchMovieGenres(), fetchTVGenres()])
      .then(([movieGenres, tvGenres]) => {
        setGenreNames(Object.fromEntries([...movieGenres, ...tvGenres].map((genre) => [genre.id, genre.name])));
      })
      .catch((error) => console.error('Failed to load genres for search', error));
  }, [isOpen, genreNames]);

  useEffect(() => {
    if (!enableShortcut) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enableShortcut, open]);

  const performSearch = useCallback(async (value: string) => {
    const requestId = ++requestIdRef.current;
    if (!value.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const found = await searchMulti(value);
      if (requestId !== requestIdRef.current) return;
      setResults(
        found
          .filter((item) => (isShow(item) ? item.poster_path && (item.title || item.name) : item.profile_path && item.name))
          .slice(0, 20)
      );
      setExpanded(null);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      if (requestId === requestIdRef.current) setResults([]);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => performSearch(value), 300);
  };

  const visibleResults = useMemo(() => results.filter((item) => matchesTab(item, tab)), [results, tab]);

  const goTo = (url: string) => {
    router.push(url);
    close();
  };

  const viewAll = () => {
    if (query.trim()) goTo(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, visibleResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && visibleResults[highlightedIndex]) {
          goTo(detailsUrl(visibleResults[highlightedIndex]));
        } else {
          viewAll();
        }
        break;
      default:
        break;
    }
  };

  const metaParts = (item: TMDBShow) => {
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const genre = item.genre_ids?.map((id) => genreNames[id]).find(Boolean);
    return [
      item.media_type === 'movie' ? 'Movie' : 'Show',
      year,
      item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : '',
      genre ?? '',
    ].filter(Boolean);
  };

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={open}
      aria-label="Search"
      className={triggerClassName ?? `rounded-full p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
        isScrolled
          ? 'text-gray-300 hover:text-yellow-400'
          : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-400'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>
  );

  const overlay = isOpen && (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Search">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${
          isExpanded ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={close}
      />

      {/* Grows out of the navbar pill: anchored to its right edge, widening to the left */}
      <div
        className={`${anchor ? 'absolute' : 'relative mx-auto mt-3 w-[min(94vw,560px)]'} transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none`}
        style={anchor ? { top: anchor.top, right: anchor.right, width: isExpanded ? anchor.targetWidth : anchor.width } : undefined}
      >
        {/* Search field */}
        <div
          className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-black/95 px-4 shadow-2xl backdrop-blur-md focus-within:border-yellow-400/70 focus-within:shadow-[0_0_16px_rgba(234,179,8,0.25)] transition-[border-color,box-shadow]"
          style={{ height: anchor?.height ?? 48 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, shows, and anime"
            autoComplete="off"
            className={`min-w-0 flex-1 bg-transparent text-white placeholder-gray-500 caret-yellow-400 focus:outline-none transition-opacity duration-200 ${
              isExpanded ? 'opacity-100 delay-100' : 'opacity-0'
            }`}
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className={`flex-shrink-0 rounded-full p-1 text-gray-400 transition-[color,background-color,opacity] hover:bg-white/10 hover:text-yellow-400 ${
              isExpanded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        {isExpanded && query.trim() && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-yellow-500/25 bg-black/95 shadow-2xl animate-[search-results-in_180ms_ease-out] motion-reduce:animate-none">
            <div className="flex gap-1 border-b border-white/5 p-2">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                    setHighlightedIndex(-1);
                    setExpanded(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    tab === id
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black'
                      : 'text-gray-400 hover:bg-white/5 hover:text-yellow-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-[min(65vh,520px)] overflow-y-auto overscroll-contain">
              {isLoading && results.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">Searching…</p>
              ) : visibleResults.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">
                  No {tab === 'all' ? 'results' : TABS.find((t) => t.id === tab)?.label.toLowerCase()} found for &quot;{query.trim()}&quot;
                </p>
              ) : (
                <ul>
                  {visibleResults.map((item, index) => {
                    const key = `${item.media_type}-${item.id}`;
                    const title = isShow(item) ? item.title || item.name || '' : item.name;
                    const isExpanded = expanded === key;
                    return (
                      <li
                        key={key}
                        className={`border-b border-white/5 last:border-0 transition-colors ${
                          index === highlightedIndex ? 'bg-yellow-500/15' : 'hover:bg-yellow-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => goTo(detailsUrl(item))}
                            className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-white/10">
                              <Image
                                src={getImageUrl((isShow(item) ? item.poster_path : item.profile_path) || '')}
                                alt={title}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white transition-colors group-hover:text-yellow-300">{title}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-400">
                                {isShow(item)
                                  ? metaParts(item).map((part, i) => (
                                      <span key={i} className="flex items-center gap-1.5">
                                        {i > 0 && <span aria-hidden="true">·</span>}
                                        <span className={part.startsWith('★') ? 'text-yellow-400' : ''}>{part}</span>
                                      </span>
                                    ))
                                  : personMeta(item)}
                              </p>
                            </div>
                          </button>
                          {isShow(item) && (
                            <button
                              type="button"
                              onClick={() => setExpanded(isExpanded ? null : key)}
                              aria-label={isExpanded ? `Hide details for ${title}` : `Show details for ${title}`}
                              aria-expanded={isExpanded}
                              className="flex-shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-yellow-400"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {isShow(item) && isExpanded && (
                          <div className="px-3 pb-3 pl-[4.25rem]">
                            <p className="text-sm text-gray-300 line-clamp-4">{item.overview || 'No description available.'}</p>
                            <div className="mt-3 flex gap-2">
                              <Link
                                href={watchUrl(item)}
                                onClick={close}
                                className="rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-1.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                              >
                                Watch now
                              </Link>
                              <Link
                                href={detailsUrl(item)}
                                onClick={close}
                                className="glass glass-button rounded-full px-4 py-1.5 text-sm font-semibold text-white"
                              >
                                Details
                              </Link>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {visibleResults.length > 0 && (
              <button
                type="button"
                onClick={viewAll}
                className="w-full border-t border-white/5 p-3 text-center text-sm text-yellow-400 transition-colors hover:bg-yellow-500/5 hover:text-yellow-300"
              >
                View all results for &quot;{query.trim()}&quot;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {trigger}
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
