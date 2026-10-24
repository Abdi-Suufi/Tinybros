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
import type { User } from '@supabase/supabase-js';
import type { TMDBShow } from '@/lib/tmdb';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type WatchlistItem = Pick<
  TMDBShow,
  'id' | 'title' | 'name' | 'overview' | 'poster_path' | 'backdrop_path' | 'media_type'
>;

interface WatchlistContextValue {
  items: WatchlistItem[];
  user: User | null;
  authReady: boolean;
  authAvailable: boolean;
  syncMessage: string | null;
  toggleItem: (item: WatchlistItem) => void;
  isSaved: (id: number, mediaType: WatchlistItem['media_type']) => boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; confirmationRequired: boolean }>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
}

const WatchlistContext = createContext<WatchlistContextValue | undefined>(undefined);

const STORAGE_KEY = 'tinywatch_watchlist_v1';

interface WatchlistRow {
  tmdb_id: number;
  media_type: WatchlistItem['media_type'];
  title: string | null;
  name: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
}

function getItemKey(item: Pick<WatchlistItem, 'id' | 'media_type'>) {
  return `${item.media_type}:${item.id}`;
}

function validItems(value: unknown): WatchlistItem[] {
  if (!Array.isArray(value)) return [];

  return mergeItems(
    value.filter(
      (item): item is WatchlistItem =>
        typeof item?.id === 'number' &&
        (item.media_type === 'movie' || item.media_type === 'tv') &&
        typeof item.poster_path === 'string'
    )
  );
}

function itemToRow(item: WatchlistItem): WatchlistRow {
  return {
    tmdb_id: item.id,
    media_type: item.media_type,
    title: item.title ?? null,
    name: item.name ?? null,
    overview: item.overview ?? null,
    poster_path: item.poster_path ?? null,
    backdrop_path: item.backdrop_path ?? null,
  };
}

function rowToItem(row: WatchlistRow): WatchlistItem {
  return {
    id: Number(row.tmdb_id),
    media_type: row.media_type,
    title: row.title ?? undefined,
    name: row.name ?? undefined,
    overview: row.overview ?? '',
    poster_path: row.poster_path ?? '',
    backdrop_path: row.backdrop_path ?? '',
  };
}

