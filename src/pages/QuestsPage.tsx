import { PenLine, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import Bubble from '../components/Bubble'
import EmptyState from '../components/EmptyState'
import PageHero from '../components/PageHero'
import QuestCard from '../components/QuestCard'
import SegmentedControl from '../components/SegmentedControl'
import Stagger from '../components/Stagger'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { evaluateAchievements } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../lib/difficulty'
import { filterQuests, pendingReviews, type QuestFilter } from '../lib/filters'
import { doneQuestIds } from '../lib/tree'
import type { Difficulty } from '../lib/types'

export default function QuestsPage() {
  const q = useAppData()
  const me = useUserId()
  const [filter, setFilter] = useState<QuestFilter>({ tab: 'pending', categoryId: null, difficulty: null, search: '' })
  const data = q.data
  const done = doneQuestIds(data?.completions ?? [])
  const list = data ? filterQuests(data.quests, done, filter) : []
  const coverOf = (questId: string) => data?.photos.find((p) => p.quest_id === questId)?.storage_path
  const coverPaths = list.filter((x) => !x.media_id).flatMap((x) => coverOf(x.id) ?? [])
  const urls = useSignedUrls(coverPaths).data ?? {}

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!data) return <PageLoading />

  const pending = pendingReviews(data.completions, data.reviews, me)
  const set = (patch: Partial<QuestFilter>) => setFilter((f) => ({ ...f, ...patch }))
  const month = todayISO().slice(0, 7)
  const openCount = data.quests.filter((x) => x.parent_id === null && !done.has(x.id)).length
  const doneThisMonth = data.completions.filter((c) => c.done_on.startsWith(month)).length
  const unlocked = evaluateAchievements(data.achievements, data.quests, data.completions).filter((s) => s.unlockedOn).length

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
        actions={
          <Link to="/quests/nova" className="fab relative inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-lg font-semibold text-white md:w-auto">
            <Sparkles aria-hidden className="size-6" /> Nova quest
          </Link>
        }
      />
      <div className="space-y-4">
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

        <SegmentedControl
          label="Situação"
          value={filter.tab}
          onChange={(tab) => set({ tab })}
          options={[{ value: 'pending', label: 'Pendentes' }, { value: 'done', label: 'Feitas' }]}
        />

        <div className="flex gap-2">
          <input type="search" aria-label="Buscar quests" placeholder="Buscar…" className="input flex-1" value={filter.search} onChange={(e) => set({ search: e.target.value })} />
          <select aria-label="Dificuldade" className="input w-36" value={filter.difficulty ?? ''} onChange={(e) => set({ difficulty: (e.target.value || null) as Difficulty | null })}>
            <option value="">Todas</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
          </select>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {data.categories.map((c) => (
            <button key={c.id} type="button" aria-pressed={filter.categoryId === c.id} onClick={() => set({ categoryId: filter.categoryId === c.id ? null : c.id })} className="chip">
              <Bubble icon={c.icon} color={c.color} size="sm" /> {c.name}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyState>{filter.tab === 'pending' ? 'Nenhuma quest pendente por aqui. Que tal criar uma?' : 'Nenhuma quest feita ainda.'}</EmptyState>
        ) : (
          <Stagger key={`${filter.tab}-${filter.categoryId}-${filter.difficulty}`} className="grid gap-3 md:grid-cols-2">
            {list.map((x) => (
              <QuestCard key={x.id} quest={x} data={data} done={done} showPath photoUrl={urls[coverOf(x.id) ?? '']} />
            ))}
          </Stagger>
        )}
      </div>
    </>
  )
}
