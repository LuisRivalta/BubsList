import { useId, type ReactNode } from 'react'

export default function EmptyState({ children }: { children: ReactNode }) {
  const mask = useId()
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-ink/60">
      <svg aria-hidden viewBox="0 0 64 64" className="size-16 text-accent/70">
        <defs>
          <mask id={mask}>
            <rect width="64" height="64" fill="#fff" />
            <circle cx="41" cy="24" r="20" fill="#000" />
          </mask>
        </defs>
        <circle cx="30" cy="32" r="22" fill="currentColor" mask={`url(#${mask})`} />
        <circle cx="52" cy="46" r="2" fill="currentColor" />
        <circle cx="12" cy="14" r="1.5" fill="currentColor" />
      </svg>
      <p className="max-w-xs font-semibold">{children}</p>
    </div>
  )
}
