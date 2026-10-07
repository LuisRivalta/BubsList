# BubsList — Redesign visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar vida às páginas do app logado — faixa de céu noturno (three.js) no topo de cada página, conteúdo claro com cartões em relevo, Fredoka/Nunito, gemas de dificuldade, medalhas metálicas, menu flutuante com pílula deslizante e micro-animações (anime.js) — sem mudar nenhuma funcionalidade.

**Architecture:** Um único céu three.js (`SkyScene`, refatorado da cena do login) fica no `Layout`, atrás da faixa do topo; cada página renderiza um `PageHero` que informa a própria altura via `--hero-h`. Componentes visuais pequenos e reutilizáveis (`Gems`, `Bubble`, `ProgressBar`, `SegmentedControl`, `CountUp`, `Stagger`, `EmptyState`) concentram o estilo; as páginas só os compõem. Uma página de prévia só de desenvolvimento renderiza qualquer rota com dados de exemplo para conferir o visual com prints.

**Tech Stack:** React 19, Tailwind 4, three 0.186, animejs 4.5, lenis 1.3, lucide-react, @fontsource (Fredoka, Nunito), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-07-bubslist-redesign-design.md` (base funcional: `docs/superpowers/specs/2026-10-06-bubslist-design.md`)

## Global Constraints

- **Nenhuma funcionalidade muda.** Textos e nomes acessíveis usados pelos testes ficam iguais ("Você tem 1 resenha pendente", "1/2", "Nova quest", "T1 E10", "+1 episódio", "Escrever minha resenha", "Fazer de novo", "Excluir", rótulos de campos, nomes de botões de categoria/dificuldade, cabeçalhos `h2` das raridades "Platina 0/1").
- **Sem emojis** no código do app (o teste `src/no-emoji.test.ts` continua passando); ícones só via `<Icon>`/Lucide.
- **Commits sem coautoria**: nenhuma linha `Co-Authored-By` nem menção ao Claude.
- **Nunca** usar ferramentas `mcp__supabase__*`.
- Paleta "agejo 2" + `night #1a1115`, `dusk #2c1b25`. Gemas: easy `#22c55e`/texto `#15803d`, medium `#f59e0b`/`#b45309`, hard `#f97316`/`#c2410c`, epic `#d946ef`/`#a21caf`.
- Fontes: Fredoka 600/700 (títulos, `font-display`), Nunito 400/600/700/800 (texto, `font-sans`), via `@fontsource`.
- Hero: `min-h` 200px (<768px) / 240px (≥768px); menu do celular flutua 12px das bordas; troca de página 350ms.
- "Reduzir movimento" (e jsdom, que não tem `matchMedia`): sem animações, céu estático em CSS, números já no valor final.
- Um único contexto WebGL no app; three.js sempre carregado com `lazy()`.
- Comandos no Git Bash a partir de `C:\BubsList`. Para prints: `node scripts/shot.mjs <url> <png> [largura] [altura] [esperaMs] [--reduce] [--bottom]` com o `npm run dev` rodando; salvar prints no scratchpad da sessão, não no repositório.

## Review Focus

1. **Overlays em tela cheia** (comemoração de conquista, cortina rosa da entrada) cobrindo a tela inteira depois da animação de entrada da página — nenhum ancestral pode ficar com `transform` inline. Teste na Task 3 (`PageEnter` não deixa `transform`) e print da comemoração na Task 7.
2. **Últimos itens de listas longas atrás do menu flutuante** no celular — o conteúdo precisa de folga embaixo. Print com `--bottom` em 390px na Task 4.
3. **Títulos longos e muitos números no hero** em 390px — devem quebrar linha sem estourar. A prévia tem uma quest de título longo; print na Task 5.
4. **Estados de carregando/erro sobre o céu escuro** — texto legível (branco), nunca cinza sobre escuro. Teste na Task 3 (`PageLoading` é um `h1` "Carregando…").
5. **"Reduzir movimento"** — céu estático, pílulas já no lugar sem animação, nada preso invisível por `opacity: 0` inicial. Teste na Task 1 (`SegmentedControl` posiciona a pílula sem anime) e print `--reduce` na Task 10.

---

## File Structure

```
src/fonts.ts                     — importa os pesos das fontes (@fontsource)
src/index.css                    — sistema visual inteiro (tokens, botões, cartões, chips, ladrilhos, gemas, medalhas, céu estático, árvore, linha do tempo)
src/routes.tsx                   — lista de rotas (usada por App e pela prévia)
src/components/Gems.tsx          — dificuldade em 4 losangos + nome
src/components/Bubble.tsx        — ícone de categoria em círculo colorido
src/components/ProgressBar.tsx   — barra de progresso com rótulos
src/components/SegmentedControl.tsx — abas com pílula deslizante
src/components/CountUp.tsx       — número que conta do zero
src/components/Stagger.tsx       — cascata de entrada dos filhos
src/components/EmptyState.tsx    — lua desenhada + frase
src/components/PageHero.tsx      — faixa do topo (título, números, ações) e --hero-h
src/components/Avatar.tsx        — foto de perfil ou inicial
src/components/SkyScene.tsx      — céu three.js (substitui LoginScene)
src/components/Layout.tsx        — céu compartilhado, onda, menu flutuante/lateral com pílula, PageEnter
src/components/MedalCard.tsx     — cartão-medalha de conquista
src/dev/preview.tsx, src/dev/sampleData.ts, preview.html — prévia só de desenvolvimento
scripts/shot.mjs                 — prints via Chrome DevTools Protocol
```

---

### Task 1: Fundamentos visuais (fontes, CSS, componentes base)

**Files:**
- Create: `src/fonts.ts`, `src/components/Gems.tsx`, `src/components/Bubble.tsx`, `src/components/ProgressBar.tsx`, `src/components/SegmentedControl.tsx`, `src/components/CountUp.tsx`, `src/components/Stagger.tsx`, `src/components/EmptyState.tsx`
- Modify: `src/index.css` (substituir inteiro), `src/main.tsx`, `src/lib/progress.ts`, `vite.config.ts`
- Test: `src/components/visual.test.tsx`, `src/lib/progress.test.ts` (acrescentar)

**Interfaces:**
- Produces: `Gems({ difficulty, stacked?, onDark? })`, `GEM_COLOR`; `Bubble({ icon, color, size?: 'sm'|'md'|'lg' })`; `ProgressBar({ value, max, size?: 'sm'|'lg', children? })`; `SegmentedControl<T extends string>({ label, options: {value: T; label: string}[], value, onChange, tone?: 'light'|'dark' })`; `CountUp({ value, className? })`; `Stagger({ children, className? })`; `EmptyState({ children })`; `episodesWatched(seasons, progress): { watched: number; total: number } | null` em `src/lib/progress.ts`; classes CSS `btn btn-primary btn-ghost btn-danger input card card-hover glass-card chip tile gem gem-dark medal medal-{rarity} medal-locked medallion medallion-lock spark sky-host sky-static hero-cover tree timeline fab parallax float reveal-curtain`.

- [ ] **Step 1: Escrever os testes que falham**

`src/components/visual.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import CountUp from './CountUp'
import Gems from './Gems'
import SegmentedControl from './SegmentedControl'

it('Gems shows the label and fills one gem per level', () => {
  const { container } = render(<Gems difficulty="hard" />)
  expect(screen.getByText('Difícil')).toBeInTheDocument()
  expect(container.querySelectorAll('.gem')).toHaveLength(4)
  expect(container.querySelectorAll('[data-on]')).toHaveLength(3)
})

it('CountUp shows the final value when motion is reduced', () => {
  render(<CountUp value={42} />)
  expect(screen.getByText('42')).toBeInTheDocument()
})

it('SegmentedControl marks the selected tab, reports changes and places the pill without animation', async () => {
  const onChange = vi.fn()
  const { container } = render(
    <SegmentedControl label="Situação" value="pending" onChange={onChange} options={[{ value: 'pending', label: 'Pendentes' }, { value: 'done', label: 'Feitas' }]} />,
  )
  expect(screen.getByRole('tablist', { name: 'Situação' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Pendentes' })).toHaveAttribute('aria-selected', 'true')
  expect((container.querySelector('[data-pill]') as HTMLElement).style.width).toBe('0px')
  await userEvent.click(screen.getByRole('tab', { name: 'Feitas' }))
  expect(onChange).toHaveBeenCalledWith('done')
})
```

Acrescentar ao final de `src/lib/progress.test.ts` (e `episodesWatched` ao import):
```ts
describe('episodesWatched', () => {
  it('counts episodes of earlier seasons plus the current one', () =>
    expect(episodesWatched(seasons, { season: 2, episode: 5 })).toEqual({ watched: 15, total: 18 }))
  it('not started is zero', () => expect(episodesWatched(seasons, null)).toEqual({ watched: 0, total: 18 }))
  it('unknown seasons give nothing', () => expect(episodesWatched([], { season: 1, episode: 3 })).toBeNull())
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/visual.test.tsx src/lib/progress.test.ts`
Expected: FAIL — não resolve `./CountUp`/`./Gems`/`./SegmentedControl`; `episodesWatched` não é função.

- [ ] **Step 3: Instalar fontes e implementar**

```bash
npm install @fontsource/fredoka @fontsource/nunito
```

`src/fonts.ts`:
```ts
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
```

`src/main.tsx` — acrescentar `import './fonts'` logo antes de `import './index.css'`.

`vite.config.ts` — dentro de `VitePWA({ ... })`, acrescentar após `includeAssets`:
```ts
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg,webp,ico}'] },
```

Acrescentar a `src/lib/progress.ts`:
```ts
export function episodesWatched(seasons: Season[], current: Progress | null): { watched: number; total: number } | null {
  const sorted = [...seasons].sort((a, b) => a.season - b.season)
  const total = sorted.reduce((sum, s) => sum + s.episodes, 0)
  if (total === 0) return null
  if (!current) return { watched: 0, total }
  const before = sorted.filter((s) => s.season < current.season).reduce((sum, s) => sum + s.episodes, 0)
  return { watched: Math.min(total, before + current.episode), total }
}
```

`src/components/Gems.tsx`:
```tsx
import { DIFFICULTY_LABEL } from '../lib/difficulty'
import type { Difficulty } from '../lib/types'

const LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, epic: 4 }

export const GEM_COLOR: Record<Difficulty, { gem: string; text: string }> = {
  easy: { gem: '#22c55e', text: '#15803d' },
  medium: { gem: '#f59e0b', text: '#b45309' },
  hard: { gem: '#f97316', text: '#c2410c' },
  epic: { gem: '#d946ef', text: '#a21caf' },
}

export default function Gems({ difficulty, stacked = false, onDark = false }: { difficulty: Difficulty; stacked?: boolean; onDark?: boolean }) {
  const { gem, text } = GEM_COLOR[difficulty]
  return (
    <span className={`inline-flex items-center ${stacked ? 'flex-col gap-2' : 'gap-1.5'}`}>
      <span aria-hidden className="inline-flex gap-1">
        {[1, 2, 3, 4].map((i) => {
          const on = i <= LEVEL[difficulty]
          return <span key={i} data-on={on || undefined} className={`gem ${onDark ? 'gem-dark' : ''}`} style={on ? { background: gem, boxShadow: `0 0 6px ${gem}99` } : undefined} />
        })}
      </span>
      <span className="text-xs font-bold" style={{ color: onDark ? gem : text }}>{DIFFICULTY_LABEL[difficulty]}</span>
    </span>
  )
}
```

`src/components/Bubble.tsx`:
```tsx
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
```

`src/components/ProgressBar.tsx`:
```tsx
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
```

`src/components/SegmentedControl.tsx`:
```tsx
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
```

