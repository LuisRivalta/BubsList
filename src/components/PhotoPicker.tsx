import { Camera, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { uploadPhoto } from '../data/api'
import { MAX_PHOTOS, UnsupportedImageError, compressImage } from '../lib/image'
import type { Photo } from '../lib/types'
import PhotoGrid from './PhotoGrid'

interface Props {
  existing: Photo[]
  pending: Blob[]
  onChange: (pending: Blob[]) => void
  onDeleteExisting?: (p: Photo) => void
}

export default function PhotoPicker({ existing, pending, onChange, onDeleteExisting }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const previews = useMemo(() => pending.map((b) => URL.createObjectURL(b)), [pending])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  async function add(files: File[]) {
    if (files.length === 0) return
    setError(null)
    if (existing.length + pending.length + files.length > MAX_PHOTOS) return setError(`Máximo de ${MAX_PHOTOS} fotos.`)
    setBusy(true)
    const blobs: Blob[] = []
    for (const file of files) {
      try {
        blobs.push(await compressImage(file))
      } catch (e) {
        setError(e instanceof UnsupportedImageError ? e.message : 'Não foi possível ler a imagem.')
      }
    }
    setBusy(false)
    if (blobs.length) onChange([...pending, ...blobs])
  }

  return (
    <div className="space-y-2">
      <PhotoGrid photos={existing} onDelete={onDeleteExisting} />
      {pending.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => onChange(pending.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-black/60 text-white"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="btn cursor-pointer">
        <Camera aria-hidden className="size-5" /> {busy ? 'Processando…' : 'Adicionar fotos'}
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            add(files)
          }}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

export async function uploadPending(target: { quest_id: string } | { review_id: string }, blobs: Blob[]): Promise<Blob[]> {
  const failed: Blob[] = []
  for (const blob of blobs) {
    try {
      await uploadPhoto(target, blob)
    } catch {
      failed.push(blob)
    }
  }
  return failed
}
