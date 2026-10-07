import { Heart, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import Avatar from '../components/Avatar'
import Bubble from '../components/Bubble'
import { IconPicker } from '../components/Icon'
import PageHero from '../components/PageHero'
import { LoadError, PageLoading } from '../components/Status'
import { deleteCategory, deleteQuestType, saveCategory, saveQuestType, signOut, updateProfile, uploadAvatar, type CategoryInput } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { useUserId } from '../data/session'
import { UnsupportedImageError, compressImage } from '../lib/image'
import { sameText } from '../lib/filters'
import type { AppData, Category, Profile, QuestType } from '../lib/types'

export default function ProfilePage() {
  const q = useAppData()
  const me = useUserId()
  const refresh = useRefresh()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />
  const profile = q.data.profiles.find((p) => p.id === me)
  const partner = q.data.profiles.find((p) => p.id !== me)

  return (
    <>
      <PageHero title="Perfil">
        <div className="flex items-center gap-3">
          {profile && <Avatar profile={profile} size="lg" />}
          <Heart aria-hidden className="size-7 fill-accent text-accent drop-shadow" />
          {partner && <Avatar profile={partner} size="lg" />}
          <p className="ml-1 font-display text-lg font-semibold text-white/90">
            {profile?.display_name}{partner ? ` & ${partner.display_name}` : ''}
          </p>
        </div>
      </PageHero>
      <div className="max-w-2xl space-y-5">
        <section className="card p-5">{profile && <ProfileForm profile={profile} onSaved={refresh} />}</section>
        <section className="card p-5"><Categories data={q.data} onChange={refresh} /></section>
        <section className="card space-y-2 p-5 text-sm text-ink/60">
          <h2 className="text-lg font-semibold text-ink">Créditos</h2>
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            <img src="/tmdb.svg" alt="TMDB" className="h-4" />
          </a>
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
          <p>Dados de anime: <a className="underline" href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>.</p>
        </section>
        <button type="button" className="btn btn-danger min-h-12 w-full" onClick={() => signOut()}>Sair</button>
      </div>
    </>
  )
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [name, setName] = useState(profile.display_name)
  const [message, setMessage] = useState<string | null>(null)

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setMessage('O nome não pode ficar vazio.')
    try {
      await updateProfile(profile.id, { display_name: name.trim() })
      onSaved()
      setMessage('Salvo!')
    } catch {
      setMessage('Não foi possível salvar.')
    }
  }

  async function changeAvatar(file: File | undefined) {
    if (!file) return
    try {
      await uploadAvatar(profile.id, await compressImage(file), profile.avatar_path)
      onSaved()
    } catch (e) {
      setMessage(e instanceof UnsupportedImageError ? e.message : 'Não foi possível trocar a foto.')
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Você</h2>
      <label className="btn cursor-pointer">
        Trocar foto
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            changeAvatar(file)
          }}
        />
      </label>
      <form onSubmit={saveName} className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Seu nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn btn-primary" aria-label="Salvar nome">Salvar</button>
      </form>
      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
  )
}

function Categories({ data, onChange }: { data: AppData; onChange: () => void }) {
  const [message, setMessage] = useState<string | null>(null)

  async function save(input: CategoryInput & { id?: string }): Promise<boolean> {
    if (!input.name.trim()) {
      setMessage('Dê um nome à categoria.')
      return false
    }
    try {
      await saveCategory({ ...input, name: input.name.trim() })
      setMessage(null)
      onChange()
      return true
    } catch (e) {
      setMessage((e as { code?: string }).code === '23505' ? 'Já existe uma categoria com esse nome.' : 'Não foi possível salvar.')
      return false
    }
  }

  async function remove(c: Category) {
    const quests = data.quests.filter((q) => q.category_id === c.id).length
    const achievements = data.achievements.filter((a) => a.rule_category_id === c.id).length
    if (quests || achievements) return setMessage(`Categoria em uso por ${quests} quest(s) e ${achievements} conquista(s).`)
    if (!window.confirm(`Excluir a categoria "${c.name}"?`)) return
    try {
      await deleteCategory(c.id)
      onChange()
    } catch {
      setMessage('Não foi possível excluir.')
    }
  }

  async function saveType(input: { id?: string; category_id: string; name: string }): Promise<boolean> {
    const name = input.name.trim()
    if (!name) {
      setMessage('Dê um nome ao tipo.')
      return false
    }
    if (data.questTypes.some((t) => t.category_id === input.category_id && t.id !== input.id && sameText(t.name, name))) {
      setMessage('Esse tipo já existe.')
      return false
    }
    try {
      await saveQuestType({ ...input, name })
      setMessage(null)
      onChange()
      return true
    } catch {
      setMessage('Não foi possível salvar.')
      return false
    }
  }

  async function removeType(t: QuestType) {
    const n = data.quests.filter((q) => q.type_id === t.id).length
    const question = n ? `${n} quest(s) usam esse tipo; elas ficam sem tipo. Excluir "${t.name}"?` : `Excluir o tipo "${t.name}"?`
    if (!window.confirm(question)) return
    try {
      await deleteQuestType(t.id)
      onChange()
    } catch {
      setMessage('Não foi possível excluir.')
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Categorias</h2>
      <ul className="space-y-2">
        {data.categories.map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            types={data.questTypes.filter((t) => t.category_id === c.id).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))}
            onSave={save}
            onDelete={remove}
            onSaveType={saveType}
            onDeleteType={removeType}
          />
        ))}
      </ul>
      <CategoryFields initial={{ name: '', icon: 'sparkles', color: '#64748b' }} submitLabel="Adicionar" onSubmit={save} />
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
    </section>
  )
}

