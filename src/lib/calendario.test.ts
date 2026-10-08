import { describe, expect, it } from 'vitest'
import { buildIcs, GET } from '../../api/calendario'

const now = new Date('2026-10-08T15:04:05Z')
const base = { title: 'Brabus Burguer', date: '2026-10-10', time: null, location: null, uid: 'brabus', now }
const lines = (ics: string) => ics.split('\r\n')

describe('buildIcs', () => {
  it('an all-day event ends the next day', () => {
    const l = lines(buildIcs(base))
    expect(l).toContain('DTSTART;VALUE=DATE:20261010')
    expect(l).toContain('DTEND;VALUE=DATE:20261011')
    expect(l).toContain('UID:brabus-2026-10-10@bubs2do')
    expect(l).toContain('DTSTAMP:20261008T150405Z')
    expect(l).toContain('SUMMARY:Brabus Burguer')
    expect(l.some((x) => x.startsWith('LOCATION'))).toBe(false)
  })
  it('a timed event lasts 2 h in floating local time, past midnight too', () => {
    expect(lines(buildIcs({ ...base, time: '20:30' }))).toEqual(expect.arrayContaining(['DTSTART:20261010T203000', 'DTEND:20261010T223000']))
    expect(lines(buildIcs({ ...base, date: '2026-12-31', time: '23:00' }))).toEqual(expect.arrayContaining(['DTSTART:20261231T230000', 'DTEND:20270101T010000']))
  })
  it('escapes commas, semicolons, backslashes and line breaks', () => {
    const ics = buildIcs({ ...base, title: 'Pizza; vinho\\e\nmais', location: 'Ribeirão Preto, São Paulo, Brasil' })
    expect(lines(ics)).toEqual(expect.arrayContaining(['SUMMARY:Pizza\\; vinho\\\\e\\nmais', 'LOCATION:Ribeirão Preto\\, São Paulo\\, Brasil']))
  })
  it('folds lines over 75 bytes without splitting a character, and ends with CRLF', () => {
    const ics = buildIcs({ ...base, title: 'Ação '.repeat(40) })
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${'Ação '.repeat(40)}`)
    for (const l of lines(ics)) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
  })
  it('starts and ends the calendar', () => {
    const l = lines(buildIcs(base))
    expect(l.slice(0, 3)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bubs2Do//PT-BR'])
    expect(l).toContain('BEGIN:VEVENT')
  })
})

describe('GET /api/calendario', () => {
  const get = (q: string) => GET(new Request(`https://bubs2do.vercel.app/api/calendario?${q}`))
  it('answers text/calendar for a valid date', async () => {
    const res = get('t=Brabus&d=2026-10-10&h=20%3A00&l=Ribeir%C3%A3o+Preto&id=brabus')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
    const body = await res.text()
    expect(body).toContain('DTSTART:20261010T200000')
    expect(body).toContain('LOCATION:Ribeirão Preto')
  })
  it('refuses a date or time that does not exist', () => {
    for (const q of ['t=x&d=2026-02-30', 't=x&d=2026-13-01', 't=x&d=amanha', 't=x', 't=x&d=2026-10-10&h=24:00', 't=x&d=2026-10-10&h=8h']) expect(get(q).status).toBe(400)
  })
  it('a missing title or an odd id still makes a valid event', async () => {
    const body = await get('d=2026-10-10&id=../x').text()
    expect(body).toContain('SUMMARY:Quest')
    expect(body).toContain('UID:quest-2026-10-10@bubs2do')
  })
})
