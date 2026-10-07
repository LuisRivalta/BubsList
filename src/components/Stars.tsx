import { animate } from 'animejs'
import { Star } from 'lucide-react'
import { prefersReducedMotion } from '../lib/motion'

const tone = (on: boolean) => (on ? 'fill-current text-accent' : 'text-gray-300')

export default function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  if (!onChange) {
    return (
      <span role="img" aria-label={`${value} de 5 estrelas`} className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => <Star key={n} aria-hidden className={`size-4 ${tone(n <= value)}`} />)}
      </span>
    )
  }
  return (
    <div role="radiogroup" aria-label="Nota" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={n === 1 ? '1 estrela' : `${n} estrelas`}
          onClick={(e) => {
            onChange(n)
            const star = e.currentTarget.firstElementChild as SVGElement | null
            if (star && !prefersReducedMotion()) animate(star, { scale: [1, 1.45, 1], rotate: [0, -14, 0], duration: 450, ease: 'outBack(2)' })
          }}
          className="grid min-h-12 min-w-12 place-items-center"
        >
          <Star aria-hidden className={`size-9 ${tone(n <= value)}`} />
        </button>
      ))}
    </div>
  )
}