`src/components/CountUp.tsx`:
```tsx
import { animate } from 'animejs'
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

// The span's text is owned by the effect (not React children) so the animation can write to it freely.
export default function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current!
    if (prefersReducedMotion() || value === 0) {
      el.textContent = String(value)
      return
    }
    const counter = { n: 0 }
    el.textContent = '0'
    const a = animate(counter, { n: value, duration: 900, ease: 'outExpo', onUpdate: () => (el.textContent = String(Math.round(counter.n))) })
    return () => {
      a.pause()
      el.textContent = String(value)
    }
  }, [value])
  return <span ref={ref} className={className} />
}
```

`src/components/Stagger.tsx`:
```tsx
import { animate, stagger } from 'animejs'
import { useEffect, useRef, type ReactNode } from 'react'
import { prefersReducedMotion } from '../lib/motion'

// Cascades the children in on mount; reverts afterwards so hover transforms and fixed overlays keep working.
export default function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const items = Array.from(ref.current?.children ?? [])
    if (prefersReducedMotion() || items.length === 0) return
    const a = animate(items, { opacity: { from: 0 }, translateY: { from: 14 }, delay: stagger(45), duration: 420, ease: 'outQuad', onComplete: (self) => self.revert() })
    return () => {
      a.revert()
    }
  }, [])
  return <div ref={ref} className={className}>{children}</div>
}
```

`src/components/EmptyState.tsx`:
```tsx
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
```

`src/index.css` (substituir inteiro):
```css
@import "tailwindcss";

/* Palette "agejo 2": plum for actions (white text 10.5:1), dusty rose for accents, blush for soft fills. */
@theme {
  --font-sans: "Nunito", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Fredoka", "Nunito", ui-sans-serif, sans-serif;
  --color-brand: #553548;
  --color-accent: #b3607e;
  --color-blush: #e3b4cf;
  --color-paper: #efeced;
  --color-ink: #1a1115;
  --color-night: #1a1115;
  --color-dusk: #2c1b25;
  --color-bronze: #b0743c;
  --color-silver: #9ca3af;
  --color-gold: #eab308;
  --color-platinum: #22d3ee;
}

@layer base {
  body {
    background: var(--color-paper);
    color: var(--color-ink);
    -webkit-tap-highlight-color: transparent;
  }
  h1, h2, h3 { font-family: var(--font-display); }
}

@layer components {
  .btn {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 999px;
    border: 1px solid rgb(227 180 207 / 0.8);
    background: #fff;
    padding: 0 1.1rem;
    font-weight: 700;
    transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.6; }
  .btn-primary {
    border-color: transparent;
    background: linear-gradient(135deg, var(--color-brand) 0%, #844a64 55%, var(--color-accent) 100%);
    color: #fff;
    box-shadow: 0 6px 16px -6px rgb(85 53 72 / 0.55);
  }
  .btn-ghost { border-color: rgb(255 255 255 / 0.3); background: rgb(255 255 255 / 0.12); color: #fff; backdrop-filter: blur(6px); }
  .btn-ghost:hover { background: rgb(255 255 255 / 0.2); }
  .btn-danger { border-color: #fecaca; color: #dc2626; }
  .input {
    width: 100%;
    min-height: 2.75rem;
    border-radius: 0.9rem;
    border: 1px solid #d9cfd5;
    background: #fff;
    padding: 0.5rem 0.85rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgb(179 96 126 / 0.2); }
  .card {
    border-radius: 1.25rem;
    border: 1px solid rgb(227 180 207 / 0.5);
    background: #fff;
    box-shadow: 0 1px 2px rgb(26 17 21 / 0.06), 0 8px 24px -12px rgb(85 53 72 / 0.25);
  }
  .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgb(26 17 21 / 0.06), 0 16px 32px -14px rgb(85 53 72 / 0.35); }
  .card-hover:active { transform: scale(0.98); }
  .glass-card {
    border-radius: 1.5rem;
    border: 1px solid rgb(255 255 255 / 0.35);
    background: rgb(255 255 255 / 0.82);
    box-shadow: 0 25px 60px rgb(26 17 21 / 0.45);
    backdrop-filter: blur(14px);
  }
  .chip {
    display: inline-flex;
    min-height: 2.75rem;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
    border-radius: 999px;
    border: 1px solid rgb(227 180 207 / 0.8);
    background: #fff;
    padding: 0 0.9rem 0 0.3rem;
    font-weight: 700;
    font-size: 0.875rem;
    transition: background-color 0.2s ease, box-shadow 0.2s ease;
  }
  .chip[aria-pressed="true"] { border-color: var(--color-accent); background: rgb(227 180 207 / 0.35); box-shadow: 0 0 0 2px rgb(179 96 126 / 0.25); }
  .tile {
    display: flex;
    min-height: 5.5rem;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 1rem;
    border: 1px solid rgb(227 180 207 / 0.7);
    background: #fff;
    padding: 0.75rem 0.5rem;
    text-align: center;
    font-weight: 700;
    font-size: 0.875rem;
    transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  }
  .tile:active { transform: scale(0.97); }
  .tile[aria-pressed="true"] { border-color: var(--color-accent); background: rgb(227 180 207 / 0.25); box-shadow: 0 0 0 3px rgb(179 96 126 / 0.25); }
  .gem { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 2px; transform: rotate(45deg); background: rgb(26 17 21 / 0.12); }
  .gem-dark { background: rgb(255 255 255 / 0.22); }
  .medal { position: relative; overflow: hidden; border-radius: 1.25rem; padding: 2px; background: var(--metal); box-shadow: 0 10px 24px -14px rgb(26 17 21 / 0.45); }
  .medal-inner { height: 100%; border-radius: calc(1.25rem - 2px); background: #fff; }
  .medal-bronze { --metal: linear-gradient(135deg, #8a5a2b, #e2a46c 45%, #b0743c); --on-metal: #fff; }
  .medal-silver { --metal: linear-gradient(135deg, #6b7280, #f3f4f6 45%, #9ca3af); --on-metal: #374151; }
  .medal-gold { --metal: linear-gradient(135deg, #a16207, #fde68a 45%, #eab308); --on-metal: #713f12; }
  .medal-platinum { --metal: linear-gradient(135deg, #22d3ee, #e3b4cf 40%, #a78bfa 70%, #22d3ee); --on-metal: #fff; }
  .medal:not(.medal-locked)::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(110deg, transparent 40%, rgb(255 255 255 / 0.55) 50%, transparent 60%);
    transform: translateX(-120%);
    animation: fab-shine 5s ease-in-out 1s infinite;
  }
  .medal-locked { --metal: linear-gradient(135deg, #d1d5db, #f3f4f6); --on-metal: #9ca3af; }
  .medallion {
    position: relative;
    display: grid;
    width: 3.5rem;
    height: 3.5rem;
    flex-shrink: 0;
    place-items: center;
    border-radius: 999px;
    background: var(--metal);
    color: var(--on-metal);
    box-shadow: inset 0 2px 6px rgb(255 255 255 / 0.55), 0 4px 10px -4px rgb(26 17 21 / 0.4);
  }
  .medallion-lock { position: absolute; right: -4px; bottom: -4px; width: 1.4rem; height: 1.4rem; border-radius: 999px; background: #fff; padding: 3px; color: #6b7280; box-shadow: 0 1px 3px rgb(0 0 0 / 0.2); }
  .spark { position: absolute; width: 0.5rem; height: 0.5rem; border-radius: 999px; background: var(--color-accent); opacity: 0; box-shadow: 0 0 10px var(--color-blush); }
  .spark:nth-child(odd) { background: #fde68a; box-shadow: 0 0 10px #fde68a; }
}

/* Login motion: hidden until anime.js reveals them (only when animating). */
[data-animating] [data-letter],
[data-animating] [data-reveal] { opacity: 0; }

/* Characters follow the pointer by --depth px (variables set by AuthBackdrop). */
.parallax {
  transform: translate3d(calc(var(--px, 0) * var(--depth, 0) * 1px), calc(var(--py, 0) * var(--depth, 0) * 1px), 0);
  transition: transform 0.4s ease-out;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
.float { animation: float 6s ease-in-out infinite; }
.float-late { animation-delay: -3s; }

/* "Nova quest" button: plum→rose gradient, breathing glow, a shine sweeping across every few seconds. */
.fab {
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-brand) 0%, #844a64 55%, var(--color-accent) 100%);
  box-shadow: 0 10px 24px -6px rgb(85 53 72 / 0.6), inset 0 0 0 1px rgb(255 255 255 / 0.18);
  transition: transform 0.2s ease;
  animation: fab-glow 3s ease-in-out infinite;
}
.fab:hover { transform: translateY(-2px); }
.fab:active { transform: scale(0.97); }
.fab::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(110deg, transparent 35%, rgb(255 255 255 / 0.4) 50%, transparent 65%);
  transform: translateX(-120%);
  animation: fab-shine 4s ease-in-out 1.5s infinite;
}
@keyframes fab-glow {
  0%, 100% { box-shadow: 0 10px 24px -6px rgb(85 53 72 / 0.6), inset 0 0 0 1px rgb(255 255 255 / 0.18); }
  50% { box-shadow: 0 10px 30px -4px rgb(179 96 126 / 0.75), inset 0 0 0 1px rgb(255 255 255 / 0.25); }
}
@keyframes fab-shine {
  0%, 70% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}

/* App shell: the shared sky sits behind each page's hero (height reported by PageHero as --hero-h). */
.sky-host { height: calc(var(--hero-h, 230px) + 2.5rem); transition: height 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
.sky-static {
  background:
    radial-gradient(1.5px 1.5px at 8% 22%, rgb(255 255 255 / 0.9), transparent),
    radial-gradient(1px 1px at 18% 64%, rgb(227 180 207 / 0.9), transparent),
    radial-gradient(1.5px 1.5px at 31% 38%, rgb(255 255 255 / 0.7), transparent),
    radial-gradient(1px 1px at 44% 12%, rgb(227 180 207 / 0.9), transparent),
    radial-gradient(2px 2px at 57% 56%, rgb(255 255 255 / 0.8), transparent),
    radial-gradient(1px 1px at 66% 28%, rgb(227 180 207 / 0.9), transparent),
    radial-gradient(1.5px 1.5px at 79% 70%, rgb(255 255 255 / 0.7), transparent),
    radial-gradient(1px 1px at 88% 18%, rgb(255 255 255 / 0.9), transparent),
    radial-gradient(2px 2px at 94% 48%, rgb(227 180 207 / 0.8), transparent),
    radial-gradient(ellipse at 78% 0%, #553548 0%, #2c1b25 55%, #1a1115 100%);
}
.hero-cover {
  position: absolute;
  top: -2rem;
  bottom: -2.5rem;
  left: 50%;
  width: 100vw;
  transform: translateX(-50%);
  background-size: cover;
  background-position: center;
  filter: blur(28px) saturate(1.2);
  opacity: 0.35;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent);
  mask-image: linear-gradient(to bottom, #000 55%, transparent);
}

/* Subquest tree and history timeline. */
.tree { display: grid; gap: 0.5rem; margin-left: 0.75rem; border-left: 2px dashed rgb(227 180 207 / 0.9); padding-left: 1rem; }
.tree > * { position: relative; }
.tree > *::before { content: ""; position: absolute; left: -1rem; top: 50%; width: 0.75rem; border-top: 2px dashed rgb(227 180 207 / 0.9); }
.timeline { display: grid; gap: 1rem; margin-left: 0.5rem; border-left: 2px solid var(--color-blush); padding-left: 1.5rem; }
.timeline > li { position: relative; }
.timeline > li::before {
  content: "";
  position: absolute;
  left: calc(-1.5rem - 9px);
  top: 1.1rem;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  border: 4px solid var(--color-paper);
  background: var(--color-accent);
}

/* Entering the app after login: the blush flash opens in a circle from the center, content rises, nav slides in. */
@property --reveal {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}
.reveal-curtain {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  background: var(--color-blush);
  -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent var(--reveal), #000 calc(var(--reveal) + 2px));
  mask-image: radial-gradient(circle at 50% 50%, transparent var(--reveal), #000 calc(var(--reveal) + 2px));
  animation: reveal 0.8s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
@keyframes reveal { to { --reveal: 120vmax; } }
[data-entering] [data-page] { animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s both; }
[data-entering] nav[aria-label="Principal"] { animation: nav-up 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.25s both; }
@media (min-width: 768px) {
  [data-entering] nav[aria-label="Principal"] { animation-name: nav-left; }
}
@keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes nav-up { from { transform: translateY(120%); } to { transform: none; } }
@keyframes nav-left { from { transform: translateX(-100%); } to { transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .fab, .fab::after, .medal::after { animation: none; }
  .float { animation: none; }
  .parallax, .sky-host { transition: none; }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (os anteriores + os novos); typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(design): visual foundations (fonts, design tokens, gems, bubbles, progress, segmented control, count-up)"
```

