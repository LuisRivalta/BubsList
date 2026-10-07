import { Check, ListChecks, Play } from 'lucide-react'
import { Link } from 'react-router'
import { formatProgress, progressOf } from '../lib/progress'
import { pathLabel, subquestProgress } from '../lib/tree'
import type { AppData, Quest } from '../lib/types'
import DifficultyBadge from './DifficultyBadge'
import Icon from './Icon'

interface Props {
  quest: Quest
  data: AppData
  done: Set<string>
  photoUrl?: string
  showPath?: boolean
}

export default function QuestCard({ quest, data, done, photoUrl, showPath = false }: Props) {
  const category = data.categories.find((c) => c.id === quest.category_id)
  const media = quest.media_id ? data.media.find((m) => m.id === quest.media_id) : undefined
  const sub = subquestProgress(data.quests, done, quest.id)
  const path = showPath ? pathLabel(data.quests, quest.id) : ''
  const image = media?.poster_url ?? photoUrl
  return (
    <Link to={`/quests/${quest.id}`} className="card flex gap-3 p-3" style={{ borderLeft: `4px solid ${category?.color ?? '#e5e7eb'}` }}>
      {image && <img src={image} alt="" loading="lazy" className="h-20 w-14 shrink-0 rounded-lg bg-gray-100 object-cover" />}
      <div className="min-w-0 flex-1">
        {path && <p className="truncate text-xs text-gray-500">{path} ›</p>}
        <p className="flex items-center gap-1.5 font-semibold">
          <span style={{ color: category?.color }}><Icon name={category?.icon ?? ''} className="size-4" /></span> {quest.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <DifficultyBadge difficulty={quest.difficulty} />
          {sub.total > 0 && <span className="inline-flex items-center gap-1"><ListChecks aria-hidden className="size-3.5" /> {sub.done}/{sub.total}</span>}
          {media && media.source !== 'tmdb_movie' && (
            <span className="inline-flex items-center gap-1"><Play aria-hidden className="size-3.5" /> {formatProgress(media.source, media.seasons, progressOf(quest))}</span>
          )}
          {done.has(quest.id) && <span className="inline-flex items-center gap-1 text-green-700"><Check aria-hidden className="size-3.5" /> Feita</span>}
        </div>
      </div>
    </Link>
  )
}
