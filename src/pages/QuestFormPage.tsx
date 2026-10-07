import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import CatalogSearch from '../components/CatalogSearch'
import Bubble from '../components/Bubble'
import Gems from '../components/Gems'
import PageHero from '../components/PageHero'
import PhotoPicker, { uploadPending } from '../components/PhotoPicker'
import { LoadError, NotFound, PageLoading } from '../components/Status'
import { createQuest, deletePhoto, updateQuest, upsertMedia, type QuestInput } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { KIND_SOURCE } from '../lib/catalog'
import { DIFFICULTIES, suggestDifficulty } from '../lib/difficulty'
import type { AppData, Difficulty, Media, NormalizedMedia, Quest } from '../lib/types'

export default function QuestFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const q = useAppData()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />
  const existing = id ? q.data.quests.find((x) => x.id === id) : undefined
  if (id && !existing) return <NotFound title="Quest não encontrada" />
  const linked = params.get('categoria')
  const initialCategory = q.data.categories.some((c) => c.id === linked) ? linked : null
  return <QuestForm key={id ?? 'new'} data={q.data} existing={existing} parentId={existing ? existing.parent_id : params.get('parent')} initialCategory={initialCategory} />
}

function QuestForm({ data, existing, parentId, initialCategory }: { data: AppData; existing?: Quest; parentId: string | null; initialCategory: string | null }) {
  const navigate = useNavigate()
  const refresh = useRefresh()
  const parent = parentId ? data.quests.find((x) => x.id === parentId) : undefined
  const atividade = data.categories.find((c) => c.builtin && c.name === 'Atividade')
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? initialCategory ?? (parentId ? atividade?.id ?? '' : ''))
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

  const heading = existing ? 'Editar quest' : parent ? `Nova subquest de ${parent.title}` : 'Nova quest'
  return (
    <>
      <PageHero title={heading} />
      <form onSubmit={save} className="max-w-2xl space-y-5">
        <section className="card space-y-3 p-5">
          <h2 id="cat-label" className="text-lg font-semibold">Categoria</h2>
          <div role="group" aria-labelledby="cat-label" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {data.categories.map((c) => (
              <button key={c.id} type="button" aria-pressed={c.id === categoryId} onClick={() => setCategoryId(c.id)} className="tile">
                <Bubble icon={c.icon} color={c.color} size="lg" /> {c.name}
              </button>
            ))}
          </div>
        </section>

        {kind !== 'general' && (
          <section className="card p-5">
            {mediaFits && media ? (
              <div className="flex items-center gap-3">
                {media.poster_url && <img src={media.poster_url} alt="" className="h-20 w-14 rounded-xl object-cover shadow-sm" />}
                <span className="flex-1 font-display text-lg font-semibold">{media.title}{media.year ? ` (${media.year})` : ''}</span>
                <button type="button" className="btn" onClick={() => setMedia(null)}>Trocar</button>
              </div>
            ) : (
              <CatalogSearch kind={kind} onPick={pickMedia} />
            )}
          </section>
        )}

        <section className="card space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block font-bold">Título</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>
          <div className="space-y-2">
            <h2 id="diff-label" className="font-bold">Dificuldade</h2>
            <div role="group" aria-labelledby="diff-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DIFFICULTIES.map((d) => (
                <button key={d} type="button" aria-pressed={d === difficulty} onClick={() => setDifficulty(d)} className="tile">
                  <Gems difficulty={d} stacked />
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block font-bold">Notas</span>
            <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </section>

        <section className="card space-y-2 p-5">
          <h2 className="text-lg font-semibold">Fotos de referência</h2>
          <PhotoPicker existing={existingPhotos} pending={pending} onChange={setPending} onDeleteExisting={removeExisting} />
        </section>

        {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}

        {savedId ? (
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={() => retryUploads(savedId)}>Tentar de novo</button>
            <button type="button" className="btn flex-1" onClick={() => navigate(`/quests/${savedId}`, { replace: true })}>Continuar sem elas</button>
          </div>
        ) : (
          <button className="btn btn-primary min-h-12 w-full text-lg" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        )}
      </form>
    </>
  )
}
