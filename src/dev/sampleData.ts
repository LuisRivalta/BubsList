import { todayISO, toISO } from '../lib/dates'
import type { Achievement, AppData, Category, CategoryKind, Completion, Difficulty, Media, Quest, Review } from '../lib/types'

// Realistic data for the dev-only preview page. Dates are relative to today so the report has content.
export const ME = 'preview-me'
const PARTNER = 'preview-bubs'
const T = '2026-01-01T00:00:00Z'
const [Y, M, D] = todayISO().split('-').map(Number)

const day = (d: number, monthsAgo = 0) => {
  const index = Y * 12 + (M - 1) - monthsAgo
  return toISO(Math.floor(index / 12), (index % 12) + 1, monthsAgo === 0 ? Math.min(d, D) : d)
}

const cat = (id: string, name: string, icon: string, color: string, kind: CategoryKind = 'general'): Category => ({
  id, name, icon, color, kind, builtin: true, created_at: T,
})

const quest = (id: string, title: string, category_id: string, difficulty: Difficulty, extra: Partial<Quest> = {}): Quest => ({
  id, parent_id: null, category_id, title, notes: null, difficulty, media_id: null, progress_season: null,
  progress_episode: null, created_by: ME, created_at: T, updated_at: T, ...extra,
})

const done = (id: string, quest_id: string, done_on: string): Completion => ({ id, quest_id, done_on, created_by: ME, created_at: `${done_on}T12:00:00Z` })

const review = (completion_id: string, user_id: string, rating: number, body: string | null = null): Review => ({
  id: `r-${completion_id}-${user_id}`, completion_id, user_id, rating, body, created_at: T, updated_at: T,
})

const media = (id: string, source: Media['source'], title: string, poster_url: string | null, seasons: Media['seasons'], runtime_minutes: number): Media => ({
  id, source, external_id: id, title, poster_url, synopsis: `Sinopse de exemplo de ${title}.`, year: 2011, genres: [],
  runtime_minutes, seasons, fetched_at: new Date().toISOString(), created_at: T,
})

const achievement = (id: string, name: string, icon: string, rarity: Achievement['rarity'], rule: Partial<Achievement>): Achievement => ({
  id, name, description: `Descrição de ${name}.`, icon, rarity, kind: 'auto', rule_category_id: null, rule_min_difficulty: null,
  rule_count: 1, manual_unlocked_on: null, created_at: T, ...rule,
})

export const sampleData: AppData = {
  profiles: [
    { id: ME, display_name: 'Luis', avatar_path: null, created_at: T },
    { id: PARTNER, display_name: 'Bubs', avatar_path: null, created_at: T },
  ],
  categories: [
    cat('viagem', 'Viagem', 'plane', '#0ea5e9'),
    cat('rest', 'Restaurante', 'utensils', '#f97316'),
    cat('ativ', 'Atividade', 'target', '#22c55e'),
    cat('filme', 'Filme', 'clapperboard', '#ef4444', 'movie'),
    cat('serie', 'Série', 'tv', '#8b5cf6', 'series'),
    cat('anime', 'Anime', 'swords', '#ec4899', 'anime'),
    cat('outro', 'Outro', 'sparkles', '#64748b'),
  ],
  media: [
    media('m-hxh', 'anilist', 'Hunter x Hunter (2011)', '/login/killua.webp', [{ season: 1, episodes: 148 }], 23),
    media('m-sm', 'anilist', 'Sailor Moon Crystal', '/login/usagi.webp', [{ season: 1, episodes: 39 }], 24),
    media('m-dark', 'tmdb_tv', 'Dark', null, [{ season: 1, episodes: 10 }, { season: 2, episodes: 8 }, { season: 3, episodes: 8 }], 55),
  ],
  quests: [
    quest('japao', 'Japão', 'viagem', 'epic', { notes: 'Ver as cerejeiras em abril e comer muito ramen.' }),
    quest('toquio', 'Tóquio', 'viagem', 'hard', { parent_id: 'japao' }),
    quest('ichiran', 'Ichiran Ramen', 'rest', 'easy', { parent_id: 'toquio' }),
    quest('fuji', 'Monte Fuji', 'ativ', 'hard', { parent_id: 'japao' }),
    quest('batata', 'Batata do Marechal', 'rest', 'medium'),
    quest('hxh', 'Hunter x Hunter', 'anime', 'epic', { media_id: 'm-hxh', progress_season: 1, progress_episode: 37 }),
    quest('sm', 'Sailor Moon Crystal', 'anime', 'medium', { media_id: 'm-sm' }),
    quest('dark', 'Dark', 'serie', 'hard', { media_id: 'm-dark', progress_season: 2, progress_episode: 5 }),
    quest('serra', 'Acampar na Serra da Mantiqueira e ver o nascer do sol lá de cima juntos', 'ativ', 'medium'),
    quest('matrix', 'Matrix', 'filme', 'easy'),
  ],
  completions: [
    done('c-matrix', 'matrix', day(2)),
    done('c-sm', 'sm', day(5)),
    done('c-batata', 'batata', day(6)),
    done('c-batata-old', 'batata', day(20, 1)),
    done('c-ichiran', 'ichiran', day(12, 2)),
  ],
  reviews: [
    review('c-matrix', ME, 4, 'Clássico. Ainda funciona demais.'),
    review('c-matrix', PARTNER, 5),
    review('c-sm', PARTNER, 5, 'Nostalgia pura.'),
    review('c-batata', ME, 5, 'A melhor batata do Rio.'),
    review('c-batata', PARTNER, 4),
  ],
  photos: [],
  achievements: [
    achievement('a1', 'Primeira quest', 'star', 'bronze', {}),
    achievement('a2', 'Em ritmo', 'flame', 'bronze', { rule_count: 10 }),
    achievement('a3', 'Primeira garfada', 'utensils', 'bronze', { rule_category_id: 'rest' }),
    achievement('a4', 'Bons de garfo', 'pizza', 'silver', { rule_category_id: 'rest', rule_count: 10 }),
    achievement('a5', 'Pipoca pronta', 'popcorn', 'bronze', { rule_category_id: 'filme' }),
    achievement('a6', 'Otakus', 'swords', 'silver', { rule_category_id: 'anime', rule_count: 5 }),
    achievement('a7', 'Lendários', 'gem', 'gold', { rule_min_difficulty: 'epic' }),
    achievement('a8', 'Rei dos piratas', 'anchor', 'platinum', { rule_category_id: 'anime', rule_min_difficulty: 'epic' }),
    achievement('a9', 'Nascer do sol juntos', 'sunrise', 'silver', { kind: 'manual', rule_count: null, manual_unlocked_on: day(15, 1) }),
    achievement('a10', 'Aurora boreal', 'moon-star', 'platinum', { kind: 'manual', rule_count: null }),
  ],
}
