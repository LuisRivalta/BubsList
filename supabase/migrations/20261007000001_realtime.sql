-- Live sync: the app listens for changes on these tables (RLS still decides who receives what).
alter publication supabase_realtime add table
  public.profiles, public.categories, public.media, public.quests,
  public.completions, public.reviews, public.photos, public.achievements;
