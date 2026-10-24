import { after, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type MediaType = 'movie' | 'tv';

interface RatingValue {
  imdb_id: string | null;
  imdbRating: number | null;
  imdbVotes: string | null;
}

interface RatingRow {
  tmdb_id: number;
  media_type: MediaType;
  imdb_id: string | null;
  imdb_rating: number | string | null;
  imdb_votes: string | null;
  updated_at: string;
}

// Ratings barely change, so a stored rating is refreshed at most once a day.
// Older ones are still served straight away and refreshed in the background.
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_IDS = 40;
const FETCH_CONCURRENCY = 6;
// Let Vercel's CDN share cached ratings across visitors, not just the browser
const CACHE_HEADER = 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400';

// Per-instance memory cache in front of Supabase
const memoryCache = new Map<string, { ts: number; value: RatingValue }>();

function getEnv(name: string) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function toNumberOrNull(v: unknown) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  if (v === 'N/A') return null;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

const cacheKey = (type: MediaType, id: number) => `${type}-${id}`;

function createSupabase(key: string): SupabaseClient | null {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Reading works with the publishable key; writing needs the secret key (RLS blocks public writes)
const readClient = createSupabase(getEnv('SUPABASE_SECRET_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'));
const writeClient = createSupabase(getEnv('SUPABASE_SECRET_KEY'));

async function readStored(type: MediaType, ids: number[]) {
  const stored = new Map<number, { value: RatingValue; ts: number }>();
  if (!readClient || ids.length === 0) return stored;

  const { data, error } = await readClient
    .from('imdb_ratings')
    .select('tmdb_id, media_type, imdb_id, imdb_rating, imdb_votes, updated_at')
    .eq('media_type', type)
    .in('tmdb_id', ids);

  if (error) {
    console.error('Failed to read stored IMDb ratings', error);
    return stored;
  }

  for (const row of (data ?? []) as RatingRow[]) {
    stored.set(Number(row.tmdb_id), {
      ts: Date.parse(row.updated_at),
      value: {
        imdb_id: row.imdb_id,
        imdbRating: toNumberOrNull(row.imdb_rating),
        imdbVotes: row.imdb_votes,
      },
    });
  }
  return stored;
}

async function saveStored(type: MediaType, values: Map<number, RatingValue>) {
  if (!writeClient || values.size === 0) return;
  const now = new Date().toISOString();
  const rows = [...values].map(([id, value]) => ({
    tmdb_id: id,
    media_type: type,
    imdb_id: value.imdb_id,
    imdb_rating: value.imdbRating,
    imdb_votes: value.imdbVotes,
    updated_at: now,
  }));
  const { error } = await writeClient.from('imdb_ratings').upsert(rows, { onConflict: 'media_type,tmdb_id' });
  if (error) console.error('Failed to store IMDb ratings', error);
}

// Look a title up on TMDB (for its IMDb id, unless already known) and OMDb.
// Throws on temporary failures (network, OMDb daily limit) so they are not stored as "no rating".
async function lookupRating(type: MediaType, id: number, knownImdbId: string | null): Promise<RatingValue> {
  const tmdbKey = getEnv('TMDB_API_KEY') || getEnv('NEXT_PUBLIC_TMDB_API_KEY');
  const omdbKey = getEnv('OMDB_API_KEY');
  if (!tmdbKey || !omdbKey) throw new Error('TMDB or OMDb API key missing');

  let imdb_id = knownImdbId;
  if (!imdb_id) {
    const external = await fetchJson(
      `https://api.themoviedb.org/3/${type}/${id}/external_ids?api_key=${encodeURIComponent(tmdbKey)}`
    );
    imdb_id = typeof external?.imdb_id === 'string' && external.imdb_id ? external.imdb_id : null;
  }
  if (!imdb_id) return { imdb_id: null, imdbRating: null, imdbVotes: null };

  const omdb = await fetchJson(
    `https://www.omdbapi.com/?i=${encodeURIComponent(imdb_id)}&apikey=${encodeURIComponent(omdbKey)}`
  );
  if (omdb?.Response === 'False' && /limit|invalid api key/i.test(String(omdb?.Error))) {
    throw new Error(`OMDb error: ${omdb.Error}`);
  }

  return {
    imdb_id,
    imdbRating: toNumberOrNull(omdb?.imdbRating),
    imdbVotes: typeof omdb?.imdbVotes === 'string' && omdb.imdbVotes !== 'N/A' ? omdb.imdbVotes : null,
  };
}

// Look up several titles a few at a time; failed ones are left out of the result
async function lookupMany(type: MediaType, items: Array<{ id: number; imdbId: string | null }>) {
  const results = new Map<number, RatingValue>();
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const { id, imdbId } = items[cursor++];
      try {
        results.set(id, await lookupRating(type, id, imdbId));
      } catch (error) {
        console.error(`Failed to fetch IMDb rating for ${type} ${id}`, error);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, items.length) }, worker));
  return results;
}

