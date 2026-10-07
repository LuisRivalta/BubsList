export type Point = [number, number]

// Midpoint displacement: every pass splits each segment and nudges its midpoint sideways by a halving amount,
// so the total sideways drift stays under length * jitter.
export function makeBolt(start: Point, end: Point, depth: number, jitter: number, rand: () => number = Math.random): Point[] {
  let points: Point[] = [start, end]
  let amplitude = (Math.hypot(end[0] - start[0], end[1] - start[1]) * jitter) / 2
  for (let pass = 0; pass < depth; pass++) {
    const next: Point[] = [points[0]]
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]
      const [bx, by] = points[i]
      const length = Math.hypot(bx - ax, by - ay) || 1
      const offset = (rand() * 2 - 1) * amplitude
      next.push([(ax + bx) / 2 - ((by - ay) / length) * offset, (ay + by) / 2 + ((bx - ax) / length) * offset], points[i])
    }
    points = next
    amplitude /= 2
  }
  return points
}
