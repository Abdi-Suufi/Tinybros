'use client';

import type React from 'react';
import { WatchlistProvider } from '@/components/WatchlistContext';
import { WatchProgressProvider } from '@/components/WatchProgressContext';
import { ThemeProvider } from '@/components/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WatchlistProvider>
      <ThemeProvider>
        <WatchProgressProvider>{children}</WatchProgressProvider>
      </ThemeProvider>
    </WatchlistProvider>
  );
}
