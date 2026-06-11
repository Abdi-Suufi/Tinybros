const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  throw new Error('TMDB API key is not defined. Please check your .env.local file.');
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBShow {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  media_type: 'movie' | 'tv';
  vote_average: number;
  popularity?: number;
  order?: number;
  release_date?: string;
  first_air_date?: string;
  original_language: string;
  origin_country?: string[];
  runtime?: number;
  number_of_seasons?: number;
  genres?: { id: number; name: string }[];
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  still_path: string;
  episode_number: number;
  air_date: string;
}

export interface TMDBSeason {
  id: number;
  episodes: TMDBEpisode[];
  season_number: number;
  name: string;
  overview: string;
  poster_path: string;
  air_date: string;
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCredits {
  cast: TMDBCast[];
  crew?: Array<{
    id: number;
    name: string;
    job: string;
  }>;
}

async function fetchFromTMDB(endpoint: string) {
  const data = await fetchJsonFromTMDB(endpoint);
  return data.results;
}

async function fetchJsonFromTMDB(endpoint: string) {
  try {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `TMDB API error: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`
      );
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching from TMDB:', error);
    throw error;
  }
}

export async function fetchTrending(): Promise<TMDBShow[]> {
  return fetchFromTMDB('/trending/all/week');
}

export async function fetchMovies(): Promise<TMDBShow[]> {
  const pages = 5; // Fetch 5 pages of results
  let allResults: TMDBShow[] = [];

  // Fetch multiple pages of movies
  for (let page = 1; page <= pages; page++) {
    const endpoint = '/discover/movie?' + new URLSearchParams({
      sort_by: 'popularity.desc',
      'vote_count.gte': '100',
      page: page.toString(),
      include_adult: 'false',
      with_original_language: 'en', // Focus on English language movies
      'vote_average.gte': '6.0', // Minimum rating of 6
    }).toString();
    
    try {
      const results = await fetchFromTMDB(endpoint);
      allResults = [...allResults, ...results];
    } catch (error) {
      console.error(`Error fetching movies page ${page}:`, error);
    }
  }
  
  // Filter to ensure we have required images and add media type
  const movies = allResults
    .filter((movie: TMDBShow) => movie.poster_path && movie.backdrop_path)
    .map((movie: TMDBShow) => ({ ...movie, media_type: 'movie' as const }));

  // Sort by popularity and rating
  return movies.sort((a, b) => b.vote_average - a.vote_average);
}

export async function fetchTVShows(): Promise<TMDBShow[]> {
  const pages = 5; // Fetch 5 pages of results
  let allResults: TMDBShow[] = [];

  // Fetch multiple pages of TV shows
  for (let page = 1; page <= pages; page++) {
    const endpoint = '/discover/tv?' + new URLSearchParams({
      sort_by: 'popularity.desc',
      'vote_count.gte': '50',
      page: page.toString(),
      include_adult: 'false',
      'vote_average.gte': '7.0', // Higher minimum rating for TV shows
      with_status: '0', // Only shows still running
      without_genres: '16', // Exclude animation genre
    }).toString();
    
    try {
      const results = await fetchFromTMDB(endpoint);
      allResults = [...allResults, ...results];
    } catch (error) {
      console.error(`Error fetching TV shows page ${page}:`, error);
    }
  }
  
  // Filter to ensure we have required images, exclude anime, and add media type
  const tvShows = allResults
    .filter((show: TMDBShow) => 
      show.poster_path && 
      show.backdrop_path &&
      show.original_language !== 'ja' && // Exclude Japanese shows (likely anime)
      (!show.origin_country || !show.origin_country.includes('JP')) // Exclude shows from Japan
    )
    .map((show: TMDBShow) => ({ ...show, media_type: 'tv' as const }));

  // Sort by popularity and rating
  return tvShows.sort((a, b) => b.vote_average - a.vote_average);
}

