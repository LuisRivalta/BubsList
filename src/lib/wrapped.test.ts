import { describe, expect, it } from 'vitest'
import { CATS, ME, PARTNER, achievement, allCats, appData, completion, media, photo, quest, review } from '../test/fixtures'
import type { AppData } from './types'
import { buildWrapped, storyCard, type Slide } from './wrapped'

const batata = quest({ id: 'batata', title: 'Batata do Marechal', category_id: CATS.restaurante.id, difficulty: 'hard' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id, difficulty: 'medium', media_id: 'm-matrix' })
const fuji = quest({ id: 'fuji', title: 'Monte Fuji', category_id: CATS.atividade.id, difficulty: 'hard' })
const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, difficulty: 'epic' })
const matrixMedia = media({ id: 'm-matrix', source: 'tmdb_movie', poster_url: 'https://image.tmdb.org/matrix.jpg' })
const completions = [
  completion({ id: 'c1', quest_id: 'batata', done_on: '2026-03-10' }),
  completion({ id: 'c2', quest_id: 'matrix', done_on: '2026-03-20' }),
  completion({ id: 'c3', quest_id: 'fuji', done_on: '2026-07-01' }),
  completion({ id: 'c0', quest_id: 'batata', done_on: '2025-12-31' }),
]
const base = (o: Partial<AppData> = {}) =>
  appData({ categories: allCats(), media: [matrixMedia], quests: [batata, matrix, fuji, japao], completions, ...o })
const rated = (o: Partial<AppData> = {}) =>
  base({
    reviews: [
      review({ id: 'r1', completion_id: 'c1', user_id: ME, rating: 5 }),
      review({ id: 'r2', completion_id: 'c1', user_id: PARTNER, rating: 5 }),
      review({ id: 'r3', completion_id: 'c2', user_id: ME, rating: 5 }),
      review({ id: 'r4', completion_id: 'c2', user_id: PARTNER, rating: 2 }),
    ],
    photos: [photo({ review_id: 'r1', storage_path: 'batata.jpg' })],
    ...o,
  })
const kinds = (slides: Slide[]) => slides.map((s) => s.kind)
const find = <K extends Slide['kind']>(slides: Slide[], kind: K) => slides.find((s) => s.kind === kind) as Extract<Slide, { kind: K }>

describe('buildWrapped', () => {
  it('a year with completions but no reviews, medals or photos has the five fixed slides', () => {
    expect(kinds(buildWrapped(2026, base(), ME))).toEqual(['intro', 'total', 'categories', 'hardest', 'outro'])
  })

  it('a year without completions has no slides', () => {
    expect(buildWrapped(2024, base(), ME)).toEqual([])
  })

  it('the intro puts the viewer first', () => {
    expect(find(buildWrapped(2026, base(), ME), 'intro').names).toEqual(['Luis', 'Bubs'])
    expect(find(buildWrapped(2026, base(), PARTNER), 'intro').names).toEqual(['Bubs', 'Luis'])
  })

  it('total counts repeats in the year and picks the busiest month, the earliest on a tie', () => {
    const data = base({ completions: [...completions, completion({ quest_id: 'fuji', done_on: '2026-07-15' })] })
    expect(find(buildWrapped(2026, data, ME), 'total')).toMatchObject({ total: 4, busiestMonth: 'Março', busiestCount: 2 })
  })

  it('categories show the top three, most completed first', () => {
    const tokyo = quest({ id: 'tokyo', category_id: CATS.viagem.id })
    const data = base({
      quests: [batata, matrix, fuji, japao, tokyo],
      completions: [...completions, completion({ quest_id: 'tokyo', done_on: '2026-05-01' }), completion({ quest_id: 'batata', done_on: '2026-08-01' })],
    })
    const top = find(buildWrapped(2026, data, ME), 'categories').top
    expect(top).toHaveLength(3)
    expect(top[0]).toMatchObject({ category: { name: 'Restaurante' }, count: 2 })
  })

  it('hardest is the most difficult quest done in the year, the most recent on a tie', () => {
    expect(find(buildWrapped(2026, base(), ME), 'hardest').item.quest.id).toBe('fuji')
  })

  it('best and disagreement come from the ratings, with the photo or the poster as their image', () => {
    const slides = buildWrapped(2026, rated(), ME)
    expect(kinds(slides)).toEqual(['intro', 'total', 'categories', 'hardest', 'best', 'disagree', 'album', 'outro'])
    expect(find(slides, 'best')).toMatchObject({ item: { quest: { id: 'batata' } }, image: { path: 'batata.jpg' } })
    expect(find(slides, 'disagree')).toMatchObject({
      item: { quest: { id: 'matrix' } },
      image: { url: 'https://image.tmdb.org/matrix.jpg' },
      ratings: [{ name: 'Luis', rating: 5 }, { name: 'Bubs', rating: 2 }],
    })
  })

  it('skips the disagreement when they always agree', () => {
    const data = base({ reviews: [review({ completion_id: 'c1', user_id: ME, rating: 4 }), review({ completion_id: 'c1', user_id: PARTNER, rating: 4 })] })
    expect(kinds(buildWrapped(2026, data, ME))).toContain('best')
    expect(kinds(buildWrapped(2026, data, ME))).not.toContain('disagree')
  })

  it('medals and album appear when the year has them', () => {
    const data = base({
      reviews: [review({ id: 'r1', completion_id: 'c1', user_id: ME, rating: 5 })],
      photos: [photo({ review_id: 'r1' }), photo({ review_id: 'r1' })],
      achievements: [achievement({ name: 'Aurora boreal', kind: 'manual', rule_count: null, manual_unlocked_on: '2026-05-01' })],
    })
    const slides = buildWrapped(2026, data, ME)
    expect(find(slides, 'medals').unlocked.map((s) => s.achievement.name)).toEqual(['Aurora boreal'])
    expect(find(slides, 'album').photos).toHaveLength(2)
  })

  it('the outro counts top-level quests still pending', () => {
    expect(find(buildWrapped(2026, base(), ME), 'outro')).toEqual({ kind: 'outro', next: 2027, pending: 1 })
  })
})

describe('storyCard', () => {
  it('turns each slide into the text of its story', () => {
    const slides = buildWrapped(2026, rated(), ME)
    expect(storyCard(find(slides, 'intro'))).toEqual({ eyebrow: 'Retrospectiva', big: '2026', caption: 'Luis & Bubs', image: null })
    expect(storyCard(find(slides, 'total'))).toMatchObject({ big: '3 quests', caption: 'Março foi o mês mais movimentado (2)' })
    expect(storyCard(find(slides, 'hardest'))).toMatchObject({ eyebrow: 'A mais difícil', big: 'Monte Fuji', caption: 'Difícil · 01/07/2026' })
    expect(storyCard(find(slides, 'best'))).toMatchObject({ big: 'Batata do Marechal', caption: 'Nota 5 de 5', image: { path: 'batata.jpg' } })
    expect(storyCard(find(slides, 'disagree'))).toMatchObject({ caption: 'Luis deu 5, Bubs deu 2', image: { url: 'https://image.tmdb.org/matrix.jpg' } })
    expect(storyCard(find(slides, 'album'))).toMatchObject({ big: '1 foto', image: { path: 'batata.jpg' } })
    expect(storyCard(find(slides, 'outro'))).toMatchObject({ eyebrow: 'Bora pra 2027', big: '1 quest' })
  })
})
