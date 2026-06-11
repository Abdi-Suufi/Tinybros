'use client';

import { Suspense, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchPersonCredits, searchShows } from '@/lib/tmdb';
import ShowGrid from '@/components/ShowGrid';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const personId = searchParams.get('person') || '';
  const personName = searchParams.get('name') || '';
  const heading = personId
    ? `Movies and Series with ${personName || 'This Cast Member'}`
    : `Search Results for "${query}"`;
  const getShows = useCallback(() => {
    if (personId) {
      return fetchPersonCredits(personId);
    }

    return searchShows(query);
  }, [personId, query]);

  // Update page title based on search query
  useEffect(() => {
    if (personId) {
      document.title = `${personName || 'Cast Member'} | TinyBros`;
    } else if (query) {
      document.title = `Search: "${query}" | TinyBros`;
    } else {
      document.title = 'Search | TinyBros';
    }
  }, [personId, personName, query]);

    return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <h1 className="text-3xl font-bold mb-8">
        {heading}
      </h1>
      <ShowGrid getShows={getShows} />
      </div>
    );
  }

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="h-8 w-64 mb-8 animate-pulse bg-gradient-to-r from-orange-500/70 to-yellow-400/70 rounded-full" />
          {/* Reuse ShowGrid skeleton layout by rendering empty grid-like blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-orange-900/40 via-gray-900/60 to-yellow-900/40"
              >
                <div className="relative aspect-[2/3] bg-gradient-to-t from-orange-700/40 via-gray-900 to-yellow-600/40" />
                <div className="p-4 space-y-2">
                  <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-orange-500/70 to-yellow-400/70" />
                  <div className="h-3 rounded-full w-full bg-gradient-to-r from-orange-500/60 to-yellow-400/60" />
                  <div className="h-3 rounded-full w-5/6 bg-gradient-to-r from-orange-500/50 to-yellow-400/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
