create table if not exists public.watchlist (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  tmdb_id bigint not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  title text,
  name text,
  overview text,
  poster_path text,
  backdrop_path text,
  added_at timestamptz not null default now(),
  constraint watchlist_user_title_unique unique (user_id, tmdb_id, media_type)
);

alter table public.watchlist enable row level security;

revoke all on table public.watchlist from anon;
grant select, insert, delete on table public.watchlist to authenticated;

drop policy if exists "Users can select their own watchlist" on public.watchlist;
create policy "Users can select their own watchlist"
  on public.watchlist
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert into their own watchlist" on public.watchlist;
create policy "Users can insert into their own watchlist"
  on public.watchlist
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete from their own watchlist" on public.watchlist;
create policy "Users can delete from their own watchlist"
  on public.watchlist
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
