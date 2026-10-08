import { animate } from 'animejs'
import { CalendarClock, CalendarDays, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import Avatar from '../components/Avatar'
import Bubble from '../components/Bubble'
import Gems from '../components/Gems'
import PageHero from '../components/PageHero'
import PhotoGrid from '../components/PhotoGrid'
import ProgressBar from '../components/ProgressBar'
import QuestCard from '../components/QuestCard'
import Stars from '../components/Stars'
import { LoadError, NotFound, PageLoading } from '../components/Status'
import { deleteCompletion, deleteQuest, setProgress } from '../data/api'
import { useAppData, useMediaRefresh, useRefresh, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { formatDate, todayISO } from '../lib/dates'
import { prefersReducedMotion } from '../lib/motion'
import { effectivePlace, placeLabel } from '../lib/place'
import { episodesWatched, formatProgress, nextEpisode, progressOf } from '../lib/progress'
import { calendarUrl, isOverdue, scheduleLabel } from '../lib/schedule'
import { ancestors, childrenOf, descendantIds, doneQuestIds, questMeta } from '../lib/tree'
import type { AppData, Completion, Quest } from '../lib/types'

export default function QuestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useUserId()
  const refresh = useRefresh()
  const q = useAppData()
  const plusButton = useRef<HTMLButtonElement>(null)
  const data = q.data
  const quest = data?.quests.find((x) => x.id === id)
  const media = quest?.media_id ? data?.media.find((m) => m.id === quest.media_id) : undefined
  const refPhotos = data && quest ? data.photos.filter((p) => p.quest_id === quest.id) : []
  const coverUrl = useSignedUrls(refPhotos.slice(0, 1).map((p) => p.storage_path)).data?.[refPhotos[0]?.storage_path ?? '']
  useMediaRefresh(media)

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!data) return <PageLoading />
  if (!quest) return <NotFound title="Quest não encontrada" />

  const category = data.categories.find((c) => c.id === quest.category_id)
  const path = ancestors(data.quests, quest.id)
  const meta = questMeta(data, quest)
  const done = doneQuestIds(data.completions)
  const isDone = done.has(quest.id)
  const children = childrenOf(data.quests, quest.id)
  const history = data.completions.filter((c) => c.quest_id === quest.id).sort((a, b) => b.done_on.localeCompare(a.done_on))
  const progress = progressOf(quest)
  const episodes = media ? episodesWatched(media.seasons, progress) : null

  async function plusOne() {
    if (!media) return
    const next = nextEpisode(media.seasons, progress)
    if (!next) {
      if (window.confirm('Vocês chegaram ao último episódio! Concluir agora?')) navigate(`/quests/${quest!.id}/concluir`)
      return
    }
    if (plusButton.current && !prefersReducedMotion()) animate(plusButton.current, { scale: [1, 1.12, 1], duration: 380, ease: 'outQuad' })
    await setProgress(quest!.id, next)
    await refresh()
  }

  async function remove() {
    const n = descendantIds(data!.quests, quest!.id).length
    if (!window.confirm(n ? `Excluir "${quest!.title}" e ${n} subquest(s)?` : `Excluir "${quest!.title}"?`)) return
    await deleteQuest(quest!.id, data!)
    navigate(quest!.parent_id ? `/quests/${quest!.parent_id}` : '/', { replace: true })
    await refresh()
  }

  async function removeCompletion(c: Completion) {
    if (!window.confirm('Excluir esta conclusão e as resenhas dela?')) return
    await deleteCompletion(c.id, data!)
    await refresh()
  }

  return (
    <>
      <PageHero
        cover={media?.poster_url ?? coverUrl}
        eyebrow={
          path.length > 0 && (
            <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1 text-sm text-white/75">
              {path.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1">
                  <Link to={`/quests/${a.id}`} className="font-semibold underline-offset-2 hover:underline">{a.title}</Link> ›
                </span>
              ))}
            </nav>
          )
        }
        title={quest.title}
        stats={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Bubble icon={category?.icon ?? ''} color={category?.color ?? '#e3b4cf'} size="sm" /> {category?.name}
            </span>
            <Gems difficulty={quest.difficulty} onDark />
            {meta && <span>{meta}</span>}
            {isDone && (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                <Check aria-hidden className="size-4" /> Feita
              </span>
            )}
          </>
        }
        actions={
          <>
            <Link to={`/quests/${quest.id}/concluir`} className="btn btn-primary">{isDone ? 'Fazer de novo' : 'Concluir'}</Link>
            <Link to={`/quests/nova?parent=${quest.id}`} className="btn btn-ghost"><Plus aria-hidden className="size-4" /> Subquest</Link>
            <Link to={`/quests/${quest.id}/editar`} className="btn btn-ghost"><Pencil aria-hidden className="size-4" /> Editar</Link>
            <button type="button" className="btn btn-ghost" onClick={remove}><Trash2 aria-hidden className="size-4" /> Excluir</button>
          </>
        }
      />

      <div className="space-y-6">
        {quest.scheduled_on && !isDone && <ScheduleCard quest={quest} data={data} />}

        {(media?.synopsis || quest.notes) && (
          <section className="card space-y-2 p-5">
            {media?.synopsis && <p className="text-ink/70">{media.synopsis}</p>}
            {quest.notes && <p className="whitespace-pre-wrap font-semibold">{quest.notes}</p>}
          </section>
        )}

        {media && media.source !== 'tmdb_movie' && (
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink/60">Progresso</p>
                <span className="font-display text-3xl font-bold text-brand">{formatProgress(media.source, media.seasons, progress)}</span>
              </div>
              <button ref={plusButton} type="button" className="btn btn-primary" onClick={plusOne}>+1 episódio</button>
            </div>
            {episodes && (
              <ProgressBar size="lg" value={episodes.watched} max={episodes.total}>
                <span>{episodes.watched} de {episodes.total} episódios</span>
                <span>{Math.round((episodes.watched / episodes.total) * 100)}%</span>
              </ProgressBar>
            )}
            <ProgressEditor key={`${quest.progress_season}:${quest.progress_episode}`} quest={quest} onSaved={refresh} />
          </section>
        )}

        <PhotoGrid photos={refPhotos} />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Subquests ({children.length})</h2>
          {children.length > 0 && (
            <div className="tree">
              {children.map((c) => <QuestCard key={c.id} quest={c} data={data} done={done} />)}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Histórico</h2>
          {history.length === 0 ? (
            <p className="text-ink/60">Ainda não fizeram essa.</p>
          ) : (
            <ol className="timeline">
              {history.map((c) => (
                <CompletionEntry key={c.id} completion={c} data={data} me={me} questId={quest.id} onDelete={() => removeCompletion(c)} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}

function ScheduleCard({ quest, data }: { quest: Quest; data: AppData }) {
  const today = todayISO()
  const label = scheduleLabel(quest.scheduled_on!, quest.scheduled_time, today)
  const late = isOverdue(quest.scheduled_on!, today)
  const place = effectivePlace(data.quests, quest.id)
  return (
    <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <span className={`inline-flex items-center gap-2 font-semibold ${late ? 'text-red-600' : ''}`}>
        <CalendarClock aria-hidden className="size-4 text-accent" /> {late ? label : `Agendada · ${label}`}
      </span>
      <a href={calendarUrl(quest, quest.place_label ?? (place && placeLabel(place)))} target="_blank" rel="noreferrer" className="btn">
        Adicionar ao calendário
      </a>
    </section>
  )
}

function ProgressEditor({ quest, onSaved }: { quest: Quest; onSaved: () => void }) {
  const [season, setSeason] = useState(String(quest.progress_season ?? 1))
  const [episode, setEpisode] = useState(String(quest.progress_episode ?? 0))
  async function save() {
    const s = Number(season)
    const e = Number(episode)
    await setProgress(quest.id, Number.isInteger(s) && Number.isInteger(e) && s >= 1 && e >= 1 ? { season: s, episode: e } : null)
    onSaved()
  }
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-ink/60">Editar progresso</summary>
      <div className="mt-2 flex items-end gap-2">
        <label className="w-24">
          <span className="block text-xs">Temporada</span>
          <input className="input" type="number" min={1} value={season} onChange={(e) => setSeason(e.target.value)} />
        </label>
        <label className="w-24">
          <span className="block text-xs">Episódio</span>
          <input className="input" type="number" min={0} value={episode} onChange={(e) => setEpisode(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={save}>Salvar</button>
      </div>
      <p className="mt-1 text-xs text-ink/60">Episódio 0 = não começou.</p>
    </details>
  )
}

interface EntryProps {
  completion: Completion
  data: AppData
  me: string
  questId: string
  onDelete: () => void
}

function CompletionEntry({ completion, data, me, questId, onDelete }: EntryProps) {
  const reviews = data.reviews.filter((r) => r.completion_id === completion.id)
  const mine = reviews.find((r) => r.user_id === me)
  return (
    <li>
      <div className="card space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-display text-lg font-semibold">
            <CalendarDays aria-hidden className="size-4 text-accent" /> {formatDate(completion.done_on)}
          </span>
          <div className="flex gap-2">
            <Link to={`/quests/${questId}/concluir?completion=${completion.id}`} className="btn">{mine ? 'Editar' : 'Escrever minha resenha'}</Link>
            <button type="button" className="btn btn-danger" aria-label="Excluir conclusão" onClick={onDelete}>
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.profiles.map((p) => {
            const r = reviews.find((x) => x.user_id === p.id)
            return (
              <div key={p.id} className="space-y-2 rounded-2xl bg-paper/70 p-3">
                <div className="flex items-center gap-2">
                  <Avatar profile={p} />
                  <div>
                    <p className="text-sm font-bold">{p.display_name}</p>
                    {r ? <Stars value={r.rating} /> : <p className="text-xs text-ink/60">Aguardando resenha</p>}
                  </div>
                </div>
                {r?.body && <p className="whitespace-pre-wrap text-sm">{r.body}</p>}
                {r && <PhotoGrid photos={data.photos.filter((ph) => ph.review_id === r.id)} />}
              </div>
            )
          })}
        </div>
      </div>
    </li>
  )
}
