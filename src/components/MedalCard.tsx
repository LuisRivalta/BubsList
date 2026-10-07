import { Lock, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { setManualUnlock } from '../data/api'
import { describeRule, type AchievementStatus } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import type { Category } from '../lib/types'
import Icon from './Icon'
import ProgressBar from './ProgressBar'

export default function MedalCard({ status, categories, onChange }: { status: AchievementStatus; categories: Category[]; onChange: () => void }) {
  const { achievement: a, unlockedOn, current, target } = status
  const [unlocking, setUnlocking] = useState(false)
  const [date, setDate] = useState(todayISO())

  async function unlock() {
    await setManualUnlock(a.id, date)
    onChange()
  }

  async function relock() {
    if (!window.confirm('Bloquear de novo?')) return
    await setManualUnlock(a.id, null)
    onChange()
  }

  return (
    <article className={`medal medal-${a.rarity} ${unlockedOn ? '' : 'medal-locked'}`}>
      <div className="medal-inner flex gap-3 p-4">
        <div className="medallion">
          <Icon name={a.icon} className="size-7" />
          {!unlockedOn && <Lock aria-hidden className="medallion-lock" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-lg font-semibold leading-tight ${unlockedOn ? '' : 'text-ink/60'}`}>{a.name}</h3>
            <Link to={`/conquistas/${a.id}/editar`} aria-label={`Editar ${a.name}`} className="grid size-8 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-blush/40">
              <Pencil aria-hidden className="size-4" />
            </Link>
          </div>
          {a.description && <p className="text-sm text-ink/60">{a.description}</p>}
          {a.kind === 'auto' && <p className="text-xs font-semibold text-ink/60">{describeRule(a, categories)}</p>}
          {unlockedOn ? (
            <p className="text-sm font-bold text-emerald-700">Desbloqueada em {formatDate(unlockedOn)}</p>
          ) : a.kind === 'auto' ? (
            <ProgressBar value={current} max={target}>
              <span className="font-bold">{current}/{target}</span>
            </ProgressBar>
          ) : unlocking ? (
            <div className="flex flex-wrap gap-2">
              <input type="date" aria-label="Data do desbloqueio" className="input" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={unlock}>Confirmar</button>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setUnlocking(true)}>Desbloquear</button>
          )}
          {a.kind === 'manual' && unlockedOn && (
            <button type="button" className="text-xs font-semibold text-ink/60 underline" onClick={relock}>Bloquear de novo</button>
          )}
        </div>
      </div>
    </article>
  )
}
