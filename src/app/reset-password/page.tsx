'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'updated';

export default function ResetPasswordPage() {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const checkRecoverySession = async () => {
      const hasRecoveryMarker = window.sessionStorage.getItem('tinywatch_password_recovery') === 'verified';
      const client = createSupabaseBrowserClient();
      if (!hasRecoveryMarker) {
        if (active) {
          setMessage('Open the password reset link from your email, or request a new one from Tinywatch.');
          setRecoveryState('invalid');
        }
        return;
      }
      if (!client) {
        if (active) {
          setMessage('Password reset is not configured on this site.');
          setRecoveryState('invalid');
        }
        return;
      }

      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) {
        console.error('Failed to check password recovery session', error);
        setMessage('We could not verify this password reset session. Request a new reset link.');
        setRecoveryState('invalid');
        return;
      }
      if (!data.session) {
        setMessage('This reset session is missing or has expired. Request a new password reset link.');
        setRecoveryState('invalid');
        return;
      }

      setRecoveryState('ready');
    };

    void checkRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }

    const client = createSupabaseBrowserClient();
    if (!client) {
      setMessage('Password reset is not configured on this site.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      console.error('Failed to update password', error);
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const { error: signOutError } = await client.auth.signOut();
    window.sessionStorage.removeItem('tinywatch_password_recovery');
    if (signOutError) {
      console.error('Password changed, but the recovery session could not be signed out', signOutError);
    }
    setRecoveryState('updated');
    setMessage(
      signOutError
        ? 'Your password has been changed. Return to Tinywatch (the website or desktop app) and sign in with your new password. If this browser remains signed in, sign out first.'
        : 'Your password has been changed. Return to Tinywatch (the website or desktop app) and sign in with your new password.'
    );
    setIsSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 pb-8 pt-24 text-white">
      <section className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-black p-6 shadow-2xl">
        <h1 className="mb-5 text-2xl font-semibold text-yellow-300">Reset your password</h1>

        {recoveryState === 'checking' && (
          <p role="status" className="text-sm text-gray-300">Checking your reset link…</p>
        )}

        {recoveryState === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5 text-sm text-gray-300">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white outline-none focus:border-yellow-500"
              />
            </label>
            <label className="block space-y-1.5 text-sm text-gray-300">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white outline-none focus:border-yellow-500"
              />
            </label>
            <p className="text-xs text-gray-400">Use at least 8 characters.</p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-2 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating password…' : 'Set new password'}
            </button>
          </form>
        )}

        {message && (
          <p role="status" className="mt-4 rounded-lg border border-gray-700 bg-black/60 p-3 text-sm text-gray-200">
            {message}
          </p>
        )}

        {(recoveryState === 'invalid' || recoveryState === 'updated') && (
          <Link href="/" className="mt-5 inline-block text-sm text-yellow-300 transition-colors hover:text-yellow-200">
            Return to Tinywatch
          </Link>
        )}
      </section>
    </main>
  );
}
