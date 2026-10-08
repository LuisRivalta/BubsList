import { describe, expect, it } from 'vitest'
import { category, quest, questType } from '../test/fixtures'
import { drawPool, sameText, type DrawFilter } from './filters'
import { questMeta } from './tree'

const japao = quest({ id: 'japao', title: 'Japão', category_id: 'viagem', difficulty: 'epic', city: 'Tóquio ' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', category_id: 'ativ', difficulty: 'hard' })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', category_id: 'viagem', difficulty: 'medium' })
const brabus = quest({ id: 'brabus', title: 'Brabus Burguer', category_id: 'rest', type_id: 't-burger', city: 'Ribeirão Preto', difficulty: 'easy' })
const forno = quest({ id: 'forno', title: 'Forno a Lenha', category_id: 'rest', type_id: 't-pizza', city: 'ribeirao preto ', difficulty: 'medium' })
const sushi = quest({ id: 'sushi', title: 'Sushi', category_id: 'rest', city: 'São Paulo', difficulty: 'easy' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: 'filme', difficulty: 'easy' })
const quests = [japao, fuji, toquio, brabus, forno, sushi, matrix]
const types = [questType({ id: 't-burger', category_id: 'rest' }), questType({ id: 't-pizza', category_id: 'rest' })]
const categories = [
  category({ id: 'viagem', has_place: true }),
  category({ id: 'ativ', has_place: true }),
  category({ id: 'rest', has_place: true }),
  category({ id: 'filme' }),
]
const none: DrawFilter = { categoryIds: [], typeIds: [], difficulties: [], places: [] }
const pool = (done: string[], f: Partial<DrawFilter> = {}) => drawPool(quests, new Set(done), { ...none, ...f }, { types, categories }).map((q) => q.id).sort()

describe('questMeta', () => {
  const data = { quests, questTypes: [questType({ id: 't-burger', name: 'Hamburgueria' })] }
  it('joins the type and the effective city', () => expect(questMeta(data, brabus)).toBe('Hamburgueria · Ribeirão Preto'))
  it('shows only what exists', () => {
    expect(questMeta(data, fuji)).toBe('Tóquio')
    expect(questMeta(data, matrix)).toBe('')
  })
})

describe('drawPool', () => {
  it('without filters: pending quests with no pending subquests, with or without type and city', () => {
    expect(pool(['matrix'])).toEqual(['brabus', 'forno', 'fuji', 'sushi', 'toquio'])
  })
  it('a quest whose subquests are all done can be drawn itself', () => {
    expect(pool(['matrix', 'fuji', 'toquio'])).toEqual(['brabus', 'forno', 'japao', 'sushi'])
  })
  it('filters by category', () => expect(pool([], { categoryIds: ['rest'] })).toEqual(['brabus', 'forno', 'sushi']))
  it('several categories add up', () => expect(pool([], { categoryIds: ['rest', 'filme'] })).toEqual(['brabus', 'forno', 'matrix', 'sushi']))
  it('a type filter keeps the chosen types of its category and drops the untyped quests of that category', () => {
    expect(pool([], { categoryIds: ['rest'], typeIds: ['t-burger', 't-pizza'] })).toEqual(['brabus', 'forno'])
  })
  it('a type only narrows its own category', () => {
    expect(pool([], { categoryIds: ['rest', 'filme'], typeIds: ['t-burger'] })).toEqual(['brabus', 'matrix'])
  })
  it('keeps any of the chosen difficulties', () => expect(pool(['matrix'], { difficulties: ['easy', 'hard'] })).toEqual(['brabus', 'fuji', 'sushi']))
  it('a place ignores accents, case and spaces, and counts the inherited place', () => {
    expect(pool([], { places: ['city:||ribeirao preto'] })).toEqual(['brabus', 'forno', 'matrix'])
    expect(pool(['matrix'], { places: ['city:||toquio'] })).toEqual(['fuji', 'toquio'])
  })
  it('a place never cuts categories without a physical place', () => {
    expect(pool([], { places: ['city:||ribeirao preto'] })).toContain('matrix')
  })
  it('combines every filter', () => {
    expect(pool([], { categoryIds: ['rest'], difficulties: ['medium'], places: ['city:||ribeirao preto'] })).toEqual(['forno'])
  })
  it('a country or a state takes everything inside it', () => {
    const rp = quest({ id: 'rp', category_id: 'rest', city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil' })
    const rio = quest({ id: 'rio', category_id: 'rest', city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brasil' })
    const tk = quest({ id: 'tk', category_id: 'viagem', city: 'Tóquio', country: 'Japão' })
    const ids = (places: string[]) => drawPool([rp, rio, tk], new Set(), { ...none, places }, { categories }).map((q) => q.id).sort()
    expect(ids(['country:brasil'])).toEqual(['rio', 'rp'])
    expect(ids(['state:brasil|sao paulo'])).toEqual(['rp'])
    expect(ids(['country:japao', 'state:brasil|rio de janeiro'])).toEqual(['rio', 'tk'])
  })
})

it('sameText ignores accents, case and surrounding spaces', () => {
  expect(sameText('Ribeirão Preto', ' ribeirao preto')).toBe(true)
  expect(sameText('Pizzaria', 'Hamburgueria')).toBe(false)
})
