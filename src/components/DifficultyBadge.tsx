import { DIFFICULTY_LABEL } from '../lib/difficulty'
import type { Difficulty } from '../lib/types'

const STYLE: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-orange-100 text-orange-800',
  epic: 'bg-purple-100 text-purple-800',
}

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[difficulty]}`}>{DIFFICULTY_LABEL[difficulty]}</span>
}
