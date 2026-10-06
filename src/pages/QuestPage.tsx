import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import DifficultyBadge from '../components/DifficultyBadge'
import PhotoGrid from '../components/PhotoGrid'
import QuestCard from '../components/QuestCard'
import Stars from '../components/Stars'
import { LoadError, Loading } from '../components/Status'
import { deleteCompletion, deleteQuest, setProgress } from '../data/api'
import { useAppData, useMediaRefresh, useRefresh } from '../data/hooks'
import { useUserId } from '../data/session'
import { formatDate } from '../lib/dates'
import { formatProgress, nextEpisode, progressOf } from '../lib/progress'
import { ancestors, childrenOf, descendantIds, doneQuestIds } from '../lib/tree'
import type { AppData, Completion, Quest } from '../lib/types'

export default function QuestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useUserId()
  const refresh = useRefresh()
  const q = useAppData()
  const data = q.data
  const quest = data?.quests.find((x) => x.id === id)
  const media = quest?.media_id ? data?.media.find((m) => m.id === quest.media_id) : undefined
  useMediaRefresh(media)

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!data) return <Loading />
  if (!quest) {
    return (
      <div className="space-y-3">
        <p>Quest não encontrada.</p>
        <Link to="/" className="btn">Voltar</Link>
      </div>
    )
  }

  const category = data.categories.find((c) => c.id === quest.category_id)
  const path = ancestors(data.quests, quest.id)
  const done = doneQuestIds(data.completions)
  const children = childrenOf(data.quests, quest.id)
  const history = data.completions.filter((c) => c.quest_id === quest.id).sort((a, b) => b.done_on.localeCompare(a.done_on))
  const progress = progressOf(quest)

  async function plusOne() {
    if (!media) return
    const next = nextEpisode(media.seasons, progress)
    if (!next) {
      if (window.confirm('Vocês chegaram ao último episódio! Concluir agora?')) navigate(`/quests/${quest!.id}/concluir`)
      return
    }
    await setProgress(quest!.id, next)
    await refresh()
  }

  async function remove() {
    const n = descendantIds(data!.quests, quest!.id).length
    if (!window.confirm(n ? `Excluir "${quest!.title}" e ${n} subquest(s)?` : `Excluir "${quest!.title}"?`)) return
    await deleteQuest(quest!.id, data!)
    await refresh()
    navigate(quest!.parent_id ? `/quests/${quest!.parent_id}` : '/', { replace: true })
  }

  async function removeCompletion(c: Completion) {
    if (!window.confirm('Excluir esta conclusão e as resenhas dela?')) return
    await deleteCompletion(c.id, data!)
    await refresh()
  }

  return (
    <article className="space-y-6">
      {path.length > 0 && (
        <nav aria-label="Caminho" className="flex flex-wrap gap-1 text-sm text-gray-500">
          {path.map((a) => (
            <span key={a.id}>
              <Link to={`/quests/${a.id}`} className="underline">{a.title}</Link> ›
            </span>
          ))}
        </nav>
      )}

      <header className="flex gap-4">
        {media?.poster_url && <img src={media.poster_url} alt="" className="h-36 w-24 shrink-0 rounded-xl object-cover" />}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{quest.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span style={{ color: category?.color }}>
              <span aria-hidden>{category?.icon}</span> {category?.name}
            </span>
            <DifficultyBadge difficulty={quest.difficulty} />
            {done.has(quest.id) && <span className="text-green-700">✔ Feita</span>}
          </div>
          {media?.synopsis && <p className="text-sm text-gray-600">{media.synopsis}</p>}
          {quest.notes && <p className="whitespace-pre-wrap">{quest.notes}</p>}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link to={`/quests/${quest.id}/concluir`} className="btn btn-primary">{done.has(quest.id) ? 'Fazer de novo' : 'Concluir'}</Link>
        <Link to={`/quests/nova?parent=${quest.id}`} className="btn">+ Subquest</Link>
        <Link to={`/quests/${quest.id}/editar`} className="btn">Editar</Link>
        <button type="button" className="btn btn-danger" onClick={remove}>Excluir</button>
      </div>

      {media && media.source !== 'tmdb_movie' && (
        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Progresso</h2>
          <div className="flex items-center gap-3">
            <span className="text-lg">{formatProgress(media.source, media.seasons, progress)}</span>
            <button type="button" className="btn btn-primary" onClick={plusOne}>+1 episódio</button>
          </div>
          <ProgressEditor key={`${quest.progress_season}:${quest.progress_episode}`} quest={quest} onSaved={refresh} />
        </section>
      )}

      <PhotoGrid photos={data.photos.filter((p) => p.quest_id === quest.id)} />

      <section className="space-y-2">
        <h2 className="font-semibold">Subquests ({children.length})</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {children.map((c) => <QuestCard key={c.id} quest={c} data={data} done={done} />)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Histórico</h2>
        {history.length === 0 && <p className="text-gray-500">Ainda não fizeram essa.</p>}
        {history.map((c) => (
          <CompletionEntry key={c.id} completion={c} data={data} me={me} questId={quest.id} onDelete={() => removeCompletion(c)} />
        ))}
      </section>
    </article>
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
      <summary className="cursor-pointer text-sm text-gray-600">Editar progresso</summary>
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
      <p className="mt-1 text-xs text-gray-500">Episódio 0 = não começou.</p>
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
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium"><span aria-hidden>📅</span> {formatDate(completion.done_on)}</span>
        <div className="flex gap-2">
          <Link to={`/quests/${questId}/concluir?completion=${completion.id}`} className="btn">{mine ? 'Editar' : 'Escrever minha resenha'}</Link>
          <button type="button" className="btn btn-danger" aria-label="Excluir conclusão" onClick={onDelete}>🗑</button>
        </div>
      </div>
      {data.profiles.map((p) => {
        const r = reviews.find((x) => x.user_id === p.id)
        return (
          <div key={p.id} className="space-y-1">
            <p className="text-sm font-medium">{p.display_name}</p>
            {r ? (
              <>
                <Stars value={r.rating} />
                {r.body && <p className="whitespace-pre-wrap text-sm">{r.body}</p>}
                <PhotoGrid photos={data.photos.filter((ph) => ph.review_id === r.id)} />
              </>
            ) : (
              <p className="text-sm text-gray-500">Aguardando resenha</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
