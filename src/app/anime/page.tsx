'use client';

import { useState, useEffect } from 'react';
import { fetchAnime, TMDBShow } from '@/lib/tmdb';
import PosterCard, { releaseYear, tmdbRating } from '@/components/PosterCard';

export default function AnimePage() {
  const [anime, setAnime] = useState<TMDBShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Anime | Tinywatch';
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAnime();
        setAnime(data);
      } catch (error) {
        console.error('Error fetching anime:', error);
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
          {loading
            ? skeletonItems.map((_, idx) => (
                <div key={`anime-skel-${idx}`}>
                  <div className="aspect-[2/3] rounded-xl animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                    <div className="h-3 rounded-full w-1/2 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
                  </div>
                </div>
              ))
            : anime
                .filter(show => show.original_language === 'ja')
                .map((show) => (
                  <PosterCard
                    key={show.id}
                    item={{ ...show, media_type: 'tv' }}
                    href={`/series/series/${show.id}`}
                    rating={tmdbRating(show.vote_average)}
                    year={releaseYear(show)}
                  />
                ))}
        </div>
      </div>
    </div>
  );
} 