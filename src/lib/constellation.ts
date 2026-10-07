// Timeline of the draw: a glow hops from star to star, slowing down, and lands on the winner.
export const HOPS = 12

export const hopDelays = (hops = HOPS, first = 60, ratio = 1.18) => Array.from({ length: hops }, (_, i) => Math.round(first * ratio ** i))

// Built backwards from the winner so the last hop is always it and no star is lit twice in a row.
export function hopSequence(stars: number, winner: number, hops = HOPS, rand = Math.random): number[] {
  const seq = [winner]
  while (seq.length < hops) {
    const after = seq[0]
    let next = Math.floor(rand() * stars)
    if (stars > 1 && next === after) next = (after + 1 + Math.floor(rand() * (stars - 1))) % stars
    seq.unshift(next)
  }
  return seq
}

const shuffle = <T>(list: T[], rand: () => number) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

// Up to `max` stars on screen, the winner always among them.
export function pickStars<T>(items: T[], winner: T, max = 40, rand = Math.random): T[] {
  const others = shuffle(items.filter((i) => i !== winner), rand).slice(0, max - 1)
  return shuffle([winner, ...others], rand)
}
