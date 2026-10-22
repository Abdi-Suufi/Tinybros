create table if not exists public.watch_progress (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  tmdb_id bigint not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  season integer not null default 0,
  episode integer not null default 0,
  position_seconds integer not null check (position_seconds > 0 and position_seconds <= 86400),
  duration_seconds integer not null check (duration_seconds > 0 and duration_seconds <= 86400),
  updated_at timestamptz not null default now(),
  constraint watch_progress_tv_episode_check check (
    (media_type = 'movie' and season = 0 and episode = 0)
    or (media_type = 'tv' and season > 0 and episode > 0)
  ),
  constraint watch_progress_position_check check (position_seconds <= duration_seconds),
  constraint watch_progress_user_item_unique
    unique (user_id, tmdb_id, media_type, season, episode)
);

create index if not exists watch_progress_user_updated_idx
  on public.watch_progress (user_id, updated_at desc);

alter table public.watch_progress enable row level security;

revoke all on table public.watch_progress from anon;
grant select, insert, update, delete on table public.watch_progress to authenticated;

drop policy if exists "Users can select their own watch progress" on public.watch_progress;
create policy "Users can select their own watch progress"
  on public.watch_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own watch progress" on public.watch_progress;
create policy "Users can insert their own watch progress"
  on public.watch_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own watch progress" on public.watch_progress;
create policy "Users can update their own watch progress"
  on public.watch_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own watch progress" on public.watch_progress;
create policy "Users can delete their own watch progress"
  on public.watch_progress
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
