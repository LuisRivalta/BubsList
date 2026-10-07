import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import CatalogSearch from '../components/CatalogSearch'
import Icon from '../components/Icon'
import PhotoPicker, { uploadPending } from '../components/PhotoPicker'
import { LoadError, Loading } from '../components/Status'
import { createQuest, deletePhoto, updateQuest, upsertMedia, type QuestInput } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { KIND_SOURCE } from '../lib/catalog'
import { DIFFICULTIES, DIFFICULTY_LABEL, suggestDifficulty } from '../lib/difficulty'
import type { AppData, Difficulty, Media, NormalizedMedia, Quest } from '../lib/types'

export default function QuestFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const q = useAppData()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const existing = id ? q.data.quests.find((x) => x.id === id) : undefined
  if (id && !existing) return <p>Quest não encontrada.</p>
  return <QuestForm key={id ?? 'new'} data={q.data} existing={existing} parentId={existing ? existing.parent_id : params.get('parent')} />
}

function QuestForm({ data, existing, parentId }: { data: AppData; existing?: Quest; parentId: string | null }) {
  const navigate = useNavigate()
  const refresh = useRefresh()
  const parent = parentId ? data.quests.find((x) => x.id === parentId) : undefined
  const atividade = data.categories.find((c) => c.builtin && c.name === 'Atividade')
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? (parentId ? atividade?.id ?? '' : ''))
  const [title, setTitle] = useState(existing?.title ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(existing?.difficulty ?? null)
  const [media, setMedia] = useState<Media | NormalizedMedia | null>(
    existing?.media_id ? data.media.find((m) => m.id === existing.media_id) ?? null : null,
  )
  const [pending, setPending] = useState<Blob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const category = data.categories.find((c) => c.id === categoryId)
  const kind = category?.kind ?? 'general'
  const mediaFits = media !== null && kind !== 'general' && KIND_SOURCE[kind] === media.source
  const existingPhotos = existing ? data.photos.filter((p) => p.quest_id === existing.id) : []

  function pickMedia(m: NormalizedMedia) {
    setMedia(m)
    setTitle(m.title)
    if (!existing) {
      const suggestion = suggestDifficulty(m)
      if (suggestion) setDifficulty(suggestion)
    }
  }

  async function finish(questId: string, blobs: Blob[]) {
    const failed = await uploadPending({ quest_id: questId }, blobs)
    await refresh()
    if (failed.length) {
      setSavedId(questId)
      setPending(failed)
      setError(`${failed.length} foto(s) não subiram.`)
    } else navigate(`/quests/${questId}`, { replace: true })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!category) return setError('Escolha uma categoria.')
    if (!title.trim()) return setError('Dê um título à quest.')
    if (!difficulty) return setError('Escolha a dificuldade.')
    setSaving(true)
    setError(null)
    try {
      const mediaId = mediaFits && media ? ('id' in media ? media.id : (await upsertMedia(media)).id) : null
      const input: QuestInput = {
        parent_id: parentId, category_id: category.id, title: title.trim(), notes: notes.trim() || null, difficulty, media_id: mediaId,
      }
      let questId: string
      if (existing) {
        const resetProgress = existing.media_id !== mediaId ? { progress_season: null, progress_episode: null } : {}
        await updateQuest(existing.id, { ...input, ...resetProgress })
        questId = existing.id
      } else {
        questId = (await createQuest(input)).id
      }
      await finish(questId, pending)
    } catch {
      setError('Não foi possível salvar. Verifique a conexão e tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  async function retryUploads(questId: string) {
    setSaving(true)
    await finish(questId, pending)
    setSaving(false)
  }

  async function removeExisting(p: Parameters<typeof deletePhoto>[0]) {
    if (!window.confirm('Remover esta foto?')) return
    await deletePhoto(p)
    await refresh()
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">{existing ? 'Editar quest' : parent ? `Nova subquest de ${parent.title}` : 'Nova quest'}</h1>

      <fieldset>
        <legend className="mb-2 font-medium">Categoria</legend>
        <div className="flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <button key={c.id} type="button" aria-pressed={c.id === categoryId} onClick={() => setCategoryId(c.id)} className={`btn ${c.id === categoryId ? 'btn-primary' : ''}`}>
              <Icon name={c.icon} className="size-4" /> {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      {kind !== 'general' &&
        (mediaFits && media ? (
          <div className="card flex items-center gap-3 p-3">
            {media.poster_url && <img src={media.poster_url} alt="" className="h-16 w-11 rounded object-cover" />}
            <span className="flex-1">{media.title}{media.year ? ` (${media.year})` : ''}</span>
            <button type="button" className="btn" onClick={() => setMedia(null)}>Trocar</button>
          </div>
        ) : (
          <CatalogSearch kind={kind} onPick={pickMedia} />
        ))}

      <label className="block">
        <span className="mb-1 block font-medium">Título</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </label>

      <fieldset>
        <legend className="mb-2 font-medium">Dificuldade</legend>
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" aria-pressed={d === difficulty} onClick={() => setDifficulty(d)} className={`btn px-1 ${d === difficulty ? 'btn-primary' : ''}`}>
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block font-medium">Notas</span>
        <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <div>
        <p className="mb-2 font-medium">Fotos de referência</p>
        <PhotoPicker existing={existingPhotos} pending={pending} onChange={setPending} onDeleteExisting={removeExisting} />
      </div>

      {error && <p role="alert" className="text-red-600">{error}</p>}

      {savedId ? (
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={() => retryUploads(savedId)}>Tentar de novo</button>
          <button type="button" className="btn flex-1" onClick={() => navigate(`/quests/${savedId}`, { replace: true })}>Continuar sem elas</button>
        </div>
      ) : (
        <button className="btn btn-primary w-full" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
      )}
    </form>
  )
}
