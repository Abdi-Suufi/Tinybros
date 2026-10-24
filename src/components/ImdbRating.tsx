'use client';

import { useEffect, useState } from 'react';

interface ImdbRatingProps {
  type: 'movie' | 'tv';
  tmdbId: string | number;
  // Shown when IMDb has no rating for this title
  fallbackRating: number;
}

export default function ImdbRating({ type, tmdbId, fallbackRating }: ImdbRatingProps) {
  // undefined = still loading, null = IMDb has no rating (fall back to TMDB)
  const [imdbRating, setImdbRating] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setImdbRating(undefined);
    fetch(`/api/imdb-rating?type=${type}&tmdbId=${tmdbId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setImdbRating(typeof json?.imdbRating === 'number' ? json.imdbRating : null);
      })
      .catch(() => {
        if (!cancelled) setImdbRating(null);
      });
    return () => {
      cancelled = true;
    };
  }, [type, tmdbId]);

  if (imdbRating === undefined) return <span>IMDb …</span>;
  if (imdbRating !== null) return <span>IMDb {imdbRating.toFixed(1)} ★</span>;
  return <span>{fallbackRating.toFixed(1)} ★</span>;
}
