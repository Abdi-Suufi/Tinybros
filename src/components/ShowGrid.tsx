'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TMDBShow, getImageUrl } from '@/lib/tmdb';
import WatchlistToggle from '@/components/WatchlistToggle';

interface ShowGridProps {
  getShows: () => Promise<TMDBShow[]>;
}

export default function ShowGrid({ getShows }: ShowGridProps) {
  const [shows, setShows] = useState<TMDBShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const data = await getShows();
        setShows(data);
      } catch (error) {
        console.error('Error fetching shows:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShows();
  }, [getShows]);

  const skeletonItems = Array.from({ length: 12 });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
      {loading
        ? skeletonItems.map((_, idx) => (
            <div
              key={idx}
              className="rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40"
            >
              <div className="relative aspect-[2/3] bg-gradient-to-t from-orange-700/40 via-gray-900 to-yellow-600/40">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="p-4 space-y-2">
                <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
                <div className="h-3 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                <div className="h-3 rounded-full w-5/6 bg-gradient-to-r from-orange-500/50 to-yellow-400/50" />
              </div>
            </div>
          ))
        : shows.length > 0
        ? shows.map((show) => (
            <div
              key={show.id}
              className="bg-gray-800/50 rounded-xl overflow-hidden hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 group"
            >
              <Link href={show.media_type === 'movie' ? `/movies/movie/${show.id}` : `/series/series/${show.id}`}>
                <div className="relative aspect-[2/3]">
                  <Image
                    src={getImageUrl(show.poster_path)}
                    alt={show.title || show.name || ''}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <WatchlistToggle
                    item={{
                      id: show.id,
                      media_type: show.media_type,
                      title: show.title,
                      name: show.name,
                      overview: show.overview,
                      poster_path: show.poster_path,
                      backdrop_path: show.backdrop_path,
                    }}
                  />
                  <div className="absolute bottom-0 left-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <h3 className="text-lg font-semibold mb-2">{show.title || show.name}</h3>
                    <p className="text-sm text-gray-300 line-clamp-3">{show.overview}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))
        : (
          <div className="col-span-full text-center text-gray-400">
            <p className="text-xl mb-2">No results found</p>
            <p>Try searching with different keywords or browse our categories</p>
          </div>
        )}
    </div>
  );
} 