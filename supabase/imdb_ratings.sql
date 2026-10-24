-- Shared cache of IMDb ratings, filled by /api/imdb-rating.
-- Anyone can read it; only the server (using the Supabase secret key) can write.
create table if not exists public.imdb_ratings (
  tmdb_id bigint not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  imdb_id text,
  imdb_rating numeric(3, 1),
  imdb_votes text,
  updated_at timestamptz not null default now(),
  primary key (media_type, tmdb_id)
);

alter table public.imdb_ratings enable row level security;

revoke all on table public.imdb_ratings from public, anon, authenticated;
grant select on table public.imdb_ratings to anon, authenticated;

drop policy if exists "Anyone can read IMDb ratings" on public.imdb_ratings;
create policy "Anyone can read IMDb ratings"
  on public.imdb_ratings
  for select
  to anon, authenticated
  using (true);