export async function fetchAnime(): Promise<TMDBShow[]> {
  const pages = 5; // Fetch 5 pages of results
  let allResults: TMDBShow[] = [];

  // Fetch multiple pages of animated shows
  for (let page = 1; page <= pages; page++) {
    const endpoint = '/discover/tv?' + new URLSearchParams({
      with_genres: '16', // Animation genre
      sort_by: 'popularity.desc',
      'vote_count.gte': '20', // Lower the vote count requirement
      page: page.toString(),
      include_adult: 'false',
      with_original_language: 'ja', // Include shows with Japanese as original language
    }).toString();
    
    try {
      const results = await fetchFromTMDB(endpoint);
      allResults = [...allResults, ...results];
    } catch (error) {
      console.error(`Error fetching anime page ${page}:`, error);
    }
  }
  
  // Filter to keep only Japanese shows with additional criteria
  const japaneseAnime = allResults.filter((show: TMDBShow) => 
    (show.original_language === 'ja' || // Japanese language
    (show.origin_country && show.origin_country.includes('JP'))) && // From Japan
    show.poster_path && // Has a poster
    show.backdrop_path // Has a backdrop image
  );

  // Sort by popularity
  return japaneseAnime.sort((a, b) => b.vote_average - a.vote_average);
}

export async function searchShows(query: string): Promise<TMDBShow[]> {
  return fetchFromTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
}

