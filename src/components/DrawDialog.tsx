import { animate, stagger } from 'animejs'
import { X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { pickStars } from '../lib/constellation'
import { DIFFICULTIES } from '../lib/difficulty'
import { drawPool, type DrawFilter } from '../lib/filters'
import { prefersReducedMotion } from '../lib/motion'
import { placeOptions, type PlaceLevel, type PlaceOption } from '../lib/place'
import { count } from '../lib/text'
import { doneQuestIds, pathLabel, questMeta } from '../lib/tree'
import type { AppData, Quest, QuestType } from '../lib/types'
import Bubble from './Bubble'
import Gems from './Gems'
import { useHideSky } from './Layout'

const DrawConstellation = lazy(() => import('./DrawConstellation'))
const SPARKS = 14
// .chip has a white background but no text color of its own: over the night sky it needs ink text and an opaque pressed state.
const CHIP = 'chip text-ink aria-pressed:bg-blush'
const LEVELS: PlaceLevel[] = ['country', 'state', 'city']
const LEVEL_LABEL: Record<PlaceLevel, string> = { country: 'Países', state: 'Estados', city: 'Cidades' }
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

type Step = 'filters' | 'rolling' | 'result'

// Full-screen draw: choose the filters, watch the constellation, get a quest.
export default function DrawDialog({ data, onClose }: { data: AppData; onClose: () => void }) {
  useHideSky()
  const [filter, setFilter] = useState<DrawFilter>({ categoryIds: [], typeIds: [], difficulties: [], places: [] })
  const [step, setStep] = useState<Step>('filters')
  const [winner, setWinner] = useState<Quest | null>(null)
  const [stars, setStars] = useState<Quest[]>([])
  const [animated] = useState(() => !prefersReducedMotion())
  const done = useMemo(() => doneQuestIds(data.completions), [data.completions])
  const order = (categoryId: string) => data.categories.findIndex((c) => c.id === categoryId)
  const types = data.questTypes
    .filter((t) => filter.categoryIds.includes(t.category_id))
    .sort((a, b) => order(a.category_id) - order(b.category_id) || a.name.localeCompare(b.name, 'pt-BR'))
  const physical = data.categories.filter((c) => c.has_place).map((c) => c.id)
  const candidates = drawPool(data.quests, done, { categoryIds: filter.categoryIds, typeIds: [], difficulties: [], places: [] }).filter((q) =>
    physical.includes(q.category_id),
  )
  const places = placeOptions(data.quests, candidates)
  const placeKeys = [...places.country, ...places.state, ...places.city].map((o) => o.key)
  // Selections whose chip is not on screen (a place of another category, a type deleted meanwhile) are ignored, never silently applied.
  const active: DrawFilter = {
    ...filter,
    typeIds: filter.typeIds.filter((id) => types.some((t) => t.id === id)),
    places: filter.places.filter((k) => placeKeys.includes(k)),
  }
  const pool = drawPool(data.quests, done, active, { types: data.questTypes, categories: data.categories })
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function draw() {
    const options = winner && pool.length > 1 ? pool.filter((q) => q.id !== winner.id) : pool
    if (!options.length) return
    const next = options[Math.floor(Math.random() * options.length)]
    setWinner(next)
    if (animated) {
      setStars(pickStars(pool, next))
      setStep('rolling')
    } else setStep('result')
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="draw-title" className="fixed inset-0 z-50 overflow-y-auto bg-night text-white">
      <div aria-hidden className="sky-static fixed inset-0" />
      <h2 id="draw-title" className="fixed left-4 top-[max(1.1rem,env(safe-area-inset-top))] z-20 text-sm font-extrabold uppercase tracking-widest text-blush">
        Sorteio
      </h2>
      <button type="button" aria-label="Fechar" onClick={onClose} className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 grid size-11 place-items-center rounded-full hover:bg-white/10">
        <X aria-hidden className="size-6" />
      </button>

      <p aria-live="polite" className="sr-only">{step === 'result' && winner ? `Sorteada: ${winner.title}` : ''}</p>

      {step === 'filters' && <Filters data={data} filter={active} types={types} places={places} onChange={setFilter} poolSize={pool.length} onDraw={draw} />}

      {step === 'rolling' && winner && (
        <div className="fixed inset-0 z-10" onClick={() => setStep('result')}>
          <Suspense fallback={null}>
            <DrawConstellation titles={stars.map((s) => s.title)} winner={stars.indexOf(winner)} onDone={() => setStep('result')} />
          </Suspense>
          <button type="button" autoFocus className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] mx-auto w-fit rounded-full px-5 py-2 text-sm font-bold text-white/80 hover:bg-white/10">
            Pular
          </button>
        </div>
      )}

      {step === 'result' && winner && (
        <Result data={data} quest={winner} canRedraw={pool.length > 1} onRedraw={draw} onFilters={() => setStep('filters')} />
      )}
    </div>
  )
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 id={id} className="text-sm font-bold text-white/80">{title}</h3>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function Filters({ data, filter, types, places, onChange, poolSize, onDraw }: {
  data: AppData
  filter: DrawFilter
  types: QuestType[]
  places: Record<PlaceLevel, PlaceOption[]>
  onChange: (f: DrawFilter) => void
  poolSize: number
  onDraw: () => void
}) {

  return (
    <div className="relative mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 pb-8 pt-20">
      <Group id="draw-category" title="Categoria">
        <button type="button" className={`${CHIP} pl-3`} aria-pressed={filter.categoryIds.length === 0} onClick={() => onChange({ ...filter, categoryIds: [], typeIds: [] })}>Todas</button>
        {data.categories.map((c) => (
          <button key={c.id} type="button" className={CHIP} aria-pressed={filter.categoryIds.includes(c.id)} onClick={() => onChange({ ...filter, categoryIds: toggle(filter.categoryIds, c.id) })}>
            <Bubble icon={c.icon} color={c.color} size="sm" /> {c.name}
          </button>
        ))}
      </Group>
      {types.length > 0 && (
        <Group id="draw-type" title="Tipo">
          {types.map((t) => {
            const category = data.categories.find((c) => c.id === t.category_id)
            return (
              <button key={t.id} type="button" className={CHIP} aria-pressed={filter.typeIds.includes(t.id)} onClick={() => onChange({ ...filter, typeIds: toggle(filter.typeIds, t.id) })}>
                <Bubble icon={category?.icon ?? ''} color={category?.color ?? '#b3607e'} size="sm" /> {t.name}
              </button>
            )
          })}
        </Group>
      )}
      <Group id="draw-difficulty" title="Dificuldade">
        {DIFFICULTIES.map((d) => (
          <button key={d} type="button" className={`${CHIP} pl-3`} aria-pressed={filter.difficulties.includes(d)} onClick={() => onChange({ ...filter, difficulties: toggle(filter.difficulties, d) })}>
            <Gems difficulty={d} />
          </button>
        ))}
      </Group>
      {LEVELS.some((l) => places[l].length > 0) && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-white/80">Local</h3>
          {LEVELS.filter((l) => places[l].length > 0).map((level) => (
            <div key={level} role="group" aria-label={LEVEL_LABEL[level]} className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-xs font-semibold text-white/70">{LEVEL_LABEL[level]}</span>
              {places[level].map((o) => (
                <button key={o.key} type="button" className={`${CHIP} pl-3`} aria-pressed={filter.places.includes(o.key)} onClick={() => onChange({ ...filter, places: toggle(filter.places, o.key) })}>
                  {o.label}
                </button>
              ))}
            </div>
          ))}
        </section>
      )}
      <div className="mt-auto space-y-3 pt-4 text-center">
        <p aria-live="polite" className="font-semibold text-white/90">
          {poolSize ? count(poolSize, 'quest no sorteio', 'quests no sorteio') : 'Nenhuma quest com esses filtros'}
        </p>
        <button type="button" className="btn btn-primary min-h-12 w-full text-lg" disabled={poolSize === 0} onClick={onDraw}>Sortear</button>
      </div>
    </div>
  )
}

