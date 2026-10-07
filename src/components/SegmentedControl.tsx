import { animate } from 'animejs'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

interface Props<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  tone?: 'light' | 'dark'
}

export default function SegmentedControl<T extends string>({ label, options, value, onChange, tone = 'light' }: Props<T>) {
  const box = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const placed = useRef(false)

  const place = (instant: boolean) => {
    const active = box.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!active || !pill.current) return
    const to = { left: active.offsetLeft, width: active.offsetWidth }
    if (instant || prefersReducedMotion()) Object.assign(pill.current.style, { left: `${to.left}px`, width: `${to.width}px` })
    else animate(pill.current, { ...to, duration: 380, ease: 'outExpo' })
  }

  useLayoutEffect(() => {
    place(!placed.current)
    placed.current = true
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => place(true)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const dark = tone === 'dark'
  return (
    <div
      ref={box}
      role="tablist"
      aria-label={label}
      className={`relative grid rounded-full p-1 ${dark ? 'bg-white/10 ring-1 ring-white/20' : 'border border-blush/70 bg-white shadow-sm'}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span ref={pill} data-pill aria-hidden className={`absolute inset-y-1 rounded-full ${dark ? 'bg-white/90' : 'bg-linear-to-r from-brand to-accent'}`} />
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`relative z-10 min-h-11 rounded-full px-3 text-sm font-bold transition-colors ${on ? (dark ? 'text-brand' : 'text-white') : dark ? 'text-white/80' : 'text-ink/60'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