---

### Task 2: Rotas separadas, prévia de desenvolvimento e prints

**Files:**
- Create: `src/routes.tsx`, `src/dev/sampleData.ts`, `src/dev/preview.tsx`, `preview.html`, `scripts/shot.mjs`
- Modify: `src/App.tsx` (substituir inteiro)

**Interfaces:**
- Consumes: páginas existentes, `SessionIdProvider`, `todayISO`, `toISO`.
- Produces: `routes: RouteObject[]` (de `src/routes.tsx`); prévia em `http://localhost:5173/preview.html?url=/caminho` (ex.: `?url=/conquistas`); `?celebrate=1` mostra a comemoração por cima; `scripts/shot.mjs`.

- [ ] **Step 1: Implementar rotas e prévia**

`src/routes.tsx`:
```tsx
import type { RouteObject } from 'react-router'
import Layout from './components/Layout'
import AchievementFormPage from './pages/AchievementFormPage'
import AchievementsPage from './pages/AchievementsPage'
import CompletePage from './pages/CompletePage'
import ProfilePage from './pages/ProfilePage'
import QuestFormPage from './pages/QuestFormPage'
import QuestPage from './pages/QuestPage'
import QuestsPage from './pages/QuestsPage'
import ReportPage from './pages/ReportPage'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <QuestsPage /> },
      { path: '/quests/nova', element: <QuestFormPage /> },
      { path: '/quests/:id/editar', element: <QuestFormPage /> },
      { path: '/quests/:id', element: <QuestPage /> },
      { path: '/quests/:id/concluir', element: <CompletePage /> },
      { path: '/conquistas', element: <AchievementsPage /> },
      { path: '/conquistas/nova', element: <AchievementFormPage /> },
      { path: '/conquistas/:id/editar', element: <AchievementFormPage /> },
      { path: '/relatorio', element: <ReportPage /> },
      { path: '/perfil', element: <ProfilePage /> },
      { path: '*', element: <p>Página não encontrada.</p> },
    ],
  },
]
```

`src/App.tsx` (substituir inteiro):
```tsx
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  return <RouterProvider router={router} />
}
```

`src/dev/sampleData.ts`:
```ts
import { todayISO, toISO } from '../lib/dates'
import type { Achievement, AppData, Category, CategoryKind, Completion, Difficulty, Media, Quest, Review } from '../lib/types'

// Realistic data for the dev-only preview page. Dates are relative to today so the report has content.
export const ME = 'preview-me'
const PARTNER = 'preview-bubs'
const T = '2026-01-01T00:00:00Z'
const [Y, M, D] = todayISO().split('-').map(Number)

const day = (d: number, monthsAgo = 0) => {
  const index = Y * 12 + (M - 1) - monthsAgo
  return toISO(Math.floor(index / 12), (index % 12) + 1, monthsAgo === 0 ? Math.min(d, D) : d)
}

const cat = (id: string, name: string, icon: string, color: string, kind: CategoryKind = 'general'): Category => ({
  id, name, icon, color, kind, builtin: true, created_at: T,
})

const quest = (id: string, title: string, category_id: string, difficulty: Difficulty, extra: Partial<Quest> = {}): Quest => ({
  id, parent_id: null, category_id, title, notes: null, difficulty, media_id: null, progress_season: null,
  progress_episode: null, created_by: ME, created_at: T, updated_at: T, ...extra,
})

const done = (id: string, quest_id: string, done_on: string): Completion => ({ id, quest_id, done_on, created_by: ME, created_at: `${done_on}T12:00:00Z` })

const review = (completion_id: string, user_id: string, rating: number, body: string | null = null): Review => ({
  id: `r-${completion_id}-${user_id}`, completion_id, user_id, rating, body, created_at: T, updated_at: T,
})

const media = (id: string, source: Media['source'], title: string, poster_url: string | null, seasons: Media['seasons'], runtime_minutes: number): Media => ({
  id, source, external_id: id, title, poster_url, synopsis: `Sinopse de exemplo de ${title}.`, year: 2011, genres: [],
  runtime_minutes, seasons, fetched_at: new Date().toISOString(), created_at: T,
})

const achievement = (id: string, name: string, icon: string, rarity: Achievement['rarity'], rule: Partial<Achievement>): Achievement => ({
  id, name, description: `Descrição de ${name}.`, icon, rarity, kind: 'auto', rule_category_id: null, rule_min_difficulty: null,
  rule_count: 1, manual_unlocked_on: null, created_at: T, ...rule,
})

export const sampleData: AppData = {
  profiles: [
    { id: ME, display_name: 'Luis', avatar_path: null, created_at: T },
    { id: PARTNER, display_name: 'Bubs', avatar_path: null, created_at: T },
  ],
  categories: [
    cat('viagem', 'Viagem', 'plane', '#0ea5e9'),
    cat('rest', 'Restaurante', 'utensils', '#f97316'),
    cat('ativ', 'Atividade', 'target', '#22c55e'),
    cat('filme', 'Filme', 'clapperboard', '#ef4444', 'movie'),
    cat('serie', 'Série', 'tv', '#8b5cf6', 'series'),
    cat('anime', 'Anime', 'swords', '#ec4899', 'anime'),
    cat('outro', 'Outro', 'sparkles', '#64748b'),
  ],
  media: [
    media('m-hxh', 'anilist', 'Hunter x Hunter (2011)', '/login/killua.webp', [{ season: 1, episodes: 148 }], 23),
    media('m-sm', 'anilist', 'Sailor Moon Crystal', '/login/usagi.webp', [{ season: 1, episodes: 39 }], 24),
    media('m-dark', 'tmdb_tv', 'Dark', null, [{ season: 1, episodes: 10 }, { season: 2, episodes: 8 }, { season: 3, episodes: 8 }], 55),
  ],
  quests: [
    quest('japao', 'Japão', 'viagem', 'epic', { notes: 'Ver as cerejeiras em abril e comer muito ramen.' }),
    quest('toquio', 'Tóquio', 'viagem', 'hard', { parent_id: 'japao' }),
    quest('ichiran', 'Ichiran Ramen', 'rest', 'easy', { parent_id: 'toquio' }),
    quest('fuji', 'Monte Fuji', 'ativ', 'hard', { parent_id: 'japao' }),
    quest('batata', 'Batata do Marechal', 'rest', 'medium'),
    quest('hxh', 'Hunter x Hunter', 'anime', 'epic', { media_id: 'm-hxh', progress_season: 1, progress_episode: 37 }),
    quest('sm', 'Sailor Moon Crystal', 'anime', 'medium', { media_id: 'm-sm' }),
    quest('dark', 'Dark', 'serie', 'hard', { media_id: 'm-dark', progress_season: 2, progress_episode: 5 }),
    quest('serra', 'Acampar na Serra da Mantiqueira e ver o nascer do sol lá de cima juntos', 'ativ', 'medium'),
    quest('matrix', 'Matrix', 'filme', 'easy'),
  ],
  completions: [
    done('c-matrix', 'matrix', day(2)),
    done('c-sm', 'sm', day(5)),
    done('c-batata', 'batata', day(6)),
    done('c-batata-old', 'batata', day(20, 1)),
    done('c-ichiran', 'ichiran', day(12, 2)),
  ],
  reviews: [
    review('c-matrix', ME, 4, 'Clássico. Ainda funciona demais.'),
    review('c-matrix', PARTNER, 5),
    review('c-sm', PARTNER, 5, 'Nostalgia pura.'),
    review('c-batata', ME, 5, 'A melhor batata do Rio.'),
    review('c-batata', PARTNER, 4),
  ],
  photos: [],
  achievements: [
    achievement('a1', 'Primeira quest', 'star', 'bronze', {}),
    achievement('a2', 'Em ritmo', 'flame', 'bronze', { rule_count: 10 }),
    achievement('a3', 'Primeira garfada', 'utensils', 'bronze', { rule_category_id: 'rest' }),
    achievement('a4', 'Bons de garfo', 'pizza', 'silver', { rule_category_id: 'rest', rule_count: 10 }),
    achievement('a5', 'Pipoca pronta', 'popcorn', 'bronze', { rule_category_id: 'filme' }),
    achievement('a6', 'Otakus', 'swords', 'silver', { rule_category_id: 'anime', rule_count: 5 }),
    achievement('a7', 'Lendários', 'gem', 'gold', { rule_min_difficulty: 'epic' }),
    achievement('a8', 'Rei dos piratas', 'anchor', 'platinum', { rule_category_id: 'anime', rule_min_difficulty: 'epic' }),
    achievement('a9', 'Nascer do sol juntos', 'sunrise', 'silver', { kind: 'manual', rule_count: null, manual_unlocked_on: day(15, 1) }),
    achievement('a10', 'Aurora boreal', 'moon-star', 'platinum', { kind: 'manual', rule_count: null }),
  ],
}
```

`src/dev/preview.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import Celebration from '../components/Celebration'
import { SessionIdProvider } from '../data/session'
import { routes } from '../routes'
import { ME, sampleData } from './sampleData'
import '../fonts'
import 'lenis/dist/lenis.css'
import '../index.css'

// Dev-only: renders any route with sample data and a fake session, no Supabase. Not part of the build.
const params = new URLSearchParams(location.search)
const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
client.setQueryData(['all'], sampleData)
client.setQueryData(['signed'], {})
const router = createMemoryRouter(routes, { initialEntries: [params.get('url') ?? '/'] })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <SessionIdProvider value={ME}>
        <RouterProvider router={router} />
        {params.get('celebrate') && <Celebration achievements={sampleData.achievements.slice(6, 8)} onClose={() => {}} />}
      </SessionIdProvider>
    </QueryClientProvider>
  </StrictMode>,
)
```

`preview.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>BubsList — prévia</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/dev/preview.tsx"></script>
  </body>
</html>
```

`scripts/shot.mjs`:
```js
// Dev tool: screenshot a page in headless Chrome with a real mobile/desktop viewport.
// Usage: node scripts/shot.mjs <url> <out.png> [width=390] [height=844] [waitMs=4000] [--reduce] [--bottom]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')))
const [url, out, w = '390', h = '844', wait = '4000'] = args
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9333', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shot-'))}`, 'about:blank',
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  target = await fetch('http://127.0.0.1:9333/json').then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const call = (method, params = {}) =>
  new Promise((resolve) => {
    const my = ++id
    const onMsg = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id !== my) return
      ws.removeEventListener('message', onMsg)
      resolve(msg.result)
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id: my, method, params }))
  })
