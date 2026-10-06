import type { Achievement, AppData, Category, Completion, Media, Photo, Quest, Review } from '../lib/types'

export const ME = 'user-me'
export const PARTNER = 'user-partner'

const T = '2026-01-01T00:00:00Z'
let seq = 0
const nextId = (prefix: string) => `${prefix}-${++seq}`

export const category = (o: Partial<Category> = {}): Category => ({
  id: nextId('cat'), name: 'Viagem', icon: '✈️', color: '#0ea5e9', kind: 'general', builtin: true, created_at: T, ...o,
})

export const quest = (o: Partial<Quest> = {}): Quest => ({
  id: nextId('q'), parent_id: null, category_id: 'cat-none', title: 'Quest', notes: null, difficulty: 'easy',
  media_id: null, progress_season: null, progress_episode: null, created_by: ME, created_at: T, updated_at: T, ...o,
})

export const completion = (o: Partial<Completion> = {}): Completion => ({
  id: nextId('c'), quest_id: 'q-none', done_on: '2026-10-01', created_by: ME, created_at: '2026-10-01T12:00:00Z', ...o,
})

export const review = (o: Partial<Review> = {}): Review => ({
  id: nextId('r'), completion_id: 'c-none', user_id: ME, rating: 5, body: null, created_at: T, updated_at: T, ...o,
})

export const photo = (o: Partial<Photo> = {}): Photo => ({
  id: nextId('p'), quest_id: null, review_id: null, storage_path: `${nextId('path')}.jpg`, created_by: ME, created_at: T, ...o,
})

export const achievement = (o: Partial<Achievement> = {}): Achievement => ({
  id: nextId('a'), name: 'Conquista', description: '', icon: '⭐', rarity: 'bronze', kind: 'auto',
  rule_category_id: null, rule_min_difficulty: null, rule_count: 1, manual_unlocked_on: null, created_at: T, ...o,
})

export const media = (o: Partial<Media> = {}): Media => ({
  id: nextId('m'), source: 'tmdb_tv', external_id: '1', title: 'Série', poster_url: null, synopsis: null, year: 2020,
  genres: [], runtime_minutes: 45, seasons: [{ season: 1, episodes: 10 }], fetched_at: new Date().toISOString(), created_at: T, ...o,
})

export const CATS = {
  viagem: category({ id: 'cat-viagem', name: 'Viagem', icon: '✈️', color: '#0ea5e9' }),
  restaurante: category({ id: 'cat-rest', name: 'Restaurante', icon: '🍽️', color: '#f97316' }),
  atividade: category({ id: 'cat-ativ', name: 'Atividade', icon: '🎯', color: '#22c55e' }),
  filme: category({ id: 'cat-filme', name: 'Filme', icon: '🎬', color: '#ef4444', kind: 'movie' }),
  serie: category({ id: 'cat-serie', name: 'Série', icon: '📺', color: '#8b5cf6', kind: 'series' }),
  anime: category({ id: 'cat-anime', name: 'Anime', icon: '🍥', color: '#ec4899', kind: 'anime' }),
}

export const allCats = () => Object.values(CATS)

export const appData = (o: Partial<AppData> = {}): AppData => ({
  profiles: [
    { id: ME, display_name: 'Luis', avatar_path: null, created_at: T },
    { id: PARTNER, display_name: 'Bubs', avatar_path: null, created_at: '2026-01-02T00:00:00Z' },
  ],
  categories: [], media: [], quests: [], completions: [], reviews: [], photos: [], achievements: [],
  ...o,
})
