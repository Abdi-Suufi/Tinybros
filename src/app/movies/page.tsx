'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { fetchMovies, getImageUrl, TMDBShow } from '@/lib/tmdb';
import WatchlistToggle from '@/components/WatchlistToggle';

export default function MoviesPage() {
  const [movies, setMovies] = useState<TMDBShow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    document.title = 'Movies | TinyBros';
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchMovies();
        setMovies(data);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const skeletonItems = Array.from({ length: 20 });

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-8 px-8">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {loading
            ? skeletonItems.map((_, idx) => (
                <div
                  key={`movie-skel-${idx}`}
                  className="rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40"
                >
                  <div className="relative aspect-[2/3] bg-gradient-to-t from-orange-700/40 via-gray-900 to-yellow-600/40" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
                    <div className="h-3 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                  </div>
                </div>
              ))
            : movies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => router.push(`/movies/movie/${movie.id}`)}
                  className="rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
                >
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={getImageUrl(movie.poster_path)}
                      alt={movie.title || ''}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <WatchlistToggle
                      item={{
                        id: movie.id,
                        media_type: 'movie',
                        title: movie.title,
                        name: movie.title,
                        overview: movie.overview,
                        poster_path: movie.poster_path,
                        backdrop_path: movie.backdrop_path,
                      }}
                      size="sm"
                    />
                    <div className="absolute bottom-0 left-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="text-lg font-semibold">{movie.title}</h3>
                      <p className="text-sm text-gray-300 line-clamp-3">{movie.overview}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold truncate">{movie.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{movie.overview}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
} 