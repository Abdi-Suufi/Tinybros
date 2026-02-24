'use client';

import type React from 'react';
import { WatchlistProvider } from '@/components/WatchlistContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <WatchlistProvider>{children}</WatchlistProvider>;
}

