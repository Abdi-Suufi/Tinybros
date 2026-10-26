'use client';

import { useEffect } from 'react';
import { useWatchlist } from '@/components/WatchlistContext';
import PosterCard from '@/components/PosterCard';
import ContinueWatchingRow from '@/components/ContinueWatchingRow';

export default function WatchlistPage() {
  const { items, syncMessage } = useWatchlist();

  useEffect(() => {
    document.title = 'Watchlist | Tinywatch';
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
            Your Watchlist
          </h1>
          {items.length > 0 && (
            <p className="text-sm text-gray-400">
              {items.length} {items.length === 1 ? 'title' : 'titles'}
            </p>
          )}
        </div>

        {syncMessage && (
          <p
            role="status"
            className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200"
          >
            {syncMessage}
          </p>
        )}

        <div className="mb-10">
          <ContinueWatchingRow />
        </div>

        {items.length === 0 ? (
          <div className="mt-16 text-center text-gray-400">
            <p className="text-xl mb-3">Your watchlist is empty.</p>
            <p>Tap the heart icon on any movie or show to save it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
            {items.map((item) => (
              <PosterCard
                key={`${item.media_type}-${item.id}`}
                item={item}
                href={item.media_type === 'movie' ? `/movies/movie/${item.id}` : `/series/series/${item.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
