'use client';

import type React from 'react';
import { WatchlistProvider } from '@/components/WatchlistContext';
import { WatchProgressProvider } from '@/components/WatchProgressContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WatchlistProvider>
      <WatchProgressProvider>{children}</WatchProgressProvider>
    </WatchlistProvider>
  );
}
