'use client';

import Image from 'next/image';
import Link from 'next/link';
import { isUpNext, useWatchProgress } from '@/components/WatchProgressContext';
import { useWatchedEpisodes } from '@/components/WatchedEpisodesContext';
import { getImageUrl } from '@/lib/tmdb';

interface EpisodeCardProps {
  tmdbId: number;
  season: number;
  episode: {
    id: number;
    name: string;
    overview: string;
    still_path: string | null;
    episode_number: number;
    air_date: string;
  };
  href: string;
  isCurrent?: boolean;
}

/** Past this share of an episode it counts as finished (matches the watch page). */
const FINISHED_RATIO = 0.9;

export default function EpisodeCard({ tmdbId, season, episode, href, isCurrent = false }: EpisodeCardProps) {
  const { getProgress } = useWatchProgress();
  const { isWatched, setWatched } = useWatchedEpisodes();

  const progress = getProgress(tmdbId, 'tv', season, episode.episode_number);
  const ratio = progress ? progress.position_seconds / progress.duration_seconds : 0;
  // An "up next" marker isn't real progress, so the card reads as a fresh episode
  const inProgress = ratio > 0 && ratio <= FINISHED_RATIO && !(progress && isUpNext(progress));
  const watched = isWatched(tmdbId, season, episode.episode_number) || ratio > FINISHED_RATIO;
  const minutesLeft = progress ? Math.max(1, Math.round((progress.duration_seconds - progress.position_seconds) / 60)) : 0;
  const actionLabel = inProgress ? 'Resume' : watched ? 'Watch Again' : 'Watch Episode';

  return (
    <div
      data-current-episode={isCurrent}
      className={`group flex overflow-hidden rounded-xl bg-black transition-all duration-300 ${
        isCurrent
          ? 'border-2 border-yellow-500/70 shadow-[0_0_18px_color-mix(in_oklab,var(--color-yellow-500)_30%,transparent)]'
          : 'border border-yellow-500/20 hover:border-yellow-400/70 hover:shadow-[0_0_16px_color-mix(in_oklab,var(--color-yellow-500)_35%,transparent)]'
      }`}
    >
      <div className="keep-dark relative min-h-[96px] w-28 flex-shrink-0 self-stretch sm:w-48">
        <Image
          src={getImageUrl(episode.still_path)}
          alt={episode.name}
          fill
          className={`object-cover transition-opacity ${watched && !isCurrent ? 'opacity-60' : ''}`}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-r from-transparent to-black/60 transition-opacity ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        />
        {watched && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-yellow-300 backdrop-blur-sm">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
              <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
            </svg>
            Watched
          </span>
        )}
        {inProgress && (
          <div
            className="absolute inset-x-0 bottom-0 h-1 bg-white/25"
            role="progressbar"
            aria-label="Watch progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
          >
            <div className="h-full bg-yellow-400" style={{ width: `${Math.max(3, ratio * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="whitespace-nowrap text-sm font-semibold text-yellow-400">Episode {episode.episode_number}</h3>
          <span className="whitespace-nowrap text-xs text-gray-400">{episode.air_date}</span>
        </div>
        <h4 className="mb-1 truncate font-bold text-white transition-colors group-hover:text-yellow-300">{episode.name}</h4>
        <p className="mb-3 line-clamp-2 text-xs text-gray-300">{episode.overview}</p>
        <div className="mt-auto flex items-center gap-2">
          {isCurrent ? (
            <span className="whitespace-nowrap rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
              Currently Watching
            </span>
          ) : (
            <Link
              href={href}
              className="bg-gradient-orange-yellow whitespace-nowrap rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-1 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </Link>
          )}
          {inProgress && !isCurrent && <span className="whitespace-nowrap text-xs text-gray-400">{minutesLeft} min left</span>}
          <button
            type="button"
            onClick={() => setWatched(tmdbId, season, episode.episode_number, !watched)}
            aria-pressed={watched}
            aria-label={watched ? `Mark episode ${episode.episode_number} as unwatched` : `Mark episode ${episode.episode_number} as watched`}
            title={watched ? 'Mark as unwatched' : 'Mark as watched'}
            className={`ml-auto flex h-7 w-7 flex-none items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
              watched
                ? 'border-yellow-400/70 bg-yellow-500/15 text-yellow-300'
                : 'border-yellow-500/25 text-gray-400 hover:border-yellow-400/60 hover:text-yellow-300'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
              <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
