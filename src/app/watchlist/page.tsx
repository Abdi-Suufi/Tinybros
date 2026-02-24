'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useWatchlist } from '@/components/WatchlistContext';
import { getImageUrl } from '@/lib/tmdb';
import WatchlistToggle from '@/components/WatchlistToggle';

export default function WatchlistPage() {
  const { items } = useWatchlist();

  useEffect(() => {
    document.title = 'Watchlist | TinyBros';
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">
            Your Watchlist
          </h1>
          {items.length > 0 && (
            <p className="text-sm text-gray-400">
              {items.length} {items.length === 1 ? 'title' : 'titles'}
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-16 text-center text-gray-400">
            <p className="text-xl mb-3">Your watchlist is empty.</p>
            <p>Tap the heart icon on any movie or show to save it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {items.map((item) => (
              <div
                key={`${item.media_type}-${item.id}`}
                className="rounded-xl overflow-hidden bg-gray-800/50 hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 cursor-pointer group"
              >
                <Link
                  href={
                    item.media_type === 'movie'
                      ? `/movies/movie/${item.id}`
                      : `/series/series/${item.id}`
                  }
                >
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={getImageUrl(item.poster_path)}
                      alt={item.title || item.name || ''}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <WatchlistToggle item={item} size="sm" />
                    <div className="absolute bottom-0 left-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="text-lg font-semibold">
                        {item.title || item.name}
                      </h3>
                      {item.overview && (
                        <p className="text-sm text-gray-300 line-clamp-3">
                          {item.overview}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

