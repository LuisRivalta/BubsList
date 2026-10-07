import { useState } from 'react'
import { Link } from 'react-router'
import RarityBadge from '../components/RarityBadge'
import { LoadError, Loading } from '../components/Status'
import { setManualUnlock } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { RARITIES, describeRule, evaluateAchievements, type AchievementStatus } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import type { Category } from '../lib/types'

export default function AchievementsPage() {
  const q = useAppData()
  const refresh = useRefresh()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const data = q.data
  const statuses = evaluateAchievements(data.achievements, data.quests, data.completions)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conquistas</h1>
        <Link to="/conquistas/nova" className="btn btn-primary">+ Nova</Link>
      </div>
      <p className="text-gray-600">{statuses.filter((s) => s.unlockedOn).length} de {statuses.length} desbloqueadas</p>
      {RARITIES.map((rarity) => {
        const group = statuses.filter((s) => s.achievement.rarity === rarity)
        if (group.length === 0) return null
        return (
          <section key={rarity} className="space-y-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <RarityBadge rarity={rarity} /> {group.filter((s) => s.unlockedOn).length}/{group.length}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((s) => <AchievementCard key={s.achievement.id} status={s} categories={data.categories} onChange={refresh} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function AchievementCard({ status, categories, onChange }: { status: AchievementStatus; categories: Category[]; onChange: () => void }) {
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
    <div className={`card flex gap-3 p-3 ${unlockedOn ? '' : 'opacity-75'}`}>
      <span aria-hidden className={`text-4xl ${unlockedOn ? '' : 'grayscale'}`}>{a.icon}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{a.name}</p>
          <Link to={`/conquistas/${a.id}/editar`} aria-label={`Editar ${a.name}`} className="px-2 text-gray-400">✎</Link>
        </div>
        {a.description && <p className="text-sm text-gray-600">{a.description}</p>}
        {a.kind === 'auto' && <p className="text-xs text-gray-500">{describeRule(a, categories)}</p>}
        {unlockedOn ? (
          <p className="text-sm text-green-700">Desbloqueada em {formatDate(unlockedOn)}</p>
        ) : a.kind === 'auto' ? (
          <div>
            <div className="h-2 rounded bg-gray-200">
              <div className="h-2 rounded bg-accent" style={{ width: `${(current / target) * 100}%` }} />
            </div>
            <p className="text-xs">{current}/{target}</p>
          </div>
        ) : unlocking ? (
          <div className="flex gap-2">
            <input type="date" aria-label="Data do desbloqueio" className="input" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            <button type="button" className="btn btn-primary" onClick={unlock}>Confirmar</button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setUnlocking(true)}>Desbloquear</button>
        )}
        {a.kind === 'manual' && unlockedOn && (
          <button type="button" className="text-xs text-gray-500 underline" onClick={relock}>Bloquear de novo</button>
        )}
      </div>
    </div>
  )
}
