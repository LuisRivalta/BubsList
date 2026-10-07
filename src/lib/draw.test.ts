import { describe, expect, it } from 'vitest'
import { quest, questType } from '../test/fixtures'
import { cityOptions, drawPool, sameText, type DrawFilter } from './filters'
import { effectiveCity, questMeta } from './tree'

const japao = quest({ id: 'japao', title: 'Japão', category_id: 'viagem', difficulty: 'epic', city: 'Tóquio ' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', category_id: 'ativ', difficulty: 'hard' })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', category_id: 'viagem', difficulty: 'medium' })
const brabus = quest({ id: 'brabus', title: 'Brabus Burguer', category_id: 'rest', type_id: 't-burger', city: 'Ribeirão Preto', difficulty: 'easy' })
const forno = quest({ id: 'forno', title: 'Forno a Lenha', category_id: 'rest', type_id: 't-pizza', city: 'ribeirao preto ', difficulty: 'medium' })
const sushi = quest({ id: 'sushi', title: 'Sushi', category_id: 'rest', city: 'São Paulo', difficulty: 'easy' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: 'filme', difficulty: 'easy' })
const quests = [japao, fuji, toquio, brabus, forno, sushi, matrix]
const types = [questType({ id: 't-burger', category_id: 'rest' }), questType({ id: 't-pizza', category_id: 'rest' })]
const none: DrawFilter = { categoryIds: [], typeIds: [], difficulties: [], cities: [] }
const pool = (done: string[], f: Partial<DrawFilter> = {}) => drawPool(quests, new Set(done), { ...none, ...f }, types).map((q) => q.id).sort()

describe('effectiveCity', () => {
  it('uses the quest own city, trimmed', () => expect(effectiveCity(quests, 'japao')).toBe('Tóquio'))
  it('inherits the city of the nearest ancestor that has one', () => expect(effectiveCity(quests, 'fuji')).toBe('Tóquio'))
  it('its own city wins over the ancestors', () => {
    const ramen = quest({ id: 'ramen', parent_id: 'toquio', city: 'Kyoto' })
    expect(effectiveCity([...quests, ramen], 'ramen')).toBe('Kyoto')
  })
  it('is null when nobody up the tree has a city', () => expect(effectiveCity(quests, 'matrix')).toBeNull())
})

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
  it('cities ignore accents, case and spaces, and count the inherited city', () => {
    expect(pool([], { cities: ['Ribeirão Preto'] })).toEqual(['brabus', 'forno'])
    expect(pool([], { cities: ['tóquio'] })).toEqual(['fuji', 'toquio'])
  })
  it('combines every filter', () => {
    expect(pool([], { categoryIds: ['rest'], difficulties: ['medium'], cities: ['Ribeirão Preto'] })).toEqual(['forno'])
  })
})

describe('cityOptions', () => {
  it('lists the effective cities once each, with the first spelling, alphabetically', () => {
    expect(cityOptions(quests)).toEqual(['Ribeirão Preto', 'São Paulo', 'Tóquio'])
  })
  it('can be limited to some quests', () => expect(cityOptions(quests, [brabus, matrix])).toEqual(['Ribeirão Preto']))
})

it('sameText ignores accents, case and surrounding spaces', () => {
  expect(sameText('Ribeirão Preto', ' ribeirao preto')).toBe(true)
  expect(sameText('Pizzaria', 'Hamburgueria')).toBe(false)
})