async function getRatings(type: MediaType, ids: number[]) {
  const now = Date.now();
  const ratings = new Map<number, RatingValue>();

  const notInMemory = ids.filter((id) => {
    const hit = memoryCache.get(cacheKey(type, id));
    if (hit && now - hit.ts < TTL_MS) {
      ratings.set(id, hit.value);
      return false;
    }
    return true;
  });

  const stored = await readStored(type, notInMemory);
  const missing: Array<{ id: number; imdbId: string | null }> = [];
  const stale: Array<{ id: number; imdbId: string | null }> = [];

  for (const id of notInMemory) {
    const row = stored.get(id);
    if (!row) {
      missing.push({ id, imdbId: null });
      continue;
    }
    ratings.set(id, row.value);
    if (now - row.ts < TTL_MS) {
      memoryCache.set(cacheKey(type, id), row);
    } else {
      stale.push({ id, imdbId: row.value.imdb_id });
    }
  }

  // Titles never seen before have to be looked up now
  const fetched = await lookupMany(type, missing);
  for (const [id, value] of fetched) {
    ratings.set(id, value);
    memoryCache.set(cacheKey(type, id), { ts: now, value });
  }
  await saveStored(type, fetched);

  // Out-of-date titles were already answered from storage; refresh them after responding
  if (stale.length > 0) {
    after(async () => {
      const refreshed = await lookupMany(type, stale);
      for (const [id, value] of refreshed) memoryCache.set(cacheKey(type, id), { ts: Date.now(), value });
      await saveStored(type, refreshed);
    });
  }

  return { ratings, failed: missing.length - fetched.size };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as MediaType | null;
  const tmdbId = searchParams.get('tmdbId');
  const idsParam = searchParams.get('ids');

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // Batch: ?type=movie&ids=1,2,3 -> { ratings: { "1": {...}, ... } }
  if (idsParam !== null) {
    const ids = [...new Set(idsParam.split(','))];
    if (ids.length === 0 || ids.length > MAX_IDS || !ids.every((id) => /^\d+$/.test(id))) {
      return NextResponse.json({ error: `ids must be 1-${MAX_IDS} numeric TMDB ids` }, { status: 400 });
    }
    const { ratings, failed } = await getRatings(type, ids.map(Number));
    return NextResponse.json(
      { ratings: Object.fromEntries(ratings) },
      // Don't let the CDN hold on to a response with missing ratings
      { headers: { 'Cache-Control': failed > 0 ? 'no-store' : CACHE_HEADER } }
    );
  }

  // Single: ?type=movie&tmdbId=1 -> { imdb_id, imdbRating, imdbVotes }
  if (!tmdbId || !/^\d+$/.test(tmdbId)) {
    return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 });
  }
  const { ratings } = await getRatings(type, [Number(tmdbId)]);
  const value = ratings.get(Number(tmdbId));
  if (!value) {
    return NextResponse.json(
      { error: 'Failed to fetch IMDb rating' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return NextResponse.json(value, { headers: { 'Cache-Control': CACHE_HEADER } });
}
