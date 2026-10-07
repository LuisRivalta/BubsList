import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import MedalCard from '../components/MedalCard'
import PageHero from '../components/PageHero'
import RarityBadge from '../components/RarityBadge'
import Stagger from '../components/Stagger'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData, useRefresh } from '../data/hooks'
import { RARITIES, RARITY_LABEL, evaluateAchievements } from '../lib/achievements'

function Ring({ value, max }: { value: number; max: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  const pct = max > 0 ? value / max : 0
  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg aria-hidden viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="url(#ring)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0" stopColor="#e3b4cf" />
            <stop offset="1" stopColor="#fde68a" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-center leading-none">
        <span className="block font-display text-2xl font-bold">{value}</span>
        <span className="text-xs text-white/70">de {max}</span>
      </span>
    </div>
  )
}

export default function AchievementsPage() {
  const q = useAppData()
  const refresh = useRefresh()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />
  const data = q.data
  const statuses = evaluateAchievements(data.achievements, data.quests, data.completions)
  const unlocked = statuses.filter((s) => s.unlockedOn)

  return (
    <>
      <PageHero title="Conquistas" actions={<Link to="/conquistas/nova" className="btn btn-ghost"><Plus aria-hidden className="size-4" /> Nova</Link>}>
        <div className="flex items-center gap-4">
          <Ring value={unlocked.length} max={statuses.length} />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/80">
            {RARITIES.map((r) => (
              <li key={r} className="inline-flex items-center gap-2">
                <span aria-hidden className={`medal-${r} size-3 rounded-full`} style={{ background: 'var(--metal)' }} />
                {RARITY_LABEL[r]}: <strong className="text-white">{unlocked.filter((s) => s.achievement.rarity === r).length}</strong>
              </li>
            ))}
          </ul>
        </div>
      </PageHero>
      <div className="space-y-8">
        {RARITIES.map((rarity) => {
          const group = statuses.filter((s) => s.achievement.rarity === rarity)
          if (group.length === 0) return null
          return (
            <section key={rarity} className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <RarityBadge rarity={rarity} /> {group.filter((s) => s.unlockedOn).length}/{group.length}
              </h2>
              <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((s) => <MedalCard key={s.achievement.id} status={s} categories={data.categories} onChange={refresh} />)}
              </Stagger>
            </section>
          )
        })}
      </div>
    </>
  )
}
