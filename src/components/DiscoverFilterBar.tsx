'use client';

import { useEffect, useState } from 'react';
import type { TMDBGenre, DiscoverSort } from '@/lib/tmdb';

export interface DiscoverFilterValues {
  genre?: string;
  sort?: DiscoverSort;
  year?: string;
  minRating?: string;
  language?: string;
  ratingSource?: 'tmdb' | 'imdb';
}

function clampRating(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  const clamped = Math.max(0, Math.min(10, parsed));
  return String(Math.round(clamped * 10) / 10);
}

export default function DiscoverFilterBar({
  title,
  genres,
  values,
  defaults,
  yearLabel,
  sortOptions,
  onApply,
  onReset,
}: {
  title: string;
  genres: TMDBGenre[];
  values: DiscoverFilterValues;
  defaults: { sort: DiscoverSort; ratingSource: 'tmdb' | 'imdb' };
  yearLabel: string;
  sortOptions: { value: DiscoverSort; label: string }[];
  onApply: (values: DiscoverFilterValues) => void;
  onReset: () => void;
}) {
  const genre = values.genre ?? '';
  const sort = values.sort;
  const year = values.year ?? '';
  const minRating = values.minRating ?? '';
  const language = values.language ?? '';
  const ratingSource = values.ratingSource ?? 'tmdb';

  const [draft, setDraft] = useState<DiscoverFilterValues>(values);

  useEffect(() => {
    setDraft({
      genre: genre || undefined,
      sort,
      year: year || undefined,
      minRating: minRating || undefined,
      language: language || undefined,
      ratingSource,
    });
  }, [genre, sort, year, minRating, language, ratingSource]);

  const activeCount =
    (values.genre ? 1 : 0) +
    (values.year ? 1 : 0) +
    (values.minRating ? 1 : 0) +
    (values.language ? 1 : 0) +
    ((values.sort ?? defaults.sort) !== defaults.sort ? 1 : 0) +
    ((values.ratingSource ?? defaults.ratingSource) !== defaults.ratingSource ? 1 : 0);

  return (
    <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-black/70 via-gray-950/60 to-black/70 backdrop-blur-md p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-xs text-gray-400">
            {activeCount === 0 ? 'No filters applied' : `${activeCount} filter${activeCount === 1 ? '' : 's'} applied`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="px-3 py-2 rounded-lg bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/20 border border-yellow-500/25 transition-colors text-sm"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 rounded-lg bg-gray-800/40 text-gray-200 hover:bg-gray-800/60 border border-gray-700/60 transition-colors text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-300">Genre</span>
          <select
            value={draft.genre ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, genre: e.target.value || undefined }))}
            className="rounded-lg bg-black/50 border border-gray-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60"
          >
            <option value="">All</option>
            {genres.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-300">Sort</span>
          <select
            value={draft.sort ?? sortOptions[0]?.value}
            onChange={(e) => setDraft((prev) => ({ ...prev, sort: e.target.value as DiscoverSort }))}
            className="rounded-lg bg-black/50 border border-gray-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-300">{yearLabel}</span>
          <input
            inputMode="numeric"
            value={draft.year ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, year: e.target.value.replace(/[^\d]/g, '') || undefined }))}
            placeholder="Any"
            className="rounded-lg bg-black/50 border border-gray-700/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500/60"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-300">Min rating ({(draft.ratingSource ?? defaults.ratingSource).toUpperCase()})</span>
          <input
            inputMode="decimal"
            value={draft.minRating ?? ''}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                minRating: clampRating(e.target.value) || undefined,
              }))
            }
            placeholder="0-10"
            className="rounded-lg bg-black/50 border border-gray-700/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500/60"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-300">Language</span>
          <input
            value={draft.language ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, language: e.target.value.trim() || undefined }))}
            placeholder="e.g. en"
            className="rounded-lg bg-black/50 border border-gray-700/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500/60"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-300">Rating source</span>
          <select
            value={draft.ratingSource ?? 'tmdb'}
            onChange={(e) => setDraft((prev) => ({ ...prev, ratingSource: e.target.value as 'tmdb' | 'imdb' }))}
            className="rounded-lg bg-black/50 border border-gray-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60"
          >
            <option value="tmdb">TMDB</option>
            <option value="imdb">IMDb</option>
          </select>
        </label>
      </div>
    </div>
  );
}
