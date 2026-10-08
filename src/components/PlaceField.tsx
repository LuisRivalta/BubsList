import { MapPin, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { searchPlaces, type PlaceChoice } from '../lib/place'

export interface PlaceFields {
  city: string | null
  state: string | null
  country: string | null
  place_label: string | null
  lat: number | null
  lng: number | null
}
export const NO_PLACE: PlaceFields = { city: null, state: null, country: null, place_label: null, lat: null, lng: null }

// Place search (OpenStreetMap): type, then Buscar (or Enter), then pick a suggestion. Never searches while typing (Nominatim policy).
// Text typed without picking is kept as the city.
export default function PlaceField({ value, inherited, onChange }: { value: PlaceFields; inherited: string | null; onChange: (v: PlaceFields) => void }) {
  const chosen = value.place_label
  const [text, setText] = useState(chosen ? '' : (value.city ?? ''))
  const [results, setResults] = useState<PlaceChoice[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')

  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])

  async function search() {
    const q = text.trim()
    if (q.length < 3) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setResults([])
    setStatus('loading')
    try {
      const list = await searchPlaces(q, controller.signal)
      if (controller.signal.aborted) return
      setResults(list)
      setStatus(list.length ? 'idle' : 'empty')
    } catch {
      if (!controller.signal.aborted) setStatus('error')
    }
  }

  function type(t: string) {
    pending.current?.abort()
    setResults([])
    setStatus('idle')
    setText(t)
    onChange({ ...NO_PLACE, city: t.trim() || null })
  }

  function pick(p: PlaceChoice) {
    pending.current?.abort()
    onChange({ city: p.city, state: p.state, country: p.country, place_label: p.label, lat: p.lat, lng: p.lng })
    setResults([])
  }

  function clear() {
    setText('')
    onChange(NO_PLACE)
  }

  return (
    <div className="space-y-2">
      <span id="place-label" className="block font-bold">Local <span className="font-normal text-ink/60">(opcional)</span></span>
      {chosen ? (
        <div className="flex items-center gap-2 rounded-2xl bg-blush/30 p-2 pl-3">
          <MapPin aria-hidden className="size-4 shrink-0 text-accent" />
          <span className="flex-1 font-semibold">{chosen}</span>
          <button type="button" aria-label="Limpar local" onClick={clear} className="grid size-9 place-items-center rounded-full hover:bg-blush/50">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            aria-labelledby="place-label"
            className="input min-w-0 flex-1"
            value={text}
            maxLength={80}
            placeholder="Cidade, estado ou país"
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                search()
              }
            }}
          />
          <button type="button" className="btn shrink-0" disabled={text.trim().length < 3} onClick={search}>
            <Search aria-hidden className="size-4" /> Buscar
          </button>
        </div>
      )}
      {!chosen && !text && inherited && <p className="text-sm text-ink/60">Herdado: {inherited}</p>}
      {status === 'loading' && <p className="text-sm text-ink/60">Buscando…</p>}
      {status === 'empty' && <p className="text-sm text-ink/60">Nenhum lugar encontrado.</p>}
      {status === 'error' && <p role="alert" className="text-sm text-red-600">Não deu para buscar agora. O que você digitou fica salvo como cidade.</p>}
      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((p) => (
            <li key={`${p.label}-${p.lat}-${p.lng}`}>
              <button type="button" onClick={() => pick(p)} className="flex w-full items-center gap-2 rounded-xl border border-blush/70 bg-white px-3 py-2.5 text-left font-semibold hover:bg-blush/30"><MapPin aria-hidden className="size-4 shrink-0 text-accent" /> {p.label}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink/60">
        Lugares © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a>
      </p>
    </div>
  )
}
