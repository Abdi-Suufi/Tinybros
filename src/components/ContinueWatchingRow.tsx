'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWatchProgress, type WatchProgress } from '@/components/WatchProgressContext';
import { getImageUrl, type TMDBShow } from '@/lib/tmdb';

function watchUrl(progress: WatchProgress) {
  const base = `/watch/${progress.media_type}/${progress.tmdb_id}`;
  return progress.media_type === 'tv'
    ? `${base}?season=${progress.season}&episode=${progress.episode}`
    : base;
}

export default function ContinueWatchingRow() {
  const { records, ready, removeProgress } = useWatchProgress();
  const [details, setDetails] = useState<Record<string, TMDBShow>>({});
  // Records are newest first; keep only the latest one per title so an older episode never resurfaces
  const seenTitles = new Set<string>();
  const latestPerTitle = records.filter((record) => {
    const title = `${record.media_type}:${record.tmdb_id}`;
    if (seenTitles.has(title)) return false;
    seenTitles.add(title);
    return true;
  });
  const inProgressRecords = latestPerTitle.filter(
    (record) => record.position_seconds / record.duration_seconds <= 0.9
  );

  useEffect(() => {
    let cancelled = false;
    const missing = inProgressRecords.filter((record) => !details[`${record.media_type}:${record.tmdb_id}`]);
    if (missing.length === 0) return;

    const unique = [...new Map(missing.map((record) => [
      `${record.media_type}:${record.tmdb_id}`,
      record,
    ])).values()];

    void Promise.all(unique.map(async (record) => {
      const key = `${record.media_type}:${record.tmdb_id}`;
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${record.media_type}/${record.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        if (!response.ok) throw new Error(`TMDB returned ${response.status} for ${key}`);
        const result = await response.json() as TMDBShow;
        if (!cancelled) setDetails((current) => ({ ...current, [key]: result }));
      } catch (error) {
        console.error('Failed to load Continue watching title details', error);
      }
    }));

    return () => {
      cancelled = true;
    };
  }, [inProgressRecords, details]);

  if (!ready || inProgressRecords.length === 0) return null;

  return (
    <section className="px-4">
      <h2 className="mb-5 text-2xl font-bold">Continue watching</h2>
      <div className="flex gap-4 overflow-x-auto pb-5">
        {inProgressRecords.map((progress) => {
          const key = `${progress.media_type}:${progress.tmdb_id}`;
          const item = details[key];
          const percent = Math.min(100, (progress.position_seconds / progress.duration_seconds) * 100);
          const label = progress.media_type === 'tv'
            ? `Season ${progress.season} • Episode ${progress.episode}`
            : 'Movie';

          return (
            <article
              key={`${key}:${progress.season ?? 0}:${progress.episode ?? 0}`}
              className="group relative w-36 flex-none overflow-hidden rounded-xl bg-black border border-yellow-500/20 hover:border-yellow-400/70 hover:shadow-[0_0_16px_rgba(234,179,8,0.35)] transition-all sm:w-44"
            >
              <Link href={watchUrl(progress)} className="block">
                <div className="relative aspect-[2/3] bg-gray-800">
                  {item?.poster_path && (
                    <Image
                      src={getImageUrl(item.poster_path)}
                      alt={item.title || item.name || 'Continue watching'}
                      fill
                      sizes="176px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">
                      {item?.title || item?.name || 'Loading title…'}
                    </h3>
                    <p className="mt-1 text-xs text-gray-300">{label}</p>
                  </div>
                </div>
                <div
                  className="h-1 w-full bg-gray-700"
                  role="progressbar"
                  aria-label={`${item?.title || item?.name || 'Title'} watched`}
                  aria-valuenow={Math.round(percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600" style={{ width: `${percent}%` }} />
                </div>
              </Link>
              <button
                type="button"
                aria-label={`Remove ${item?.title || item?.name || 'title'} from Continue watching`}
                onClick={() => removeProgress(progress)}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-lg text-white opacity-100 transition-opacity hover:bg-black sm:opacity-0 sm:group-hover:opacity-100"
              >
                ×
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
