import type { Achievement } from '../lib/types'
import Icon from './Icon'
import RarityBadge from './RarityBadge'

export default function Celebration({ achievements, onClose }: { achievements: Achievement[]; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="celebration-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="card w-full max-w-sm space-y-4 p-6 text-center">
        <h2 id="celebration-title" className="text-xl font-bold">Conquista desbloqueada!</h2>
        <ul className="space-y-4">
          {achievements.map((a) => (
            <li key={a.id} className="space-y-1">
              <Icon name={a.icon} className="mx-auto size-12 text-accent" />
              <p className="font-semibold">{a.name}</p>
              <RarityBadge rarity={a.rarity} />
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary w-full" onClick={onClose} autoFocus>Continuar</button>
      </div>
    </div>
  )
}
