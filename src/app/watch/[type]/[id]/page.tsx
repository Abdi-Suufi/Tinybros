'use client';

import { useCallback, useEffect, useRef, useState, use, type IframeHTMLAttributes } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getImageUrl, TMDBCast } from '@/lib/tmdb';
import Image from 'next/image';
import Link from 'next/link';
import { DiscussionEmbed } from 'disqus-react';
import WatchlistToggle from '@/components/WatchlistToggle';
import CastView from '@/components/CastView';
import { AdsterraSidebar } from '@/components/AdsterraAds';
import { useWatchProgress, type WatchProgress } from '@/components/WatchProgressContext';

interface ShowDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  number_of_seasons?: number;
}

interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string;
  episode_number: number;
  season_number: number;
  air_date: string;
}

interface RecommendedShow {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string;
}

interface PlaybackSource {
  id: string;
  name: string;
  url: string;
  disabled?: boolean;
  sandbox?: string;
}

const PLAYER_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-presentation';

function logWatchPlayer(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[watch-player] ${event}`, details);
  }
}

export default function WatchPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const resolvedParams = use(params);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedShow[]>([]);
  const [cast, setCast] = useState<TMDBCast[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('cinesrc');
  const [showPlayer, setShowPlayer] = useState(true);
  const [resumeStart, setResumeStart] = useState<{ key: string; seconds: number } | null>(null);
  const [playerReload, setPlayerReload] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const latestPlaybackRef = useRef<{
    currentTime: number;
    duration: number;
    progress: WatchProgress;
  } | null>(null);
  const lastProgressSaveAtRef = useRef(0);
  const finishedProgressKeyRef = useRef<string | null>(null);
  const stoppedUpdateTimerRef = useRef<number | null>(null);
  const { records: watchProgress, ready: progressReady, saveProgress, removeProgress } = useWatchProgress();
  const mediaType = resolvedParams.type === 'movie' ? 'movie' : 'tv';
  const currentSeason = Number(searchParams.get('season')) || 1;
  const currentEpisode = Number(searchParams.get('episode')) || 1;
  const progressSeason = mediaType === 'tv' ? currentSeason : null;
  const progressEpisode = mediaType === 'tv' ? currentEpisode : null;
  const progressKey = `${mediaType}:${resolvedParams.id}:${progressSeason ?? 0}:${progressEpisode ?? 0}`;
  const savedProgress = watchProgress.find((entry) =>
    entry.tmdb_id === Number(resolvedParams.id) &&
    entry.media_type === mediaType &&
    entry.season === progressSeason &&
    entry.episode === progressEpisode
  );
  const savedProgressRef = useRef(savedProgress);
  savedProgressRef.current = savedProgress;
  const startSeconds = resumeStart?.key === progressKey ? resumeStart.seconds : null;
  const fullscreenIframeProps = {
    allowFullScreen: true,
    webkitallowfullscreen: "true",
    mozallowfullscreen: "true",
  } as IframeHTMLAttributes<HTMLIFrameElement> & {
    webkitallowfullscreen: string;
    mozallowfullscreen: string;
  };

  // Define available playback sources
  const playbackSources: PlaybackSource[] = [
    {
      id: 'cinesrc',
      name: 'Main player',
      url: resolvedParams.type === 'tv'
        ? `https://cinesrc.st/embed/tv/${resolvedParams.id}?s=${searchParams.get('season') || '1'}&e=${searchParams.get('episode') || '1'}`
        : `https://cinesrc.st/embed/movie/${resolvedParams.id}`
    },
    {
      id: 'vidzee',
      name: 'VidZee',
      url: `https://player.vidzee.wtf/embed/${resolvedParams.type === 'movie' ? 'movie' : 'tv'}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}`,
    },
    {
      id: 'vidstuck',
      name: 'VidStuck (ads)',
      url: `https://vidstuck.cc/embed/${resolvedParams.type === 'movie' ? 'movie' : 'tv'}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}?loading=2&color=FF7575&overlay=true&back=false`,
    },
    {
      id: 'vidy',
      name: 'Vidy (ads)',
      url: `https://www.vidy.st/${resolvedParams.type === 'movie' ? 'movie' : 'tv'}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}?color=FF7575&nextEpisode=false&episodeSelector=false&autoplayNextEpisode=false`,
    },
    {
      id: 'videasy',
      name: 'Videasy (ads)',
      url: `https://player.videasy.net/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}`
    },
    {
      id: 'vidcore',
      name: 'VidCore (ads)',
      url: `https://vidcore.net/${resolvedParams.type === 'movie' ? 'movie' : 'tv'}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `/${searchParams.get('season') || '1'}/${searchParams.get('episode') || '1'}` : ''}?autoPlay=true&hideServer=true`,
    },
  ];

  useEffect(() => {
    if (!progressReady || resumeStart?.key === progressKey) return;
    const progress = watchProgress.find((entry) =>
      entry.tmdb_id === Number(resolvedParams.id) &&
      entry.media_type === mediaType &&
      entry.season === progressSeason &&
      entry.episode === progressEpisode
    );
    if (progress && progress.position_seconds / progress.duration_seconds > 0.9) {
      removeProgress(progress);
      setResumeStart({ key: progressKey, seconds: 0 });
      return;
    }
    const hasResumePoint = progress &&
      progress.position_seconds > 30 &&
      progress.position_seconds / progress.duration_seconds <= 0.9;
    setResumeStart({
      key: progressKey,
      seconds: hasResumePoint ? Math.max(0, Math.round(progress.position_seconds) - 5) : 0,
    });
  }, [progressReady, progressKey, resumeStart?.key, watchProgress, resolvedParams.id, mediaType, progressSeason, progressEpisode, removeProgress]);

  const flushPlaybackProgress = useCallback((reason: string, ended = false) => {
    const latest = latestPlaybackRef.current;
    if (!latest) {
      logWatchPlayer('flush skipped', { reason, result: 'no valid timeupdate received' });
      return;
    }
    if (ended || latest.currentTime > latest.duration * 0.9) {
      logWatchPlayer('save attempt', {
        key: `${latest.progress.media_type}:${latest.progress.tmdb_id}:${latest.progress.season ?? 0}:${latest.progress.episode ?? 0}`,
        position: latest.progress.position_seconds,
        duration: latest.progress.duration_seconds,
        destination: 'clear finished progress',
        reason,
        result: 'finished',
      });
      removeProgress(latest.progress);
      latestPlaybackRef.current = null;
      return;
    }
    if (latest.currentTime <= 30) {
      logWatchPlayer('flush skipped', { reason, position: latest.currentTime, result: 'position is at or below 30 seconds' });
      return;
    }
    if (latest.duration > 86_400) {
      logWatchPlayer('flush skipped', { reason, duration: latest.duration, result: 'duration exceeds storage limit' });
      return;
    }
    logWatchPlayer('save attempt', {
      key: `${latest.progress.media_type}:${latest.progress.tmdb_id}:${latest.progress.season ?? 0}:${latest.progress.episode ?? 0}`,
      position: latest.progress.position_seconds,
      duration: latest.progress.duration_seconds,
      destination: 'localStorage' + (typeof window !== 'undefined' && window.localStorage ? ' + Supabase when signed in' : ''),
      reason,
      result: 'dispatched',
    });
    saveProgress(latest.progress);
    lastProgressSaveAtRef.current = Date.now();
  }, [removeProgress, saveProgress]);

  useEffect(() => {
    latestPlaybackRef.current = null;
    lastProgressSaveAtRef.current = 0;
    finishedProgressKeyRef.current = null;
  }, [progressKey]);

  useEffect(() => {
    if (!progressReady || startSeconds === null) return;
    const onMessage = (event: MessageEvent) => {
      const sourceMatches = event.source === iframeRef.current?.contentWindow;
      let data: unknown = event.data;
      const initialShape = data && typeof data === 'object' ? Object.keys(data) : null;
      const initialType = data && typeof data === 'object' && 'type' in data
        ? (data as { type?: unknown }).type
        : null;
      logWatchPlayer('message received', {
        origin: event.origin,
        type: initialType,
        sourceMatches,
        shape: initialShape,
      });
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data) as unknown;
        } catch {
          logWatchPlayer('message rejected', {
            origin: event.origin,
            type: null,
            reason: 'data is a string but not valid JSON',
            sourceMatches,
          });
          return;
        }
      }
      if (!data || typeof data !== 'object') {
        logWatchPlayer('message rejected', {
          origin: event.origin,
          type: null,
          reason: 'message data is not an object',
          sourceMatches,
        });
        return;
      }

      const message = data as Record<string, unknown> & { type?: unknown };
      const type = typeof message.type === 'string' ? message.type.toLowerCase() : null;
      const normalizedType = type?.replace(/[_\-\s]/g, '') ?? null;
      const shape = Object.keys(data);
      const reject = (reason: string) => logWatchPlayer('message rejected', {
        origin: event.origin,
        type,
        reason,
        sourceMatches,
        shape,
      });
      if (event.origin !== 'https://cinesrc.st') {
        reject('origin is not https://cinesrc.st');
        return;
      }
      if (!sourceMatches) {
        reject('event.source is not the tracked player iframe contentWindow');
        return;
      }
      if (!type) {
        reject('type is missing or is not a string');
        return;
      }

      const isTimeUpdate = normalizedType?.includes('timeupdate') ?? false;
      const isPause = normalizedType?.includes('pause') ?? false;
      const isEnded = normalizedType?.includes('ended') ?? false;
      if (!isTimeUpdate && !isPause && !isEnded) {
        reject('unknown message type');
        return;
      }
      if (finishedProgressKeyRef.current === progressKey) {
        reject('this item is already marked finished');
        return;
      }

      const nestedData = message.data && typeof message.data === 'object'
        ? message.data as Record<string, unknown>
        : {};
      const currentTimeValue =
        message.currentTime ??
        message.current_time ??
        message.positionSeconds ??
        message.position ??
        nestedData.currentTime ??
        nestedData.current_time ??
        nestedData.positionSeconds ??
        nestedData.position;
      const durationValue =
        message.duration ??
        message.durationSeconds ??
        message.duration_seconds ??
        message.totalDuration ??
        nestedData.duration ??
        nestedData.durationSeconds ??
        nestedData.duration_seconds ??
        nestedData.totalDuration;
      const hasValidTime = typeof currentTimeValue === 'number' &&
        Number.isFinite(currentTimeValue) &&
        typeof durationValue === 'number' &&
        Number.isFinite(durationValue) &&
        durationValue > 0;
      if (isTimeUpdate && !hasValidTime) {
        reject('timeupdate requires finite numeric currentTime and positive duration fields');
        return;
      }
      if (hasValidTime) {
        const currentTime = currentTimeValue as number;
        const duration = durationValue as number;
        latestPlaybackRef.current = {
          currentTime,
          duration,
          progress: {
            tmdb_id: Number(resolvedParams.id),
            media_type: mediaType,
            season: progressSeason,
            episode: progressEpisode,
            position_seconds: Math.max(1, Math.min(Math.round(currentTime), Math.round(duration))),
            duration_seconds: Math.max(1, Math.round(duration)),
            updated_at: new Date().toISOString(),
          },
        };
      }
      logWatchPlayer('message accepted', {
        origin: event.origin,
        type,
        sourceMatches,
        shape,
        reason: hasValidTime ? 'recognized playback message with valid time fields' : 'recognized pause/ended message; using latest valid timeupdate',
      });

      if (isTimeUpdate) {
        if (stoppedUpdateTimerRef.current !== null) {
          window.clearTimeout(stoppedUpdateTimerRef.current);
        }
        stoppedUpdateTimerRef.current = window.setTimeout(() => {
          stoppedUpdateTimerRef.current = null;
          flushPlaybackProgress('timeupdates stopped for 2 seconds');
        }, 2000);
      }
      if ((isPause || isEnded) && stoppedUpdateTimerRef.current !== null) {
        window.clearTimeout(stoppedUpdateTimerRef.current);
        stoppedUpdateTimerRef.current = null;
      }

      if (isEnded || (hasValidTime && (currentTimeValue as number) > (durationValue as number) * 0.9)) {
        finishedProgressKeyRef.current = progressKey;
        if (isEnded && !latestPlaybackRef.current && savedProgressRef.current) {
          logWatchPlayer('save attempt', {
            key: progressKey,
            position: savedProgressRef.current.position_seconds,
            duration: savedProgressRef.current.duration_seconds,
            destination: 'clear finished progress',
            reason: 'ended message without time fields',
            result: 'finished',
          });
          removeProgress(savedProgressRef.current);
          return;
        }
        flushPlaybackProgress(isEnded ? 'ended message' : 'past 90% duration', isEnded);
        return;
      }
      if (isPause) {
        flushPlaybackProgress('pause message');
        return;
      }
      if (isTimeUpdate && Date.now() - lastProgressSaveAtRef.current >= 15_000) {
        flushPlaybackProgress('15-second timeupdate interval');
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPlaybackProgress('visibilitychange hidden');
    };
    const onPageHide = () => flushPlaybackProgress('pagehide');
    window.addEventListener('message', onMessage);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      flushPlaybackProgress('watch page effect cleanup');
      if (stoppedUpdateTimerRef.current !== null) {
        window.clearTimeout(stoppedUpdateTimerRef.current);
        stoppedUpdateTimerRef.current = null;
      }
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [progressReady, startSeconds, progressKey, selectedSource, playerReload, resolvedParams.id, mediaType, progressSeason, progressEpisode, removeProgress, flushPlaybackProgress]);

  const routeIdentity = `${pathname}?${searchParams.toString()}`;
  useEffect(() => () => flushPlaybackProgress('client-side route change or unmount'), [routeIdentity, flushPlaybackProgress]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const season = searchParams.get('season') || '1';
        const failed = Promise.resolve(null);
        // Request everything at once; each response is handled below as before
        const [showResponse, episodesResponse, recommendationsResponse, creditsResponse] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/${resolvedParams.type}/${resolvedParams.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
          ),
          resolvedParams.type === 'tv'
            ? fetch(
                `https://api.themoviedb.org/3/tv/${resolvedParams.id}/season/${season}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
              ).catch(() => failed)
            : failed,
          fetch(
            `https://api.themoviedb.org/3/${resolvedParams.type}/${resolvedParams.id}/recommendations?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
          ).catch(() => failed),
          fetch(
            `https://api.themoviedb.org/3/${resolvedParams.type}/${resolvedParams.id}/credits?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
          ).catch(() => failed),
        ]);

        if (!showResponse.ok) {
          throw new Error('Failed to fetch show details');
        }

        const showData = await showResponse.json();
        setShow(showData);

        // If it's a TV show, use the episodes
        if (episodesResponse?.ok) {
          const episodesData = await episodesResponse.json();
          setEpisodes(episodesData.episodes);
          setSelectedSeason(Number(season));
        }

        if (recommendationsResponse?.ok) {
          const recommendationsData = await recommendationsResponse.json();
          const results = (recommendationsData.results || []) as RecommendedShow[];
          setRecommendations(results.filter((item) => item.poster_path));
        }

        if (creditsResponse?.ok) {
          const creditsData = await creditsResponse.json();
          setCast(creditsData.cast || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.id, resolvedParams.type, searchParams]);

  // Fetch episodes when season changes
  useEffect(() => {
    if (resolvedParams.type === 'tv' && show) {
      const fetchEpisodes = async () => {
        try {
          const episodesResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${resolvedParams.id}/season/${selectedSeason}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
          );
          
          if (episodesResponse.ok) {
            const episodesData = await episodesResponse.json();
            setEpisodes(episodesData.episodes || []);
          }
        } catch (error) {
          console.error('Error fetching episodes:', error);
        }
      };

      fetchEpisodes();
    }
  }, [selectedSeason, resolvedParams.id, resolvedParams.type, show]);

  // Update page title when show or episode changes
  useEffect(() => {
    if (show) {
      const title = show.title || show.name || 'Watch';
      const episode = searchParams.get('episode');
      const season = searchParams.get('season');
      if (episode && season) {
        document.title = `${title} - S${season}E${episode} | Tinywatch`;
      } else {
        document.title = `${title} | Tinywatch`;
      }
    }
  }, [show, searchParams]);

  // Handle source change
  const handleSourceChange = (sourceId: string) => {
    setSelectedSource(sourceId);
    setShowPlayer(true);
  };

  const handleStartOver = () => {
    if (savedProgress) removeProgress(savedProgress);
    latestPlaybackRef.current = null;
    lastProgressSaveAtRef.current = 0;
    finishedProgressKeyRef.current = null;
    setResumeStart({ key: progressKey, seconds: 0 });
    setPlayerReload((current) => current + 1);
  };

  // Get current source URL
  const getCurrentSource = () => {
    return playbackSources.find(s => s.id === selectedSource) || playbackSources[0];
  };

  const getCurrentSourceUrl = () => {
    const source = getCurrentSource();
    if (source.id !== 'cinesrc' || startSeconds === null || startSeconds <= 0) return source.url;
    const separator = source.url.includes('?') ? '&' : '?';
    return `${source.url}${separator}time=${Math.round(startSeconds)}`;
  };
  const finalIframeSrc = getCurrentSourceUrl();

  useEffect(() => {
    if (!showPlayer || !progressReady || startSeconds === null) return;
    logWatchPlayer('final iframe src', {
      src: finalIframeSrc,
      source: selectedSource,
      progressKey,
      startSeconds,
    });
  }, [showPlayer, progressReady, startSeconds, selectedSource, progressKey, playerReload, finalIframeSrc]);

  //NAVIGATION LOGIC
  // Next Episode Logic
  let nextEpisodeUrl = '';
  if (resolvedParams.type === 'tv' && show) {
    const hasNextInSeason = episodes.some(ep => ep.episode_number === currentEpisode + 1);
    const hasNextSeason = (show.number_of_seasons || 0) > currentSeason;

    if (hasNextInSeason) {
      nextEpisodeUrl = `/watch/${resolvedParams.type}/${resolvedParams.id}?season=${currentSeason}&episode=${currentEpisode + 1}`;
    } else if (hasNextSeason) {
      nextEpisodeUrl = `/watch/${resolvedParams.type}/${resolvedParams.id}?season=${currentSeason + 1}&episode=1`;
    }
  }

  // Previous Episode Logic
  let prevEpisodeUrl = '';
  if (resolvedParams.type === 'tv' && show) {
    // Only support going back to previous episode in the SAME season for simplicity
    if (currentEpisode > 1) {
      prevEpisodeUrl = `/watch/${resolvedParams.type}/${resolvedParams.id}?season=${currentSeason}&episode=${currentEpisode - 1}`;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full max-w-5xl mx-auto pt-28 pb-8 px-4">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40">
            <div className="absolute inset-0 bg-gradient-to-t from-orange-700/40 via-black to-yellow-600/40" />
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto px-4 pb-2">
          <div className="flex flex-col md:flex-row gap-8 animate-pulse">
            <div className="w-48 h-72 rounded-xl flex-shrink-0 bg-gradient-to-b from-orange-700/50 via-gray-900 to-yellow-600/50" />
            <div className="flex-1 space-y-4 mt-2">
              <div className="h-8 rounded-full w-2/3 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
              <div className="space-y-2">
                <div className="h-3 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                <div className="h-3 rounded-full w-5/6 bg-gradient-to-r from-orange-500/50 to-yellow-400/50" />
                <div className="h-3 rounded-full w-4/6 bg-gradient-to-r from-orange-500/40 to-yellow-400/40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Show not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <style jsx global>{`
        /* Custom scrollbar styling */
        .scrollbar-hide::-webkit-scrollbar {
          height: 8px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-track {
          background: #000;
          border-radius: 4px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #0ea5e9, #14b8a6);
          border-radius: 4px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to right, #0284c7, #0d9488);
        }
      `}</style>

      {/* Video Player */}
      <div className="mx-auto grid w-full max-w-[1408px] grid-cols-1 gap-4 px-4 pt-28 pb-8 lg:grid-cols-[160px_minmax(0,1fr)_160px]">
        <div className="row-start-1 w-full max-w-5xl justify-self-center lg:col-start-2 lg:row-start-1 lg:max-w-none">
        {showPlayer ? (
          <>
            <div className="relative w-full aspect-video bg-gray-900 rounded-lg shadow-2xl">
              {progressReady && startSeconds !== null ? (
                <iframe
                  key={`${selectedSource}-${getCurrentSourceUrl()}-${playerReload}`}
                  ref={iframeRef}
                  src={getCurrentSourceUrl()}
                  title={`${show.title || show.name || 'Video'} player`}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer *; autoplay *; clipboard-write *; encrypted-media *; fullscreen *; gyroscope *; picture-in-picture *; web-share *"
                  style={{ border: 'none' }}
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox={['vidstuck', 'vidy', 'videasy', 'vidcore'].includes(getCurrentSource().id) ? undefined : PLAYER_SANDBOX}
                  {...fullscreenIframeProps}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Preparing your player…
                </div>
              )}
            </div>
            {selectedSource === 'cinesrc' && savedProgress && startSeconds !== null && startSeconds > 0 && (
              <button
                type="button"
                onClick={handleStartOver}
                className="mt-2 text-sm text-gray-400 underline decoration-gray-600 underline-offset-2 transition-colors hover:text-yellow-300"
              >
                Start over
              </button>
            )}
          </>
        ) : (
          <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">{show.title || show.name}</h1>
              {searchParams.get('episode') && (
                <h2 className="text-2xl mb-4">
                  Season {searchParams.get('season')} • Episode {searchParams.get('episode')}
                </h2>
              )}
              <div className="mt-6">
                <h3 className="text-xl mb-4">Select a playback source:</h3>
                
                <div className="flex flex-col items-center gap-6">
                  {/* Source Buttons */}
                  <div className="flex flex-wrap justify-center gap-3">
                    {playbackSources.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => handleSourceChange(source.id)}
                        disabled={source.disabled}
                        className={`px-4 py-2 rounded-full text-white font-semibold transition-opacity ${
                          source.disabled
                            ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                            : source.id === 'cinesrc'
                              ? 'bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600 ring-2 ring-orange-400 ring-offset-2 ring-offset-black hover:opacity-90' 
                              : 'bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90'
                        }`}
                      >
                        {source.name}
                        {source.id === 'cinesrc' && (
                          <span className="ml-1 text-xs bg-orange-400 text-black px-1.5 py-0.5 rounded-full">★</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Navigation Buttons for Placeholder */}
                  <div className="flex gap-4">
                    {prevEpisodeUrl && (
                      <Link
                        href={prevEpisodeUrl}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white rounded-full font-semibold transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>Prev</span>
                      </Link>
                    )}
                    {nextEpisodeUrl && (
                      <Link
                        href={nextEpisodeUrl}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white rounded-full font-semibold transition-opacity"
                      >
                        <span>Next</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
        </div>
        <AdsterraSidebar placement="left" />
        <AdsterraSidebar placement="right" />
      </div>
      {/* Current Episode Display (when player is active) */}
      {showPlayer && resolvedParams.type === 'tv' && (
        <div className="w-full max-w-5xl mx-auto px-4 pb-2">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-900/80 backdrop-blur-sm rounded-full border border-gray-700/50">
              <span className="text-white font-semibold text-lg">
                {show.title || show.name}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-orange-400 font-bold text-lg">
                Season {currentSeason} • Episode {currentEpisode}
              </span>
              {episodes.find(ep => ep.episode_number === currentEpisode) && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300 text-sm">
                    {episodes.find(ep => ep.episode_number === currentEpisode)?.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Source Selector & Navigation (when player is active) */}
      {showPlayer && (
        <div className="bg-gray-900 p-4">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl">
            
            {/* Previous Episode Button (Left Side) */}
            <div className="flex-shrink-0 w-full md:w-auto flex justify-center md:justify-start">
              {prevEpisodeUrl ? (
                <Link
                  href={prevEpisodeUrl}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white rounded-full font-semibold transition-opacity group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  <span>Prev</span>
                </Link>
              ) : (
                // Invisible spacer to maintain center alignment of sources when Prev is missing
                <div className="hidden md:block w-[100px]" />
              )}
            </div>

            {/* Source Buttons (Center) */}
            <div className="flex flex-wrap gap-3 justify-center flex-1">
              {playbackSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceChange(source.id)}
                  disabled={source.disabled}
                  className={`px-4 py-2 rounded-full text-white font-semibold transition-all ${
                    source.disabled
                      ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                      : selectedSource === source.id
                        ? source.id === 'cinesrc'
                          ? 'bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600 ring-2 ring-orange-400 ring-offset-2 ring-offset-black'
                          : 'bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600'
                        : source.id === 'cinesrc'
                          ? 'bg-gray-800 hover:bg-gray-700 ring-1 ring-orange-400/50'
                          : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {source.name}
                  {source.id === 'cinesrc' && (
                    <span className="ml-1 text-xs bg-orange-400 text-black px-1.5 py-0.5 rounded-full">★</span>
                  )}
                </button>
              ))}
            </div>

            {/* Next Episode Button (Right Side) */}
            <div className="flex-shrink-0 w-full md:w-auto flex justify-center md:justify-end">
              {nextEpisodeUrl ? (
                <Link
                  href={nextEpisodeUrl}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white rounded-full font-semibold transition-opacity group"
                >
                  <span>Next</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              ) : (
                // Invisible spacer
                <div className="hidden md:block w-[100px]" />
              )}
            </div>

          </div>
        </div>
      )}

      {/* Show Info */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Poster */}
          <div className="w-48 h-72 relative flex-shrink-0 rounded-xl overflow-hidden group hover:scale-105 transition-transform duration-300">
            <Image
              src={getImageUrl(show.poster_path)}
              alt={show.title || show.name || ''}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <WatchlistToggle
              item={{
                id: show.id,
                media_type: resolvedParams.type === 'movie' ? 'movie' : 'tv',
                title: show.title,
                name: show.name,
                overview: show.overview,
                poster_path: show.poster_path,
                backdrop_path: show.backdrop_path,
              }}
              size="sm"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">
              {show.title || show.name}
            </h1>
            <p className="text-gray-300">{show.overview}</p>
          </div>
        </div>

        {/* Cast Section */}
        {cast.length > 0 && (
          <CastView cast={cast} />
        )}

        {/* Episodes (for TV shows) */}
        {resolvedParams.type === 'tv' && episodes.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">
                Episodes
              </h2>
              <select
                value={selectedSeason}
                onChange={(e) => {
                  const newSeason = Number(e.target.value);
                  setSelectedSeason(newSeason);
                  // Update URL without reloading
                  const url = new URL(window.location.href);
                  url.searchParams.set('season', newSeason.toString());
                  window.history.pushState({}, '', url.toString());
                }}
                className="bg-gray-800/50 text-white px-4 py-2 rounded-full border border-gray-700 focus:outline-none focus:border-gray-500 transition-colors"
              >
                {Array.from({ length: show.number_of_seasons || 1 }, (_, i) => i + 1).map(
                  (season) => (
                    <option key={season} value={season}>
                      Season {season}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {episodes.map((episode) => {
                const isCurrentEpisode = episode.episode_number === currentEpisode && selectedSeason === currentSeason;
                return (
                  <div
                    key={episode.id}
                    className={`rounded-xl overflow-hidden transition-all duration-300 transform ${
                      isCurrentEpisode
                        ? 'bg-gradient-to-br from-orange-900/40 to-yellow-900/40 border-2 border-orange-500/50'
                        : 'bg-gray-800/50 hover:bg-gray-800/80 hover:scale-105 group'
                    }`}
                  >
                    <div className="relative h-40">
                      <Image
                        src={getImageUrl(episode.still_path)}
                        alt={episode.name}
                        fill
                        className="object-cover"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent ${
                        isCurrentEpisode ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'
                      } transition-opacity`} />
                      {isCurrentEpisode && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-600 to-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          Currently Watching
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Episode {episode.episode_number}</h3>
                        <span className="text-sm text-gray-400">{episode.air_date}</span>
                      </div>
                      <h4 className="text-lg font-bold mb-2">{episode.name}</h4>
                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                        {episode.overview}
                      </p>
                      {isCurrentEpisode ? (
                        <button
                          disabled
                          className="inline-block w-full text-center px-4 py-2 bg-gray-700/50 text-gray-400 rounded-full font-semibold cursor-not-allowed"
                        >
                          Currently Watching
                        </button>
                      ) : (
                        <Link
                          href={`/watch/${resolvedParams.type}/${resolvedParams.id}?season=${selectedSeason}&episode=${episode.episode_number}`}
                          className="inline-block w-full text-center px-4 py-2 bg-gradient-orange-yellow bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full font-semibold hover:opacity-90 transition-opacity"
                        >
                          Watch Episode
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Disqus Comments */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Comments</h2>
          <DiscussionEmbed
            shortname="tinybros"
            config={{
              url: `https://tinywatch.co.uk/watch/${resolvedParams.type}/${resolvedParams.id}${resolvedParams.type === 'tv' ? `?season=${searchParams.get('season') || '1'}&episode=${searchParams.get('episode') || '1'}` : ''}`,
              identifier: `${resolvedParams.type}-${resolvedParams.id}${resolvedParams.type === 'tv' ? `-s${searchParams.get('season') || '1'}-e${searchParams.get('episode') || '1'}` : ''}`,
              title: show.title || show.name,
              language: 'en'
            }}
          />
        </div>

        {/* Recommended Section */}
        {recommendations.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500">
              Recommended
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-gray-800/50 rounded-xl overflow-hidden hover:bg-gray-800/80 transition-all duration-300 transform hover:scale-105 group"
                >
                  <Link href={`/watch/${resolvedParams.type}/${rec.id}`}>
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={getImageUrl(rec.poster_path)}
                        alt={rec.title || rec.name || ''}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <h3 className="text-sm sm:text-base font-semibold mb-1">
                          {rec.title || rec.name}
                        </h3>
                        {rec.overview && (
                          <p className="text-xs sm:text-sm text-gray-300 line-clamp-2">
                            {rec.overview}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
