import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Bubble from '../components/Bubble'
import { useHideSky } from '../components/Layout'
import PageHero from '../components/PageHero'
import SegmentedControl from '../components/SegmentedControl'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData } from '../data/hooks'
import { mapPins, type MapShow, type Pin } from '../lib/map'
import { placeLabel } from '../lib/place'
import { count } from '../lib/text'
import type { AppData } from '../lib/types'

const QuestMap = lazy(() => import('../components/QuestMap'))

const SHOW: { value: MapShow; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'done', label: 'Feitas' },
]

export default function MapPage() {
  const q = useAppData()
  const [show, setShow] = useState<MapShow>('all')
  const [picked, setPicked] = useState<Pin | null>(null)
  useHideSky() // the map covers the page; no point animating the sky behind it
  // Memoized so tapping a pin (a re-render) does not refit the map.
  const result = useMemo(() => (q.data ? mapPins(q.data, show) : null), [q.data, show])

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data || !result) return <PageLoading />
  const { pins, unplaced } = result

  return (
    <>
      <PageHero title="Mapa" />
      <div className="space-y-4">
        <SegmentedControl
          label="Mostrar"
          options={SHOW}
          value={show}
          onChange={(v) => {
            setShow(v)
            setPicked(null)
          }}
        />
        {/* isolate: Leaflet panes (z-index up to 1000) stay under the menu bar */}
        <div className="relative isolate h-[60dvh] min-h-80 overflow-hidden rounded-3xl border border-white/70 bg-paper shadow-lg">
          <Suspense fallback={<p className="grid size-full place-items-center text-ink/60">Carregando o mapa…</p>}>
            <QuestMap pins={pins} onPick={setPicked} />
          </Suspense>
          {pins.length === 0 && (
            <p className="absolute inset-x-3 top-3 z-[1001] rounded-xl bg-white/95 p-3 text-sm font-semibold shadow">
              Nenhuma quest no mapa ainda. Escolham o lugar pela busca no formulário.
            </p>
          )}
          {picked && <PinCard pin={picked} data={q.data} onClose={() => setPicked(null)} />}
        </div>
        {unplaced.length > 0 && (
          <section className="card space-y-2 p-4 text-sm">
            <p className="font-semibold">{count(unplaced.length, 'quest', 'quests')} com lugar fora do mapa:</p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {unplaced.map((x) => (
                <li key={x.id}>
                  <Link to={`/quests/${x.id}/editar`} className="font-semibold text-brand underline underline-offset-2">{x.title}</Link>
                </li>
              ))}
            </ul>
            <p className="text-ink/60">Escolham o lugar pela busca para elas aparecerem.</p>
          </section>
        )}
      </div>
    </>
  )
}

function PinCard({ pin, data, onClose }: { pin: Pin; data: AppData; onClose: () => void }) {
  return (
    <section aria-label="Neste ponto" className="absolute inset-x-3 bottom-3 z-[1001] max-h-[55%] space-y-2 overflow-y-auto rounded-2xl bg-white p-3 shadow-xl">
      <ul className="space-y-1">
        {pin.quests.map((x) => {
          const c = data.categories.find((k) => k.id === x.category_id)
          return (
            <li key={x.id}>
              <Link to={`/quests/${x.id}`} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-blush/30">
                <Bubble icon={c?.icon ?? ''} color={c?.color ?? '#e3b4cf'} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{x.title}</span>
                  <span className="block truncate text-xs text-ink/60">{x.place_label ?? placeLabel(x)}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn w-full" onClick={onClose}>Fechar</button>
    </section>
  )
}
