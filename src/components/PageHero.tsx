import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface Props {
  title: ReactNode
  eyebrow?: ReactNode
  stats?: ReactNode
  actions?: ReactNode
  cover?: string | null
  children?: ReactNode
}

// Top band of every page, drawn over the shared sky. Reports its height so the sky (in Layout) fits behind it.
export default function PageHero({ title, eyebrow, stats, actions, cover, children }: Props) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = ref.current!
    const report = () => document.documentElement.style.setProperty('--hero-h', `${el.offsetHeight}px`)
    report()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <header ref={ref} className="relative min-h-[200px] pb-12 pt-8 text-white md:min-h-[240px] md:pb-16 md:pt-12">
      {cover && <div aria-hidden className="hero-cover" style={{ backgroundImage: `url("${cover}")` }} />}
      <div className="relative space-y-3">
        {eyebrow}
        <h1 className="break-words text-3xl font-bold leading-tight drop-shadow-sm md:text-5xl">{title}</h1>
        {stats && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80 md:text-base">{stats}</div>}
        {children}
        {actions && <div className="flex flex-wrap gap-2 pt-2">{actions}</div>}
      </div>
    </header>
  )
}
