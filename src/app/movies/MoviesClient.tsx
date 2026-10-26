'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { discoverMoviesPage, fetchMovieGenres, TMDBGenre, TMDBShow, type DiscoverSort } from '@/lib/tmdb';
import PosterCard, { releaseYear, tmdbRating } from '@/components/PosterCard';
import DiscoverFilterBar, { DiscoverFilterValues } from '@/components/DiscoverFilterBar';
import { fetchImdbRatings, sortByImdbRating } from '@/lib/imdbRatings';

const MOVIE_SORTS: Record<string, DiscoverSort> = {
  'popularity.desc': 'popularity.desc',
  'vote_average.desc': 'vote_average.desc',
  'primary_release_date.desc': 'primary_release_date.desc',
};
const K_DRAMA_GENRE_ID = -100;
const K_DRAMA_GENRE_VALUE = String(K_DRAMA_GENRE_ID);
const DEFAULT_RATING_SOURCE: 'imdb' | 'tmdb' = 'imdb';
const MIN_MOVIE_VOTES = 100;
// "Top rated" needs more votes, otherwise obscure titles with a handful of 10/10 votes win
const TOP_RATED_MIN_MOVIE_VOTES = 1000;

export default function MoviesClient() {
  const [movies, setMovies] = useState<TMDBShow[]>([]);
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
  const apiGenreParam = isKDramaFilter ? '' : genreParam;
  const apiLanguageParam = isKDramaFilter ? 'ko' : langParam;
  const apiOriginCountryParam = isKDramaFilter ? 'KR' : undefined;

  const safeSort: DiscoverSort = MOVIE_SORTS[sortParam] ?? 'popularity.desc';
  const minVotes = safeSort === 'vote_average.desc' ? TOP_RATED_MIN_MOVIE_VOTES : MIN_MOVIE_VOTES;

  const values: DiscoverFilterValues = {
    genre: genreParam || undefined,
    sort: safeSort,
    year: yearParam || undefined,
    minRating: minRatingParam || undefined,
    language: isKDramaFilter ? undefined : langParam || undefined,
    ratingSource,
  };

  useEffect(() => {
    document.title = 'Movies | Tinywatch';
  }, []);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await fetchMovieGenres();
        setGenres([{ id: K_DRAMA_GENRE_ID, name: 'Korean Movies' }, ...data].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Error fetching movie genres:', error);
      }
    };

    fetchGenres();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await discoverMoviesPage({
          sort_by: safeSort,
          with_genres: apiGenreParam || undefined,
          year: yearParam ? Number(yearParam) : undefined,
          'vote_average.gte': ratingSource === 'tmdb' && minRatingParam ? Number(minRatingParam) : undefined,
          'vote_count.gte': minVotes,
          with_original_language: apiLanguageParam || undefined,
          with_origin_country: apiOriginCountryParam,
          page: 1,
        });
        setMovies(data.results);
        setNextPage(data.page + 1);
        setHasMore(data.page < data.totalPages);
        setImdbRatings({});
      } catch (error) {
        console.error('Error fetching movies:', error);
        setMovies([]);
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
            const data = await discoverMoviesPage({
              sort_by: safeSort,
              with_genres: apiGenreParam || undefined,
              year: yearParam ? Number(yearParam) : undefined,
              'vote_average.gte': ratingSource === 'tmdb' && minRatingParam ? Number(minRatingParam) : undefined,
              'vote_count.gte': minVotes,
              with_original_language: apiLanguageParam || undefined,
              with_origin_country: apiOriginCountryParam,
              page: nextPage,
            });
            setMovies((prev) => {
              const existing = new Set(prev.map((item) => item.id));
              const incoming = data.results.filter((item) => !existing.has(item.id));
              return [...prev, ...incoming];
            });
            setNextPage(data.page + 1);
            setHasMore(data.page < data.totalPages);
          } catch (error) {
            console.error('Error loading more movies:', error);
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
    if (movies.length === 0) return;

    let cancelled = false;

    const idsToFetch = movies.map((m) => m.id).filter((id) => !(id in imdbRatings));
    if (idsToFetch.length === 0) return;

    const run = async () => {
      const next = await fetchImdbRatings('movie', idsToFetch);
      if (cancelled) return;
      setImdbRatings((prev) => ({ ...prev, ...next }));
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [ratingSource, movies, imdbRatings, minRatingParam]);

  const applyFilters = (next: DiscoverFilterValues) => {
    const params = new URLSearchParams();
    if (next.genre) params.set('genre', next.genre);
    if (next.sort) params.set('sort', next.sort);
    if (next.year) params.set('year', next.year);
    if (next.minRating) params.set('minRating', next.minRating);
    if (next.language && next.genre !== K_DRAMA_GENRE_VALUE) params.set('lang', next.language);
    if (next.ratingSource) params.set('rating', next.ratingSource);
    const qs = params.toString();
    router.push(qs ? `/movies?${qs}` : '/movies');
  };

  const resetFilters = () => {
    router.push('/movies');
  };

  const skeletonItems = Array.from({ length: 20 });
  const minImdb = minRatingParam ? Number(minRatingParam) : null;
  const useImdbFilter = ratingSource === 'imdb' && minImdb !== null && Number.isFinite(minImdb);
  const sortByImdb = ratingSource === 'imdb' && safeSort === 'vote_average.desc';
  const filteredMovies = useImdbFilter
    ? movies.filter((m) => (imdbRatings[m.id] ?? -1) >= (minImdb as number))
    : movies;
  const visibleMovies = sortByImdb ? sortByImdbRating(filteredMovies, imdbRatings) : filteredMovies;
  // When the list depends on IMDb ratings, wait for the first ratings instead of showing an unsorted/unfiltered list
  const waitingForImdb =
    (useImdbFilter || sortByImdb) && movies.length > 0 && !movies.some((m) => m.id in imdbRatings);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-8 px-8">
      <div className="max-w-7xl mx-auto">
        <DiscoverFilterBar
          title="Movies"
          genres={genres}
          values={values}
          defaults={{ sort: 'popularity.desc', ratingSource: DEFAULT_RATING_SOURCE }}
          yearLabel="Release year"
          sortOptions={[
            { value: 'popularity.desc', label: 'Popular' },
            { value: 'vote_average.desc', label: 'Top rated' },
            { value: 'primary_release_date.desc', label: 'Newest' },
          ]}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
          {((loading && movies.length === 0) || waitingForImdb)
            ? skeletonItems.map((_, idx) => (
                <div key={`movie-skel-${idx}`}>
                  <div className="aspect-[2/3] rounded-xl animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                    <div className="h-3 rounded-full w-1/2 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
                  </div>
                </div>
              ))
            : visibleMovies.map((movie) => (
                <PosterCard
                  key={`movie-${movie.id}`}
                  item={{ ...movie, name: movie.title, media_type: 'movie' }}
                  onClick={() => router.push(`/movies/movie/${movie.id}`)}
                  rating={ratingSource === 'imdb'
                    ? `IMDb ${movie.id in imdbRatings ? imdbRatings[movie.id] ?? 'N/A' : '...'}`
                    : tmdbRating(movie.vote_average)}
                  year={releaseYear(movie)}
                />
              ))}
        </div>
        {loadingMore && (
          <p className="text-center text-sm text-gray-400 mt-6">Loading more movies...</p>
        )}
        {!loading && !loadingMore && hasMore && <div ref={sentinelRef} className="h-10" aria-hidden="true" />}
      </div>
    </div>
  );
}

