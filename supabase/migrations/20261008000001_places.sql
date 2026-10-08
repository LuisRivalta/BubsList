-- Categories with a physical place, and the quest's place in levels (city/state/country) from the place search.
-- Run in the SQL Editor BEFORE deploying the app that reads and writes these columns.
alter table public.categories add column has_place boolean not null default false;
update public.categories set has_place = true where builtin and name in ('Viagem', 'Restaurante', 'Atividade');

alter table public.quests
  add column state text check (state is null or length(trim(state)) between 1 and 80),
  add column country text check (country is null or length(trim(country)) between 1 and 80),
  add column place_label text check (place_label is null or length(trim(place_label)) between 1 and 200),
  add column lat double precision check (lat is null or lat between -90 and 90),
  add column lng double precision check (lng is null or lng between -180 and 180);
