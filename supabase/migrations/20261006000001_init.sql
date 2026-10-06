-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- the two accounts already exist when this migration runs
insert into public.profiles (id, display_name)
  select id, split_part(email, '@', 1) from auth.users
  on conflict (id) do nothing;

-- Domain -----------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  kind text not null check (kind in ('general', 'movie', 'series', 'anime')),
  builtin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('tmdb_movie', 'tmdb_tv', 'anilist')),
  external_id text not null,
  title text not null,
  poster_url text,
  synopsis text,
  year int,
  genres text[] not null default '{}',
  runtime_minutes int,
  seasons jsonb not null default '[]',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.quests on delete cascade,
  category_id uuid not null references public.categories on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'epic')),
  media_id uuid references public.media on delete set null,
  progress_season int,
  progress_episode int,
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quests_parent_id_idx on public.quests (parent_id);

create table public.completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests on delete cascade,
  done_on date not null,
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz not null default now()
);
create index completions_quest_id_idx on public.completions (quest_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.completions on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles,
  rating smallint not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (completion_id, user_id)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references public.quests on delete cascade,
  review_id uuid references public.reviews on delete cascade,
  storage_path text not null,
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz not null default now(),
  check (num_nonnulls(quest_id, review_id) = 1)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  icon text not null,
  rarity text not null check (rarity in ('bronze', 'silver', 'gold', 'platinum')),
  kind text not null check (kind in ('auto', 'manual')),
  rule_category_id uuid references public.categories on delete restrict,
  rule_min_difficulty text check (rule_min_difficulty in ('easy', 'medium', 'hard', 'epic')),
  rule_count int check (rule_count >= 1),
  manual_unlocked_on date,
  created_at timestamptz not null default now(),
  check (
    (kind = 'auto' and rule_count is not null and manual_unlocked_on is null)
    or (kind = 'manual' and rule_category_id is null and rule_min_difficulty is null and rule_count is null)
  )
);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger quests_touch before update on public.quests for each row execute function public.touch_updated_at();
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();

-- Row level security -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.media enable row level security;
alter table public.quests enable row level security;
alter table public.completions enable row level security;
alter table public.reviews enable row level security;
alter table public.photos enable row level security;
alter table public.achievements enable row level security;

grant select, insert, update, delete on all tables in schema public to authenticated;

create policy "couple reads profiles" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "couple reads categories" on public.categories for select to authenticated using (true);
create policy "couple adds categories" on public.categories for insert to authenticated with check (not builtin);
-- ponytail: builtin flag is not protected on update; the UI never sends it. Add a trigger if that ever matters.
create policy "couple edits categories" on public.categories for update to authenticated using (true) with check (true);
create policy "couple deletes custom categories" on public.categories for delete to authenticated using (not builtin);

create policy "couple manages media" on public.media for all to authenticated using (true) with check (true);
create policy "couple manages quests" on public.quests for all to authenticated using (true) with check (true);
create policy "couple manages completions" on public.completions for all to authenticated using (true) with check (true);
create policy "couple manages photos" on public.photos for all to authenticated using (true) with check (true);
create policy "couple manages achievements" on public.achievements for all to authenticated using (true) with check (true);

create policy "couple reads reviews" on public.reviews for select to authenticated using (true);
create policy "own review insert" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "own review update" on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own review delete" on public.reviews for delete to authenticated using (user_id = auth.uid());

-- Storage ----------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;

create policy "couple manages photo files" on storage.objects for all to authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');