function Result({ data, quest, canRedraw, onRedraw, onFilters }: {
  data: AppData
  quest: Quest
  canRedraw: boolean
  onRedraw: () => void
  onFilters: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const bora = useRef<HTMLAnchorElement>(null)
  const category = data.categories.find((c) => c.id === quest.category_id)
  const poster = quest.media_id ? data.media.find((m) => m.id === quest.media_id)?.poster_url : null
  const meta = questMeta(data, quest)
  const path = pathLabel(data.quests, quest.id)

  useEffect(() => bora.current?.focus(), [quest.id])

  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = box.current!
    const angle = (i: number) => (i / SPARKS) * Math.PI * 2
    const anims = [
      animate(el, { scale: { from: 0.6 }, opacity: { from: 0 }, duration: 600, ease: 'outBack(1.6)', onComplete: (self) => self.revert() }),
      animate(el.querySelectorAll('[data-spark]'), {
        translateX: (_: unknown, i = 0) => Math.cos(angle(i)) * 150,
        translateY: (_: unknown, i = 0) => Math.sin(angle(i)) * 150,
        scale: [{ to: 1.4 }, { to: 0 }],
        opacity: [{ to: 1 }, { to: 0 }],
        duration: 1100,
        delay: stagger(18, { start: 120 }),
        ease: 'outExpo',
      }),
    ]
    return () => anims.forEach((a) => a.revert())
  }, [quest.id])

  return (
    <div className="relative mx-auto flex min-h-full max-w-sm flex-col justify-center px-4 py-20">
      <div ref={box} className="card relative space-y-3 p-6 text-center text-ink">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-24">
          {Array.from({ length: SPARKS }, (_, i) => <span key={i} data-spark className="spark" />)}
        </div>
        {poster ? (
          <img src={poster} alt="" className="mx-auto max-h-56 rounded-2xl shadow-lg" />
        ) : (
          <div className="flex justify-center"><Bubble icon={category?.icon ?? ''} color={category?.color ?? '#b3607e'} size="lg" /></div>
        )}
        {path && <p className="text-xs text-ink/60">{path} ›</p>}
        <p className="font-display text-2xl font-bold leading-tight">{quest.title}</p>
        {meta && <p className="text-sm text-ink/60">{meta}</p>}
        <div className="flex justify-center"><Gems difficulty={quest.difficulty} /></div>
        <div className="grid gap-2 pt-2">
          <Link ref={bora} to={`/quests/${quest.id}`} className="btn btn-primary min-h-12">Bora!</Link>
          {canRedraw && <button type="button" className="btn min-h-12" onClick={onRedraw}>Sortear outra</button>}
          <button type="button" className="btn min-h-12" onClick={onFilters}>Filtros</button>
        </div>
      </div>
    </div>
  )
}