export async function fetchPersonCredits(personId: string): Promise<TMDBShow[]> {
  const data = await fetchJsonFromTMDB(`/person/${personId}/combined_credits`);
  const cast = Array.isArray(data?.cast) ? data.cast : [];
  const seen = new Set<string>();
  const mainCastLimit = 8;

  return cast
    .filter((show: TMDBShow) => show.media_type === 'movie' || show.media_type === 'tv')
    .filter((show: TMDBShow) => show.poster_path)
    .filter((show: TMDBShow) => typeof show.order !== 'number' || show.order <= mainCastLimit)
    .filter((show: TMDBShow) => {
      const key = `${show.media_type}-${show.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a: TMDBShow, b: TMDBShow) => {
      const aHasKnownMainRole = typeof a.order === 'number' && a.order <= mainCastLimit;
      const bHasKnownMainRole = typeof b.order === 'number' && b.order <= mainCastLimit;

      if (aHasKnownMainRole !== bHasKnownMainRole) {
        return bHasKnownMainRole ? 1 : -1;
      }

      const popularityDifference = (b.popularity || 0) - (a.popularity || 0);
      if (popularityDifference !== 0) return popularityDifference;

      return (b.vote_average || 0) - (a.vote_average || 0);
    });
}

export async function fetchMovieGenres(): Promise<TMDBGenre[]> {
  const data = await fetchJsonFromTMDB('/genre/movie/list');
  return Array.isArray(data?.genres) ? data.genres : [];
}

export async function fetchTVGenres(): Promise<TMDBGenre[]> {
  const data = await fetchJsonFromTMDB('/genre/tv/list');
  return Array.isArray(data?.genres) ? data.genres : [];
}

export type DiscoverSort =
  | 'popularity.desc'
  | 'vote_average.desc'
  | 'primary_release_date.desc'
  | 'first_air_date.desc';

export interface DiscoverOptions {
  page?: number;
  sort_by?: DiscoverSort;
  with_genres?: string; // comma-separated genre IDs
  year?: number; // movies
  first_air_date_year?: number; // TV
  'vote_average.gte'?: number;
  with_original_language?: string;
}

async function discover(endpoint: '/discover/movie' | '/discover/tv', options: DiscoverOptions) {
  const params = new URLSearchParams();
  if (options.sort_by) params.set('sort_by', options.sort_by);
  if (options.with_genres) params.set('with_genres', options.with_genres);
  if (typeof options.year === 'number') params.set('primary_release_year', String(options.year));
  if (typeof options.first_air_date_year === 'number')
    params.set('first_air_date_year', String(options.first_air_date_year));
  if (typeof options['vote_average.gte'] === 'number')
    params.set('vote_average.gte', String(options['vote_average.gte']));
  if (options.with_original_language) params.set('with_original_language', options.with_original_language);
  params.set('include_adult', 'false');
  params.set('page', String(options.page ?? 1));

  const data = await fetchJsonFromTMDB(`${endpoint}?${params.toString()}`);
  const results = Array.isArray(data?.results) ? data.results : [];
  const page = typeof data?.page === 'number' ? data.page : options.page ?? 1;
  const totalPages = typeof data?.total_pages === 'number' ? data.total_pages : page;

  return {
    results,
    page,
    totalPages,
  };
}

export async function discoverMovies(options: Omit<DiscoverOptions, 'first_air_date_year'> & { pages?: number } = {}) {
  const pages = Math.max(1, Math.min(5, options.pages ?? 3));
  let allResults: TMDBShow[] = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const data = await discover('/discover/movie', {
        ...options,
        page,
      });
      allResults = [...allResults, ...data.results];
    } catch (error) {
      console.error(`Error discovering movies page ${page}:`, error);
    }
  }

  const seen = new Set<number>();
  const unique = allResults.filter((movie: TMDBShow) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });

  return unique
    .filter((movie: TMDBShow) => movie.poster_path && movie.backdrop_path)
    .map((movie: TMDBShow) => ({ ...movie, media_type: 'movie' as const }));
}

export async function discoverMoviesPage(options: Omit<DiscoverOptions, 'first_air_date_year'> = {}) {
  const page = Math.max(1, options.page ?? 1);
  const data = await discover('/discover/movie', {
    ...options,
    page,
  });
  const seen = new Set<number>();
  const results = data.results
    .filter((movie: TMDBShow) => movie.poster_path && movie.backdrop_path)
    .filter((movie: TMDBShow) => {
      if (seen.has(movie.id)) return false;
      seen.add(movie.id);
      return true;
    })
    .map((movie: TMDBShow) => ({ ...movie, media_type: 'movie' as const }));

  return {
    results,
    page: data.page,
    totalPages: data.totalPages,
  };
}

export async function discoverTVShows(
  options: Omit<DiscoverOptions, 'year'> & { pages?: number; excludeAnime?: boolean } = {}
) {
  const pages = Math.max(1, Math.min(5, options.pages ?? 3));
  const excludeAnime = options.excludeAnime ?? true;
  let allResults: TMDBShow[] = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const data = await discover('/discover/tv', {
        ...options,
        page,
      });
      allResults = [...allResults, ...data.results];
    } catch (error) {
      console.error(`Error discovering TV shows page ${page}:`, error);
    }
  }

  const seen = new Set<number>();
  const unique = allResults.filter((show: TMDBShow) => {
    if (seen.has(show.id)) return false;
    seen.add(show.id);
    return true;
  });

  return unique
    .filter((show: TMDBShow) => {
      if (!show.poster_path || !show.backdrop_path) return false;
      if (!excludeAnime) return true;
      return show.original_language !== 'ja' && (!show.origin_country || !show.origin_country.includes('JP'));
    })
    .map((show: TMDBShow) => ({ ...show, media_type: 'tv' as const }));
}

export async function discoverTVShowsPage(
  options: Omit<DiscoverOptions, 'year'> & { excludeAnime?: boolean } = {}
) {
  const page = Math.max(1, options.page ?? 1);
  const excludeAnime = options.excludeAnime ?? true;
  const data = await discover('/discover/tv', {
    ...options,
    page,
  });
  const seen = new Set<number>();
  const results = data.results
    .filter((show: TMDBShow) => {
      if (!show.poster_path || !show.backdrop_path) return false;
      if (!excludeAnime) return true;
      return show.original_language !== 'ja' && (!show.origin_country || !show.origin_country.includes('JP'));
    })
    .filter((show: TMDBShow) => {
      if (seen.has(show.id)) return false;
      seen.add(show.id);
      return true;
    })
    .map((show: TMDBShow) => ({ ...show, media_type: 'tv' as const }));

  return {
    results,
    page: data.page,
    totalPages: data.totalPages,
  };
}

export function getImageUrl(path: string, size: 'w500' | 'original' = 'w500'): string {
  if (!path) {
    // Return a transparent placeholder image data URI
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTFhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function fetchMovieCast(movieId: string): Promise<TMDBCredits> {
  return fetchJsonFromTMDB(`/movie/${movieId}/credits`);
}

export async function fetchTVCast(tvId: string): Promise<TMDBCredits> {
  return fetchJsonFromTMDB(`/tv/${tvId}/credits`);
}
