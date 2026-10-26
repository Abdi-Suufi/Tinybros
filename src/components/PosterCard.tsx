'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getImageUrl } from '@/lib/tmdb';
import WatchlistToggle from '@/components/WatchlistToggle';
import type { WatchlistItem } from '@/components/WatchlistContext';

interface PosterCardProps {
  item: WatchlistItem;
  /** Navigate with a link... */
  href?: string;
  /** ...or a click handler (used by drag-scrollable rows that suppress clicks after a drag). */
  onClick?: () => void;
  /** Rating text shown after the star, e.g. "7.8" or "IMDb 7.8". Omitted when unknown. */
  rating?: ReactNode;
  year?: string;
  /** Top Trending rank. Only that section passes this, so the TOP badge appears nowhere else. */
  rank?: number;
  /** Width classes for scroll rows; grids leave this empty so the card fills its cell. */
  className?: string;
}

export default function PosterCard({ item, href, onClick, rating, year, rank, className = '' }: PosterCardProps) {
  const title = item.title || item.name || '';

  const poster = (
    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-black border border-yellow-500/20 group-hover:border-yellow-400/70 group-hover:shadow-[0_0_16px_rgba(234,179,8,0.35)] transition-all duration-300">
      <Image
        src={getImageUrl(item.poster_path)}
        alt={title}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {rank !== undefined && (
        <div className="absolute top-0 left-3 z-10 flex flex-col items-center rounded-b-md bg-gradient-to-b from-yellow-400 to-yellow-600 px-2 pb-1 pt-0.5 text-black shadow-lg">
          <span className="text-[9px] font-extrabold leading-none tracking-wider">TOP</span>
          <span className="text-base font-extrabold leading-tight">{rank}</span>
        </div>
      )}
      <WatchlistToggle item={item} size="sm" />
    </div>
  );

  const details = (
    <div className="mt-3 px-0.5">
      <h3 className="truncate font-semibold text-white group-hover:text-yellow-300 transition-colors">{title}</h3>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
        {rating !== undefined && rating !== null && (
          <>
            <span className="text-yellow-400">★</span>
            <span>{rating}</span>
            <span>·</span>
          </>
        )}
        {year && (
          <>
            <span>{year}</span>
            <span>·</span>
          </>
        )}
        <span>{item.media_type === 'movie' ? 'Movie' : 'Show'}</span>
      </p>
    </div>
  );

  const classes = `group block cursor-pointer select-none ${className}`;

  if (onClick) {
    return (
      <div onClick={onClick} onDragStart={(e) => e.preventDefault()} className={classes}>
        {poster}
        {details}
      </div>
    );
  }

  return (
    <Link href={href ?? '#'} className={classes}>
      {poster}
      {details}
    </Link>
  );
}

/** Shared helpers for the card's meta line. */
export function releaseYear(show: { release_date?: string; first_air_date?: string }) {
  return (show.release_date || show.first_air_date || '').slice(0, 4) || undefined;
}

export function tmdbRating(voteAverage?: number) {
  return voteAverage ? voteAverage.toFixed(1) : undefined;
}
