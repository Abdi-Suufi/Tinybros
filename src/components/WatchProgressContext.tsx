'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWatchlist } from '@/components/WatchlistContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type ProgressMediaType = 'movie' | 'tv';

export interface WatchProgress {
  tmdb_id: number;
  media_type: ProgressMediaType;
  season: number | null;
  episode: number | null;
  position_seconds: number;
  duration_seconds: number;
  updated_at: string;
}

interface LocalProgressState {
  records: Array<WatchProgress & { user_id: string | null }>;
  deleted: Array<{
    user_id: string;
    tmdb_id: number;
    media_type: ProgressMediaType;
    season: number | null;
    episode: number | null;
  }>;
}

interface WatchProgressContextValue {
  records: WatchProgress[];
  ready: boolean;
  getProgress: (id: number, mediaType: ProgressMediaType, season?: number | null, episode?: number | null) => WatchProgress | undefined;
  saveProgress: (progress: WatchProgress) => void;
  removeProgress: (progress: WatchProgress) => void;
}

const WatchProgressContext = createContext<WatchProgressContextValue | undefined>(undefined);
const STORAGE_KEY = 'tinywatch_watch_progress_v1';
const MAX_SECONDS = 86_400;

function logProgress(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[watch-progress] ${event}`, details);
  }
}

function getProgressKey(progress: Pick<WatchProgress, 'tmdb_id' | 'media_type' | 'season' | 'episode'>) {
  return `${progress.media_type}:${progress.tmdb_id}:${progress.season ?? 0}:${progress.episode ?? 0}`;
}

function toDatabaseProgress(progress: WatchProgress) {
  return {
    ...progress,
    season: progress.season ?? 0,
    episode: progress.episode ?? 0,
  };
}

function fromDatabaseProgress(progress: WatchProgress): WatchProgress {
  return progress.media_type === 'movie'
    ? { ...progress, season: null, episode: null }
    : progress;
}

function localRecordToProgress(record: WatchProgress & { user_id: string | null }): WatchProgress {
  return {
    tmdb_id: record.tmdb_id,
    media_type: record.media_type,
    season: record.season,
    episode: record.episode,
    position_seconds: record.position_seconds,
    duration_seconds: record.duration_seconds,
    updated_at: record.updated_at,
  };
}

function validProgress(value: unknown): value is WatchProgress {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<WatchProgress>;
  return Number.isInteger(progress.tmdb_id) &&
    (progress.media_type === 'movie' || progress.media_type === 'tv') &&
    (progress.season === null || Number.isInteger(progress.season)) &&
    (progress.episode === null || Number.isInteger(progress.episode)) &&
    typeof progress.position_seconds === 'number' &&
    Number.isFinite(progress.position_seconds) &&
    progress.position_seconds > 0 &&
    progress.position_seconds <= MAX_SECONDS &&
    typeof progress.duration_seconds === 'number' &&
    Number.isFinite(progress.duration_seconds) &&
    progress.duration_seconds > 0 &&
    progress.duration_seconds <= MAX_SECONDS &&
    typeof progress.updated_at === 'string';
}

function readLocalState(): LocalProgressState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { records: [], deleted: [] };
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') return { records: [], deleted: [] };
  const state = parsed as Partial<LocalProgressState>;
  const records = Array.isArray(state.records)
    ? state.records.filter((item): item is WatchProgress & { user_id: string | null } =>
        validProgress(item) && (item.user_id === null || typeof item.user_id === 'string'))
    : [];
  const deleted = Array.isArray(state.deleted)
    ? state.deleted.filter((item) =>
        item && typeof item.user_id === 'string' &&
        Number.isInteger(item.tmdb_id) &&
        (item.media_type === 'movie' || item.media_type === 'tv') &&
        (item.season === null || Number.isInteger(item.season)) &&
        (item.episode === null || Number.isInteger(item.episode)))
    : [];
  return { records, deleted };
}

function mergeNewest(...lists: WatchProgress[][]): WatchProgress[] {
  const newest = new Map<string, WatchProgress>();
  for (const progress of lists.flat()) {
    const key = getProgressKey(progress);
    const current = newest.get(key);
    if (!current || Date.parse(progress.updated_at) > Date.parse(current.updated_at)) {
      newest.set(key, progress);
    }
  }
  return [...newest.values()].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}

export function WatchProgressProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useWatchlist();
  const [records, setRecords] = useState<WatchProgress[]>([]);
  const [ready, setReady] = useState(false);
  const recordsRef = useRef<WatchProgress[]>([]);
  const localStateRef = useRef<LocalProgressState>({ records: [], deleted: [] });
  const userIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const retryTimersRef = useRef(new Map<string, number>());

  const updateRecords = useCallback((next: WatchProgress[]) => {
    const sorted = mergeNewest(next);
    recordsRef.current = sorted;
    setRecords(sorted);
  }, []);

  const persistLocal = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localStateRef.current));
      logProgress('localStorage write', {
        result: 'success',
        records: localStateRef.current.records.length,
        deleted: localStateRef.current.deleted.length,
      });
      return true;
    } catch (error) {
      logProgress('localStorage write', { result: 'failure', error });
      console.error('Failed to persist watch progress locally', error);
      return false;
    }
  }, []);

  const removeLocalRecord = useCallback((progress: WatchProgress, userId: string | null) => {
    localStateRef.current.records = localStateRef.current.records.filter((item) =>
      !(getProgressKey(item) === getProgressKey(progress) &&
        item.user_id === userId &&
        item.updated_at === progress.updated_at)
    );
    persistLocal();
  }, [persistLocal]);

  const syncRecord = useCallback((progress: WatchProgress, userId: string, localOwner: string | null = userId) => {
    const client = createSupabaseBrowserClient();
    const key = getProgressKey(progress);
    if (!client) {
      logProgress('Supabase save attempt', { key, result: 'skipped', reason: 'client unavailable' });
      return;
    }
    const timerKey = `${userId}:${key}`;
    const existingTimer = retryTimersRef.current.get(timerKey);
    if (existingTimer) window.clearTimeout(existingTimer);

    const attempt = async () => {
      retryTimersRef.current.delete(timerKey);
      logProgress('Supabase save attempt', {
        key,
        position: progress.position_seconds,
        duration: progress.duration_seconds,
        destination: 'Supabase',
      });
      const { error } = await client.from('watch_progress').upsert(
        { ...toDatabaseProgress(progress), user_id: userId },
        { onConflict: 'user_id,tmdb_id,media_type,season,episode' }
      );
      if (error) {
        logProgress('Supabase save result', { key, result: 'failure', error });
        console.error('Failed to sync watch progress; it will be retried', error);
        const timer = window.setTimeout(() => void attempt(), 30_000);
        retryTimersRef.current.set(timerKey, timer);
        return;
      }
      logProgress('Supabase save result', { key, result: 'success' });
      removeLocalRecord(progress, localOwner);
    };

    const timer = window.setTimeout(() => void attempt(), 1200);
    retryTimersRef.current.set(timerKey, timer);
  }, [removeLocalRecord]);

  const syncDelete = useCallback((deleted: LocalProgressState['deleted'][number]) => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const key = `${deleted.user_id}:${getProgressKey(deleted)}`;
    const existingTimer = retryTimersRef.current.get(key);
    if (existingTimer) window.clearTimeout(existingTimer);
    retryTimersRef.current.delete(key);
    const attempt = async () => {
      retryTimersRef.current.delete(key);
      const { error } = await client
        .from('watch_progress')
        .delete()
        .eq('user_id', deleted.user_id)
        .eq('tmdb_id', deleted.tmdb_id)
        .eq('media_type', deleted.media_type)
        .eq('season', deleted.season ?? 0)
        .eq('episode', deleted.episode ?? 0);
      if (error) {
        console.error('Failed to remove synced watch progress; it will be retried', error);
        const timer = window.setTimeout(() => void attempt(), 30_000);
        retryTimersRef.current.set(key, timer);
        return;
      }
      localStateRef.current.deleted = localStateRef.current.deleted.filter(
        (entry) => `${entry.user_id}:${getProgressKey(entry)}` !== key
      );
      persistLocal();
    };
    void attempt();
  }, [persistLocal]);

  useEffect(() => {
    if (!authReady) return;
    const requestId = ++requestIdRef.current;
    userIdRef.current = user?.id ?? null;
    setReady(false);

    try {
      localStateRef.current = readLocalState();
      logProgress('progress load', {
        destination: 'localStorage',
        result: 'success',
        records: localStateRef.current.records.length,
        userId: user?.id ?? null,
      });
    } catch (error) {
      logProgress('progress load', { destination: 'localStorage', result: 'failure', error });
      console.error('Failed to load local watch progress', error);
      localStateRef.current = { records: [], deleted: [] };
    }

    const localRecords = localStateRef.current.records.filter(
      (item) => item.user_id === null || item.user_id === user?.id
    );
    const localProgress = localRecords.map(localRecordToProgress);

    const load = async () => {
      if (!user) {
        updateRecords(localProgress);
        setReady(true);
        return;
      }

      const client = createSupabaseBrowserClient();
      if (!client) {
        logProgress('progress load', {
          destination: 'localStorage',
          result: 'success',
          reason: 'Supabase client unavailable',
        });
        updateRecords(localProgress);
        setReady(true);
        return;
      }

      logProgress('progress load', { destination: 'Supabase', result: 'started', userId: user.id });
      const { data, error } = await client
        .from('watch_progress')
        .select('tmdb_id, media_type, season, episode, position_seconds, duration_seconds, updated_at')
        .order('updated_at', { ascending: false });
      if (requestId !== requestIdRef.current) return;
      if (error) {
        logProgress('progress load', { destination: 'Supabase', result: 'failure', error });
        console.error('Failed to load account watch progress; using the local copy', error);
        updateRecords(localProgress);
        setReady(true);
        return;
      }

      const pendingDeletes = localStateRef.current.deleted.filter((item) => item.user_id === user.id);
      const deletedKeys = new Set(pendingDeletes.map(getProgressKey));
      const remote = ((data ?? []) as WatchProgress[])
        .map(fromDatabaseProgress)
        .filter((entry) => validProgress(entry) && !deletedKeys.has(getProgressKey(entry)));
      logProgress('progress load', {
        destination: 'Supabase',
        result: 'success',
        records: remote.length,
        userId: user.id,
      });
      const merged = mergeNewest(remote, localProgress);
      const remoteByKey = new Map(remote.map((entry) => [getProgressKey(entry), entry]));
      const pendingRecords = localRecords.filter((entry) => {
        const remoteEntry = remoteByKey.get(getProgressKey(entry));
        return !remoteEntry || Date.parse(entry.updated_at) > Date.parse(remoteEntry.updated_at);
      });
      const guestRecords = localRecords.filter((entry) => entry.user_id === null);
      let localMergeSucceeded = pendingRecords.length === 0;

      for (const deleted of pendingDeletes) syncDelete(deleted);

      if (pendingRecords.length) {
        const rows = pendingRecords.map((entry) => ({
          ...toDatabaseProgress(localRecordToProgress(entry)),
          user_id: user.id,
        }));
        const { error: mergeError } = await client
          .from('watch_progress')
          .upsert(rows, { onConflict: 'user_id,tmdb_id,media_type,season,episode' });
        if (requestId !== requestIdRef.current) return;
        if (mergeError) {
          logProgress('guest progress merge', { result: 'failure', records: pendingRecords.length, error: mergeError });
          console.error('Failed to merge local watch progress; it will be retried', mergeError);
        } else {
          logProgress('guest progress merge', { result: 'success', records: pendingRecords.length });
          localMergeSucceeded = true;
          for (const pending of pendingRecords) {
            removeLocalRecord(pending, pending.user_id);
          }
        }
      }
      if (guestRecords.length && localMergeSucceeded) {
        localStateRef.current.records = localStateRef.current.records.filter(
          (entry) => entry.user_id !== null || !guestRecords.some((guest) =>
            getProgressKey(guest) === getProgressKey(entry))
        );
        persistLocal();
      }
      updateRecords(merged);
      setReady(true);
    };

    void load();
  }, [authReady, user, updateRecords, syncDelete, removeLocalRecord, persistLocal]);

  useEffect(() => {
    const retry = () => {
      const userId = userIdRef.current;
      if (!userId) return;
      for (const deleted of localStateRef.current.deleted) {
        if (deleted.user_id === userId) syncDelete(deleted);
      }
      for (const entry of localStateRef.current.records) {
        if (entry.user_id === userId || entry.user_id === null) {
          syncRecord(localRecordToProgress(entry), userId, entry.user_id);
        }
      }
    };
    window.addEventListener('online', retry);
    const interval = window.setInterval(retry, 60_000);
    const timers = retryTimersRef.current;
    return () => {
      window.removeEventListener('online', retry);
      window.clearInterval(interval);
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, [syncDelete, syncRecord]);

  const getProgress = useCallback(
    (id: number, mediaType: ProgressMediaType, season: number | null = null, episode: number | null = null) =>
      records.find((item) =>
        item.tmdb_id === id &&
        item.media_type === mediaType &&
        (item.season ?? null) === season &&
        (item.episode ?? null) === episode
      ),
    [records]
  );

  const saveProgress = useCallback((progress: WatchProgress) => {
    const normalized = {
      ...progress,
      season: progress.media_type === 'tv' ? progress.season : null,
      episode: progress.media_type === 'tv' ? progress.episode : null,
    };
    const userId = userIdRef.current;
    const localRecord = { ...normalized, user_id: userId };
    const timerKey = userId ? `${userId}:${getProgressKey(normalized)}` : null;
    if (timerKey) {
      const timer = retryTimersRef.current.get(timerKey);
      if (timer) window.clearTimeout(timer);
      retryTimersRef.current.delete(timerKey);
    }
    localStateRef.current.records = [
      localRecord,
      ...localStateRef.current.records.filter((entry) =>
        !(getProgressKey(entry) === getProgressKey(normalized) && entry.user_id === userId)
      ),
    ];
    localStateRef.current.deleted = localStateRef.current.deleted.filter(
      (entry) => !(entry.user_id === userId && getProgressKey(entry) === getProgressKey(normalized))
    );
    const localWriteSucceeded = persistLocal();
    logProgress('save attempt', {
      key: getProgressKey(normalized),
      position: normalized.position_seconds,
      duration: normalized.duration_seconds,
      destination: userId ? 'localStorage + Supabase' : 'localStorage',
      result: localWriteSucceeded ? 'localStorage persisted' : 'localStorage write failed',
    });
    updateRecords([normalized, ...recordsRef.current]);
    if (userId) syncRecord(normalized, userId);
  }, [persistLocal, syncRecord, updateRecords]);

  const removeProgress = useCallback((progress: WatchProgress) => {
    const userId = userIdRef.current;
    updateRecords(recordsRef.current.filter((entry) => getProgressKey(entry) !== getProgressKey(progress)));
    localStateRef.current.records = localStateRef.current.records.filter(
      (entry) => getProgressKey(entry) !== getProgressKey(progress)
    );
    if (userId) {
      const timerKey = `${userId}:${getProgressKey(progress)}`;
      const timer = retryTimersRef.current.get(timerKey);
      if (timer) window.clearTimeout(timer);
      retryTimersRef.current.delete(timerKey);
      const deleted = {
        user_id: userId,
        tmdb_id: progress.tmdb_id,
        media_type: progress.media_type,
        season: progress.season,
        episode: progress.episode,
      };
      localStateRef.current.deleted = [
        deleted,
        ...localStateRef.current.deleted.filter((entry) =>
          !(entry.user_id === userId && getProgressKey(entry) === getProgressKey(progress))
        ),
      ];
    }
    persistLocal();
    if (userId) {
      const deleted = localStateRef.current.deleted.find(
        (entry) => entry.user_id === userId && getProgressKey(entry) === getProgressKey(progress)
      );
      if (deleted) syncDelete(deleted);
    }
  }, [persistLocal, syncDelete, updateRecords]);

  const value = useMemo(
    () => ({ records, ready, getProgress, saveProgress, removeProgress }),
    [records, ready, getProgress, saveProgress, removeProgress]
  );

  return <WatchProgressContext.Provider value={value}>{children}</WatchProgressContext.Provider>;
}

export function useWatchProgress() {
  const context = useContext(WatchProgressContext);
  if (!context) throw new Error('useWatchProgress must be used within a WatchProgressProvider');
  return context;
}
