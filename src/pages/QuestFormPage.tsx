import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import CatalogSearch from '../components/CatalogSearch'
import Bubble from '../components/Bubble'
import Gems from '../components/Gems'
import PageHero from '../components/PageHero'
import PhotoPicker, { uploadPending } from '../components/PhotoPicker'
import PlaceField, { NO_PLACE, type PlaceFields } from '../components/PlaceField'
import { LoadError, NotFound, PageLoading } from '../components/Status'
import { createQuest, deletePhoto, saveQuestType, updateQuest, upsertMedia, type QuestInput } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { KIND_SOURCE } from '../lib/catalog'
import { DIFFICULTIES, suggestDifficulty } from '../lib/difficulty'
import { sameText } from '../lib/filters'
import { effectivePlace, placeLabel } from '../lib/place'
import type { AppData, Difficulty, Media, NormalizedMedia, Quest, QuestType } from '../lib/types'

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
  // A type that was deleted meanwhile counts as none.
  const [typeId, setTypeId] = useState<string | null>(data.questTypes.some((t) => t.id === existing?.type_id) ? existing!.type_id : null)
  const [createdTypes, setCreatedTypes] = useState<QuestType[]>([])
  const [newType, setNewType] = useState<string | null>(null) // null = the "new type" field is closed
  const [genre, setGenre] = useState<string | null>(null)
  const [place, setPlace] = useState<PlaceFields>(
    existing
      ? { city: existing.city, state: existing.state, country: existing.country, place_label: existing.place_label, lat: existing.lat, lng: existing.lng }
      : NO_PLACE,
  )
  const inherited = parentId ? effectivePlace(data.quests, parentId) : null
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
  const types = [...data.questTypes, ...createdTypes.filter((c) => !data.questTypes.some((t) => t.id === c.id))]
    .filter((t) => t.category_id === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  function chooseCategory(id: string) {
    if (id !== categoryId) {
      setTypeId(null)
      setGenre(null)
      setNewType(null)
    }
    setCategoryId(id)
  }

  // Creates the type in this category (or picks the existing one with that name) and selects it.
  async function addType(name: string) {
    const clean = name.trim()
    if (!clean || !categoryId) return
    const found = types.find((t) => sameText(t.name, clean))
    if (found) setTypeId(found.id)
    else {
      try {
        const created = await saveQuestType({ category_id: categoryId, name: clean })
        setCreatedTypes((list) => [...list, created])
        setTypeId(created.id)
        refresh()
      } catch {
        setError('Não foi possível criar o tipo.')
        return
      }
    }
    setNewType(null)
    setGenre(null)
  }

  function pickMedia(m: NormalizedMedia) {
    setMedia(m)
    setTitle(m.title)
    if (!existing) {
      const suggestion = suggestDifficulty(m)
      if (suggestion) setDifficulty(suggestion)
    }
    if (typeId === null) {
      const match = types.find((t) => m.genres.some((g) => sameText(g, t.name)))
      if (match) setTypeId(match.id)
      else setGenre(m.genres[0] ?? null)
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
        type_id: typeId,
        city: place.city?.trim() || null, state: place.state, country: place.country, place_label: place.place_label, lat: place.lat, lng: place.lng,
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
              <button key={c.id} type="button" aria-pressed={c.id === categoryId} onClick={() => chooseCategory(c.id)} className="tile">
                <Bubble icon={c.icon} color={c.color} size="lg" /> {c.name}
              </button>
            ))}
          </div>
          {category && (
            <div className="space-y-2 border-t border-ink/10 pt-3">
              <h3 id="type-label" className="font-bold">Tipo</h3>
              <div role="group" aria-labelledby="type-label" className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={typeId === null} onClick={() => setTypeId(null)} className="chip pl-3">Nenhum</button>
                {types.map((t) => (
                  <button key={t.id} type="button" aria-pressed={typeId === t.id} onClick={() => setTypeId(t.id)} className="chip pl-3">{t.name}</button>
                ))}
                {genre && !types.some((t) => sameText(t.name, genre)) && (
                  <button type="button" onClick={() => addType(genre)} className="chip pl-3"><Plus aria-hidden className="size-4" /> {genre}</button>
                )}
                <button type="button" onClick={() => setNewType('')} className="chip pl-3"><Plus aria-hidden className="size-4" /> Novo tipo</button>
              </div>
              {newType !== null && (
                <div className="flex gap-2">
                  <input
                    aria-label="Nome do novo tipo"
                    className="input min-w-0 flex-1"
                    value={newType}
                    maxLength={40}
                    autoFocus
                    onChange={(e) => setNewType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addType(newType)
                      }
                    }}
                  />
                  <button type="button" className="btn btn-primary" onClick={() => addType(newType)}>Criar</button>
                </div>
              )}
            </div>
          )}
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
          {category?.has_place && <PlaceField value={place} inherited={inherited ? placeLabel(inherited) : null} onChange={setPlace} />}
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
