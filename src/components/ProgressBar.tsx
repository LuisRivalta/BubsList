import type { ReactNode } from 'react'

export default function ProgressBar({ value, max, size = 'sm', children }: { value: number; max: number; size?: 'sm' | 'lg'; children?: ReactNode }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      {children && <div className="flex items-center justify-between gap-2 text-xs text-ink/60">{children}</div>}
      <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className={`overflow-hidden rounded-full bg-ink/10 ${size === 'lg' ? 'h-3' : 'h-1.5'}`}>
        <div className="h-full rounded-full bg-linear-to-r from-brand to-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
