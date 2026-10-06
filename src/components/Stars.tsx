export default function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  if (!onChange) {
    return (
      <span aria-label={`${value} de 5 estrelas`} className="text-lg text-yellow-500">
        {'★'.repeat(value)}
        <span className="text-gray-300">{'★'.repeat(5 - value)}</span>
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
          className={`min-h-11 min-w-11 text-3xl ${n <= value ? 'text-yellow-500' : 'text-gray-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
