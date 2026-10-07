import { PenLine, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import Icon from '../components/Icon'
import QuestCard from '../components/QuestCard'
import { LoadError, Loading } from '../components/Status'
import { useAppData, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { formatDate } from '../lib/dates'
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
  if (!data) return <Loading />

  const pending = pendingReviews(data.completions, data.reviews, me)
  const set = (patch: Partial<QuestFilter>) => setFilter((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quests</h1>

      {pending.length > 0 && (
        <details className="card p-3">
          <summary className="cursor-pointer font-medium">
            <PenLine aria-hidden className="mr-1 inline size-4" /> Você tem {pending.length} {pending.length === 1 ? 'resenha pendente' : 'resenhas pendentes'}
          </summary>
          <ul className="mt-2 space-y-1">
            {pending.map((c) => (
              <li key={c.id}>
                <Link to={`/quests/${c.quest_id}/concluir?completion=${c.id}`} className="underline">
                  {data.quests.find((x) => x.id === c.quest_id)?.title} — {formatDate(c.done_on)}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div role="tablist" aria-label="Situação" className="grid grid-cols-2 gap-2">
        {(['pending', 'done'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={filter.tab === t} onClick={() => set({ tab: t })} className={`btn ${filter.tab === t ? 'btn-primary' : ''}`}>
            {t === 'pending' ? 'Pendentes' : 'Feitas'}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="search"
          aria-label="Buscar quests"
          placeholder="Buscar…"
          className="input flex-1"
          value={filter.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        <select
          aria-label="Dificuldade"
          className="input w-36"
          value={filter.difficulty ?? ''}
          onChange={(e) => set({ difficulty: (e.target.value || null) as Difficulty | null })}
        >
          <option value="">Todas</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {data.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filter.categoryId === c.id}
            onClick={() => set({ categoryId: filter.categoryId === c.id ? null : c.id })}
            className={`btn shrink-0 ${filter.categoryId === c.id ? 'btn-primary' : ''}`}
          >
            <Icon name={c.icon} className="size-4" /> {c.name}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-gray-500">
          {filter.tab === 'pending' ? 'Nenhuma quest pendente por aqui. Que tal criar uma?' : 'Nenhuma quest feita ainda.'}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((x) => (
            <QuestCard key={x.id} quest={x} data={data} done={done} showPath photoUrl={urls[coverOf(x.id) ?? '']} />
          ))}
        </div>
      )}

      <Link
        to="/quests/nova"
        className="fab fixed bottom-20 right-4 z-20 inline-flex items-center gap-2 rounded-full px-5 py-3.5 font-semibold text-white md:bottom-8 md:right-8"
      >
        <Sparkles aria-hidden className="size-5" /> Nova quest
      </Link>
    </div>
  )
}
