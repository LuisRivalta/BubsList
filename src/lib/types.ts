import type { MediaSource, Season } from '../../supabase/functions/_shared/catalog'

export type { CatalogHit, MediaSource, NormalizedMedia, Season } from '../../supabase/functions/_shared/catalog'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'epic'
export type Rarity = 'bronze' | 'silver' | 'gold' | 'platinum'
export type CategoryKind = 'general' | 'movie' | 'series' | 'anime'

export interface Profile {
  id: string
  display_name: string
  avatar_path: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  kind: CategoryKind
  builtin: boolean
  has_place: boolean
  created_at: string
}

export interface QuestType {
  id: string
  category_id: string
  name: string
  created_at: string
}

export interface Media {
  id: string
  source: MediaSource
  external_id: string
  title: string
  poster_url: string | null
  synopsis: string | null
  year: number | null
  genres: string[]
  runtime_minutes: number | null
  seasons: Season[]
  fetched_at: string
  created_at: string
}

export interface Quest {
  id: string
  parent_id: string | null
  category_id: string
  title: string
  notes: string | null
  difficulty: Difficulty
  media_id: string | null
  type_id: string | null
  city: string | null
  state: string | null
  country: string | null
  place_label: string | null
  lat: number | null
  lng: number | null
  progress_season: number | null
  progress_episode: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Completion {
  id: string
  quest_id: string
  done_on: string
  created_by: string
  created_at: string
}

export interface Review {
  id: string
  completion_id: string
  user_id: string
  rating: number
  body: string | null
  created_at: string
  updated_at: string
}

export interface Photo {
  id: string
  quest_id: string | null
  review_id: string | null
  storage_path: string
  created_by: string
  created_at: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: Rarity
  kind: 'auto' | 'manual'
  rule_category_id: string | null
  rule_min_difficulty: Difficulty | null
  rule_count: number | null
  manual_unlocked_on: string | null
  created_at: string
}

export interface AppData {
  profiles: Profile[]
  categories: Category[]
  questTypes: QuestType[]
  media: Media[]
  quests: Quest[]
  completions: Completion[]
  reviews: Review[]
  photos: Photo[]
  achievements: Achievement[]
}
