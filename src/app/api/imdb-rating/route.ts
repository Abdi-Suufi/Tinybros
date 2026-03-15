import { NextResponse } from 'next/server';

type MediaType = 'movie' | 'tv';

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<
  string,
  { ts: number; value: { imdb_id?: string | null; imdbRating?: number | null; imdbVotes?: string | null } }
>();

function getEnv(name: string) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function toNumberOrNull(v: unknown) {
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as MediaType | null;
  const tmdbId = searchParams.get('tmdbId');

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  if (!tmdbId || !/^\d+$/.test(tmdbId)) {
    return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 });
  }

  const key = `${type}-${tmdbId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return NextResponse.json(hit.value, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  const tmdbKey = getEnv('TMDB_API_KEY') || getEnv('NEXT_PUBLIC_TMDB_API_KEY');
  const omdbKey = getEnv('OMDB_API_KEY');

  if (!tmdbKey) {
    return NextResponse.json({ error: 'TMDB API key missing' }, { status: 500 });
  }
  if (!omdbKey) {
    return NextResponse.json({ error: 'OMDb API key missing' }, { status: 500 });
  }

  try {
    const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${encodeURIComponent(
      tmdbKey
    )}`;
    const external = await fetchJson(tmdbUrl);
    const imdb_id: string | null = typeof external?.imdb_id === 'string' ? external.imdb_id : null;

    if (!imdb_id) {
      const value = { imdb_id: null, imdbRating: null, imdbVotes: null };
      cache.set(key, { ts: Date.now(), value });
      return NextResponse.json(value, {
        headers: { 'Cache-Control': 'public, max-age=3600' },
      });
    }

    const omdbUrl = `https://www.omdbapi.com/?i=${encodeURIComponent(imdb_id)}&apikey=${encodeURIComponent(omdbKey)}`;
    const omdb = await fetchJson(omdbUrl);
    const value = {
      imdb_id,
      imdbRating: toNumberOrNull(omdb?.imdbRating),
      imdbVotes: typeof omdb?.imdbVotes === 'string' ? omdb.imdbVotes : null,
    };

    cache.set(key, { ts: Date.now(), value });

    return NextResponse.json(value, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch IMDb rating' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
