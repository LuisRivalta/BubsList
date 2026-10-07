import { animate, stagger } from 'animejs'
import { X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { pickStars } from '../lib/constellation'
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../lib/difficulty'
import { cityOptions, drawPool, sameText, type DrawFilter } from '../lib/filters'
import { prefersReducedMotion } from '../lib/motion'
import { count } from '../lib/text'
import { doneQuestIds, pathLabel, questMeta } from '../lib/tree'
import type { AppData, Quest } from '../lib/types'
import Bubble from './Bubble'
import Gems from './Gems'
import { useHideSky } from './Layout'

const DrawConstellation = lazy(() => import('./DrawConstellation'))
const SPARKS = 14
// .chip has a white background but no text color of its own: over the night sky it needs ink text and an opaque pressed state.
const CHIP = 'chip text-ink aria-pressed:bg-blush'
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

type Step = 'filters' | 'rolling' | 'result'

// Full-screen draw: choose the filters, watch the constellation, get a quest.
export default function DrawDialog({ data, categoryId, onClose }: { data: AppData; categoryId: string | null; onClose: () => void }) {
  useHideSky()
  const [filter, setFilter] = useState<DrawFilter>({ categoryId, typeIds: [], difficulties: [], cities: [] })
  const [step, setStep] = useState<Step>('filters')
  const [winner, setWinner] = useState<Quest | null>(null)
  const [stars, setStars] = useState<Quest[]>([])
  const [animated] = useState(() => !prefersReducedMotion())
  const done = useMemo(() => doneQuestIds(data.completions), [data.completions])
  const pool = drawPool(data.quests, done, filter)

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

      {step === 'filters' && <Filters data={data} done={done} filter={filter} onChange={setFilter} poolSize={pool.length} onDraw={draw} />}

      {step === 'rolling' && winner && (
        <div className="fixed inset-0 z-10" onClick={() => setStep('result')}>
          <Suspense fallback={null}>
            <DrawConstellation titles={stars.map((s) => s.title)} winner={stars.indexOf(winner)} onDone={() => setStep('result')} />
          </Suspense>
          <button type="button" className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] mx-auto w-fit rounded-full px-5 py-2 text-sm font-bold text-white/80 hover:bg-white/10">
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

function Filters({ data, done, filter, onChange, poolSize, onDraw }: {
  data: AppData
  done: Set<string>
  filter: DrawFilter
  onChange: (f: DrawFilter) => void
  poolSize: number
  onDraw: () => void
}) {
  const types = filter.categoryId
    ? data.questTypes.filter((t) => t.category_id === filter.categoryId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    : []
  const inCategory = drawPool(data.quests, done, { categoryId: filter.categoryId, typeIds: [], difficulties: [], cities: [] })
  const cities = cityOptions(data.quests, inCategory)
  const pickCategory = (categoryId: string | null) => onChange({ ...filter, categoryId, typeIds: [] })

  return (
    <div className="relative mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 pb-8 pt-20">
      <Group id="draw-category" title="Categoria">
        <button type="button" className={`${CHIP} pl-3`} aria-pressed={filter.categoryId === null} onClick={() => pickCategory(null)}>Todas</button>
        {data.categories.map((c) => (
          <button key={c.id} type="button" className={CHIP} aria-pressed={filter.categoryId === c.id} onClick={() => pickCategory(c.id)}>
            <Bubble icon={c.icon} color={c.color} size="sm" /> {c.name}
          </button>
        ))}
      </Group>
      {types.length > 0 && (
        <Group id="draw-type" title="Tipo">
          {types.map((t) => (
            <button key={t.id} type="button" className={`${CHIP} pl-3`} aria-pressed={filter.typeIds.includes(t.id)} onClick={() => onChange({ ...filter, typeIds: toggle(filter.typeIds, t.id) })}>
              {t.name}
            </button>
          ))}
        </Group>
      )}
      <Group id="draw-difficulty" title="Dificuldade">
        {DIFFICULTIES.map((d) => (
          <button key={d} type="button" className={`${CHIP} pl-3`} aria-pressed={filter.difficulties.includes(d)} onClick={() => onChange({ ...filter, difficulties: toggle(filter.difficulties, d) })}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </Group>
      {cities.length > 0 && (
        <Group id="draw-city" title="Cidade">
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              className={`${CHIP} pl-3`}
              aria-pressed={filter.cities.some((x) => sameText(x, c))}
              onClick={() => onChange({ ...filter, cities: filter.cities.some((x) => sameText(x, c)) ? filter.cities.filter((x) => !sameText(x, c)) : [...filter.cities, c] })}
            >
              {c}
            </button>
          ))}
        </Group>
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
  const category = data.categories.find((c) => c.id === quest.category_id)
  const poster = quest.media_id ? data.media.find((m) => m.id === quest.media_id)?.poster_url : null
  const meta = questMeta(data, quest)
  const path = pathLabel(data.quests, quest.id)

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
          <Link to={`/quests/${quest.id}`} className="btn btn-primary min-h-12">Bora!</Link>
          {canRedraw && <button type="button" className="btn min-h-12" onClick={onRedraw}>Sortear outra</button>}
          <button type="button" className="btn min-h-12" onClick={onFilters}>Filtros</button>
        </div>
      </div>
    </div>
  )
}
