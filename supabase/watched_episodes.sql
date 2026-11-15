-- Episodes a signed-in viewer has finished (or marked as watched), shown as ticks in episode lists.
create table if not exists public.watched_episodes (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  tmdb_id bigint not null check (tmdb_id > 0),
  season integer not null check (season >= 0),
  episode integer not null check (episode > 0),
  watched_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, season, episode)
);

alter table public.watched_episodes enable row level security;

revoke all on table public.watched_episodes from anon;
grant select, insert, update, delete on table public.watched_episodes to authenticated;

drop policy if exists "Users can select their own watched episodes" on public.watched_episodes;
create policy "Users can select their own watched episodes"
  on public.watched_episodes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own watched episodes" on public.watched_episodes;
create policy "Users can insert their own watched episodes"
  on public.watched_episodes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own watched episodes" on public.watched_episodes;
create policy "Users can update their own watched episodes"
  on public.watched_episodes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own watched episodes" on public.watched_episodes;
create policy "Users can delete their own watched episodes"
  on public.watched_episodes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
