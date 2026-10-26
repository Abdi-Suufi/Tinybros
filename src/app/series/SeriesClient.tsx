'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { discoverTVShowsPage, fetchTVGenres, TMDBGenre, TMDBShow, type DiscoverSort } from '@/lib/tmdb';
import PosterCard, { releaseYear, tmdbRating } from '@/components/PosterCard';
import DiscoverFilterBar, { DiscoverFilterValues } from '@/components/DiscoverFilterBar';
import { fetchImdbRatings, sortByImdbRating } from '@/lib/imdbRatings';

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
// "Top rated" needs more votes, otherwise obscure titles with a handful of 10/10 votes win
const TOP_RATED_MIN_SERIES_VOTES = 300;

export default function SeriesClient() {
  const [series, setSeries] = useState<TMDBShow[]>([]);
  const [imdbRatings, setImdbRatings] = useState<Record<number, number | null>>({});
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
  const minVotes = safeSort === 'vote_average.desc' ? TOP_RATED_MIN_SERIES_VOTES : MIN_SERIES_VOTES;

  const values: DiscoverFilterValues = {
    genre: genreParam || undefined,
    sort: safeSort,
    year: yearParam || undefined,
    minRating: minRatingParam || undefined,
    language: isKDramaFilter ? undefined : langParam || undefined,
    ratingSource,
  };

  useEffect(() => {
    document.title = 'Series | Tinywatch';
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
          'vote_count.gte': minVotes,
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
  }, [apiGenreParam, apiLanguageParam, apiOriginCountryParam, safeSort, minVotes, yearParam, minRatingParam, ratingSource]);

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
              'vote_count.gte': minVotes,
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
  }, [loading, loadingMore, hasMore, nextPage, safeSort, minVotes, apiGenreParam, yearParam, minRatingParam, apiLanguageParam, apiOriginCountryParam, ratingSource]);

  useEffect(() => {
    if (ratingSource !== 'imdb') return;
    if (series.length === 0) return;

    let cancelled = false;

    const idsToFetch = series.map((s) => s.id).filter((id) => !(id in imdbRatings));
    if (idsToFetch.length === 0) return;

    const run = async () => {
      const next = await fetchImdbRatings('tv', idsToFetch);
      if (cancelled) return;
      setImdbRatings((prev) => ({ ...prev, ...next }));
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
  const sortByImdb = ratingSource === 'imdb' && safeSort === 'vote_average.desc';
  const filteredSeries = useImdbFilter
    ? series.filter((s) => (imdbRatings[s.id] ?? -1) >= (minImdb as number))
    : series;
  const visibleSeries = sortByImdb ? sortByImdbRating(filteredSeries, imdbRatings) : filteredSeries;
  // When the list depends on IMDb ratings, wait for the first ratings instead of showing an unsorted/unfiltered list
  const waitingForImdb =
    (useImdbFilter || sortByImdb) && series.length > 0 && !series.some((s) => s.id in imdbRatings);

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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
          {((loading && series.length === 0) || waitingForImdb)
            ? skeletonItems.map((_, idx) => (
                <div key={`series-skel-${idx}`}>
                  <div className="aspect-[2/3] rounded-xl animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                    <div className="h-3 rounded-full w-1/2 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
                  </div>
                </div>
              ))
            : visibleSeries.map((show) => (
                <PosterCard
                  key={`tv-${show.id}`}
                  item={{ ...show, media_type: 'tv' }}
                  onClick={() => router.push(`/series/series/${show.id}`)}
                  rating={ratingSource === 'imdb'
                    ? `IMDb ${show.id in imdbRatings ? imdbRatings[show.id] ?? 'N/A' : '...'}`
                    : tmdbRating(show.vote_average)}
                  year={releaseYear(show)}
                />
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

