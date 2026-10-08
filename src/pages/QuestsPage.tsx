import { CalendarClock, PenLine } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import Bubble from '../components/Bubble'
import EmptyState from '../components/EmptyState'
import PageHero from '../components/PageHero'
import QuestActions from '../components/QuestActions'
import { QuestCards } from '../components/QuestList'
import Stagger from '../components/Stagger'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData } from '../data/hooks'
import { useUserId } from '../data/session'
import { evaluateAchievements } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import { filterQuests, pendingReviews } from '../lib/filters'
import { isOverdue, scheduleLabel, upcoming } from '../lib/schedule'
import { count } from '../lib/text'
import { doneQuestIds } from '../lib/tree'
import type { AppData } from '../lib/types'

export default function QuestsPage() {
  const q = useAppData()
  const me = useUserId()
  const [search, setSearch] = useState('')

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />

  const data = q.data
  const done = doneQuestIds(data.completions)
  const pending = pendingReviews(data.completions, data.reviews, me)
  const today = todayISO()
  const month = today.slice(0, 7)
  const next = upcoming(data.quests, done)
  const openCount = data.quests.filter((x) => x.parent_id === null && !done.has(x.id)).length
  const doneThisMonth = data.completions.filter((c) => c.done_on.startsWith(month)).length
  const unlocked = evaluateAchievements(data.achievements, data.quests, data.completions).filter((s) => s.unlockedOn).length
  // Search looks everywhere: every category, subquests included, pending and done.
  const found = search.trim()
    ? (['pending', 'done'] as const).flatMap((tab) => filterQuests(data.quests, done, { tab, categoryId: null, difficulty: null, search }))
    : []

  return (
    <>
      <PageHero
        title="Quests"
        stats={
          <>
            <span><strong className="text-white">{openCount}</strong> pendentes</span>
            <span aria-hidden>·</span>
            <span><strong className="text-white">{doneThisMonth}</strong> feitas este mês</span>
            <span aria-hidden>·</span>
            <span><strong className="text-white">{unlocked}</strong> conquistas</span>
          </>
        }
        actions={<QuestActions data={data} categoryId={null} />}
      />
      <div className="space-y-4">
        {next.length > 0 && (
          <section aria-labelledby="next-title" className="card space-y-2 p-4">
            <h2 id="next-title" className="flex items-center gap-2 font-bold">
              <CalendarClock aria-hidden className="size-4 text-accent" /> Próximas
            </h2>
            <ul className="space-y-1">
              {next.map((x) => {
                const c = data.categories.find((k) => k.id === x.category_id)
                return (
                  <li key={x.id}>
                    <Link to={`/quests/${x.id}`} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-blush/30">
                      <Bubble icon={c?.icon ?? ''} color={c?.color ?? '#e3b4cf'} size="sm" />
                      <span className="min-w-0 flex-1 truncate font-semibold">{x.title}</span>
                      <span className={`shrink-0 text-sm ${isOverdue(x.scheduled_on!, today) ? 'font-bold text-red-600' : 'text-ink/60'}`}>
                        {scheduleLabel(x.scheduled_on!, x.scheduled_time, today)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {pending.length > 0 && (
          <details className="card border-accent/30 bg-blush/30 p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-bold">
              <PenLine aria-hidden className="size-4 text-accent" /> Você tem {pending.length} {pending.length === 1 ? 'resenha pendente' : 'resenhas pendentes'}
            </summary>
            <ul className="mt-3 space-y-1.5">
              {pending.map((c) => (
                <li key={c.id}>
                  <Link to={`/quests/${c.quest_id}/concluir?completion=${c.id}`} className="font-semibold text-brand underline underline-offset-2">
                    {data.quests.find((x) => x.id === c.quest_id)?.title} — {formatDate(c.done_on)}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}

        <input type="search" aria-label="Buscar quests" placeholder="Buscar quests…" className="input w-full" value={search} onChange={(e) => setSearch(e.target.value)} />

        {!search.trim() ? (
          <CategoryGrid data={data} done={done} />
        ) : found.length === 0 ? (
          <EmptyState>Nenhuma quest encontrada.</EmptyState>
        ) : (
          <QuestCards quests={found} data={data} done={done} />
        )}
      </div>
    </>
  )
}

function CategoryGrid({ data, done }: { data: AppData; done: Set<string> }) {
  const topLevel = data.quests.filter((x) => x.parent_id === null)
  const cards = [
    ...data.categories.map((c) => ({ to: `/categoria/${c.id}`, name: c.name, icon: c.icon, color: c.color, quests: topLevel.filter((x) => x.category_id === c.id) })),
    { to: '/categoria/todas', name: 'Todas', icon: 'map', color: '#b3607e', quests: topLevel },
  ]
  return (
    <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {cards.map(({ to, name, icon, color, quests }) => {
        const doneCount = quests.filter((x) => done.has(x.id)).length
        return (
          <Link key={to} to={to} className="card card-hover flex flex-col items-start gap-3 p-4">
            <Bubble icon={icon} color={color} size="lg" />
            <span className="break-words font-display text-lg font-semibold leading-tight">{name}</span>
            <span className="text-sm text-ink/60">
              {quests.length ? `${count(quests.length - doneCount, 'pendente', 'pendentes')} · ${count(doneCount, 'feita', 'feitas')}` : 'Nenhuma ainda'}
            </span>
          </Link>
        )
      })}
    </Stagger>
  )
}
