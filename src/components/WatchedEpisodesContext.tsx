'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useWatchlist } from '@/components/WatchlistContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Remembers which episodes the viewer has finished. Signed out, the list lives in
 * localStorage; signed in, it syncs to the `watched_episodes` table (see
 * supabase/watched_episodes.sql), and the device's list is merged in on first sign-in.
 */

interface WatchedEpisodesContextValue {
  isWatched: (tmdbId: number, season: number, episode: number) => boolean;
  setWatched: (tmdbId: number, season: number, episode: number, watched: boolean) => void;
}

interface LocalState {
  guest: string[];
  users: Record<string, string[]>;
}

interface WatchedRow {
  tmdb_id: number;
  season: number;
  episode: number;
}

const STORAGE_KEY = 'tinywatch_watched_episodes_v1';
const KEY_PATTERN = /^\d+:\d+:\d+$/;

const WatchedEpisodesContext = createContext<WatchedEpisodesContextValue | null>(null);

const episodeKey = (tmdbId: number, season: number, episode: number) => `${tmdbId}:${season}:${episode}`;

function keyToRow(key: string): WatchedRow {
  const [tmdb_id, season, episode] = key.split(':').map(Number);
  return { tmdb_id, season, episode };
}

function readLocal(): LocalState {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return { guest: [], users: {} };
    const state = parsed as Partial<LocalState>;
    const clean = (list: unknown) =>
      Array.isArray(list) ? list.filter((key): key is string => typeof key === 'string' && KEY_PATTERN.test(key)) : [];
    const users: Record<string, string[]> = {};
    if (state.users && typeof state.users === 'object') {
      for (const [id, list] of Object.entries(state.users)) users[id] = clean(list);
    }
    return { guest: clean(state.guest), users };
  } catch {
    return { guest: [], users: {} };
  }
}

function writeLocal(state: LocalState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); ticks still show for this visit
  }
}

export function WatchedEpisodesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useWatchlist();
  const userId = user?.id ?? null;
  const [watched, setWatchedKeys] = useState<Set<string>>(() => new Set());
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const saveLocalList = useCallback((owner: string | null, keys: Set<string>) => {
    const state = readLocal();
    if (owner) state.users[owner] = [...keys];
    else state.guest = [...keys];
    writeLocal(state);
  }, []);

  // Load the list for whoever is signed in (or the guest list when signed out)
  useEffect(() => {
    const local = readLocal();
    if (!userId) {
      setWatchedKeys(new Set(local.guest));
      return;
    }

    // Show the cached copy straight away, then reconcile with the account
    setWatchedKeys(new Set([...(local.users[userId] ?? []), ...local.guest]));
    const client = createSupabaseBrowserClient();
    if (!client) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await client.from('watched_episodes').select('tmdb_id, season, episode');
      if (cancelled) return;
      if (error) {
        console.warn('Could not load watched episodes from account; using this device’s copy', error);
        return;
      }

      const remote = new Set((data as WatchedRow[]).map((row) => episodeKey(row.tmdb_id, row.season, row.episode)));
      const fromDevice = readLocal().guest.filter((key) => !remote.has(key));
      if (fromDevice.length > 0) {
        const { error: upsertError } = await client
          .from('watched_episodes')
          .upsert(fromDevice.map(keyToRow), { onConflict: 'user_id,tmdb_id,season,episode', ignoreDuplicates: true });
        if (upsertError) console.warn('Could not merge this device’s watched episodes into the account', upsertError);
      }
      if (cancelled) return;

      const merged = new Set([...remote, ...fromDevice]);
      const state = readLocal();
      state.users[userId] = [...merged];
      // The device's list now belongs to the account
      state.guest = [];
      writeLocal(state);
      setWatchedKeys(merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isWatched = useCallback(
    (tmdbId: number, season: number, episode: number) => watched.has(episodeKey(tmdbId, season, episode)),
    [watched]
  );

  const setWatched = useCallback(
    (tmdbId: number, season: number, episode: number, isNowWatched: boolean) => {
      const key = episodeKey(tmdbId, season, episode);
      const owner = userIdRef.current;
      setWatchedKeys((current) => {
        if (current.has(key) === isNowWatched) return current;
        const next = new Set(current);
        if (isNowWatched) next.add(key);
        else next.delete(key);
        saveLocalList(owner, next);
        return next;
      });

      if (!owner) return;
      const client = createSupabaseBrowserClient();
      if (!client) return;
      const request = isNowWatched
        ? client
            .from('watched_episodes')
            .upsert({ ...keyToRow(key), watched_at: new Date().toISOString() }, { onConflict: 'user_id,tmdb_id,season,episode' })
        : client.from('watched_episodes').delete().match(keyToRow(key));
      void request.then(({ error }) => {
        if (error) console.warn('Could not save watched episode to account', error);
      });
    },
    [saveLocalList]
  );

  const value = useMemo(() => ({ isWatched, setWatched }), [isWatched, setWatched]);

  return <WatchedEpisodesContext.Provider value={value}>{children}</WatchedEpisodesContext.Provider>;
}

/** Used if the provider is missing (e.g. a hot reload swapped modules): no ticks, but no crash. */
const FALLBACK: WatchedEpisodesContextValue = {
  isWatched: () => false,
  setWatched: () => {
    console.warn('Watched episodes are unavailable: WatchedEpisodesProvider is missing');
  },
};

export function useWatchedEpisodes() {
  return useContext(WatchedEpisodesContext) ?? FALLBACK;
}
