create table if not exists public.keepalive (
  id integer primary key check (id = 1)
);

insert into public.keepalive (id)
values (1)
on conflict (id) do nothing;

alter table public.keepalive enable row level security;

revoke all on table public.keepalive from public, anon, authenticated;
grant select on table public.keepalive to anon;

drop policy if exists "Allow anonymous keep-alive select" on public.keepalive;
create policy "Allow anonymous keep-alive select"
  on public.keepalive
  for select
  to anon
  using (true);
