-- When a quest is planned: a date and an optional time (floating local time, both of them live in Brazil).
-- Run in the SQL Editor BEFORE deploying the app that reads and writes these columns.
alter table public.quests
  add column scheduled_on date,
  add column scheduled_time time,
  add constraint quests_schedule_time_needs_date check (scheduled_time is null or scheduled_on is not null);
