import { describe, expect, it } from 'vitest'
import { quest } from '../test/fixtures'
import { calendarUrl, isOverdue, scheduleLabel, upcoming } from './schedule'

const TODAY = '2026-10-08' // quinta-feira

describe('scheduleLabel', () => {
  it('says Hoje, Amanhã, or the weekday and date', () => {
    expect(scheduleLabel('2026-10-08', null, TODAY)).toBe('Hoje')
    expect(scheduleLabel('2026-10-09', null, TODAY)).toBe('Amanhã')
    expect(scheduleLabel('2026-10-10', null, TODAY)).toBe('sáb, 10/10')
    expect(scheduleLabel('2027-01-03', null, TODAY)).toBe('dom, 03/01')
  })
  it('adds the time, with minutes only when they are not zero', () => {
    expect(scheduleLabel('2026-10-10', '20:00:00', TODAY)).toBe('sáb, 10/10 · 20h')
    expect(scheduleLabel('2026-10-08', '08:30', TODAY)).toBe('Hoje · 8h30')
  })
  it('a past date is late', () => {
    expect(scheduleLabel('2026-10-03', '20:00:00', TODAY)).toBe('Atrasada · 03/10')
    expect(isOverdue('2026-10-03', TODAY)).toBe(true)
    expect(isOverdue('2026-10-08', TODAY)).toBe(false)
  })
})

describe('upcoming', () => {
  it('lists scheduled quests by date, then time, a day without time first', () => {
    const late = quest({ id: 'late', scheduled_on: '2026-10-01' })
    const night = quest({ id: 'night', scheduled_on: '2026-10-10', scheduled_time: '20:00:00' })
    const allDay = quest({ id: 'allday', scheduled_on: '2026-10-10' })
    const morning = quest({ id: 'morning', scheduled_on: '2026-10-10', scheduled_time: '09:00:00' })
    const loose = quest({ id: 'loose' })
    expect(upcoming([night, loose, morning, allDay, late]).map((q) => q.id)).toEqual(['late', 'allday', 'morning', 'night'])
  })
  it('a quest done before and scheduled again ("Fazer de novo") is upcoming again', () => {
    // Completing clears the date (CompletePage), so any date still set is a plan for the next time.
    expect(upcoming([quest({ id: 'again', scheduled_on: '2026-10-10' })]).map((q) => q.id)).toEqual(['again'])
  })
})

describe('calendarUrl', () => {
  it('carries title, date, time, place and id', () => {
    const q = quest({ id: 'brabus', title: 'Brabus Burguer', scheduled_on: '2026-10-10', scheduled_time: '20:30:00' })
    expect(calendarUrl(q, 'Ribeirão Preto, São Paulo, Brasil')).toBe(
      '/api/calendario?t=Brabus+Burguer&d=2026-10-10&h=20%3A30&l=Ribeir%C3%A3o+Preto%2C+S%C3%A3o+Paulo%2C+Brasil&id=brabus',
    )
  })
  it('leaves out what is missing', () => {
    expect(calendarUrl(quest({ id: 'x', title: 'Cinema', scheduled_on: '2026-10-10' }), null)).toBe('/api/calendario?t=Cinema&d=2026-10-10&id=x')
  })
})
