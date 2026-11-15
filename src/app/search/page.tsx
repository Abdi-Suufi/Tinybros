'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { fetchPersonCredits, fetchPersonDetails, getImageUrl, searchShows, TMDBPerson } from '@/lib/tmdb';
import ShowGrid from '@/components/ShowGrid';

/** TMDB dates are plain YYYY-MM-DD; parse the parts so time zones can't shift the day. */
function parseDate(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return null;
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Whole years between two dates (to today when `until` is missing). */
function yearsBetween(from?: string | null, until?: string | null) {
  const start = parseDate(from);
  if (!start) return null;
  const now = new Date();
  const end = parseDate(until) ?? { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  let years = end.year - start.year;
  if (end.month < start.month || (end.month === start.month && end.day < start.day)) years -= 1;
  return years >= 0 ? years : null;
}

function PersonFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-yellow-500/20 bg-black px-4 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-white">{value}</dd>
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const personId = searchParams.get('person') || '';
  const personName = searchParams.get('name') || '';
  const department = searchParams.get('department');
  const [person, setPerson] = useState<TMDBPerson | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  useEffect(() => setBioExpanded(false), [personId]);
  const isDirector = department === 'directing' || person?.known_for_department === 'Directing';
  const heading = personId
    ? `Movies and Series ${isDirector ? 'directed by' : 'with'} ${person?.name || personName || (isDirector ? 'This Director' : 'This Cast Member')}`
    : `Search Results for "${query}"`;
  const getShows = useCallback(async () => {
    if (personId) {
      const profile = await fetchPersonDetails(personId);
      setPerson(profile);
      const personIsDirector = department === 'directing' || profile.known_for_department === 'Directing';
      return fetchPersonCredits(personId, personIsDirector ? 'directing' : 'acting');
    }

    return searchShows(query);
  }, [department, personId, query]);

  // Update page title based on search query
  useEffect(() => {
    if (personId) {
      document.title = `${person?.name || personName || (isDirector ? 'Director' : 'Cast Member')} | Tinywatch`;
    } else if (query) {
      document.title = `Search: "${query}" | Tinywatch`;
    } else {
      document.title = 'Search | Tinywatch';
    }
  }, [isDirector, personId, personName, person?.name, query]);

    return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      {personId ? (
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative aspect-[2/3] w-32 flex-none overflow-hidden rounded-xl bg-gray-800/70 shadow-xl ring-1 ring-white/10 sm:w-40">
            <Image
              src={getImageUrl(person?.profile_path || '', 'w500')}
              alt={person?.name || personName || 'Cast member'}
              fill
              className="object-cover"
              sizes="160px"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">
              {heading}
            </h1>
            {person && (() => {
              const born = formatDate(person.birthday);
              const died = formatDate(person.deathday);
              const age = yearsBetween(person.birthday, person.deathday);
              const facts = [
                born && { label: 'Born', value: !died && age !== null ? `${born} (age ${age})` : born },
                died && { label: 'Died', value: age !== null ? `${died} (aged ${age})` : died },
                person.place_of_birth && { label: 'Birthplace', value: person.place_of_birth },
                person.known_for_department && { label: 'Known for', value: person.known_for_department },
              ].filter((fact): fact is { label: string; value: string } => Boolean(fact));
              const biography = person.biography?.trim();

              return (
                <>
                  {facts.length > 0 && (
                    <dl className="mt-4 flex flex-wrap gap-2">
                      {facts.map((fact) => (
                        <PersonFact key={fact.label} {...fact} />
                      ))}
                    </dl>
                  )}
                  {biography && (
                    <div className="mt-4 max-w-4xl">
                      <p className={`whitespace-pre-line text-sm leading-relaxed text-gray-300 ${bioExpanded ? '' : 'line-clamp-3'}`}>
                        {biography}
                      </p>
                      {biography.length > 280 && (
                        <button
                          type="button"
                          onClick={() => setBioExpanded((open) => !open)}
                          aria-expanded={bioExpanded}
                          className="mt-1 text-sm font-semibold text-yellow-400 hover:text-yellow-300"
                        >
                          {bioExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  )}
                  {person.imdb_id && (
                    <a
                      href={`https://www.imdb.com/name/${person.imdb_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 px-3 py-1 text-xs font-semibold text-yellow-300 transition-colors hover:border-yellow-400/70 hover:bg-yellow-500/10"
                    >
                      View on IMDb
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                        <path d="M11 3a1 1 0 100 2h2.59l-6.3 6.3a1 1 0 101.42 1.4L15 6.42V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                    </a>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <h1 className="text-3xl font-bold mb-8">
          {heading}
        </h1>
      )}
      <ShowGrid getShows={getShows} />
      </div>
    );
  }

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="h-8 w-64 mb-8 animate-pulse bg-gradient-to-r from-yellow-500/70 to-yellow-400/70 rounded-full" />
          {/* Reuse ShowGrid skeleton layout by rendering empty grid-like blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-yellow-900/40 via-gray-900/60 to-yellow-900/40"
              >
                <div className="relative aspect-[2/3] bg-gradient-to-t from-yellow-700/40 via-gray-900 to-yellow-600/40" />
                <div className="p-4 space-y-2">
                  <div className="h-4 rounded-full w-3/4 bg-gradient-to-r from-yellow-500/70 to-yellow-400/70" />
                  <div className="h-3 rounded-full w-full bg-gradient-to-r from-yellow-500/60 to-yellow-400/60" />
                  <div className="h-3 rounded-full w-5/6 bg-gradient-to-r from-yellow-500/50 to-yellow-400/50" />
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
