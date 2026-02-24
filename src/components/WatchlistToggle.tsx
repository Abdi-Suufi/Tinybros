'use client';

import type { MouseEvent } from 'react';
import type { WatchlistItem } from '@/components/WatchlistContext';
import { useWatchlist } from '@/components/WatchlistContext';

interface WatchlistToggleProps {
  item: WatchlistItem;
  size?: 'sm' | 'md';
}

export default function WatchlistToggle({ item, size = 'md' }: WatchlistToggleProps) {
  const { isSaved, toggleItem } = useWatchlist();
  const saved = isSaved(item.id, item.media_type);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(item);
  };

  const baseSize = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={saved ? 'Remove from watchlist' : 'Save to watchlist'}
      className={`absolute top-3 right-3 z-20 flex items-center justify-center rounded-full border transition-all duration-200 ${
        baseSize
      } ${
        saved
          ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black border-yellow-400 shadow-lg'
          : 'bg-black/70 text-yellow-300 border-orange-400/70 hover:bg-black/90'
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={iconSize}
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
             4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 
             16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    </button>
  );
}

