import { Share2, Star, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import Bubble from '../components/Bubble'
import CountUp from '../components/CountUp'
import Gems from '../components/Gems'
import Icon from '../components/Icon'
import Stagger from '../components/Stagger'
import Stars from '../components/Stars'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { formatDate } from '../lib/dates'
import { prefersReducedMotion } from '../lib/motion'
import { drawStory, shareOrDownload, type ImageRef } from '../lib/story'
import { buildWrapped, storyCard, type Slide } from '../lib/wrapped'

const SkyScene = lazy(() => import('../components/SkyScene'))
const SLIDE_MS = 6000 // same as the .story-fill animation in index.css

export default function WrappedPage() {
  const { year: param = '' } = useParams()
  const q = useAppData()
  const me = useUserId()
  if (q.error) return <Night><LoadError retry={() => q.refetch()} /></Night>
  if (!q.data) return <Night><PageLoading /></Night>
  const year = /^\d{4}$/.test(param) ? Number(param) : NaN
  const slides = Number.isNaN(year) ? [] : buildWrapped(year, q.data, me)
  if (slides.length === 0) return <Navigate to="/relatorio" replace />
  return <Stories year={year} slides={slides} />
}

// Loading and error heroes use white text: give them the night background outside the Layout.
function Night({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 overflow-y-auto bg-night px-4">{children}</div>
}

const pathsOf = (s: Slide): string[] => {
  if (s.kind === 'album') return s.photos.slice(0, 9).map((p) => p.storage_path)
  if ('image' in s && s.image && 'path' in s.image) return [s.image.path]
  return []
}

function Stories({ year, slides }: { year: number; slides: Slide[] }) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [animated] = useState(() => !prefersReducedMotion())
  const last = slides.length - 1
  const slide = slides[index]
  const urls = useSignedUrls(slides.flatMap(pathsOf)).data ?? {}
  const src = (ref: ImageRef | null) => (!ref ? null : 'url' in ref ? ref.url : (urls[ref.path] ?? null))
  const go = (delta: number) => setIndex((i) => Math.min(last, Math.max(0, i + delta)))
  const close = () => navigate('/relatorio')

  useEffect(() => {
    if (!animated || sharing || index === last) return
    const timer = setTimeout(() => go(1), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, sharing, animated, last])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function share() {
    setSharing(true)
    setFailed(false)
    try {
      const card = storyCard(slide)
      await shareOrDownload(await drawStory(card, year, src(card.image)), `bubs2do-${year}-${slide.kind}.png`)
    } catch {
      setFailed(true)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-night text-white">
      <div aria-hidden className="sky-static absolute inset-0" />
      {animated && (
        <Suspense fallback={null}>
          <SkyScene boltEvery={[9000, 18000]} moon="small" />
        </Suspense>
      )}
      <div className="relative mx-auto flex h-full max-w-md flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div aria-hidden className="flex gap-1">
          {slides.map((s, i) => (
            <span key={s.kind} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <span className={`block h-full rounded-full bg-white ${i < index ? 'w-full' : i > index ? 'w-0' : animated && i < last ? 'story-fill' : 'w-full'}`} />
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold text-white/90">Retrospectiva {year}</h1>
          <button type="button" aria-label="Fechar" onClick={close} className="grid size-11 place-items-center rounded-full hover:bg-white/10">
            <X aria-hidden className="size-6" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <section key={index} aria-roledescription="slide" aria-label={`${index + 1} de ${slides.length}`} className="absolute inset-0 overflow-y-auto">
            <SlideView slide={slide} cover={'image' in slide ? src(slide.image) : null} urls={urls} />
          </section>
          <button type="button" aria-label="Anterior" disabled={index === 0} onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/3 cursor-default" />
          <button type="button" aria-label="Próxima" disabled={index === last} onClick={() => go(1)} className="absolute inset-y-0 right-0 w-2/3 cursor-default" />
        </div>
        {failed && <p role="alert" className="text-center text-sm font-semibold text-rose-200">Não deu para gerar a imagem.</p>}
        <button type="button" className="btn btn-primary min-h-12" disabled={sharing} onClick={share}>
          <Share2 aria-hidden className="size-5" /> {sharing ? 'Gerando…' : 'Compartilhar'}
        </button>
      </div>
    </div>
  )
}

function SlideView({ slide, cover, urls }: { slide: Slide; cover: string | null; urls: Record<string, string> }) {
  return (
    <Stagger className="flex min-h-full flex-col items-center justify-center gap-4 py-6 text-center">
      <p className="text-sm font-extrabold uppercase tracking-widest text-blush">{storyCard(slide).eyebrow}</p>
      {cover && (
        <img
          src={cover}
          alt=""
          className="max-h-72 max-w-64 rounded-3xl shadow-2xl"
          onError={(e) => {
            e.currentTarget.hidden = true
          }}
        />
      )}
      <Body slide={slide} urls={urls} />
    </Stagger>
  )
}

const title = 'break-words font-display text-4xl font-bold leading-tight'

function Body({ slide, urls }: { slide: Slide; urls: Record<string, string> }) {
  switch (slide.kind) {
    case 'intro':
      return (
        <>
          <h2 className="font-display text-8xl font-bold">{slide.year}</h2>
          <p className="font-display text-2xl font-semibold text-white/90">de {slide.names.join(' & ')}</p>
        </>
      )
    case 'total':
      return (
        <>
          <h2 className="font-display text-8xl font-bold"><CountUp value={slide.total} /></h2>
          <p className="text-xl font-bold">{slide.total === 1 ? 'quest' : 'quests'}</p>
          <p className="text-white/80">{slide.busiestMonth} foi o mês mais movimentado ({slide.busiestCount})</p>
        </>
      )
    case 'categories': {
      const top = slide.top[0]
      return (
        <>
          <Bubble icon={top.category.icon} color={top.category.color} size="lg" />
          <h2 className={title}>{top.category.name}</h2>
          <ul className="w-full max-w-xs space-y-3 text-left">
            {slide.top.map(({ category, count }) => (
              <li key={category.id} className="space-y-1">
                <p className="flex justify-between gap-3 text-sm font-bold"><span className="break-words">{category.name}</span><span>{count}</span></p>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                  <div className="bar-grow h-full rounded-full" style={{ width: `${(count / top.count) * 100}%`, background: category.color }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )
    }
    case 'hardest':
      return (
        <>
          <h2 className={title}>{slide.item.quest.title}</h2>
          <Gems difficulty={slide.item.quest.difficulty} onDark />
          <p className="text-white/80">{formatDate(slide.item.completion.done_on)}</p>
        </>
      )
    case 'best':
      return (
        <>
          <h2 className={title}>{slide.item.quest.title}</h2>
          <p className="inline-flex items-center gap-2 font-display text-3xl font-bold text-blush">
            <Star aria-hidden className="size-7 fill-current" /> {slide.item.average!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </p>
        </>
      )
    case 'disagree':
      return (
        <>
          <h2 className={title}>{slide.item.quest.title}</h2>
          <ul className="space-y-2">
            {slide.ratings.map((r) => (
              <li key={r.name} className="flex items-center justify-center gap-3 font-semibold">
                <span>{r.name} deu {r.rating}</span>
                <Stars value={r.rating} />
              </li>
            ))}
          </ul>
        </>
      )
    case 'medals':
      return (
        <>
          <h2 className="font-display text-7xl font-bold"><CountUp value={slide.unlocked.length} /></h2>
          <p className="text-xl font-bold">{slide.unlocked.length === 1 ? 'medalha' : 'medalhas'}</p>
          <ul className="flex flex-wrap justify-center gap-4">
            {slide.unlocked.slice(0, 6).map(({ achievement: a }) => (
              <li key={a.id} className={`medal-${a.rarity} flex w-24 flex-col items-center gap-2 [perspective:600px]`}>
                <span className="medallion medal-spin size-16"><Icon name={a.icon} className="size-7" /></span>
                <span className="text-xs font-bold leading-tight">{a.name}</span>
              </li>
            ))}
          </ul>
        </>
      )
    case 'album':
      return (
        <>
          <ul className="grid w-full max-w-xs grid-cols-3 gap-2">
            {slide.photos.slice(0, 9).map((p) => (
              <li key={p.id}><img src={urls[p.storage_path]} alt="" className="aspect-square w-full rounded-xl bg-white/10 object-cover" /></li>
            ))}
          </ul>
          <h2 className="font-display text-4xl font-bold">{slide.photos.length} {slide.photos.length === 1 ? 'foto' : 'fotos'}</h2>
        </>
      )
    case 'outro':
      return (
        <>
          <h2 className="font-display text-8xl font-bold"><CountUp value={slide.pending} /></h2>
          <p className="text-xl font-bold">{slide.pending === 1 ? 'quest esperando' : 'quests esperando'} por vocês</p>
        </>
      )
  }
}
