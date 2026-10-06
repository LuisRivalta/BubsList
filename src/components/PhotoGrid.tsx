import { useSignedUrls } from '../data/hooks'
import type { Photo } from '../lib/types'

export default function PhotoGrid({ photos, onDelete }: { photos: Photo[]; onDelete?: (p: Photo) => void }) {
  const urls = useSignedUrls(photos.map((p) => p.storage_path)).data ?? {}
  if (photos.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((p) => (
        <div key={p.id} className="relative">
          <a href={urls[p.storage_path]} target="_blank" rel="noreferrer">
            <img src={urls[p.storage_path]} alt="" loading="lazy" className="aspect-square w-full rounded-lg bg-gray-100 object-cover" />
          </a>
          {onDelete && (
            <button type="button" aria-label="Remover foto" onClick={() => onDelete(p)} className="absolute right-1 top-1 size-8 rounded-full bg-black/60 text-white">
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
