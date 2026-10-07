import { useState } from 'react'
import { useSignedUrls } from '../data/hooks'
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../lib/difficulty'
import { filterQuests, type QuestFilter } from '../lib/filters'
import { doneQuestIds } from '../lib/tree'
import type { AppData, Difficulty, Quest } from '../lib/types'
import EmptyState from './EmptyState'
import QuestCard from './QuestCard'
import SegmentedControl from './SegmentedControl'
import Stagger from './Stagger'

export function QuestCards({ quests, data, done }: { quests: Quest[]; data: AppData; done: Set<string> }) {
  const coverOf = (questId: string) => data.photos.find((p) => p.quest_id === questId)?.storage_path
  const urls = useSignedUrls(quests.filter((x) => !x.media_id).flatMap((x) => coverOf(x.id) ?? [])).data ?? {}
  return (
    <Stagger className="grid gap-3 md:grid-cols-2">
      {quests.map((x) => (
        <QuestCard key={x.id} quest={x} data={data} done={done} showPath photoUrl={urls[coverOf(x.id) ?? '']} />
      ))}
    </Stagger>
  )
}

// Pending/done tabs, difficulty filter and the cards of one category (null = all of them).
export default function QuestList({ data, categoryId }: { data: AppData; categoryId: string | null }) {
  const [tab, setTab] = useState<QuestFilter['tab']>('pending')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const done = doneQuestIds(data.completions)
  const list = filterQuests(data.quests, done, { tab, categoryId, difficulty, search: '' })
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SegmentedControl
            label="Situação"
            value={tab}
            onChange={(t) => setTab(t)}
            options={[{ value: 'pending', label: 'Pendentes' }, { value: 'done', label: 'Feitas' }]}
          />
        </div>
        <select aria-label="Dificuldade" className="input sm:w-44" value={difficulty ?? ''} onChange={(e) => setDifficulty((e.target.value || null) as Difficulty | null)}>
          <option value="">Todas as dificuldades</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
        </select>
      </div>
      {list.length === 0 ? (
        <EmptyState>{tab === 'pending' ? 'Nenhuma quest pendente por aqui. Que tal criar uma?' : 'Nenhuma quest feita ainda.'}</EmptyState>
      ) : (
        <QuestCards key={`${tab}-${difficulty}`} quests={list} data={data} done={done} />
      )}
    </div>
  )
}
