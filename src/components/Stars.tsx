import { Star } from 'lucide-react'

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
          onClick={() => onChange(n)}
          className="grid min-h-11 min-w-11 place-items-center"
        >
          <Star aria-hidden className={`size-8 ${tone(n <= value)}`} />
        </button>
      ))}
    </div>
  )
}
