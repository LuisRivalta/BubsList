import { useEffect, useState } from 'react'
import { fetchCatalogDetails, searchCatalog } from '../lib/catalog'
import type { CatalogHit, CategoryKind, NormalizedMedia } from '../lib/types'

type Status = 'idle' | 'loading' | 'empty' | 'error'

export default function CatalogSearch({ kind, onPick }: { kind: Exclude<CategoryKind, 'general'>; onPick: (m: NormalizedMedia) => void }) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CatalogHit[]>([])
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setHits([])
      setStatus('idle')
      return
    }
    let alive = true
    setStatus('loading')
    const timer = setTimeout(() => {
      searchCatalog(kind, term)
        .then((found) => {
          if (!alive) return
          setHits(found)
          setStatus(found.length ? 'idle' : 'empty')
        })
        .catch(() => alive && setStatus('error'))
    }, 400)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query, kind])

  async function pick(hit: CatalogHit) {
    setStatus('loading')
    try {
      onPick(await fetchCatalogDetails(hit.source, hit.external_id))
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block font-medium">Buscar no catálogo</span>
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: Frieren" />
      </label>
      {status === 'loading' && <p className="text-sm text-gray-500">Buscando…</p>}
      {status === 'empty' && <p className="text-sm text-gray-500">Nada encontrado. Você pode salvar só com o título.</p>}
      {status === 'error' && <p className="text-sm text-red-600">Não foi possível buscar. Você pode salvar só com o título.</p>}
      <ul className="space-y-1">
        {hits.map((h) => (
          <li key={h.external_id}>
            <button type="button" onClick={() => pick(h)} className="card flex w-full items-center gap-3 p-2 text-left">
              {h.poster_url && <img src={h.poster_url} alt="" className="h-14 w-10 rounded object-cover" />}
              <span>{h.title}{h.year ? ` (${h.year})` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
