import { useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import Celebration from '../components/Celebration'
import PhotoPicker, { uploadPending } from '../components/PhotoPicker'
import Stars from '../components/Stars'
import { LoadError, Loading } from '../components/Status'
import { createCompletion, deletePhoto, deleteReview, saveReview, updateCompletion } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { useUserId } from '../data/session'
import { evaluateAchievements, newlyUnlocked } from '../lib/achievements'
import { todayISO } from '../lib/dates'
import type { Achievement, AppData, Completion, Photo, Quest } from '../lib/types'

export default function CompletePage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const q = useAppData()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const quest = q.data.quests.find((x) => x.id === id)
  if (!quest) return <p>Quest não encontrada.</p>
  const completionId = params.get('completion')
  const existing = completionId ? q.data.completions.find((c) => c.id === completionId) : undefined
  if (completionId && !existing) return <p>Conclusão não encontrada.</p>
  return <CompleteForm key={completionId ?? 'new'} data={q.data} quest={quest} existing={existing} />
}

function CompleteForm({ data, quest, existing }: { data: AppData; quest: Quest; existing?: Completion }) {
  const me = useUserId()
  const navigate = useNavigate()
  const refresh = useRefresh()
  const mine = existing ? data.reviews.find((r) => r.completion_id === existing.id && r.user_id === me) : undefined
  const [doneOn, setDoneOn] = useState(existing?.done_on ?? todayISO())
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [body, setBody] = useState(mine?.body ?? '')
  const [pending, setPending] = useState<Blob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [failedReviewId, setFailedReviewId] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState<Achievement[] | null>(null)
  const unlocked = useRef<Achievement[]>([])

  const back = () => navigate(`/quests/${quest.id}`, { replace: true })
  const afterSave = () => (unlocked.current.length ? setCelebrate(unlocked.current) : back())

  async function submit(withReview: boolean) {
    if (!doneOn) return setError('Escolha a data.')
    if (doneOn > todayISO()) return setError('A data não pode ser no futuro.')
    if (withReview && rating === 0) return setError('Dê uma nota para salvar a resenha.')
    setSaving(true)
    setError(null)
    try {
      const before = evaluateAchievements(data.achievements, data.quests, data.completions)
      let completion: Completion
      if (existing) {
        if (existing.done_on !== doneOn) await updateCompletion(existing.id, doneOn)
        completion = { ...existing, done_on: doneOn }
      } else {
        completion = await createCompletion(quest.id, doneOn)
      }
      let failed: Blob[] = []
      let reviewId: string | null = null
      if (withReview) {
        const saved = await saveReview({ id: mine?.id, completion_id: completion.id, rating, body: body.trim() || null })
        reviewId = saved.id
        failed = await uploadPending({ review_id: saved.id }, pending)
      }
      const completions = existing ? data.completions.map((c) => (c.id === completion.id ? completion : c)) : [...data.completions, completion]
      unlocked.current = newlyUnlocked(before, evaluateAchievements(data.achievements, data.quests, completions))
      await refresh()
      if (failed.length) {
        setPending(failed)
        setFailedReviewId(reviewId)
        setError(`${failed.length} foto(s) não subiram.`)
      } else afterSave()
    } catch {
      setError('Não foi possível salvar. Verifique a conexão e tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  async function retryUploads(reviewId: string) {
    setSaving(true)
    const still = await uploadPending({ review_id: reviewId }, pending)
    await refresh()
    setSaving(false)
    if (still.length) {
      setPending(still)
      setError(`${still.length} foto(s) não subiram.`)
    } else afterSave()
  }

  async function removeMine() {
    if (!mine || !window.confirm('Apagar sua resenha?')) return
    await deleteReview(mine.id, data)
    await refresh()
    back()
  }

  async function removePhoto(p: Photo) {
    if (!window.confirm('Remover esta foto?')) return
    await deletePhoto(p)
    await refresh()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(rating > 0 || body.trim() !== '' || pending.length > 0)
      }}
      className="mx-auto max-w-xl space-y-5"
    >
      <h1 className="text-2xl font-bold">{existing ? 'Editar conclusão' : 'Concluir'}: {quest.title}</h1>

      <label className="block">
        <span className="mb-1 block font-medium">Quando vocês fizeram?</span>
        <input type="date" className="input" value={doneOn} max={todayISO()} onChange={(e) => setDoneOn(e.target.value)} />
      </label>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Sua resenha</h2>
        <Stars value={rating} onChange={setRating} />
        <label className="block">
          <span className="mb-1 block text-sm">O que achou? (opcional)</span>
          <textarea className="input min-h-28" value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <PhotoPicker
          existing={mine ? data.photos.filter((p) => p.review_id === mine.id) : []}
          pending={pending}
          onChange={setPending}
          onDeleteExisting={removePhoto}
        />
      </section>

      {error && <p role="alert" className="text-red-600">{error}</p>}

      {failedReviewId ? (
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={() => retryUploads(failedReviewId)}>Tentar de novo</button>
          <button type="button" className="btn flex-1" onClick={afterSave}>Continuar sem elas</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn btn-primary flex-1" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
          {!existing && <button type="button" className="btn flex-1" disabled={saving} onClick={() => submit(false)}>Pular resenha</button>}
          {mine && <button type="button" className="btn btn-danger flex-1" onClick={removeMine}>Apagar minha resenha</button>}
        </div>
      )}

      {celebrate && <Celebration achievements={celebrate} onClose={back} />}
    </form>
  )
}
