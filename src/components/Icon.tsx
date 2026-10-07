import {
  Anchor, Award, Backpack, Bike, BookOpen, CalendarCheck, Camera, Car, ChefHat, Clapperboard, Coffee, Compass, CookingPot,
  Crown, Dog, Drama, Dumbbell, Film, Flame, Gamepad2, Gem, Ghost, Gift, Globe, Heart, Hourglass, Landmark, Map as MapIcon,
  Medal, Mic, Moon, MoonStar, Mountain, Music, Palette, Pizza, Plane, Popcorn, ShoppingBag, Sofa, Sparkles, Star, Sunrise,
  Swords, Target, Tent, Ticket, Train, TreePine, Trophy, Tv, Users, Utensils, Waves, Zap, type LucideIcon,
} from 'lucide-react'

// Categories and achievements store one of these names in their `icon` column.
export const ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  plane: { Icon: Plane, label: 'Avião' },
  car: { Icon: Car, label: 'Carro' },
  train: { Icon: Train, label: 'Trem' },
  globe: { Icon: Globe, label: 'Globo' },
  map: { Icon: MapIcon, label: 'Mapa' },
  compass: { Icon: Compass, label: 'Bússola' },
  backpack: { Icon: Backpack, label: 'Mochila' },
  mountain: { Icon: Mountain, label: 'Montanha' },
  'tree-pine': { Icon: TreePine, label: 'Natureza' },
  waves: { Icon: Waves, label: 'Praia' },
  tent: { Icon: Tent, label: 'Barraca' },
  sunrise: { Icon: Sunrise, label: 'Nascer do sol' },
  moon: { Icon: Moon, label: 'Lua' },
  'moon-star': { Icon: MoonStar, label: 'Noite estrelada' },
  utensils: { Icon: Utensils, label: 'Talheres' },
  'chef-hat': { Icon: ChefHat, label: 'Chef' },
  'cooking-pot': { Icon: CookingPot, label: 'Panela' },
  pizza: { Icon: Pizza, label: 'Pizza' },
  coffee: { Icon: Coffee, label: 'Café' },
  popcorn: { Icon: Popcorn, label: 'Pipoca' },
  clapperboard: { Icon: Clapperboard, label: 'Claquete' },
  film: { Icon: Film, label: 'Filme' },
  tv: { Icon: Tv, label: 'TV' },
  sofa: { Icon: Sofa, label: 'Sofá' },
  swords: { Icon: Swords, label: 'Espadas' },
  drama: { Icon: Drama, label: 'Teatro' },
  'gamepad-2': { Icon: Gamepad2, label: 'Videogame' },
  music: { Icon: Music, label: 'Música' },
  mic: { Icon: Mic, label: 'Microfone' },
  ticket: { Icon: Ticket, label: 'Ingresso' },
  'book-open': { Icon: BookOpen, label: 'Livro' },
  palette: { Icon: Palette, label: 'Arte' },
  camera: { Icon: Camera, label: 'Câmera' },
  bike: { Icon: Bike, label: 'Bicicleta' },
  dumbbell: { Icon: Dumbbell, label: 'Haltere' },
  target: { Icon: Target, label: 'Alvo' },
  zap: { Icon: Zap, label: 'Raio' },
  flame: { Icon: Flame, label: 'Fogo' },
  heart: { Icon: Heart, label: 'Coração' },
  gift: { Icon: Gift, label: 'Presente' },
  'shopping-bag': { Icon: ShoppingBag, label: 'Compras' },
  dog: { Icon: Dog, label: 'Pet' },
  ghost: { Icon: Ghost, label: 'Fantasma' },
  users: { Icon: Users, label: 'Amigos' },
  anchor: { Icon: Anchor, label: 'Âncora' },
  landmark: { Icon: Landmark, label: 'Monumento' },
  hourglass: { Icon: Hourglass, label: 'Ampulheta' },
  'calendar-check': { Icon: CalendarCheck, label: 'Agenda' },
  star: { Icon: Star, label: 'Estrela' },
  sparkles: { Icon: Sparkles, label: 'Brilho' },
  trophy: { Icon: Trophy, label: 'Troféu' },
  medal: { Icon: Medal, label: 'Medalha' },
  award: { Icon: Award, label: 'Prêmio' },
  crown: { Icon: Crown, label: 'Coroa' },
  gem: { Icon: Gem, label: 'Joia' },
}

const lookup = (name: string) => (Object.hasOwn(ICONS, name) ? ICONS[name] : ICONS.sparkles)

export default function Icon({ name, className = 'size-5' }: { name: string; className?: string }) {
  const { Icon: Svg } = lookup(name)
  return <Svg aria-hidden className={className} strokeWidth={1.75} />
}

export function IconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <details className="rounded-xl border border-blush bg-white">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3">
        <Icon name={value} /> Ícone: {lookup(value).label}
      </summary>
      <div role="radiogroup" aria-label="Ícone" className="grid grid-cols-6 gap-1 p-2 sm:grid-cols-9">
        {Object.entries(ICONS).map(([name, { label }]) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={value === name}
            aria-label={label}
            title={label}
            onClick={() => onChange(name)}
            className={`grid size-11 place-items-center rounded-lg ${value === name ? 'bg-brand text-white' : 'hover:bg-blush/40'}`}
          >
            <Icon name={name} />
          </button>
        ))}
      </div>
    </details>
  )
}
