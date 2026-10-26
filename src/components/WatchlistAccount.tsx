'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useWatchlist } from '@/components/WatchlistContext';

export default function WatchlistAccount({ mobile = false }: { mobile?: boolean }) {
  const { user, authReady, authAvailable, signIn, signUp, requestPasswordReset, signOut } = useWatchlist();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'resetRequest'>('signIn');
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

    const triggerRect = trigger.getBoundingClientRect();
    const navHeader = trigger.closest('nav')?.firstElementChild;
    const top = (navHeader instanceof HTMLElement ? navHeader.getBoundingClientRect().bottom : triggerRect.bottom) + 8;
    const dropdownWidth = Math.min(448, window.innerWidth - 32);
    const right = Math.max(
      16,
      Math.min(window.innerWidth - dropdownWidth - 16, window.innerWidth - triggerRect.right)
    );
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

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          setMessage(null);
          updateDropdownPosition();
          setIsOpen(true);
        }}
        className={
          mobile
            ? 'block w-full rounded-lg px-4 py-2 text-left text-gray-300 transition-colors hover:bg-gray-800/50 hover:text-yellow-400'
            : 'whitespace-nowrap rounded-lg border border-yellow-500/40 px-3 py-2 text-sm text-yellow-300 transition-colors hover:bg-yellow-500/10'
        }
      >
        {user ? 'Account' : 'Sign in'}
      </button>

      {isOpen && dropdownPosition && typeof document !== 'undefined'
        ? createPortal(
          <section
            ref={dropdownRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="watchlist-account-title"
            className={`account-dropdown fixed z-[70] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-yellow-500/30 bg-black p-6 text-white shadow-2xl${mobile ? ' mobile-menu-container' : ''}`}
            style={{
              top: dropdownPosition.top,
              right: dropdownPosition.right,
              maxHeight: `calc(100vh - ${dropdownPosition.top}px - 16px)`,
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="watchlist-account-title" className="text-xl font-semibold text-yellow-300">
                {user
                  ? 'Watchlist account'
                  : mode === 'signIn'
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

            {user ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-300">
                  Signed in as <span className="text-white">{user.email}</span>
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-2 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            ) : (
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
            )}

            {message && (
              <p role="status" className="mt-4 rounded-lg border border-gray-700 bg-black/60 p-3 text-sm text-gray-200">
                {message}
              </p>
            )}
          </section>,
          document.body
        )
        : null}
    </>
  );
}
