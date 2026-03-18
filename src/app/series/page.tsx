import { Suspense } from 'react';
import SeriesClient from './SeriesClient';

export default function SeriesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white pt-24 pb-8 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="h-10 w-64 rounded-xl bg-gray-800/50 animate-pulse" />
          </div>
        </div>
      }
    >
      <SeriesClient />
    </Suspense>
  );
}

