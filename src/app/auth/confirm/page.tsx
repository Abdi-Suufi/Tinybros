'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ConfirmAuthPage() {
  const [message, setMessage] = useState('Verifying your password reset link…');

  useEffect(() => {
    let active = true;

    const confirmRecovery = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type = params.get('type');
      const client = createSupabaseBrowserClient();

      if (!client) {
        if (active) setMessage('Password reset is not configured on this site.');
        return;
      }
      if (!tokenHash || type !== 'recovery') {
        if (active) setMessage('This password reset link is invalid or incomplete. Request a new one from Tinywatch.');
        return;
      }

      const { error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });
      if (!active) return;

      if (error) {
        console.error('Failed to verify password reset link', error);
        setMessage('This password reset link is invalid or has expired. Request a new one from Tinywatch.');
        return;
      }

      window.sessionStorage.setItem('tinywatch_password_recovery', 'verified');
      window.location.replace('/reset-password');
    };

    void confirmRecovery();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 pt-20 text-white">
      <p role="status" className="max-w-lg rounded-xl border border-yellow-500/30 bg-gray-950 p-6 text-center text-gray-200">
        {message}
      </p>
    </div>
  );
}
