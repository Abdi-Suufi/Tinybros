'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useWatchlist } from '@/components/WatchlistContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  CUSTOM_THEME_STORAGE_KEY,
  CUSTOM_VARS_STORAGE_KEY,
  DEFAULT_CUSTOM_THEME,
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  buildCustomThemeVars,
  isColorMode,
  isCustomTheme,
  isThemeId,
  type ColorMode,
  type CustomTheme,
  type ThemeId,
} from '@/lib/themes';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  customTheme: CustomTheme;
  setCustomTheme: (customTheme: CustomTheme) => void;
}

type AccountThemeData = { theme?: ThemeId; mode?: ColorMode; customTheme?: CustomTheme };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this visit
  }
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

let transitionTimer: number | null = null;

/** Turns off CSS transitions until changes stop for a moment (see .theme-changing in globals.css). */
function pauseTransitions() {
  const root = document.documentElement;
  root.classList.add('theme-changing');
  if (transitionTimer !== null) window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => {
    transitionTimer = null;
    root.classList.remove('theme-changing');
  }, 200);
}

function applyTheme(theme: ThemeId) {
  pauseTransitions();
  document.documentElement.setAttribute('data-theme', theme);
  store(THEME_STORAGE_KEY, theme);
}

function applyMode(mode: ColorMode) {
  pauseTransitions();
  document.documentElement.setAttribute('data-mode', mode);
  store(MODE_STORAGE_KEY, mode);
}

function applyCustomThemeVars(customTheme: CustomTheme) {
  pauseTransitions();
  const root = document.documentElement;
  for (const [name, value] of Object.entries(buildCustomThemeVars(customTheme))) root.style.setProperty(name, value);
}

function storeCustomTheme(customTheme: CustomTheme) {
  store(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customTheme));
  store(CUSTOM_VARS_STORAGE_KEY, JSON.stringify(buildCustomThemeVars(customTheme)));
}

function applyCustomTheme(customTheme: CustomTheme) {
  applyCustomThemeVars(customTheme);
  storeCustomTheme(customTheme);
}

/** Wait this long after the last colour-picker change before writing it to localStorage. */
const LOCAL_SAVE_DELAY_MS = 250;

/** Wait this long after the last change before saving to the account (colour pickers fire constantly while dragging). */
const ACCOUNT_SAVE_DELAY_MS = 600;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useWatchlist();
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [mode, setModeState] = useState<ColorMode>(DEFAULT_MODE);
  const [customTheme, setCustomThemeState] = useState<CustomTheme>(DEFAULT_CUSTOM_THEME);
  const pendingSaveRef = useRef<AccountThemeData>({});
  const saveTimerRef = useRef<number | null>(null);
  // Colour pickers fire on every mouse move; only the latest pick per frame is applied
  const pendingCustomRef = useRef<CustomTheme | null>(null);
  const customFrameRef = useRef<number | null>(null);
  const localSaveTimerRef = useRef<number | null>(null);
  // Latest choices, read when an account with no saved theme signs in
  const currentRef = useRef({ theme, mode, customTheme });
  currentRef.current = { theme, mode, customTheme };

  // Pick up whatever the inline head script applied from localStorage
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    if (isThemeId(currentTheme)) setThemeState(currentTheme);
    const currentMode = root.getAttribute('data-mode');
    if (isColorMode(currentMode)) setModeState(currentMode);
    try {
      const savedCustom = JSON.parse(read(CUSTOM_THEME_STORAGE_KEY) ?? 'null');
      if (isCustomTheme(savedCustom)) setCustomThemeState(savedCustom);
    } catch {
      // Ignore a corrupted saved value and keep the default custom colours
    }
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      if (customFrameRef.current !== null) window.cancelAnimationFrame(customFrameRef.current);
      if (localSaveTimerRef.current !== null) window.clearTimeout(localSaveTimerRef.current);
    },
    []
  );

  const saveToAccount = useCallback(
    (changes: AccountThemeData) => {
      if (!user) return;
      pendingSaveRef.current = { ...pendingSaveRef.current, ...changes };
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        const data = pendingSaveRef.current;
        pendingSaveRef.current = {};
        const client = createSupabaseBrowserClient();
        void client?.auth.updateUser({ data }).then(({ error }) => {
          if (error) console.error('Failed to save theme to account', error);
        });
      }, ACCOUNT_SAVE_DELAY_MS);
    },
    [user]
  );

  // On sign-in, load the account's theme from the server (the session cached in this
  // browser can hold old metadata). An account with nothing saved yet adopts this
  // device's current choices instead.
  const userId = user?.id;
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const client = createSupabaseBrowserClient();

    void (async () => {
      // Fall back to the metadata in the cached session if the server can't be reached
      let metadata = user.user_metadata ?? {};
      let verified = false;
      if (client) {
        const { data, error } = await client.auth.getUser();
        if (cancelled) return;
        if (data.user) {
          metadata = data.user.user_metadata ?? {};
          verified = true;
        } else if (error && error.name !== 'AuthSessionMissingError') {
          // AuthSessionMissingError just means the session ended (sign-out, or an expired
          // session being dropped) while this loaded; anything else is worth a note
          console.warn('Could not refresh theme from account, using cached session', error);
        }
      }

      const savedTheme = metadata.theme;
      const savedMode = metadata.mode;
      const savedCustom = metadata.customTheme;
      if (!isThemeId(savedTheme) && !isColorMode(savedMode) && !isCustomTheme(savedCustom)) {
        // Only write when the server confirmed the account really has nothing saved
        if (verified) saveToAccount(currentRef.current);
        return;
      }

      if (isCustomTheme(savedCustom)) {
        setCustomThemeState(savedCustom);
        applyCustomTheme(savedCustom);
      }
      if (isThemeId(savedTheme)) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      }
      if (isColorMode(savedMode)) {
        setModeState(savedMode);
        applyMode(savedMode);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when the signed-in account changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setTheme = useCallback(
    (next: ThemeId) => {
      // Make sure the custom colours are on <html> (and cached for the head script) before switching to them
      if (next === 'custom') applyCustomTheme(customTheme);
      setThemeState(next);
      applyTheme(next);
      saveToAccount(next === 'custom' ? { theme: next, customTheme } : { theme: next });
    },
    [customTheme, saveToAccount]
  );

  const setMode = useCallback(
    (next: ColorMode) => {
      setModeState(next);
      applyMode(next);
      saveToAccount({ mode: next });
    },
    [saveToAccount]
  );

  const setCustomTheme = useCallback(
    (next: CustomTheme) => {
      pendingCustomRef.current = next;
      if (customFrameRef.current === null) {
        customFrameRef.current = window.requestAnimationFrame(() => {
          customFrameRef.current = null;
          const latest = pendingCustomRef.current;
          if (!latest) return;
          setCustomThemeState(latest);
          applyCustomThemeVars(latest);
        });
      }

      if (localSaveTimerRef.current !== null) window.clearTimeout(localSaveTimerRef.current);
      localSaveTimerRef.current = window.setTimeout(() => {
        localSaveTimerRef.current = null;
        storeCustomTheme(next);
      }, LOCAL_SAVE_DELAY_MS);

      saveToAccount({ customTheme: next });
    },
    [saveToAccount]
  );

  const value = useMemo(
    () => ({ theme, setTheme, mode, setMode, customTheme, setCustomTheme }),
    [theme, setTheme, mode, setMode, customTheme, setCustomTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
