// "Adicionar ao calendário": a real link that answers text/calendar makes the iPhone show its add-event sheet
// (a file built inside the installed app often fails there). Self-contained on purpose: Vercel runs this file as is.

export interface IcsEvent {
  title: string
  date: string // YYYY-MM-DD
  time: string | null // HH:MM, floating local time
  location: string | null
  uid: string
  now: Date
}

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const stamp = (d: Date) => d.toISOString().slice(0, 19).replace(/[-:]/g, '') // 20261010T203000, from the UTC parts
const encoder = new TextEncoder()

// Lines longer than 75 bytes go on as continuation lines (a leading space), never splitting a character.
function fold(line: string): string {
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const size = encoder.encode(ch).length
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += size
  }
  out.push(current)
  return out.join('\r\n ')
}

export function buildIcs(e: IcsEvent): string {
  // The date and time are read as UTC parts and written back without a zone: the phone shows them in its own time.
  const start = new Date(`${e.date}T${e.time ?? '00:00'}:00Z`)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bubs2Do//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${e.uid}-${e.date}@bubs2do`, `DTSTAMP:${stamp(e.now)}Z`]
  if (e.time) lines.push(`DTSTART:${stamp(start)}`, `DTEND:${stamp(new Date(start.getTime() + 2 * 3_600_000))}`)
  else lines.push(`DTSTART;VALUE=DATE:${stamp(start).slice(0, 8)}`, `DTEND;VALUE=DATE:${stamp(new Date(start.getTime() + 86_400_000)).slice(0, 8)}`)
  lines.push(`SUMMARY:${escape(e.title)}`)
  if (e.location) lines.push(`LOCATION:${escape(e.location)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
function realDate(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const t = new Date(`${d}T00:00:00Z`)
  return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(d)
}

export function GET(request: Request): Response {
  const p = new URL(request.url).searchParams
  const date = p.get('d') ?? ''
  const time = p.get('h')
  if (!realDate(date) || (time !== null && !TIME.test(time))) return new Response('Data ou horário inválido', { status: 400 })
  const id = p.get('id') ?? ''
  const ics = buildIcs({
    title: (p.get('t') ?? '').trim().slice(0, 200) || 'Quest',
    date,
    time,
    location: p.get('l')?.trim().slice(0, 200) || null,
    uid: /^[\w-]{1,64}$/.test(id) ? id : 'quest',
    now: new Date(),
  })
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="quest.ics"' } })
}
