'use client';

import { useEffect, useState } from 'react';
import { TMDBShow } from '@/lib/tmdb';
import PosterCard, { releaseYear, tmdbRating } from '@/components/PosterCard';

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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
      {loading
        ? skeletonItems.map((_, idx) => (
            <div key={idx}>
              <div className="aspect-[2/3] rounded-xl animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40" />
              <div className="mt-3 space-y-2">
                <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                <div className="h-3 rounded-full w-1/2 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
              </div>
            </div>
          ))
        : shows.length > 0
        ? shows.map((show) => (
            <PosterCard
              key={`${show.media_type}-${show.id}`}
              item={show}
              href={show.media_type === 'movie' ? `/movies/movie/${show.id}` : `/series/series/${show.id}`}
              rating={tmdbRating(show.vote_average)}
              year={releaseYear(show)}
            />
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