interface RowProps {
  category: Category
  types: QuestType[]
  onSave: (c: CategoryInput & { id?: string }) => Promise<boolean>
  onDelete: (c: Category) => void
  onSaveType: (t: { id?: string; category_id: string; name: string }) => Promise<boolean>
  onDeleteType: (t: QuestType) => void
}

function CategoryRow({ category: c, types, onSave, onDelete, onSaveType, onDeleteType }: RowProps) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <li>
        <CategoryFields
          initial={{ name: c.name, icon: c.icon, color: c.color }}
          submitLabel="Salvar"
          onSubmit={async (v) => {
            const ok = await onSave({ ...v, id: c.id })
            if (ok) setEditing(false)
            return ok
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }
  return (
    <li className="space-y-2 rounded-2xl bg-paper/70 p-2 pr-3">
      <div className="flex items-center gap-3">
        <Bubble icon={c.icon} color={c.color} />
        <span className="flex-1">{c.name}</span>
        {c.builtin ? (
          <span className="text-xs text-ink/60">padrão</span>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => setEditing(true)}>Editar</button>
            <button type="button" className="btn btn-danger" aria-label={`Excluir ${c.name}`} onClick={() => onDelete(c)}>
              <Trash2 aria-hidden className="size-4" />
            </button>
          </>
        )}
      </div>
      <TypeChips category={c} types={types} onSave={onSaveType} onDelete={onDeleteType} />
    </li>
  )
}

// A category's types: tap one to rename or delete it, "+ Tipo" to add.
function TypeChips({ category, types, onSave, onDelete }: {
  category: Category
  types: QuestType[]
  onSave: (t: { id?: string; category_id: string; name: string }) => Promise<boolean>
  onDelete: (t: QuestType) => void
}) {
  const [editing, setEditing] = useState<string | null>(null) // a type id, 'new', or closed
  const [name, setName] = useState('')
  const current = types.find((t) => t.id === editing)
  const open = (id: string, initial: string) => {
    setEditing(id)
    setName(initial)
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (await onSave({ id: current?.id, category_id: category.id, name })) setEditing(null)
  }
  return (
    <div className="flex flex-wrap items-center gap-2 pl-12">
      {types.map((t) => (
        <button key={t.id} type="button" className="chip pl-3" aria-label={`Editar tipo ${t.name}`} onClick={() => open(t.id, t.name)}>{t.name}</button>
      ))}
      <button type="button" className="chip pl-3" aria-label={`Adicionar tipo em ${category.name}`} onClick={() => open('new', '')}>+ Tipo</button>
      {editing && (
        <form onSubmit={submit} className="flex w-full flex-wrap gap-2">
          <input aria-label={`Nome do tipo em ${category.name}`} className="input min-w-0 flex-1" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary">Salvar</button>
          {current && <button type="button" className="btn btn-danger" onClick={() => onDelete(current)}>Excluir</button>}
          <button type="button" className="btn" onClick={() => setEditing(null)}>Cancelar</button>
        </form>
      )}
    </div>
  )
}

interface FieldsProps {
  initial: CategoryInput
  submitLabel: string
  onSubmit: (c: CategoryInput) => Promise<boolean>
  onCancel?: () => void
}

function CategoryFields({ initial, submitLabel, onSubmit, onCancel }: FieldsProps) {
  const [c, setC] = useState(initial)
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if ((await onSubmit(c)) && !onCancel) setC(initial)
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Nome da categoria" className="input min-w-0 flex-1" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <input aria-label="Cor" type="color" className="h-11 w-14 rounded" value={c.color} onChange={(e) => setC({ ...c, color: e.target.value })} />
        <button className="btn btn-primary">{submitLabel}</button>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancelar</button>}
      </div>
      <IconPicker value={c.icon} onChange={(icon) => setC({ ...c, icon })} />
    </form>
  )
}
