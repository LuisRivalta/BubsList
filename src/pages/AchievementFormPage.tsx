import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { LoadError, Loading } from '../components/Status'
import { deleteAchievement, saveAchievement, type AchievementInput } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { RARITIES, RARITY_LABEL } from '../lib/achievements'
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../lib/difficulty'
import type { Achievement, AppData, Difficulty, Rarity } from '../lib/types'

export default function AchievementFormPage() {
  const { id } = useParams()
  const q = useAppData()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const existing = id ? q.data.achievements.find((a) => a.id === id) : undefined
  if (id && !existing) return <p>Conquista não encontrada.</p>
  return <AchievementForm key={id ?? 'new'} data={q.data} existing={existing} />
}

function AchievementForm({ data, existing }: { data: AppData; existing?: Achievement }) {
  const navigate = useNavigate()
  const refresh = useRefresh()
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? '🏆')
  const [rarity, setRarity] = useState<Rarity>(existing?.rarity ?? 'bronze')
  const [kind, setKind] = useState<'auto' | 'manual'>(existing?.kind ?? 'auto')
  const [categoryId, setCategoryId] = useState(existing?.rule_category_id ?? '')
  const [minDifficulty, setMinDifficulty] = useState<Difficulty | ''>(existing?.rule_min_difficulty ?? '')
  const [count, setCount] = useState(String(existing?.rule_count ?? 1))
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    const n = Number(count)
    if (!name.trim()) return setError('Dê um nome à conquista.')
    if (!icon.trim()) return setError('Escolha um ícone.')
    if (kind === 'auto' && (!Number.isInteger(n) || n < 1)) return setError('A quantidade precisa ser um número inteiro maior que zero.')
    const base = { name: name.trim(), description: description.trim(), icon: icon.trim(), rarity, kind }
    const row: AchievementInput =
      kind === 'auto'
        ? { ...base, rule_category_id: categoryId || null, rule_min_difficulty: minDifficulty || null, rule_count: n, manual_unlocked_on: null }
        : { ...base, rule_category_id: null, rule_min_difficulty: null, rule_count: null, manual_unlocked_on: existing?.kind === 'manual' ? existing.manual_unlocked_on : null }
    try {
      await saveAchievement({ id: existing?.id, ...row })
      await refresh()
      navigate('/conquistas', { replace: true })
    } catch {
      setError('Não foi possível salvar. Verifique a conexão e tente de novo.')
    }
  }

  async function remove() {
    if (!existing || !window.confirm(`Excluir a conquista "${existing.name}"?`)) return
    await deleteAchievement(existing.id)
    await refresh()
    navigate('/conquistas', { replace: true })
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{existing ? 'Editar conquista' : 'Nova conquista'}</h1>
      <div className="flex gap-2">
        <label className="w-20">
          <span className="mb-1 block font-medium">Ícone</span>
          <input className="input text-center text-2xl" value={icon} maxLength={8} onChange={(e) => setIcon(e.target.value)} />
        </label>
        <label className="flex-1">
          <span className="mb-1 block font-medium">Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block font-medium">Descrição</span>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">Raridade</span>
        <select className="input" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)}>
          {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
        </select>
      </label>
      <fieldset>
        <legend className="mb-2 font-medium">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['auto', 'manual'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`btn ${kind === k ? 'btn-primary' : ''}`}>
              {k === 'auto' ? 'Automática' : 'Manual'}
            </button>
          ))}
        </div>
      </fieldset>
      {kind === 'auto' && (
        <>
          <label className="block">
            <span className="mb-1 block font-medium">Categoria</span>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Qualquer categoria</option>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Dificuldade mínima</span>
            <select className="input" value={minDifficulty} onChange={(e) => setMinDifficulty(e.target.value as Difficulty | '')}>
              <option value="">Qualquer</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Quantidade</span>
            <input className="input" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
          </label>
        </>
      )}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button className="btn btn-primary w-full">Salvar</button>
      {existing && <button type="button" className="btn btn-danger w-full" onClick={remove}>Excluir conquista</button>}
    </form>
  )
}
