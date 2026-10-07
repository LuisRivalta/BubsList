import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import Icon, { IconPicker } from '../components/Icon'
import { LoadError, Loading } from '../components/Status'
import { deleteCategory, saveCategory, signOut, updateProfile, uploadAvatar, type CategoryInput } from '../data/api'
import { useAppData, useRefresh, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { UnsupportedImageError, compressImage } from '../lib/image'
import type { AppData, Category, Profile } from '../lib/types'

export default function ProfilePage() {
  const q = useAppData()
  const me = useUserId()
  const refresh = useRefresh()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const profile = q.data.profiles.find((p) => p.id === me)

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">Perfil</h1>
      {profile && <ProfileForm profile={profile} onSaved={refresh} />}
      <Categories data={q.data} onChange={refresh} />
      <section className="space-y-2 text-sm text-gray-600">
        <h2 className="font-semibold text-gray-900">Créditos</h2>
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          <img src="/tmdb.svg" alt="TMDB" className="h-4" />
        </a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        <p>
          Dados de anime: <a className="underline" href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>.
        </p>
      </section>
      <button type="button" className="btn btn-danger w-full" onClick={() => signOut()}>Sair</button>
    </div>
  )
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [name, setName] = useState(profile.display_name)
  const [message, setMessage] = useState<string | null>(null)
  const avatarUrl = useSignedUrls(profile.avatar_path ? [profile.avatar_path] : []).data?.[profile.avatar_path ?? '']

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
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="grid size-16 place-items-center rounded-full bg-brand text-2xl text-white">
            {profile.display_name[0]?.toUpperCase()}
          </span>
        )}
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
      </div>
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

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Categorias</h2>
      <ul className="space-y-2">
        {data.categories.map((c) => <CategoryRow key={c.id} category={c} onSave={save} onDelete={remove} />)}
      </ul>
      <CategoryFields initial={{ name: '', icon: 'sparkles', color: '#64748b' }} submitLabel="Adicionar" onSubmit={save} />
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
    </section>
  )
}

interface RowProps {
  category: Category
  onSave: (c: CategoryInput & { id?: string }) => Promise<boolean>
  onDelete: (c: Category) => void
}

function CategoryRow({ category: c, onSave, onDelete }: RowProps) {
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
    <li className="card flex items-center gap-3 p-3">
      <span style={{ color: c.color }}><Icon name={c.icon} /></span>
      <span className="flex-1">{c.name}</span>
      {c.builtin ? (
        <span className="text-xs text-gray-500">padrão</span>
      ) : (
        <>
          <button type="button" className="btn" onClick={() => setEditing(true)}>Editar</button>
          <button type="button" className="btn btn-danger" aria-label={`Excluir ${c.name}`} onClick={() => onDelete(c)}>
            <Trash2 aria-hidden className="size-4" />
          </button>
        </>
      )}
    </li>
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
