'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useWatchlist } from '@/components/WatchlistContext';

interface WatchlistAccountProps {
  /** Classes for the round icon trigger, so it matches the navbar it sits in. */
  triggerClassName?: string;
}

export default function WatchlistAccount({ triggerClassName = '' }: WatchlistAccountProps) {
  const { user, authReady, authAvailable, signIn, signUp, requestPasswordReset, signOut } = useWatchlist();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'resetRequest'>('signIn');
  const [view, setView] = useState<'menu' | 'auth'>('menu');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [isResetAnimating, setIsResetAnimating] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLElement | null>(null);

  const updateDropdownPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    // Open just under the navbar pill, right-aligned with the account button
    const triggerRect = trigger.getBoundingClientRect();
    const pill = trigger.closest('[data-nav-pill]');
    const top = (pill instanceof HTMLElement ? pill.getBoundingClientRect().bottom : triggerRect.bottom) + 8;
    const right = Math.max(16, window.innerWidth - (pill instanceof HTMLElement ? pill.getBoundingClientRect().right : triggerRect.right));
    setDropdownPosition({ top, right });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    updateDropdownPosition();
    document.addEventListener('mousedown', handleOutsideMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!isResetAnimating) return;
    const timeout = window.setTimeout(() => setIsResetAnimating(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [isResetAnimating]);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timeout = window.setTimeout(() => setResetCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [resetCooldown]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (mode === 'resetRequest') {
      setMessage("If an account exists, we've sent a reset link. Check your inbox and spam folder.");
      setResetCooldown(30);
      setIsResetAnimating(true);
      void (async () => {
        try {
          const error = await requestPasswordReset(email);
          if (error) {
            console.error('Failed to request password reset', error);
            setResetCooldown(0);
            setIsResetAnimating(false);
            setMessage("Couldn't send the email, please try again in a moment");
          }
        } catch (error) {
          console.error('Failed to request password reset', error);
          setResetCooldown(0);
          setIsResetAnimating(false);
          setMessage("Couldn't send the email, please try again in a moment");
        } finally {
          setIsSubmitting(false);
        }
      })();
      return;
    }

    setIsSubmitting(true);
    if (mode === 'signIn') {
      const error = await signIn(email, password);
      setMessage(error ?? 'Signed in. Your watchlist is syncing.');
    } else {
      const result = await signUp(email, password);
      if (result.error) {
        setMessage(result.error);
      } else if (result.confirmationRequired) {
        setMessage('Account created. Check your email to confirm it, then sign in here with your email and password.');
      } else {
        setMessage('Account created and signed in. Your watchlist is syncing.');
      }
    }

    setIsSubmitting(false);
  };

  const handleSignOut = async () => {
    setMessage(null);
    setIsSubmitting(true);
    const error = await signOut();
    setMessage(error ?? 'Signed out. This device is now using its local watchlist.');
    setIsSubmitting(false);
    if (!error) setIsOpen(false);
  };

  const openMenu = () => {
    setMessage(null);
    setView('menu');
    updateDropdownPosition();
    setIsOpen(true);
  };

  const startAuth = (nextMode: 'signIn' | 'signUp') => {
    setMode(nextMode);
    setMessage(null);
    setView('auth');
  };

  const menuLinkClass =
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/5 hover:text-yellow-300';

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        aria-label={user ? 'Account' : 'Account and sign in'}
        aria-expanded={isOpen}
        className={`${triggerClassName} ${isOpen ? 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-400/60' : ''}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
        </svg>
      </button>

      {isOpen && dropdownPosition && typeof document !== 'undefined'
        ? createPortal(
          <section
            ref={dropdownRef}
            role="dialog"
            aria-modal="false"
            aria-label={view === 'menu' ? 'Account menu' : undefined}
            aria-labelledby={view === 'auth' ? 'watchlist-account-title' : undefined}
            className={`account-dropdown fixed z-[70] overflow-y-auto rounded-2xl border border-yellow-500/25 bg-black/95 text-white shadow-2xl backdrop-blur-md ${
              view === 'menu' ? 'w-60 p-2' : 'w-[min(28rem,calc(100vw-2rem))] p-6'
            }`}
            style={{
              top: dropdownPosition.top,
              right: dropdownPosition.right,
              maxHeight: `calc(100vh - ${dropdownPosition.top}px - 16px)`,
            }}
          >
            {view === 'menu' ? (
              <>
                {user && (
                  <p className="truncate px-3 pb-2 pt-1 text-xs text-gray-400">
                    Signed in as <span className="text-gray-200">{user.email}</span>
                  </p>
                )}
                <nav className="flex flex-col">
                  <Link href="/watchlist" onClick={() => setIsOpen(false)} className={menuLinkClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                    Watchlist
                  </Link>
                  <Link href="/patch-notes" onClick={() => setIsOpen(false)} className={menuLinkClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" d="M12 11v5m0-8h.01" />
                    </svg>
                    Patch Notes
                  </Link>
                </nav>
                <div className="my-2 border-t border-white/10" />
                {user ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Signing out…' : 'Sign out'}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startAuth('signIn')}
                      className="rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 px-3 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => startAuth('signUp')}
                      className="glass glass-button rounded-xl px-3 py-2.5 text-sm font-semibold text-white"
                    >
                      Sign up
                    </button>
                  </div>
                )}
                {message && (
                  <p role="status" className="mt-2 rounded-lg border border-gray-700 bg-black/60 p-2.5 text-xs text-gray-200">
                    {message}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView('menu');
                      setMessage(null);
                    }}
                    aria-label="Back to account menu"
                    className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-yellow-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <h2 id="watchlist-account-title" className="flex-1 text-xl font-semibold text-yellow-300">
                    {mode === 'signIn'
                      ? 'Sign in to sync'
                      : mode === 'signUp'
                        ? 'Create an account'
                        : 'Reset your password'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close account dialog"
                    className="rounded px-2 py-1 text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!authAvailable && (
                    <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                      Account sync is not configured. You can keep using your device-only watchlist.
                    </p>
                  )}
                  <label className="block space-y-1.5 text-sm text-gray-300">
                    Email
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white outline-none focus:border-yellow-500"
                    />
                  </label>
                  {(mode === 'signUp' || mode === 'signIn') && (
                    <label className="block space-y-1.5 text-sm text-gray-300">
                      Password
                      <input
                        type="password"
                        autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                        minLength={6}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white outline-none focus:border-yellow-500"
                      />
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !authAvailable ||
                      !authReady ||
                      (mode === 'resetRequest' && resetCooldown > 0)
                    }
                    className="w-full rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-2 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {mode === 'resetRequest' && isResetAnimating
                      ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
                          />
                          Sending…
                        </span>
                      )
                      : mode === 'resetRequest' && resetCooldown > 0
                      ? `Try again in ${resetCooldown}s`
                      : isSubmitting
                      ? 'Please wait…'
                      : mode === 'signIn'
                        ? 'Sign in'
                        : mode === 'signUp'
                          ? 'Create account'
                          : 'Send reset link'}
                  </button>
                  {mode === 'signUp' && (
                    <p className="text-center text-xs leading-relaxed text-gray-400">
                      By creating an account you agree to our{' '}
                      <Link href="/privacy" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  )}
                  {mode !== 'resetRequest' && (
                    <>
                      {mode === 'signIn' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('resetRequest');
                            setMessage(null);
                          }}
                          className="w-full text-sm text-gray-300 transition-colors hover:text-yellow-300"
                        >
                          Forgot password?
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                          setMessage(null);
                        }}
                        className="w-full text-sm text-gray-300 transition-colors hover:text-yellow-300"
                      >
                        {mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
                      </button>
                    </>
                  )}
                  {mode === 'resetRequest' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signIn');
                        setMessage(null);
                      }}
                      className="w-full text-sm text-gray-300 transition-colors hover:text-yellow-300"
                    >
                      Back to sign in
                    </button>
                  )}
                </form>

                {message && (
                  <p role="status" className="mt-4 rounded-lg border border-gray-700 bg-black/60 p-3 text-sm text-gray-200">
                    {message}
                  </p>
                )}
              </>
            )}
          </section>,
          document.body
        )
        : null}
    </>
  );
}
