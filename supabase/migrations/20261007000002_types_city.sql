-- Quest types (a list per category) and the quest's city. Run in the SQL Editor BEFORE deploying the app that reads them.
create table public.quest_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
create unique index quest_types_category_name on public.quest_types (category_id, lower(name));

alter table public.quests
  add column type_id uuid references public.quest_types on delete set null,
  add column city text check (city is null or length(trim(city)) between 1 and 80);

alter table public.quest_types enable row level security;
create policy "couple reads quest types" on public.quest_types for select to authenticated using (true);
create policy "couple adds quest types" on public.quest_types for insert to authenticated with check (true);
create policy "couple edits quest types" on public.quest_types for update to authenticated using (true) with check (true);
create policy "couple deletes quest types" on public.quest_types for delete to authenticated using (true);

alter publication supabase_realtime add table public.quest_types;
