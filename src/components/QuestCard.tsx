import { Check, ListChecks, Play } from 'lucide-react'
import { Link } from 'react-router'
import { episodesWatched, formatProgress, progressOf } from '../lib/progress'
import { pathLabel, questMeta, subquestProgress } from '../lib/tree'
import type { AppData, Quest } from '../lib/types'
import Bubble from './Bubble'
import Gems from './Gems'
import ProgressBar from './ProgressBar'

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
  const meta = questMeta(data, quest)
  const image = media?.poster_url ?? photoUrl
  const series = media && media.source !== 'tmdb_movie' ? media : undefined
  const episodes = series ? episodesWatched(series.seasons, progressOf(quest)) : null
  return (
    <Link to={`/quests/${quest.id}`} className="card card-hover flex gap-3 p-3">
      {image ? (
        <img src={image} alt="" loading="lazy" className="h-24 w-18 shrink-0 rounded-xl bg-blush/30 object-cover shadow-sm" />
      ) : (
        <Bubble icon={category?.icon ?? ''} color={category?.color ?? '#b3607e'} size="lg" />
      )}
      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        {path && <p className="truncate text-xs text-ink/60">{path} ›</p>}
        <p className="break-words font-display text-lg font-semibold leading-snug">{quest.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Gems difficulty={quest.difficulty} />
          {meta && <span className="text-ink/60">{meta}</span>}
          {done.has(quest.id) && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <Check aria-hidden className="size-3.5" /> Feita
            </span>
          )}
        </div>
        {sub.total > 0 && (
          <ProgressBar value={sub.done} max={sub.total}>
            <span className="inline-flex items-center gap-1"><ListChecks aria-hidden className="size-3.5" /> {sub.done}/{sub.total}</span>
            <span>subquests</span>
          </ProgressBar>
        )}
        {series && (
          <ProgressBar value={episodes?.watched ?? 0} max={episodes?.total ?? 0}>
            <span className="inline-flex items-center gap-1"><Play aria-hidden className="size-3.5" /> {formatProgress(series.source, series.seasons, progressOf(quest))}</span>
            {episodes && <span>{Math.round((episodes.watched / episodes.total) * 100)}%</span>}
          </ProgressBar>
        )}
      </div>
    </Link>
  )
}
