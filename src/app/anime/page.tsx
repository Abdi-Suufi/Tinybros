'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { fetchAnime, getImageUrl, TMDBShow } from '@/lib/tmdb';
import Loading from '@/components/Loading';

export default function AnimePage() {
  const [anime, setAnime] = useState<TMDBShow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-8 px-8">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {anime
            .filter(show => show.original_language === 'ja')
            .map((show) => (
              <div
                key={show.id}
                onClick={() => router.push(`/shows/series/${show.id}`)}
                className="rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
              >
                <div className="relative aspect-[2/3]">
                  <Image
                    src={getImageUrl(show.poster_path)}
                    alt={show.name || ''}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
      </div>
    </div>
  );
} 