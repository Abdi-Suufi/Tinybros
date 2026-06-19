'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { discoverTVShowsPage, fetchTVGenres, getImageUrl, TMDBGenre, TMDBShow, type DiscoverSort } from '@/lib/tmdb';
import WatchlistToggle from '@/components/WatchlistToggle';
import DiscoverFilterBar, { DiscoverFilterValues } from '@/components/DiscoverFilterBar';

const TV_SORTS: Record<string, DiscoverSort> = {
  'popularity.desc': 'popularity.desc',
  'vote_average.desc': 'vote_average.desc',
  'first_air_date.desc': 'first_air_date.desc',
};
const K_DRAMA_GENRE_ID = -100;
const K_DRAMA_GENRE_VALUE = String(K_DRAMA_GENRE_ID);
const DRAMA_GENRE_VALUE = '18';
const DEFAULT_RATING_SOURCE: 'imdb' | 'tmdb' = 'imdb';
const MIN_SERIES_VOTES = 50;

export default function SeriesClient() {
  const [series, setSeries] = useState<TMDBShow[]>([]);
  const [imdbRatings, setImdbRatings] = useState<Record<number, number | null>>({});
  const [imdbLoading, setImdbLoading] = useState(false);
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const genreParam = searchParams.get('genre') || '';
  const sortParam = searchParams.get('sort') || 'popularity.desc';
  const yearParam = searchParams.get('year') || '';
  const minRatingParam = searchParams.get('minRating') || '';
  const langParam = searchParams.get('lang') || '';
  const ratingParam = searchParams.get('rating') || DEFAULT_RATING_SOURCE;
  const ratingSource: 'tmdb' | 'imdb' = ratingParam === 'tmdb' ? 'tmdb' : 'imdb';
  const isKDramaFilter = genreParam === K_DRAMA_GENRE_VALUE;
  const apiGenreParam = isKDramaFilter ? DRAMA_GENRE_VALUE : genreParam;
  const apiLanguageParam = isKDramaFilter ? 'ko' : langParam;
  const apiOriginCountryParam = isKDramaFilter ? 'KR' : undefined;

  const safeSort: DiscoverSort = TV_SORTS[sortParam] ?? 'popularity.desc';

  const values: DiscoverFilterValues = {
    genre: genreParam || undefined,
    sort: safeSort,
    year: yearParam || undefined,
    minRating: minRatingParam || undefined,
    language: isKDramaFilter ? undefined : langParam || undefined,
    ratingSource,
  };

  useEffect(() => {
    document.title = 'Series | TinyBros';
  }, []);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await fetchTVGenres();
        setGenres([{ id: K_DRAMA_GENRE_ID, name: 'K-Dramas' }, ...data].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Error fetching TV genres:', error);
      }
    };

    fetchGenres();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await discoverTVShowsPage({
          sort_by: safeSort,
          with_genres: apiGenreParam || undefined,
          first_air_date_year: yearParam ? Number(yearParam) : undefined,
          'vote_average.gte': ratingSource === 'tmdb' && minRatingParam ? Number(minRatingParam) : undefined,
          'vote_count.gte': MIN_SERIES_VOTES,
          with_original_language: apiLanguageParam || undefined,
          with_origin_country: apiOriginCountryParam,
          page: 1,
          excludeAnime: true,
        });
        setSeries(data.results);
        setNextPage(data.page + 1);
        setHasMore(data.page < data.totalPages);
        setImdbRatings({});
      } catch (error) {
        console.error('Error fetching series:', error);
        setSeries([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiGenreParam, apiLanguageParam, apiOriginCountryParam, safeSort, yearParam, minRatingParam, ratingSource]);

  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        const fetchMore = async () => {
          setLoadingMore(true);
          try {
            const data = await discoverTVShowsPage({
              sort_by: safeSort,
              with_genres: apiGenreParam || undefined,
              first_air_date_year: yearParam ? Number(yearParam) : undefined,
              'vote_average.gte': ratingSource === 'tmdb' && minRatingParam ? Number(minRatingParam) : undefined,
              'vote_count.gte': MIN_SERIES_VOTES,
              with_original_language: apiLanguageParam || undefined,
              with_origin_country: apiOriginCountryParam,
              page: nextPage,
              excludeAnime: true,
            });
            setSeries((prev) => {
              const existing = new Set(prev.map((item) => item.id));
              const incoming = data.results.filter((item) => !existing.has(item.id));
              return [...prev, ...incoming];
            });
            setNextPage(data.page + 1);
            setHasMore(data.page < data.totalPages);
          } catch (error) {
            console.error('Error loading more series:', error);
            setHasMore(false);
          } finally {
            setLoadingMore(false);
          }
        };

        void fetchMore();
      },
      { rootMargin: '400px 0px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, nextPage, safeSort, apiGenreParam, yearParam, minRatingParam, apiLanguageParam, apiOriginCountryParam, ratingSource]);

  useEffect(() => {
    if (ratingSource !== 'imdb') return;
    if (series.length === 0) return;

    let cancelled = false;

    const idsToFetch = series.map((s) => s.id).filter((id) => !(id in imdbRatings));
    if (idsToFetch.length === 0) return;

    const run = async () => {
      if (minRatingParam) setImdbLoading(true);
      const next: Record<number, number | null> = {};
      const concurrency = 8;
      let cursor = 0;

      const worker = async () => {
        while (cursor < idsToFetch.length && !cancelled) {
          const id = idsToFetch[cursor++];
          try {
            const res = await fetch(`/api/imdb-rating?type=tv&tmdbId=${id}`);
            const json = await res.json();
            next[id] = typeof json?.imdbRating === 'number' ? json.imdbRating : null;
          } catch {
            next[id] = null;
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, idsToFetch.length) }, () => worker()));
      if (cancelled) return;
      setImdbRatings((prev) => ({ ...prev, ...next }));
      setImdbLoading(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [ratingSource, series, imdbRatings, minRatingParam]);

  const applyFilters = (next: DiscoverFilterValues) => {
    const params = new URLSearchParams();
    if (next.genre) params.set('genre', next.genre);
    if (next.sort) params.set('sort', next.sort);
    if (next.year) params.set('year', next.year);
    if (next.minRating) params.set('minRating', next.minRating);
    if (next.language && next.genre !== K_DRAMA_GENRE_VALUE) params.set('lang', next.language);
    if (next.ratingSource) params.set('rating', next.ratingSource);
    const qs = params.toString();
    router.push(qs ? `/series?${qs}` : '/series');
  };

  const resetFilters = () => {
    router.push('/series');
  };

  const skeletonItems = Array.from({ length: 20 });
  const minImdb = minRatingParam ? Number(minRatingParam) : null;
  const useImdbFilter = ratingSource === 'imdb' && minImdb !== null && Number.isFinite(minImdb);
  const visibleSeries = useImdbFilter
    ? series.filter((s) => (imdbRatings[s.id] ?? -1) >= (minImdb as number))
    : series;

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-8 px-8">
      <div className="max-w-7xl mx-auto">
        <DiscoverFilterBar
          title="TV Shows"
          genres={genres}
          values={values}
          defaults={{ sort: 'popularity.desc', ratingSource: DEFAULT_RATING_SOURCE }}
          yearLabel="First air year"
          sortOptions={[
            { value: 'popularity.desc', label: 'Popular' },
            { value: 'vote_average.desc', label: 'Top rated' },
            { value: 'first_air_date.desc', label: 'Newest' },
          ]}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {((loading || (useImdbFilter && imdbLoading)) && series.length === 0)
            ? skeletonItems.map((_, idx) => (
                <div
                  key={`series-skel-${idx}`}
                  className="rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40"
                >
                  <div className="relative aspect-[2/3] bg-gradient-to-t from-orange-700/40 via-gray-900 to-yellow-600/40" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
                    <div className="h-3 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                  </div>
                </div>
              ))
            : visibleSeries.map((show) => (
                <div
                  key={`tv-${show.id}`}
                  onClick={() => router.push(`/series/series/${show.id}`)}
                  className="rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
                >
                  <div className="relative aspect-[2/3]">
                    <Image src={getImageUrl(show.poster_path)} alt={show.name || ''} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-3 left-3 z-10">
                      {ratingSource === 'imdb' ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-black/70 border border-yellow-500/30 text-yellow-300">
                          IMDb {imdbRatings[show.id] ?? '...'}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-black/70 border border-yellow-500/30 text-yellow-300">
                          TMDB {Math.round((show.vote_average ?? 0) * 10) / 10}
                        </span>
                      )}
                    </div>
                    <WatchlistToggle
                      item={{
                        id: show.id,
                        media_type: 'tv',
                        title: show.title,
                        name: show.name,
                        overview: show.overview,
                        poster_path: show.poster_path,
                        backdrop_path: show.backdrop_path,
                      }}
                      size="sm"
                    />
                    <div className="absolute bottom-0 left-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="text-lg font-semibold">{show.name}</h3>
                      <p className="text-sm text-gray-300 line-clamp-3">{show.overview}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold truncate">{show.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{show.overview}</p>
                  </div>
                </div>
              ))}
        </div>
        {loadingMore && (
          <p className="text-center text-sm text-gray-400 mt-6">Loading more series...</p>
        )}
        {!loading && !loadingMore && hasMore && <div ref={sentinelRef} className="h-10" aria-hidden="true" />}
      </div>
    </div>
  );
}

