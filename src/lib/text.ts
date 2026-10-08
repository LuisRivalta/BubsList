// "1 quest", "3 quests"
export const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const normalizeText = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export const sameText = (a: string, b: string) => normalizeText(a) === normalizeText(b)
