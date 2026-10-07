import { animate } from 'animejs'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { prefersReducedMotion } from '../lib/motion'
import { pathLabel } from '../lib/tree'
import type { Category, Quest } from '../lib/types'
import Bubble from './Bubble'
import Gems from './Gems'

const any = (pool: Quest[]) => pool[Math.floor(Math.random() * pool.length)]

// Titles spin like a slot machine, slow down and land on the drawn quest.
export default function DrawDialog({ pool, quests, categories, onClose }: { pool: Quest[]; quests: Quest[]; categories: Category[]; onClose: () => void }) {
  const [pick, setPick] = useState(() => any(pool))
  const [rolling, setRolling] = useState(false)
  const [round, setRound] = useState(0)

  useEffect(() => {
    const final = any(pool)
    if (prefersReducedMotion() || pool.length < 2) {
      setPick(final)
      return
    }
    setRolling(true)
    const tick = { n: 0 }
    let step = -1
    const a = animate(tick, {
      n: 14,
      duration: 1400,
      ease: 'outCubic',
      onUpdate: () => {
        if (Math.floor(tick.n) === step) return
        step = Math.floor(tick.n)
        setPick(any(pool))
      },
      onComplete: () => {
        setPick(final)
        setRolling(false)
      },
    })
    return () => {
      a.pause()
    }
  }, [round])

  const category = categories.find((c) => c.id === pick.category_id)
  const path = pathLabel(quests, pick.id)

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="draw-title" className="fixed inset-0 z-50 flex overflow-y-auto bg-night/70 p-4 backdrop-blur-sm">
      <div className="card relative m-auto w-full max-w-sm space-y-5 p-6 text-center">
        <button type="button" aria-label="Fechar" onClick={onClose} className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-ink/60 hover:bg-blush/40">
          <X aria-hidden className="size-5" />
        </button>
        <h2 id="draw-title" className="text-sm font-bold uppercase tracking-wider text-ink/60">Sorteio</h2>
        <div aria-live={rolling ? 'off' : 'polite'} className="flex min-h-44 flex-col items-center justify-center gap-3">
          <Bubble icon={category?.icon ?? ''} color={category?.color ?? '#b3607e'} size="lg" />
          <p className="font-display text-2xl font-bold leading-tight">{pick.title}</p>
          {path && <p className="text-sm text-ink/60">{path}</p>}
          <Gems difficulty={pick.difficulty} />
        </div>
        <div className="grid gap-2">
          <Link to={`/quests/${pick.id}`} className={`btn btn-primary min-h-12 ${rolling ? 'pointer-events-none opacity-60' : ''}`}>Bora!</Link>
          {pool.length > 1 && (
            <button type="button" className="btn min-h-12" disabled={rolling} onClick={() => setRound((r) => r + 1)}>Sortear outra</button>
          )}
        </div>
      </div>
    </div>
  )
}