function mergeItems(...lists: WatchlistItem[][]): WatchlistItem[] {
  const seen = new Set<string>();
  return lists.flat().filter((item) => {
    const key = getItemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authAvailable, setAuthAvailable] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const guestItemsRef = useRef<WatchlistItem[]>([]);
  const itemsRef = useRef<WatchlistItem[]>([]);
  const userRef = useRef<User | null>(null);
  const localStorageReadyRef = useRef(false);
  const accountLoadIdRef = useRef(0);
  const mutationIdRef = useRef(0);
  const itemMutationIdsRef = useRef(new Map<string, number>());

  const updateItems = useCallback((nextItems: WatchlistItem[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const loadAccountWatchlist = useCallback(
    async () => {
      const client = createSupabaseBrowserClient();
      if (!client) return;
      const loadId = ++accountLoadIdRef.current;
      const guestItems = guestItemsRef.current;

      setSyncMessage(null);
      const { data, error } = await client
        .from('watchlist')
        .select('tmdb_id, media_type, title, name, overview, poster_path, backdrop_path')
        .order('added_at', { ascending: false });

      if (loadId !== accountLoadIdRef.current) return;
      if (error) {
        updateItems(guestItems);
        setSyncMessage('Your saved titles could not be loaded from sync. Your device watchlist is still available.');
        console.error('Failed to load account watchlist', error);
        return;
      }

      const remoteItems = (data as WatchlistRow[]).map(rowToItem);
      const mergedItems = mergeItems(remoteItems, guestItems);

      if (guestItems.length > 0) {
        const { error: mergeError } = await client
          .from('watchlist')
          .upsert(guestItems.map(itemToRow), {
            onConflict: 'user_id,tmdb_id,media_type',
            ignoreDuplicates: true,
          });

        if (loadId !== accountLoadIdRef.current) return;
        if (mergeError) {
          updateItems(mergedItems);
          setSyncMessage('Some device titles could not be synced yet. They remain saved on this device.');
          console.error('Failed to merge device watchlist into account', mergeError);
          return;
        }

        try {
          window.localStorage.removeItem(STORAGE_KEY);
          guestItemsRef.current = [];
        } catch (storageError) {
          console.error('Failed to clear synced guest watchlist', storageError);
        }
      }

      updateItems(mergedItems);
    },
    [updateItems]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const localItems = raw ? validItems(JSON.parse(raw)) : [];
      guestItemsRef.current = localItems;
      updateItems(localItems);
    } catch (error) {
      console.error('Failed to load watchlist from localStorage', error);
    } finally {
      localStorageReadyRef.current = true;
    }

    const client = createSupabaseBrowserClient();
    setAuthAvailable(client !== null);
    if (!client) {
      setAuthReady(true);
      return;
    }

    const applyUser = (nextUser: User | null) => {
      const previousUser = userRef.current;
      if (previousUser?.id === nextUser?.id) return;

      userRef.current = nextUser;
      setUser(nextUser);
      if (nextUser) {
        void loadAccountWatchlist();
      } else {
        accountLoadIdRef.current += 1;
        setSyncMessage(null);
        updateItems(guestItemsRef.current);
      }
    };

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
      setAuthReady(true);
    });

    void client.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Failed to restore Supabase session', error);
      applyUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      accountLoadIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [loadAccountWatchlist, updateItems]);

  useEffect(() => {
    if (!localStorageReadyRef.current || user) return;
    try {
      guestItemsRef.current = items;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save watchlist to localStorage', error);
    }
  }, [items, user]);

  useEffect(() => {
    if (!syncMessage) return;
    const timeout = window.setTimeout(() => setSyncMessage(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [syncMessage]);

  const savedKeys = useMemo(() => new Set(items.map(getItemKey)), [items]);

  const isSaved = useCallback(
    (id: number, mediaType: WatchlistItem['media_type']) =>
      savedKeys.has(getItemKey({ id, media_type: mediaType })),
    [savedKeys]
  );

  const toggleItem = useCallback(
    (item: WatchlistItem) => {
      const key = getItemKey(item);
      const previousItems = itemsRef.current;
      const existing = previousItems.find((saved) => getItemKey(saved) === key);
      const nextItems = existing
        ? previousItems.filter((saved) => getItemKey(saved) !== key)
        : [item, ...previousItems];

      updateItems(nextItems);

      const currentUser = userRef.current;
      if (!currentUser) return;

      const client = createSupabaseBrowserClient();
      if (!client) return;

      const mutationId = ++mutationIdRef.current;
      itemMutationIdsRef.current.set(key, mutationId);
      const mutation = existing
        ? client
            .from('watchlist')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('tmdb_id', item.id)
            .eq('media_type', item.media_type)
        : client.from('watchlist').upsert([itemToRow(item)], {
            onConflict: 'user_id,tmdb_id,media_type',
            ignoreDuplicates: true,
          });

      void mutation.then(({ error }) => {
        if (!error) {
          setSyncMessage(null);
          return;
        }
        console.error('Failed to update account watchlist', error);
        setSyncMessage('Your change could not reach sync. Please check your connection and try again.');
        if (itemMutationIdsRef.current.get(key) !== mutationId) return;

        const latestItems = itemsRef.current;
        const rolledBack = existing
          ? mergeItems(latestItems, [existing])
          : latestItems.filter((saved) => getItemKey(saved) !== key);
        updateItems(rolledBack);
      });
    },
    [updateItems]
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const client = createSupabaseBrowserClient();
    if (!client) return 'Account sync is not configured on this site.';
    const { error } = await client.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const client = createSupabaseBrowserClient();
    if (!client) {
      return { error: 'Account sync is not configured on this site.', confirmationRequired: false };
    }
    const { data, error } = await client.auth.signUp({ email, password });
    return {
      error: error?.message ?? null,
      confirmationRequired: !error && !data.session,
    };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const client = createSupabaseBrowserClient();
    if (!client) return 'Account sync is not configured on this site.';

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return error?.message ?? null;
    } catch (error) {
      console.error('Failed to request password reset', error);
      return 'Password reset request failed.';
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = createSupabaseBrowserClient();
    if (!client) return 'Account sync is not configured on this site.';
    const { error } = await client.auth.signOut();
    return error?.message ?? null;
  }, []);

  const value = useMemo(
    () => ({
      items,
      user,
      authReady,
      authAvailable,
      syncMessage,
      toggleItem,
      isSaved,
      signIn,
      signUp,
      requestPasswordReset,
      signOut,
    }),
    [
      items,
      user,
      authReady,
      authAvailable,
      syncMessage,
      toggleItem,
      isSaved,
      signIn,
      signUp,
      requestPasswordReset,
      signOut,
    ]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return ctx;
}