await call('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 2, mobile: +w < 768 })
if (flags.has('--reduce')) await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await call('Page.navigate', { url })
await sleep(+wait)
if (flags.has('--bottom')) {
  await call('Runtime.evaluate', { expression: 'window.scrollTo(0, document.documentElement.scrollHeight)' })
  await sleep(1200)
}
const { data } = await call('Page.captureScreenshot', { format: 'png' })
writeFileSync(out, Buffer.from(data, 'base64'))
ws.close()
chrome.kill()
console.log('saved', out)
```

- [ ] **Step 2: Verificar (sem regressão + prévia renderiza)**

Run: `npx vitest run && npm run typecheck && npm run build`
Expected: todos PASS; typecheck limpo; build OK e `dist/preview.html` **não** existe (`ls dist/preview.html` falha).

Com `npm run dev` rodando: `node scripts/shot.mjs "http://localhost:5173/preview.html?url=/" <scratchpad>/prev-quests.png`
Expected: print mostra a tela de Quests com "Japão", "Batata do Marechal", "Hunter x Hunter" etc. (visual ainda antigo).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(dev): routes module, sample-data preview page and screenshot script"
```

---

### Task 3: Céu compartilhado, casca do app e PageHero

**Files:**
- Create: `src/components/SkyScene.tsx` (substitui `LoginScene.tsx`), `src/components/PageHero.tsx`
- Delete: `src/components/LoginScene.tsx`
- Modify: `src/components/AuthBackdrop.tsx`, `src/components/Layout.tsx` (substituir inteiro), `src/components/Status.tsx` (substituir inteiro), `src/data/session.test.tsx` (caminho do mock), `src/components/Layout.test.tsx`
- Test: `src/components/PageHero.test.tsx`, `src/components/Layout.test.tsx` (acrescentar)

**Interfaces:**
- Consumes: `makeBolt` (bolt.ts), `prefersReducedMotion`.
- Produces: `SkyScene({ flashSignal?, boltEvery?: [minMs, maxMs] })` (default export, para `lazy`); `PageHero({ title, eyebrow?, stats?, actions?, cover?, children? })` que define `--hero-h` no `<html>`; `PageLoading()`, `LoadError({ retry })` (agora com hero), `Loading()` (inalterado, usado pelo AuthGate); `Layout` com `[data-page]` no conteúdo.

- [ ] **Step 1: Escrever os testes que falham**

`src/components/PageHero.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import PageHero from './PageHero'

it('renders the title as the page heading, stats and actions, and reports its height', () => {
  document.documentElement.style.removeProperty('--hero-h')
  render(<PageHero title="Quests" stats={<span>3 pendentes</span>} actions={<button>Ação</button>} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Quests' })).toBeInTheDocument()
  expect(screen.getByText('3 pendentes')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument()
  expect(document.documentElement.style.getPropertyValue('--hero-h')).not.toBe('')
})
```

Em `src/components/Layout.test.tsx`: acrescentar `vi` ao import do vitest, o mock e o teste:
```tsx
vi.mock('./SkyScene', () => ({ default: () => null }))

it('the page-enter animation leaves no transform behind (fixed overlays keep covering the screen)', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  renderLayout()
  await new Promise((r) => setTimeout(r, 700))
  expect(screen.getByText('conteúdo').closest('[data-page]')!.getAttribute('style') ?? '').not.toMatch(/transform/)
  vi.unstubAllGlobals()
})
```

Em `src/pages/QuestsPage.test.tsx`, acrescentar:
```tsx
it('loading shows a readable hero heading', async () => {
  vi.mocked(api.loadAll).mockReturnValue(new Promise(() => {}))
  open()
  expect(await screen.findByRole('heading', { level: 1, name: 'Carregando…' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components src/pages/QuestsPage.test.tsx`
Expected: FAIL — não resolve `./PageHero`; mock `./SkyScene` aponta para arquivo inexistente; "Carregando…" não é `h1`.

- [ ] **Step 3: Implementar o céu**

`git mv src/components/LoginScene.tsx src/components/SkyScene.tsx` e, em `SkyScene.tsx`, aplicar estas mudanças (o resto do arquivo fica igual):

1. Assinatura:
```tsx
export default function SkyScene({ flashSignal = 0, boltEvery = [2600, 6200] }: { flashSignal?: number; boltEvery?: [number, number] }) {
  const host = useRef<HTMLDivElement>(null)
  const flash = useRef<() => void>(() => {})
  const every = useRef(boltEvery)
```
2. Em `resize()`, logo no começo: `if (!el.clientWidth || !el.clientHeight) return`.
3. Trocar o bloco `resize()` / `window.addEventListener('resize', resize)` por:
```tsx
    resize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(el)
    window.addEventListener('resize', resize)
```
4. Trocar `let nextBolt = performance.now() + 1800` por `let nextBolt = performance.now() + every.current[0] * 0.7`, e no `frame` a linha de reagendamento por `nextBolt = now + every.current[0] + Math.random() * (every.current[1] - every.current[0])`.
5. Trocar `raf = requestAnimationFrame(frame)` (após a definição de `frame`) e o bloco `onVisibility` por:
```tsx
    let visible = true
    const schedule = () => {
      cancelAnimationFrame(raf)
      if (visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      schedule()
    }) : null
    io?.observe(el)
    schedule()
    document.addEventListener('visibilitychange', schedule)
```
6. No cleanup: trocar `document.removeEventListener('visibilitychange', onVisibility)` por `document.removeEventListener('visibilitychange', schedule)` e acrescentar `ro?.disconnect()` e `io?.disconnect()`.
7. Comentário do topo: `// Night sky: pink sparkles (Sailor Moon), a glowing crescent moon and Killua's Godspeed lightning. Used by the login and behind every page hero.`

`src/components/AuthBackdrop.tsx`: trocar `const LoginScene = lazy(() => import('./LoginScene'))` por `const SkyScene = lazy(() => import('./SkyScene'))` e `<LoginScene flashSignal=...` por `<SkyScene flashSignal=...`.

`src/data/session.test.tsx`: trocar `vi.mock('../components/LoginScene', ...)` por `vi.mock('../components/SkyScene', () => ({ default: () => null }))`.

- [ ] **Step 4: Implementar PageHero, Status e Layout**

`src/components/PageHero.tsx`:
```tsx
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
```

`src/components/Status.tsx` (substituir inteiro):
```tsx
import PageHero from './PageHero'

// Before login / outside the layout (light background).
export function Loading() {
  return <p className="p-6 text-center text-gray-500">Carregando…</p>
}

// Inside the layout, over the dark sky.
export function PageLoading() {
  return <PageHero title="Carregando…" />
}

export function LoadError({ retry }: { retry: () => void }) {
  return (
    <PageHero
      title="Não foi possível carregar"
      stats={<span>Verifique a conexão.</span>}
      actions={<button type="button" className="btn btn-ghost" onClick={retry}>Tentar de novo</button>}
    />
  )
}
```

`src/components/Layout.tsx` (substituir inteiro):
```tsx
import { animate } from 'animejs'
import { ChartColumn, Map as MapIcon, Trophy, User } from 'lucide-react'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { prefersReducedMotion } from '../lib/motion'

const SkyScene = lazy(() => import('./SkyScene'))

const NAV = [
  { to: '/', label: 'Quests', Icon: MapIcon },
  { to: '/conquistas', label: 'Conquistas', Icon: Trophy },
  { to: '/relatorio', label: 'Relatório', Icon: ChartColumn },
  { to: '/perfil', label: 'Perfil', Icon: User },
]

const isActive = (to: string, pathname: string) => (to === '/' ? pathname === '/' || pathname.startsWith('/quests') : pathname.startsWith(to))

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

// New page content rises in; the inline transform is removed afterwards so fixed overlays inside keep covering the screen.
function PageEnter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
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
  const { pathname } = useLocation()
  const [animated] = useState(() => !prefersReducedMotion())
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
    <div className="min-h-dvh md:flex">
      <nav
        ref={nav}
        aria-label="Principal"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex rounded-full border border-white/70 bg-white/80 p-1.5 shadow-[0_12px_30px_-10px_rgb(26_17_21/0.4)] backdrop-blur-xl md:sticky md:inset-auto md:top-0 md:h-dvh md:w-60 md:shrink-0 md:flex-col md:gap-1 md:rounded-none md:border-0 md:bg-night md:p-4 md:shadow-none"
      >
        <span ref={pill} aria-hidden className="absolute rounded-full bg-linear-to-r from-brand to-accent md:rounded-xl md:bg-none md:bg-white/12" style={{ opacity: 0 }} />
        <span className="hidden px-3 pb-6 pt-2 font-display text-2xl font-bold text-blush md:block">BubsList</span>
        {NAV.map((n) => {
          const active = isActive(n.to, pathname)
          return (
            <Link
              key={n.to}
              to={n.to}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-bold transition-colors md:min-h-11 md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-sm ${
                active ? 'text-white' : 'text-ink/55 md:text-white/60 md:hover:text-white'
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
          {animated && (
            <Suspense fallback={null}>
              <SkyScene boltEvery={[9000, 18000]} />
            </Suspense>
          )}
          <svg className="absolute -bottom-px left-0 h-8 w-full text-paper md:h-12" viewBox="0 0 100 10" preserveAspectRatio="none">
            <path d="M0 10V6Q50-3 100 6V10Z" fill="currentColor" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-5xl px-4 md:px-8">
          {!online && (
            <p role="alert" className="mt-4 rounded-xl bg-yellow-100 p-3 text-sm text-yellow-900">
              Sem conexão. O que você digitar continua aqui — tente salvar quando a internet voltar.
            </p>
          )}
          <PageEnter key={pathname}>
            <Outlet />
          </PageEnter>
        </div>
      </main>
    </div>
  )
}
```

Em todas as páginas (`QuestsPage`, `QuestPage`, `QuestFormPage`, `CompletePage`, `AchievementsPage`, `AchievementFormPage`, `ReportPage`, `ProfilePage`): trocar `import { LoadError, Loading } from '../components/Status'` por `import { LoadError, PageLoading } from '../components/Status'` e `return <Loading />` por `return <PageLoading />`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 6: Conferir visualmente**

Com `npm run dev`: prints de `preview.html?url=/` em 390×844 e 1280×800.
Expected: céu noturno atrás do topo com a onda clara embaixo; menu flutuante de vidro no celular com a pílula sob "Quests"; menu lateral escuro no computador. Login (`http://localhost:5173/` deslogado) continua igual ao anterior.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(design): shared three.js sky, page hero, floating nav with sliding pill, page-enter motion"
```

---

### Task 4: Página de Quests

**Files:**
- Modify: `src/pages/QuestsPage.tsx` (substituir inteiro), `src/components/QuestCard.tsx` (substituir inteiro)

**Interfaces:**
- Consumes: `PageHero`, `SegmentedControl`, `Stagger`, `EmptyState`, `Bubble`, `Gems`, `ProgressBar`, `episodesWatched`, `evaluateAchievements`.
- Produces: `QuestCard` com a mesma assinatura (`{ quest, data, done, photoUrl?, showPath? }`).

- [ ] **Step 1: Implementar**

`src/components/QuestCard.tsx`:
```tsx
import { Check, ListChecks, Play } from 'lucide-react'
import { Link } from 'react-router'
import { episodesWatched, formatProgress, progressOf } from '../lib/progress'
import { pathLabel, subquestProgress } from '../lib/tree'
import type { AppData, Quest } from '../lib/types'
import Bubble from './Bubble'
import Gems from './Gems'
import ProgressBar from './ProgressBar'

interface Props {
  quest: Quest
  data: AppData
  done: Set<string>
  photoUrl?: string
  showPath?: boolean
}

export default function QuestCard({ quest, data, done, photoUrl, showPath = false }: Props) {
  const category = data.categories.find((c) => c.id === quest.category_id)
  const media = quest.media_id ? data.media.find((m) => m.id === quest.media_id) : undefined
  const sub = subquestProgress(data.quests, done, quest.id)
  const path = showPath ? pathLabel(data.quests, quest.id) : ''
  const image = media?.poster_url ?? photoUrl
  const series = media && media.source !== 'tmdb_movie' ? media : undefined
  const episodes = series ? episodesWatched(series.seasons, progressOf(quest)) : null
  return (
    <Link to={`/quests/${quest.id}`} className="card card-hover flex gap-3 p-3">
      {image ? (
        <img src={image} alt="" loading="lazy" className="h-24 w-18 shrink-0 rounded-xl bg-blush/30 object-cover shadow-sm" />
      ) : (
        <Bubble icon={category?.icon ?? ''} color={category?.color ?? '#b3607e'} size="lg" />
      )}
      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        {path && <p className="truncate text-xs text-ink/50">{path} ›</p>}
        <p className="break-words font-display text-lg font-semibold leading-snug">{quest.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Gems difficulty={quest.difficulty} />
          {done.has(quest.id) && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <Check aria-hidden className="size-3.5" /> Feita
            </span>
          )}
        </div>
        {sub.total > 0 && (
          <ProgressBar value={sub.done} max={sub.total}>
            <span className="inline-flex items-center gap-1"><ListChecks aria-hidden className="size-3.5" /> {sub.done}/{sub.total}</span>
            <span>subquests</span>
          </ProgressBar>
        )}
        {series && (
          <ProgressBar value={episodes?.watched ?? 0} max={episodes?.total ?? 0}>
            <span className="inline-flex items-center gap-1"><Play aria-hidden className="size-3.5" /> {formatProgress(series.source, series.seasons, progressOf(quest))}</span>
            {episodes && <span>{Math.round((episodes.watched / episodes.total) * 100)}%</span>}
          </ProgressBar>
        )}
      </div>
    </Link>
  )
}
```

`src/pages/QuestsPage.tsx`:
```tsx
import { PenLine, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import Bubble from '../components/Bubble'
import EmptyState from '../components/EmptyState'
import PageHero from '../components/PageHero'
import QuestCard from '../components/QuestCard'
import SegmentedControl from '../components/SegmentedControl'
import Stagger from '../components/Stagger'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { evaluateAchievements } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../lib/difficulty'
import { filterQuests, pendingReviews, type QuestFilter } from '../lib/filters'
import { doneQuestIds } from '../lib/tree'
import type { Difficulty } from '../lib/types'

export default function QuestsPage() {
  const q = useAppData()
  const me = useUserId()
  const [filter, setFilter] = useState<QuestFilter>({ tab: 'pending', categoryId: null, difficulty: null, search: '' })
  const data = q.data
  const done = doneQuestIds(data?.completions ?? [])
  const list = data ? filterQuests(data.quests, done, filter) : []
  const coverOf = (questId: string) => data?.photos.find((p) => p.quest_id === questId)?.storage_path
  const coverPaths = list.filter((x) => !x.media_id).flatMap((x) => coverOf(x.id) ?? [])
  const urls = useSignedUrls(coverPaths).data ?? {}

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!data) return <PageLoading />

  const pending = pendingReviews(data.completions, data.reviews, me)
  const set = (patch: Partial<QuestFilter>) => setFilter((f) => ({ ...f, ...patch }))
  const month = todayISO().slice(0, 7)
  const openCount = data.quests.filter((x) => x.parent_id === null && !done.has(x.id)).length
  const doneThisMonth = data.completions.filter((c) => c.done_on.startsWith(month)).length
  const unlocked = evaluateAchievements(data.achievements, data.quests, data.completions).filter((s) => s.unlockedOn).length

  return (
    <>
      <PageHero
        title="Quests"
        stats={
          <>
            <span><strong className="text-white">{openCount}</strong> pendentes</span>
            <span aria-hidden>·</span>
            <span><strong className="text-white">{doneThisMonth}</strong> feitas este mês</span>
            <span aria-hidden>·</span>
            <span><strong className="text-white">{unlocked}</strong> conquistas</span>
          </>
        }
        actions={
          <Link to="/quests/nova" className="fab relative inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-lg font-semibold text-white md:w-auto">
            <Sparkles aria-hidden className="size-6" /> Nova quest
          </Link>
        }
      />
      <div className="space-y-4">
        {pending.length > 0 && (
          <details className="card border-accent/30 bg-blush/30 p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-bold">
              <PenLine aria-hidden className="size-4 text-accent" /> Você tem {pending.length} {pending.length === 1 ? 'resenha pendente' : 'resenhas pendentes'}
            </summary>
            <ul className="mt-3 space-y-1.5">
              {pending.map((c) => (
                <li key={c.id}>
                  <Link to={`/quests/${c.quest_id}/concluir?completion=${c.id}`} className="font-semibold text-brand underline underline-offset-2">
                    {data.quests.find((x) => x.id === c.quest_id)?.title} — {formatDate(c.done_on)}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}

        <SegmentedControl
          label="Situação"
          value={filter.tab}
          onChange={(tab) => set({ tab })}
          options={[{ value: 'pending', label: 'Pendentes' }, { value: 'done', label: 'Feitas' }]}
        />

        <div className="flex gap-2">
          <input type="search" aria-label="Buscar quests" placeholder="Buscar…" className="input flex-1" value={filter.search} onChange={(e) => set({ search: e.target.value })} />
          <select aria-label="Dificuldade" className="input w-36" value={filter.difficulty ?? ''} onChange={(e) => set({ difficulty: (e.target.value || null) as Difficulty | null })}>
            <option value="">Todas</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
          </select>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {data.categories.map((c) => (
            <button key={c.id} type="button" aria-pressed={filter.categoryId === c.id} onClick={() => set({ categoryId: filter.categoryId === c.id ? null : c.id })} className="chip">
              <Bubble icon={c.icon} color={c.color} size="sm" /> {c.name}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyState>{filter.tab === 'pending' ? 'Nenhuma quest pendente por aqui. Que tal criar uma?' : 'Nenhuma quest feita ainda.'}</EmptyState>
        ) : (
          <Stagger key={`${filter.tab}-${filter.categoryId}-${filter.difficulty}`} className="grid gap-3 md:grid-cols-2">
            {list.map((x) => (
              <QuestCard key={x.id} quest={x} data={data} done={done} showPath photoUrl={urls[coverOf(x.id) ?? '']} />
            ))}
          </Stagger>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (inclusive os testes atuais de QuestsPage: "1/2", aba "Feitas", busca "toquio", "Você tem 1 resenha pendente", "Nova quest", "Carregando…").

- [ ] **Step 3: Conferir visualmente (inclui Review Focus 2)**

Prints de `preview.html?url=/` em 390×844, 1280×800 e 390×844 com `--bottom`.
Expected: hero com números e Nova quest; pílula Pendentes/Feitas; chips com bolhas; cartões com capa (Hunter x Hunter/Sailor Moon), gemas e barras; com `--bottom`, o último cartão aparece inteiro acima do menu flutuante.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(design): quests page with hero stats, segmented tabs, category bubbles and richer cards"
```

---

### Task 5: Página da quest

**Files:**
- Create: `src/components/Avatar.tsx`
- Modify: `src/pages/QuestPage.tsx` (substituir inteiro)

**Interfaces:**
- Consumes: `PageHero`, `Bubble`, `Gems`, `ProgressBar`, `QuestCard`, `Stars`, `PhotoGrid`, `episodesWatched`, `useSignedUrls`.
- Produces: `Avatar({ profile, size?: 'sm'|'lg' })` (foto via URL assinada ou inicial).

- [ ] **Step 1: Implementar**

`src/components/Avatar.tsx`:
```tsx
import { useSignedUrls } from '../data/hooks'
import type { Profile } from '../lib/types'

export default function Avatar({ profile, size = 'sm' }: { profile: Profile; size?: 'sm' | 'lg' }) {
  const url = useSignedUrls(profile.avatar_path ? [profile.avatar_path] : []).data?.[profile.avatar_path ?? '']
  const box = size === 'lg' ? 'size-20 text-3xl ring-4' : 'size-9 text-sm ring-2'
  return url ? (
    <img src={url} alt="" className={`${box} shrink-0 rounded-full object-cover ring-white/70`} />
  ) : (
    <span aria-hidden className={`${box} grid shrink-0 place-items-center rounded-full bg-linear-to-br from-brand to-accent font-display font-bold text-white ring-white/70`}>
      {profile.display_name[0]?.toUpperCase()}
    </span>
  )
}
```

`src/pages/QuestPage.tsx`:
```tsx
import { animate } from 'animejs'
import { CalendarDays, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import Avatar from '../components/Avatar'
import Bubble from '../components/Bubble'
import Gems from '../components/Gems'
import PageHero from '../components/PageHero'
import PhotoGrid from '../components/PhotoGrid'
import ProgressBar from '../components/ProgressBar'
import QuestCard from '../components/QuestCard'
import Stars from '../components/Stars'
import { LoadError, PageLoading } from '../components/Status'
import { deleteCompletion, deleteQuest, setProgress } from '../data/api'
import { useAppData, useMediaRefresh, useRefresh, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { formatDate } from '../lib/dates'
import { prefersReducedMotion } from '../lib/motion'
import { episodesWatched, formatProgress, nextEpisode, progressOf } from '../lib/progress'
import { ancestors, childrenOf, descendantIds, doneQuestIds } from '../lib/tree'
import type { AppData, Completion, Quest } from '../lib/types'

export default function QuestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useUserId()
  const refresh = useRefresh()
  const q = useAppData()
  const plusButton = useRef<HTMLButtonElement>(null)
  const data = q.data
  const quest = data?.quests.find((x) => x.id === id)
  const media = quest?.media_id ? data?.media.find((m) => m.id === quest.media_id) : undefined
  const refPhotos = data && quest ? data.photos.filter((p) => p.quest_id === quest.id) : []
  const coverUrl = useSignedUrls(refPhotos.slice(0, 1).map((p) => p.storage_path)).data?.[refPhotos[0]?.storage_path ?? '']
  useMediaRefresh(media)

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!data) return <PageLoading />
  if (!quest) {
    return (
      <PageHero title="Quest não encontrada" actions={<Link to="/" className="btn btn-ghost">Voltar</Link>} />
    )
  }

  const category = data.categories.find((c) => c.id === quest.category_id)
  const path = ancestors(data.quests, quest.id)
  const done = doneQuestIds(data.completions)
  const isDone = done.has(quest.id)
  const children = childrenOf(data.quests, quest.id)
  const history = data.completions.filter((c) => c.quest_id === quest.id).sort((a, b) => b.done_on.localeCompare(a.done_on))
  const progress = progressOf(quest)
  const episodes = media ? episodesWatched(media.seasons, progress) : null

  async function plusOne() {
    if (!media) return
    const next = nextEpisode(media.seasons, progress)
    if (!next) {
      if (window.confirm('Vocês chegaram ao último episódio! Concluir agora?')) navigate(`/quests/${quest!.id}/concluir`)
      return
    }
    if (plusButton.current && !prefersReducedMotion()) animate(plusButton.current, { scale: [1, 1.12, 1], duration: 380, ease: 'outQuad' })
    await setProgress(quest!.id, next)
    await refresh()
  }

  async function remove() {
    const n = descendantIds(data!.quests, quest!.id).length
    if (!window.confirm(n ? `Excluir "${quest!.title}" e ${n} subquest(s)?` : `Excluir "${quest!.title}"?`)) return
    await deleteQuest(quest!.id, data!)
    await refresh()
    navigate(quest!.parent_id ? `/quests/${quest!.parent_id}` : '/', { replace: true })
  }

  async function removeCompletion(c: Completion) {
    if (!window.confirm('Excluir esta conclusão e as resenhas dela?')) return
    await deleteCompletion(c.id, data!)
    await refresh()
  }

  return (
    <>
      <PageHero
        cover={media?.poster_url ?? coverUrl}
        eyebrow={
          path.length > 0 && (
            <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1 text-sm text-white/75">
              {path.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1">
                  <Link to={`/quests/${a.id}`} className="font-semibold underline-offset-2 hover:underline">{a.title}</Link> ›
                </span>
              ))}
            </nav>
          )
        }
        title={quest.title}
        stats={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Bubble icon={category?.icon ?? ''} color={category?.color ?? '#e3b4cf'} size="sm" /> {category?.name}
            </span>
            <Gems difficulty={quest.difficulty} onDark />
            {isDone && (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                <Check aria-hidden className="size-4" /> Feita
              </span>
            )}
          </>
        }
        actions={
          <>
            <Link to={`/quests/${quest.id}/concluir`} className="btn btn-primary">{isDone ? 'Fazer de novo' : 'Concluir'}</Link>
            <Link to={`/quests/nova?parent=${quest.id}`} className="btn btn-ghost"><Plus aria-hidden className="size-4" /> Subquest</Link>
            <Link to={`/quests/${quest.id}/editar`} className="btn btn-ghost"><Pencil aria-hidden className="size-4" /> Editar</Link>
            <button type="button" className="btn btn-ghost" onClick={remove}><Trash2 aria-hidden className="size-4" /> Excluir</button>
          </>
        }
      />

      <div className="space-y-6">
        {(media?.synopsis || quest.notes) && (
          <section className="card space-y-2 p-5">
            {media?.synopsis && <p className="text-ink/70">{media.synopsis}</p>}
            {quest.notes && <p className="whitespace-pre-wrap font-semibold">{quest.notes}</p>}
          </section>
        )}

        {media && media.source !== 'tmdb_movie' && (
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink/50">Progresso</p>
                <span className="font-display text-3xl font-bold text-brand">{formatProgress(media.source, media.seasons, progress)}</span>
              </div>
              <button ref={plusButton} type="button" className="btn btn-primary" onClick={plusOne}>+1 episódio</button>
            </div>
            {episodes && (
              <ProgressBar size="lg" value={episodes.watched} max={episodes.total}>
                <span>{episodes.watched} de {episodes.total} episódios</span>
                <span>{Math.round((episodes.watched / episodes.total) * 100)}%</span>
              </ProgressBar>
            )}
            <ProgressEditor key={`${quest.progress_season}:${quest.progress_episode}`} quest={quest} onSaved={refresh} />
          </section>
        )}

        <PhotoGrid photos={refPhotos} />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Subquests ({children.length})</h2>
          {children.length > 0 && (
            <div className="tree">
              {children.map((c) => <QuestCard key={c.id} quest={c} data={data} done={done} />)}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Histórico</h2>
          {history.length === 0 ? (
            <p className="text-ink/50">Ainda não fizeram essa.</p>
          ) : (
            <ol className="timeline">
              {history.map((c) => (
                <CompletionEntry key={c.id} completion={c} data={data} me={me} questId={quest.id} onDelete={() => removeCompletion(c)} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}

function ProgressEditor({ quest, onSaved }: { quest: Quest; onSaved: () => void }) {
  const [season, setSeason] = useState(String(quest.progress_season ?? 1))
  const [episode, setEpisode] = useState(String(quest.progress_episode ?? 0))
  async function save() {
    const s = Number(season)
    const e = Number(episode)
    await setProgress(quest.id, Number.isInteger(s) && Number.isInteger(e) && s >= 1 && e >= 1 ? { season: s, episode: e } : null)
    onSaved()
  }
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-ink/60">Editar progresso</summary>
      <div className="mt-2 flex items-end gap-2">
        <label className="w-24">
          <span className="block text-xs">Temporada</span>
          <input className="input" type="number" min={1} value={season} onChange={(e) => setSeason(e.target.value)} />
        </label>
        <label className="w-24">
          <span className="block text-xs">Episódio</span>
          <input className="input" type="number" min={0} value={episode} onChange={(e) => setEpisode(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={save}>Salvar</button>
      </div>
      <p className="mt-1 text-xs text-ink/50">Episódio 0 = não começou.</p>
    </details>
  )
}

interface EntryProps {
  completion: Completion
  data: AppData
  me: string
  questId: string
  onDelete: () => void
}

function CompletionEntry({ completion, data, me, questId, onDelete }: EntryProps) {
  const reviews = data.reviews.filter((r) => r.completion_id === completion.id)
  const mine = reviews.find((r) => r.user_id === me)
  return (
    <li>
      <div className="card space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-display text-lg font-semibold">
            <CalendarDays aria-hidden className="size-4 text-accent" /> {formatDate(completion.done_on)}
          </span>
          <div className="flex gap-2">
            <Link to={`/quests/${questId}/concluir?completion=${completion.id}`} className="btn">{mine ? 'Editar' : 'Escrever minha resenha'}</Link>
            <button type="button" className="btn btn-danger" aria-label="Excluir conclusão" onClick={onDelete}>
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.profiles.map((p) => {
            const r = reviews.find((x) => x.user_id === p.id)
            return (
              <div key={p.id} className="space-y-2 rounded-2xl bg-paper/70 p-3">
                <div className="flex items-center gap-2">
                  <Avatar profile={p} />
                  <div>
                    <p className="text-sm font-bold">{p.display_name}</p>
                    {r ? <Stars value={r.rating} /> : <p className="text-xs text-ink/50">Aguardando resenha</p>}
                  </div>
                </div>
                {r?.body && <p className="whitespace-pre-wrap text-sm">{r.body}</p>}
                {r && <PhotoGrid photos={data.photos.filter((ph) => ph.review_id === r.id)} />}
              </div>
            )
          })}
        </div>
      </div>
    </li>
  )
}
```

- [ ] **Step 2: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (testes de QuestPage: caminho, "Comer o tonkotsu", "4 de 5 estrelas", "Muito bom", data, "Escrever minha resenha", "Fazer de novo", "T1 E10", "+1 episódio", exclusão com 3 subquests, refresh de mídia).

- [ ] **Step 3: Conferir visualmente (inclui Review Focus 3)**

Prints em 390 e 1280 de `preview.html?url=/quests/hxh` (capa desfocada + progresso), `?url=/quests/japao` (árvore de subquests) e `?url=/quests/serra` (título longo quebrando linha), e `?url=/quests/batata` (linha do tempo com duas resenhas).
Expected: nada estoura a largura; título longo quebra em linhas.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(design): quest page with cover hero, progress card, subquest tree and review timeline"
```

---

### Task 6: Formulários (nova/editar quest, concluir, conquista) e estrelas

**Files:**
- Modify: `src/pages/QuestFormPage.tsx` (trecho de JSX do `QuestForm`), `src/pages/CompletePage.tsx` (JSX do `CompleteForm`), `src/pages/AchievementFormPage.tsx` (JSX do `AchievementForm`), `src/components/Stars.tsx`

**Interfaces:**
- Consumes: `PageHero`, `Bubble`, `Gems`.
- Produces: `Stars` com o mesmo contrato (exibição `aria-label="N de 5 estrelas"`; entrada com `role="radio"` "N estrelas"), agora com "pulo" ao escolher.

- [ ] **Step 1: Implementar**

`src/components/Stars.tsx` (substituir inteiro):
```tsx
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
```

`src/pages/QuestFormPage.tsx` — acrescentar imports `Bubble`, `Gems`, `PageHero` (de `../components/...`) e remover `Icon`; substituir o `return (...)` do `QuestForm` por:
```tsx
  const heading = existing ? 'Editar quest' : parent ? `Nova subquest de ${parent.title}` : 'Nova quest'
  return (
    <>
      <PageHero title={heading} />
      <form onSubmit={save} className="mx-auto max-w-2xl space-y-5">
        <section className="card space-y-3 p-5">
          <h2 id="cat-label" className="text-lg font-semibold">Categoria</h2>
          <div role="group" aria-labelledby="cat-label" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {data.categories.map((c) => (
              <button key={c.id} type="button" aria-pressed={c.id === categoryId} onClick={() => setCategoryId(c.id)} className="tile">
                <Bubble icon={c.icon} color={c.color} size="lg" /> {c.name}
              </button>
            ))}
          </div>
        </section>

        {kind !== 'general' && (
          <section className="card p-5">
            {mediaFits && media ? (
              <div className="flex items-center gap-3">
                {media.poster_url && <img src={media.poster_url} alt="" className="h-20 w-14 rounded-xl object-cover shadow-sm" />}
                <span className="flex-1 font-display text-lg font-semibold">{media.title}{media.year ? ` (${media.year})` : ''}</span>
                <button type="button" className="btn" onClick={() => setMedia(null)}>Trocar</button>
              </div>
            ) : (
              <CatalogSearch kind={kind} onPick={pickMedia} />
            )}
          </section>
        )}

        <section className="card space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block font-bold">Título</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>
          <div className="space-y-2">
            <h2 id="diff-label" className="font-bold">Dificuldade</h2>
            <div role="group" aria-labelledby="diff-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DIFFICULTIES.map((d) => (
                <button key={d} type="button" aria-pressed={d === difficulty} onClick={() => setDifficulty(d)} className="tile">
                  <Gems difficulty={d} stacked />
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block font-bold">Notas</span>
            <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </section>

        <section className="card space-y-2 p-5">
          <h2 className="text-lg font-semibold">Fotos de referência</h2>
          <PhotoPicker existing={existingPhotos} pending={pending} onChange={setPending} onDeleteExisting={removeExisting} />
        </section>

        {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}

        {savedId ? (
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={() => retryUploads(savedId)}>Tentar de novo</button>
            <button type="button" className="btn flex-1" onClick={() => navigate(`/quests/${savedId}`, { replace: true })}>Continuar sem elas</button>
          </div>
        ) : (
          <button className="btn btn-primary min-h-12 w-full text-lg" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        )}
      </form>
    </>
  )
```
(Remover também o `DIFFICULTY_LABEL` do import de `../lib/difficulty` se ficar sem uso.)

`src/pages/CompletePage.tsx` — acrescentar `import PageHero from '../components/PageHero'`; substituir o `return (...)` do `CompleteForm` por:
```tsx
  return (
    <>
      <PageHero title={`${existing ? 'Editar conclusão' : 'Concluir'}: ${quest.title}`} />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(rating > 0 || body.trim() !== '' || pending.length > 0)
        }}
        className="mx-auto max-w-2xl space-y-5"
      >
        <section className="card p-5">
          <label className="block">
            <span className="mb-1 block font-bold">Quando vocês fizeram?</span>
            <input type="date" className="input" value={doneOn} max={todayISO()} onChange={(e) => setDoneOn(e.target.value)} />
          </label>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold">Sua resenha</h2>
          <Stars value={rating} onChange={setRating} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">O que achou? (opcional)</span>
            <textarea className="input min-h-28" value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <PhotoPicker existing={mine ? data.photos.filter((p) => p.review_id === mine.id) : []} pending={pending} onChange={setPending} onDeleteExisting={removePhoto} />
        </section>

        {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}

        {failedReviewId ? (
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={() => retryUploads(failedReviewId)}>Tentar de novo</button>
            <button type="button" className="btn flex-1" onClick={afterSave}>Continuar sem elas</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn btn-primary min-h-12 flex-1 text-lg" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            {!existing && <button type="button" className="btn min-h-12 flex-1" disabled={saving} onClick={() => submit(false)}>Pular resenha</button>}
            {mine && <button type="button" className="btn btn-danger min-h-12 flex-1" onClick={removeMine}>Apagar minha resenha</button>}
          </div>
        )}

        {celebrate && <Celebration achievements={celebrate} onClose={back} />}
      </form>
    </>
  )
```

`src/pages/AchievementFormPage.tsx` — acrescentar `import PageHero from '../components/PageHero'`; substituir o `return (...)` do `AchievementForm` por:
```tsx
  return (
    <>
      <PageHero title={existing ? 'Editar conquista' : 'Nova conquista'} />
      <form onSubmit={save} className="mx-auto max-w-2xl space-y-5">
        <section className="card space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block font-bold">Nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <IconPicker value={icon} onChange={setIcon} />
          <label className="block">
            <span className="mb-1 block font-bold">Descrição</span>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block font-bold">Raridade</span>
            <select className="input" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)}>
              {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
            </select>
          </label>
        </section>

        <section className="card space-y-4 p-5">
          <h2 id="kind-label" className="text-lg font-semibold">Tipo</h2>
          <div role="group" aria-labelledby="kind-label" className="grid grid-cols-2 gap-2">
            {(['auto', 'manual'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className="tile">
                {k === 'auto' ? 'Automática' : 'Manual'}
              </button>
            ))}
          </div>
          {kind === 'auto' && (
            <>
              <label className="block">
                <span className="mb-1 block font-bold">Categoria</span>
                <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Qualquer categoria</option>
                  {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-bold">Dificuldade mínima</span>
                <select className="input" value={minDifficulty} onChange={(e) => setMinDifficulty(e.target.value as Difficulty | '')}>
                  <option value="">Qualquer</option>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-bold">Quantidade</span>
                <input className="input" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
              </label>
            </>
          )}
        </section>

        {error && <p role="alert" className="font-semibold text-red-600">{error}</p>}
        <button className="btn btn-primary min-h-12 w-full text-lg">Salvar</button>
        {existing && <button type="button" className="btn btn-danger w-full" onClick={remove}>Excluir conquista</button>}
      </form>
    </>
  )
```

- [ ] **Step 2: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (testes de QuestFormPage, CompletePage, AchievementsPage-form).

- [ ] **Step 3: Conferir visualmente**

Prints em 390 e 1280 de `preview.html?url=/quests/nova`, `?url=/quests/nova?parent=japao`, `?url=/quests/sm/concluir`, `?url=/conquistas/nova`.
Expected: ladrilhos de categoria com bolhas, ladrilhos de dificuldade com gemas, estrelas grandes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(design): form pages with category and difficulty tiles, big bouncing stars"
```

---

### Task 7: Conquistas, cartão-medalha e comemoração

**Files:**
- Create: `src/components/MedalCard.tsx`
- Modify: `src/pages/AchievementsPage.tsx` (substituir inteiro), `src/components/Celebration.tsx` (substituir inteiro)

**Interfaces:**
- Consumes: `AchievementStatus`, `describeRule`, `setManualUnlock`, `Icon`, `RarityBadge`, `ProgressBar`, `PageHero`, `RARITIES`.
- Produces: `MedalCard({ status, categories, onChange })`.

- [ ] **Step 1: Implementar**

`src/components/MedalCard.tsx`:
```tsx
import { Lock, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { setManualUnlock } from '../data/api'
import { describeRule, type AchievementStatus } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import type { Category } from '../lib/types'
import Icon from './Icon'
import ProgressBar from './ProgressBar'

export default function MedalCard({ status, categories, onChange }: { status: AchievementStatus; categories: Category[]; onChange: () => void }) {
  const { achievement: a, unlockedOn, current, target } = status
  const [unlocking, setUnlocking] = useState(false)
  const [date, setDate] = useState(todayISO())

  async function unlock() {
    await setManualUnlock(a.id, date)
    onChange()
  }

  async function relock() {
    if (!window.confirm('Bloquear de novo?')) return
    await setManualUnlock(a.id, null)
    onChange()
  }

  return (
    <article className={`medal medal-${a.rarity} ${unlockedOn ? '' : 'medal-locked'}`}>
      <div className="medal-inner flex gap-3 p-4">
        <div className="medallion">
          <Icon name={a.icon} className="size-7" />
          {!unlockedOn && <Lock aria-hidden className="medallion-lock" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-lg font-semibold leading-tight ${unlockedOn ? '' : 'text-ink/60'}`}>{a.name}</h3>
            <Link to={`/conquistas/${a.id}/editar`} aria-label={`Editar ${a.name}`} className="grid size-8 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-blush/40">
              <Pencil aria-hidden className="size-4" />
            </Link>
          </div>
          {a.description && <p className="text-sm text-ink/60">{a.description}</p>}
          {a.kind === 'auto' && <p className="text-xs font-semibold text-ink/45">{describeRule(a, categories)}</p>}
          {unlockedOn ? (
            <p className="text-sm font-bold text-emerald-700">Desbloqueada em {formatDate(unlockedOn)}</p>
          ) : a.kind === 'auto' ? (
            <ProgressBar value={current} max={target}>
              <span className="font-bold">{current}/{target}</span>
            </ProgressBar>
          ) : unlocking ? (
            <div className="flex gap-2">
              <input type="date" aria-label="Data do desbloqueio" className="input" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={unlock}>Confirmar</button>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setUnlocking(true)}>Desbloquear</button>
          )}
          {a.kind === 'manual' && unlockedOn && (
            <button type="button" className="text-xs font-semibold text-ink/50 underline" onClick={relock}>Bloquear de novo</button>
          )}
        </div>
      </div>
    </article>
  )
}
```

`src/pages/AchievementsPage.tsx`:
```tsx
import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import MedalCard from '../components/MedalCard'
import PageHero from '../components/PageHero'
import RarityBadge from '../components/RarityBadge'
import Stagger from '../components/Stagger'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData, useRefresh } from '../data/hooks'
import { RARITIES, RARITY_LABEL, evaluateAchievements } from '../lib/achievements'

function Ring({ value, max }: { value: number; max: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  const pct = max > 0 ? value / max : 0
  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg aria-hidden viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="url(#ring)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0" stopColor="#e3b4cf" />
            <stop offset="1" stopColor="#fde68a" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-center leading-none">
        <span className="block font-display text-2xl font-bold">{value}</span>
        <span className="text-xs text-white/70">de {max}</span>
      </span>
    </div>
  )
}

export default function AchievementsPage() {
  const q = useAppData()
  const refresh = useRefresh()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />
  const data = q.data
  const statuses = evaluateAchievements(data.achievements, data.quests, data.completions)
  const unlocked = statuses.filter((s) => s.unlockedOn)

  return (
    <>
      <PageHero title="Conquistas" actions={<Link to="/conquistas/nova" className="btn btn-ghost"><Plus aria-hidden className="size-4" /> Nova</Link>}>
        <div className="flex items-center gap-4">
          <Ring value={unlocked.length} max={statuses.length} />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/80">
            {RARITIES.map((r) => (
              <li key={r} className="inline-flex items-center gap-2">
                <span aria-hidden className={`medal-${r} size-3 rounded-full`} style={{ background: 'var(--metal)' }} />
                {RARITY_LABEL[r]}: <strong className="text-white">{unlocked.filter((s) => s.achievement.rarity === r).length}</strong>
              </li>
            ))}
          </ul>
        </div>
      </PageHero>
      <div className="space-y-8">
        {RARITIES.map((rarity) => {
          const group = statuses.filter((s) => s.achievement.rarity === rarity)
          if (group.length === 0) return null
          return (
            <section key={rarity} className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <RarityBadge rarity={rarity} /> {group.filter((s) => s.unlockedOn).length}/{group.length}
              </h2>
              <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((s) => <MedalCard key={s.achievement.id} status={s} categories={data.categories} onChange={refresh} />)}
              </Stagger>
            </section>
          )
        })}
      </div>
    </>
  )
}
```

`src/components/Celebration.tsx`:
```tsx
import { animate, stagger } from 'animejs'
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import type { Achievement } from '../lib/types'
import Icon from './Icon'
import RarityBadge from './RarityBadge'

const SPARKS = 14

export default function Celebration({ achievements, onClose }: { achievements: Achievement[]; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = box.current!
    const angle = (i: number) => (i / SPARKS) * Math.PI * 2
    const anims = [
      animate(el.querySelectorAll('[data-medal]'), { rotateY: { from: 180 }, scale: { from: 0.3 }, duration: 950, delay: stagger(160), ease: 'outBack(1.4)' }),
      animate(el.querySelectorAll('[data-spark]'), {
        translateX: (_: unknown, i: number) => Math.cos(angle(i)) * 120,
        translateY: (_: unknown, i: number) => Math.sin(angle(i)) * 120,
        scale: [{ to: 1.4 }, { to: 0 }],
        opacity: [{ to: 1 }, { to: 0 }],
        duration: 1000,
        delay: stagger(18, { start: 150 }),
        ease: 'outExpo',
      }),
    ]
    return () => anims.forEach((a) => a.revert())
  }, [])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="celebration-title" className="fixed inset-0 z-50 grid place-items-center bg-night/70 p-4 backdrop-blur-sm">
      <div ref={box} className="card relative w-full max-w-sm space-y-5 overflow-hidden p-6 text-center">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-28">
          {Array.from({ length: SPARKS }, (_, i) => <span key={i} data-spark className="spark" />)}
        </div>
        <h2 id="celebration-title" className="text-2xl font-bold text-brand">Conquista desbloqueada!</h2>
        <ul className="space-y-5">
          {achievements.map((a) => (
            <li key={a.id} className={`medal-${a.rarity} space-y-2 [perspective:600px]`}>
              <div data-medal className="medallion mx-auto size-24">
                <Icon name={a.icon} className="size-11" />
              </div>
              <p className="font-display text-xl font-semibold">{a.name}</p>
              <RarityBadge rarity={a.rarity} />
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary min-h-12 w-full" onClick={onClose} autoFocus>Continuar</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (AchievementsPage: cabeçalhos `h2` "Platina 0/1", "Prata 0/1", "Bronze 1/1"; "7/10"; "Desbloqueada em 01/10/2026"; desbloqueio manual; CompletePage: diálogo com "Primeira quest" e "Continuar").

- [ ] **Step 3: Conferir visualmente (inclui Review Focus 1)**

Prints em 390 e 1280 de `preview.html?url=/conquistas` e de `preview.html?url=/quests/hxh&celebrate=1` (esperar 2500ms).
Expected: medalhas com molduras metálicas, bloqueadas cinza com cadeado; a comemoração cobre a tela inteira (fundo escurecido de borda a borda).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(design): achievements with metallic medal cards, progress ring and celebration burst"
```

---

### Task 8: Relatório

**Files:**
- Modify: `src/pages/ReportPage.tsx` (substituir inteiro), `src/components/PhotoGrid.tsx` (prop `mosaic`)
- Delete: `src/components/DifficultyBadge.tsx`

**Interfaces:**
- Consumes: `PageHero`, `SegmentedControl`, `CountUp`, `Bubble`, `Gems`, `Stars`, `Icon`, `RarityBadge`, `PhotoGrid`, `EmptyState`.
- Produces: `PhotoGrid({ photos, onDelete?, mosaic? })`.

- [ ] **Step 1: Implementar**

`src/components/PhotoGrid.tsx` — trocar a assinatura e a `className` do grid:
```tsx
export default function PhotoGrid({ photos, onDelete, mosaic = false }: { photos: Photo[]; onDelete?: (p: Photo) => void; mosaic?: boolean }) {
```
```tsx
    <div className={`grid grid-cols-3 gap-2 sm:grid-cols-4 ${mosaic ? '[&>*:first-child]:col-span-2 [&>*:first-child]:row-span-2' : ''}`}>
```

`src/pages/ReportPage.tsx`:
```tsx
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import Bubble from '../components/Bubble'
import CountUp from '../components/CountUp'
import EmptyState from '../components/EmptyState'
import Gems from '../components/Gems'
import Icon from '../components/Icon'
import PageHero from '../components/PageHero'
import PhotoGrid from '../components/PhotoGrid'
import RarityBadge from '../components/RarityBadge'
import SegmentedControl from '../components/SegmentedControl'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData } from '../data/hooks'
import { evaluateAchievements } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import { DIFFICULTIES } from '../lib/difficulty'
import { buildReport, last3Period, monthPeriod, shiftPeriod, yearPeriod, type Period, type PeriodKind } from '../lib/report'

export default function ReportPage() {
  const q = useAppData()
  const today = todayISO()
  const [y, m] = today.split('-').map(Number)
  const [period, setPeriod] = useState<Period>(() => monthPeriod(y, m))
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />
  const data = q.data
  const report = buildReport(period, data, evaluateAchievements(data.achievements, data.quests, data.completions))
  const nameOf = (userId: string) => data.profiles.find((p) => p.id === userId)?.display_name ?? '?'
  const empty = report.total === 0 && report.unlocked.length === 0
  const makers: Record<PeriodKind, () => Period> = { month: () => monthPeriod(y, m), last3: () => last3Period(today), year: () => yearPeriod(y) }
  const maxCount = Math.max(1, ...report.byCategory.map((c) => c.count))

  return (
    <>
      <PageHero title="Relatório">
        <div className="max-w-md space-y-3">
          <SegmentedControl
            label="Período"
            tone="dark"
            value={period.kind}
            onChange={(kind) => setPeriod(makers[kind]())}
            options={[{ value: 'month', label: 'Mês' }, { value: 'last3', label: 'Últimos 3 meses' }, { value: 'year', label: 'Ano' }]}
          />
          <div className="flex items-center justify-between gap-2">
            {period.kind !== 'last3' ? (
              <button type="button" className="btn btn-ghost px-3" aria-label="Período anterior" onClick={() => setPeriod(shiftPeriod(period, -1))}>
                <ChevronLeft aria-hidden className="size-5" />
              </button>
            ) : <span />}
            <h2 className="text-xl font-semibold capitalize">{period.label}</h2>
            {period.kind !== 'last3' ? (
              <button type="button" className="btn btn-ghost px-3" aria-label="Próximo período" onClick={() => setPeriod(shiftPeriod(period, 1))}>
                <ChevronRight aria-hidden className="size-5" />
              </button>
            ) : <span />}
          </div>
        </div>
      </PageHero>

      {empty ? (
        <EmptyState>Nada por aqui ainda. Bora completar uma quest?</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card flex items-center gap-4 p-5 md:col-span-2">
            <CountUp value={report.total} className="font-display text-6xl font-bold text-accent" />
            <p className="text-lg font-semibold text-ink/70">{report.total === 1 ? 'quest concluída' : 'quests concluídas'}</p>
          </section>

          <section className="card space-y-3 p-5">
            <h3 className="text-lg font-semibold">Por categoria</h3>
            {report.byCategory.map(({ category, count }) => (
              <div key={category.id} className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bubble icon={category.icon} color={category.color} size="sm" />
                  <span>{category.name}: {count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, background: category.color }} />
                </div>
              </div>
            ))}
          </section>

          <section className="card space-y-3 p-5">
            <h3 className="text-lg font-semibold">Por dificuldade</h3>
            <ul className="grid grid-cols-4 gap-2 text-center">
              {DIFFICULTIES.map((d) => (
                <li key={d} className="flex flex-col items-center gap-2 rounded-2xl bg-paper/70 py-3">
                  <span className="font-display text-3xl font-bold">{report.byDifficulty[d]}</span>
                  <Gems difficulty={d} stacked />
                </li>
              ))}
            </ul>
          </section>

          {report.unlocked.length > 0 && (
            <section className="card space-y-3 p-5 md:col-span-2">
              <h3 className="text-lg font-semibold">Conquistas desbloqueadas</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {report.unlocked.map((s) => (
                  <li key={s.achievement.id} className={`medal-${s.achievement.rarity} flex items-center gap-3`}>
                    <span className="medallion size-11"><Icon name={s.achievement.icon} className="size-5" /></span>
                    <span className="flex-1 font-semibold">{s.achievement.name}</span>
                    <RarityBadge rarity={s.achievement.rarity} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.best.length > 0 && (
            <section className="space-y-3 md:col-span-2">
              <h3 className="text-lg font-semibold">Melhores momentos</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {report.best.map((i) => (
                  <Link key={i.completion.id} to={`/quests/${i.quest.id}`} className="card card-hover space-y-1 p-4">
                    <p className="font-display text-lg font-semibold">{i.quest.title}</p>
                    <p className="inline-flex items-center gap-1 font-bold text-accent">
                      <Star aria-hidden className="size-4 fill-current" /> {i.average!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {report.photos.length > 0 && (
            <section className="space-y-3 md:col-span-2">
              <h3 className="text-lg font-semibold">Álbum</h3>
              <PhotoGrid photos={report.photos} mosaic />
            </section>
          )}

          <section className="space-y-3 md:col-span-2">
            <h3 className="text-lg font-semibold">Linha do tempo</h3>
            <ol className="timeline">
              {report.timeline.map((i) => (
                <li key={i.completion.id}>
                  <div className="card space-y-1 p-4">
                    <p className="text-xs font-semibold text-ink/50">{formatDate(i.completion.done_on)}{i.path ? ` · ${i.path}` : ''}</p>
                    <Link to={`/quests/${i.quest.id}`} className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                      <Bubble icon={i.category?.icon ?? ''} color={i.category?.color ?? '#b3607e'} size="sm" /> {i.quest.title}
                    </Link>
                    {i.ratings.length > 0 && (
                      <p className="text-sm text-ink/60">{i.ratings.map((r) => `${nameOf(r.user_id)}: ${r.rating}/5`).join(' · ')}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  )
}
```

Run: `git rm src/components/DifficultyBadge.tsx`

- [ ] **Step 2: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (ReportPage: "outubro de 2026", "3", "Restaurante: 2", "Filme: 1", período anterior, "Últimos 3 meses", mensagem vazia).

- [ ] **Step 3: Conferir visualmente**

Prints em 390 e 1280 de `preview.html?url=/relatorio`.
Expected: seletor de período no céu, número grande, barras coloridas, colunas de gemas, linha do tempo com pontos.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(design): report with count-up total, category bars, gem columns, mosaic album and timeline"
```

---

### Task 9: Perfil e página não encontrada

**Files:**
- Modify: `src/pages/ProfilePage.tsx` (função `ProfilePage` e cartões), `src/routes.tsx` (rota `*`)

**Interfaces:**
- Consumes: `PageHero`, `Avatar`, `Bubble`.

- [ ] **Step 1: Implementar**

`src/pages/ProfilePage.tsx` — acrescentar imports `Heart` (lucide-react), `Avatar`, `Bubble`, `PageHero`; substituir a função `ProfilePage` por:
```tsx
export default function ProfilePage() {
  const q = useAppData()
  const me = useUserId()
  const refresh = useRefresh()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />
  const profile = q.data.profiles.find((p) => p.id === me)
  const partner = q.data.profiles.find((p) => p.id !== me)

  return (
    <>
      <PageHero title="Perfil">
        <div className="flex items-center gap-3">
          {profile && <Avatar profile={profile} size="lg" />}
          <Heart aria-hidden className="size-7 fill-accent text-accent drop-shadow" />
          {partner && <Avatar profile={partner} size="lg" />}
          <p className="ml-1 font-display text-lg font-semibold text-white/90">
            {profile?.display_name}{partner ? ` & ${partner.display_name}` : ''}
          </p>
        </div>
      </PageHero>
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="card p-5">{profile && <ProfileForm profile={profile} onSaved={refresh} />}</section>
        <section className="card p-5"><Categories data={q.data} onChange={refresh} /></section>
        <section className="card space-y-2 p-5 text-sm text-ink/60">
          <h2 className="text-lg font-semibold text-ink">Créditos</h2>
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            <img src="/tmdb.svg" alt="TMDB" className="h-4" />
          </a>
          <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
          <p>Dados de anime: <a className="underline" href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>.</p>
        </section>
        <button type="button" className="btn btn-danger min-h-12 w-full" onClick={() => signOut()}>Sair</button>
      </div>
    </>
  )
}
```
No `ProfileForm`, remover o bloco do avatar redondo grande (o avatar agora fica no hero) mantendo o botão "Trocar foto": trocar o primeiro `<div className="flex items-center gap-4">…</div>` por:
```tsx
      <label className="btn cursor-pointer">
        Trocar foto
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            changeAvatar(file)
          }}
        />
      </label>
```
e remover a constante `avatarUrl` e o import de `useSignedUrls` se ficarem sem uso. No `CategoryRow`, trocar o par `<span className="size-3 rounded-full" …/>` + `<span style={{ color: c.color }}><Icon … /></span>` por `<Bubble icon={c.icon} color={c.color} />` e o `<li className="card …">` por `<li className="flex items-center gap-3 rounded-2xl bg-paper/70 p-2 pr-3">`; remover o import de `Icon` se ficar sem uso.

`src/routes.tsx` — acrescentar `import { Link } from 'react-router'`, `import PageHero from './components/PageHero'` e trocar a rota `*` por:
```tsx
      { path: '*', element: <PageHero title="Página não encontrada" actions={<Link to="/" className="btn btn-ghost">Voltar para as quests</Link>} /> },
```

- [ ] **Step 2: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos PASS (ProfilePage: excluir categorias, "Livro", "Adicionar", duplicada, "Salvar nome").

- [ ] **Step 3: Conferir visualmente**

Prints em 390 e 1280 de `preview.html?url=/perfil` e `?url=/xyz`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(design): profile hero with the couple's avatars, category bubbles and a styled not-found page"
```

---

### Task 10: Revisão visual final

**Files:** nenhum novo (ajustes pontuais conforme o que os prints mostrarem, cada um registrado como Ruling no ledger).

- [ ] **Step 1: Prints de todas as telas**

Com `npm run dev`, para cada URL de prévia (`/`, `/quests/hxh`, `/quests/japao`, `/quests/serra`, `/quests/batata`, `/quests/nova`, `/quests/sm/concluir`, `/conquistas`, `/conquistas/nova`, `/relatorio`, `/perfil`): 390×844 e 1280×800; mais `/` e `/conquistas` com `--reduce`; mais `/` com `--bottom`; mais o login deslogado (`http://localhost:5173/`).
Expected: nada cortado, sem rolagem horizontal, textos brancos só sobre o céu, menu não cobre conteúdo, versão `--reduce` com céu estático e pílulas no lugar.

- [ ] **Step 2: Verificação completa**

Run: `npx vitest run && npm run typecheck && npm run build`
Expected: todos PASS; build OK; `dist/preview.html` inexistente.

- [ ] **Step 3: Commit (se houve ajustes)**

```bash
git add -A
git commit -m "fix(design): visual QA adjustments"
```
