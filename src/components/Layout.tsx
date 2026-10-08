import { animate } from 'animejs'
import { ChartColumn, Map as MapIcon, ScrollText, Trophy, User } from 'lucide-react'
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { prefersReducedMotion } from '../lib/motion'
import { applyUpdate } from '../lib/update'

const SkyScene = lazy(() => import('./SkyScene'))

// Full-screen 3D overlays (the draw) hide the page sky while mounted, so only one WebGL context runs at a time.
const HideSkyContext = createContext<() => () => void>(() => () => {})

export function useHideSky() {
  const hide = useContext(HideSkyContext)
  useEffect(() => hide(), [hide])
}

const NAV = [
  { to: '/', label: 'Quests', Icon: ScrollText },
  { to: '/mapa', label: 'Mapa', Icon: MapIcon },
  { to: '/conquistas', label: 'Conquistas', Icon: Trophy },
  { to: '/relatorio', label: 'Retrospectiva', Icon: ChartColumn },
  { to: '/perfil', label: 'Perfil', Icon: User },
]

const isActive = (to: string, pathname: string) => (to === '/' ? pathname === '/' || pathname.startsWith('/quests') || pathname.startsWith('/categoria') : pathname.startsWith(to))

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

// Async click handlers that fail without their own try/catch end up here, so a failed save never goes unnoticed.
function useSaveFailed() {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const show = () => setFailed(true)
    window.addEventListener('unhandledrejection', show)
    return () => window.removeEventListener('unhandledrejection', show)
  }, [])
  useEffect(() => {
    if (!failed) return
    const timer = setTimeout(() => setFailed(false), 6000)
    return () => clearTimeout(timer)
  }, [failed])
  return failed
}

// A deploy shows "Nova versão" instead of reloading on its own, so nothing typed is lost.
// The installed iPhone app stays open in the background for days: look for a new version whenever it comes back.
function useNewVersion() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      if (!r) return
      registration.current = r
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') r.update().catch(() => {})
      })
    },
  })
  return needRefresh ? () => applyUpdate(registration.current, () => updateServiceWorker(true), () => window.location.reload()) : null
}

// New page content rises in; the inline transform is removed afterwards so fixed overlays inside keep covering the screen.
function PageEnter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const a = animate(ref.current!, { opacity: { from: 0 }, translateY: { from: 16 }, duration: 350, ease: 'outQuad', onComplete: (self) => self.revert() })
    return () => {
      a.revert()
    }
  }, [])
  return <div ref={ref} data-page>{children}</div>
}

export default function Layout() {
  const online = useOnline()
  const saveFailed = useSaveFailed()
  const update = useNewVersion()
  const { pathname } = useLocation()
  const [animated] = useState(() => !prefersReducedMotion())
  const [hiders, setHiders] = useState(0)
  const hide = useCallback(() => {
    setHiders((n) => n + 1)
    return () => setHiders((n) => n - 1)
  }, [])
  const nav = useRef<HTMLElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const placed = useRef(false)

  useLayoutEffect(() => {
    const move = (instant: boolean) => {
      const active = nav.current?.querySelector<HTMLElement>('a[aria-current="page"]')
      const el = pill.current
      if (!el) return
      if (!active) {
        el.style.opacity = '0'
        return
      }
      el.style.opacity = '1'
      const to = { left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight }
      if (instant || !animated) Object.assign(el.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` })
      else animate(el, { ...to, duration: 420, ease: 'outExpo' })
    }
    move(!placed.current)
    placed.current = true
    const onResize = () => move(true)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pathname, animated])

  return (
    <HideSkyContext.Provider value={hide}>
      <div className="min-h-dvh md:flex">
        <nav
          ref={nav}
          aria-label="Principal"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex rounded-full border border-white/70 bg-white/80 p-1.5 shadow-[0_12px_30px_-10px_rgb(26_17_21/0.4)] backdrop-blur-xl md:sticky md:inset-auto md:top-0 md:h-dvh md:w-60 md:shrink-0 md:flex-col md:gap-1 md:rounded-none md:border-0 md:bg-night md:p-4 md:shadow-none"
        >
          <span ref={pill} aria-hidden className="absolute rounded-full bg-linear-to-r from-brand to-accent md:rounded-xl md:bg-none md:bg-white/12" style={{ opacity: 0 }} />
          <span className="hidden px-3 pb-6 pt-2 font-display text-2xl font-bold text-blush md:block">Bubs2Do</span>
          {NAV.map((n) => {
            const active = isActive(n.to, pathname)
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? 'page' : undefined}
                className={`relative z-10 flex min-h-12 flex-auto flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-bold transition-colors md:min-h-11 md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-sm ${
                  active ? 'text-white' : 'text-ink/70 md:text-white/60 md:hover:text-white'
                }`}
              >
                <n.Icon aria-hidden className="size-5" strokeWidth={1.9} />
                {n.label}
              </Link>
            )
          })}
        </nav>
        <main className="relative min-w-0 flex-1 overflow-x-clip pb-28 md:pb-12">
          <div aria-hidden className="sky-host absolute inset-x-0 top-0 overflow-hidden">
            <div className="sky-static absolute inset-0" />
            {animated && hiders === 0 && (
              <Suspense fallback={null}>
                <SkyScene boltEvery={[9000, 18000]} moon="small" />
              </Suspense>
            )}
            <svg className="absolute -bottom-px left-0 h-8 w-full text-paper md:h-12" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 10V6Q50-3 100 6V10Z" fill="currentColor" />
            </svg>
          </div>
          <div className="relative mx-auto max-w-5xl px-4 md:px-8">
            <PageEnter key={pathname}>
              <Outlet />
            </PageEnter>
          </div>
        </main>
        <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 space-y-2 md:left-auto md:right-6 md:max-w-md">
          {update && (
            <div role="status" className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-ink shadow-lg">
              <span className="flex-1">Nova versão do Bubs2Do</span>
              <button type="button" className="btn btn-primary" onClick={update}>Atualizar</button>
            </div>
          )}
          {!online && (
            <p role="alert" className="rounded-xl bg-yellow-100 p-3 text-sm text-yellow-900 shadow-lg">
              Sem conexão. O que você digitar continua aqui — tente salvar quando a internet voltar.
            </p>
          )}
          {saveFailed && (
            <p role="alert" className="rounded-xl bg-rose-100 p-3 text-sm font-semibold text-rose-900 shadow-lg">
              Não deu para salvar. Confira a internet e tente de novo.
            </p>
          )}
        </div>
      </div>
    </HideSkyContext.Provider>
  )
}
