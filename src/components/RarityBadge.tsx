import { RARITY_LABEL } from '../lib/achievements'
import type { Rarity } from '../lib/types'

const STYLE: Record<Rarity, string> = {
  bronze: 'bg-bronze/15 text-bronze',
  silver: 'bg-silver/20 text-gray-600',
  gold: 'bg-gold/20 text-yellow-700',
  platinum: 'bg-platinum/20 text-cyan-700',
}

export default function RarityBadge({ rarity }: { rarity: Rarity }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STYLE[rarity]}`}>{RARITY_LABEL[rarity]}</span>
}
