const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

export const todayISO = (now = new Date()) => toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
