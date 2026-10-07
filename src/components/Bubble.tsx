import Icon from './Icon'

const SIZE = { sm: ['size-7', 'size-3.5'], md: ['size-9', 'size-4'], lg: ['size-14', 'size-7'] } as const

export default function Bubble({ icon, color, size = 'md' }: { icon: string; color: string; size?: keyof typeof SIZE }) {
  const [box, glyph] = SIZE[size]
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full ${box}`} style={{ background: `${color}26`, color }}>
      <Icon name={icon} className={glyph} />
    </span>
  )
}
