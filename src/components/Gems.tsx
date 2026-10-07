import { DIFFICULTY_LABEL } from '../lib/difficulty'
import type { Difficulty } from '../lib/types'

const LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, epic: 4 }

export const GEM_COLOR: Record<Difficulty, { gem: string; text: string }> = {
  easy: { gem: '#22c55e', text: '#15803d' },
  medium: { gem: '#f59e0b', text: '#b45309' },
  hard: { gem: '#f97316', text: '#c2410c' },
  epic: { gem: '#d946ef', text: '#a21caf' },
}

export default function Gems({ difficulty, stacked = false, onDark = false }: { difficulty: Difficulty; stacked?: boolean; onDark?: boolean }) {
  const { gem, text } = GEM_COLOR[difficulty]
  return (
    <span className={`inline-flex items-center ${stacked ? 'flex-col gap-2' : 'gap-1.5'}`}>
      <span aria-hidden className="inline-flex gap-1">
        {[1, 2, 3, 4].map((i) => {
          const on = i <= LEVEL[difficulty]
          return <span key={i} data-on={on || undefined} className={`gem ${onDark ? 'gem-dark' : ''}`} style={on ? { background: gem, boxShadow: `0 0 6px ${gem}99` } : undefined} />
        })}
      </span>
      <span className="text-xs font-bold" style={{ color: onDark ? gem : text }}>{DIFFICULTY_LABEL[difficulty]}</span>
    </span>
  )
}
