# Retrospectiva do ano — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma retrospectiva do ano estilo Wrapped (telas animadas tipo stories) com "Compartilhar" que gera um PNG 1080×1920 de cada tela.

**Architecture:**
- `src/lib/wrapped.ts` monta as telas a partir do `buildReport` que já existe. São funções puras e testadas.
- `src/lib/story.ts` faz a quebra de linha, carrega imagens com timeout, desenha o story num canvas e escolhe entre compartilhar e baixar.
- `src/pages/WrappedPage.tsx` é uma rota em tela cheia, irmã do `Layout`, com o próprio céu 3D. A navegação é por toque, teclado e avanço automático.
- O Relatório ganha o botão de entrada.

**Tech Stack:**
- React 19, React Router 7, TanStack Query 5, Tailwind 4.
- anime.js 4 (via os `Stagger` e `CountUp` já existentes) e animações CSS.
- Canvas 2D, Web Share API.
- Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-07-bubs2do-retrospectiva-design.md`

## Global Constraints

- Textos da interface em pt-BR; identificadores de código em inglês, como no resto do projeto.
- Nenhuma dependência nova.
- Trabalho direto na `main`, sem branch. Commits **sem** `Co-Authored-By` nem atribuição ao Claude. Push só se o usuário autorizar.
- Nunca usar ferramentas `mcp__supabase__*`.
- Animações:
  - só anime.js ou CSS;
  - nada pode deixar `transform` ou `opacity` inline depois de terminar;
  - respeitar `prefersReducedMotion()`. No jsdom ela retorna `true`, então os testes rodam sem animação.
- Um só contexto WebGL. A `WrappedPage` fica fora do `Layout`, então o `SkyScene` dela é o único montado.
- Contraste: texto branco só sobre o céu escuro. Texto `ink` com opacidade mínima de 60%, o que o `src/design.test.ts` já garante.
- **Story:**
  - PNG 1080×1920;
  - rodapé exatamente `Bubs2Do · {ano}`;
  - nome do arquivo `bubs2do-{ano}-{tela}.png`;
  - imagem com timeout de 5 s.
- **Avanço automático:** 6 s (`SLIDE_MS`), igual à duração da animação CSS `.story-fill`.

## Review Focus

1. **Tocar em "Compartilhar" ou "Fechar"** nunca pode também trocar de tela. As zonas de toque cobrem só a área da tela.
2. **Títulos e nomes de categoria muito longos** quebram linha a 390px sem empurrar o "Compartilhar" para fora da tela. No story, o texto é cortado com "…" (3 linhas com imagem, 4 sem).
3. **Imagem que não carrega** (pôster sem CORS, URL assinada vencida, sem rede):
   - no app, a capa some;
   - o story é gerado sem imagem;
   - o botão nunca fica preso em "Gerando…".
4. **"Reduzir movimento":**
   - sem avanço automático;
   - segmentos de progresso já cheios;
   - nada preso com `opacity: 0`.
5. **Ano inválido ou vazio** na URL (`/retrospectiva/abc`, ou `/retrospectiva/2025` sem conclusões) volta para o Relatório, nunca deixa a tela em branco.

---

### Task 1: `story.ts`: quebra de linha, carregar imagem, desenhar e compartilhar

**Files:**
- Create: `src/lib/story.ts`
- Test: `src/lib/story.test.ts`

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces:
  - `type ImageRef = { path: string } | { url: string }`
  - `interface StoryCard { eyebrow: string; big: string; caption: string; image: ImageRef | null }`
  - `wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines?: number): string[]`
  - `loadImage(src: string, timeout?: number): Promise<HTMLImageElement | null>`
  - `drawStory(card: StoryCard, year: number, imageUrl: string | null): Promise<Blob>`
  - `shareOrDownload(blob: Blob, filename: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/story.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadImage, shareOrDownload, wrapLines } from './story'

const len = (s: string) => s.length

describe('wrapLines', () => {
  it('keeps short text on one line', () => {
    expect(wrapLines('Batata do Marechal', 100, len)).toEqual(['Batata do Marechal'])
  })

  it('breaks between words when the line gets too wide', () => {
    expect(wrapLines('Acampar na Serra da Mantiqueira', 12, len)).toEqual(['Acampar na', 'Serra da', 'Mantiqueira'])
  })

  it('a word longer than the line stays whole on its own line', () => {
    expect(wrapLines('Supercalifragilistico ok', 5, len)).toEqual(['Supercalifragilistico', 'ok'])
  })

  it('cuts to maxLines with an ellipsis', () => {
    expect(wrapLines('a b c d e f', 1, len, 3)).toEqual(['a', 'b', 'c…'])
  })
})

describe('loadImage', () => {
  afterEach(() => vi.useRealTimers())

  it('gives up after the timeout so the story is drawn without the image', async () => {
    vi.useFakeTimers()
    const result = loadImage('https://example.com/poster.jpg', 5000)
    vi.advanceTimersByTime(5000)
    await expect(result).resolves.toBeNull()
  })
})

describe('shareOrDownload', () => {
  const blob = new Blob(['png'], { type: 'image/png' })
  afterEach(() => vi.unstubAllGlobals())

  const downloads = () => {
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download)
    })
    Object.assign(URL, { createObjectURL: () => 'blob:story', revokeObjectURL: () => {} }) // not implemented in jsdom
    return names
  }

  it('opens the native share sheet when the device can share files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: () => true, share })
    const names = downloads()
    await shareOrDownload(blob, 'bubs2do-2026-intro.png')
    expect(share.mock.calls[0][0].files[0].name).toBe('bubs2do-2026-intro.png')
    expect(names).toEqual([])
  })

  it('does nothing else when the person cancels the share sheet', async () => {
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError')) })
    const names = downloads()
    await shareOrDownload(blob, 'x.png')
    expect(names).toEqual([])
  })

  it('downloads the file when sharing is not supported or fails', async () => {
    vi.stubGlobal('navigator', {})
    const names = downloads()
    await shareOrDownload(blob, 'bubs2do-2026-total.png')
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new Error('NotAllowed')) })
    await shareOrDownload(blob, 'bubs2do-2026-best.png')
    expect(names).toEqual(['bubs2do-2026-total.png', 'bubs2do-2026-best.png'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/story.test.ts`
Expected: FAIL. O import falha porque o módulo `./story` ainda não existe.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/story.ts
// Story images (1080×1920) for sharing a retrospective slide.

export type ImageRef = { path: string } | { url: string }

export interface StoryCard {
  eyebrow: string
  big: string
  caption: string
  image: ImageRef | null
}

export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines = Infinity): string[] {
  const lines: string[] = []
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1)
    if (last !== undefined && measure(`${last} ${word}`) <= maxWidth) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  if (lines.length <= maxLines) return lines
  return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1]}…`]
}

// Resolves null on error or timeout (no CORS, expired URL, offline): the story is then drawn without the image.
export function loadImage(src: string, timeout = 5000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const done = (ok: boolean) => {
      clearTimeout(timer)
      resolve(ok ? img : null)
    }
    const timer = setTimeout(() => done(false), timeout)
    img.onload = () => done(true)
    img.onerror = () => done(false)
    img.src = src
  })
}

const W = 1080
const H = 1920
const PAPER = '#efeced'
const BLUSH = '#e3b4cf'
const BRAND = '#553548'

// Same star field on every story (fixed seed).
function drawStars(ctx: CanvasRenderingContext2D) {
  let seed = 7
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 160; i++) {
    ctx.globalAlpha = 0.3 + rand() * 0.7
    ctx.fillStyle = rand() > 0.8 ? BLUSH : '#fff'
    ctx.beginPath()
    ctx.arc(rand() * W, rand() * H * 0.85, 1 + rand() * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// Canvas is not available in jsdom: this is verified by the PNG print in Task 5.
export async function drawStory(card: StoryCard, year: number, imageUrl: string | null): Promise<Blob> {
  await Promise.all(['700 150px Fredoka', '600 44px Fredoka', '800 40px Nunito', '600 46px Nunito'].map((f) => document.fonts.load(f)))
  const image = imageUrl ? await loadImage(imageUrl) : null
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const measure = (s: string) => ctx.measureText(s).width

  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#1a1115')
  sky.addColorStop(0.6, '#2c1b25')
  sky.addColorStop(1, BRAND)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  drawStars(ctx)

  ctx.textAlign = 'center'
  ctx.fillStyle = BLUSH
  ctx.font = '800 40px Nunito'
  ctx.fillText(card.eyebrow.toUpperCase(), W / 2, 300)

  let y = 760
  if (image) {
    const size = 640
    const x = (W - size) / 2
    const crop = Math.min(image.naturalWidth, image.naturalHeight)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, 360, size, size, 48)
    ctx.clip()
    ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, x, 360, size, size)
    ctx.restore()
    y = 1100
  }

  const bigSize = image ? 96 : 150
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${bigSize}px Fredoka`
  for (const line of wrapLines(card.big, 920, measure, image ? 3 : 4)) {
    ctx.fillText(line, W / 2, y)
    y += bigSize * 1.1
  }
  y += 30
  ctx.fillStyle = 'rgb(255 255 255 / 0.8)'
  ctx.font = '600 46px Nunito'
  for (const line of wrapLines(card.caption, 900, measure, 3)) {
    ctx.fillText(line, W / 2, y)
    y += 62
  }

  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.moveTo(0, H)
  ctx.lineTo(0, H - 170)
  ctx.quadraticCurveTo(W / 2, H - 290, W, H - 170)
  ctx.lineTo(W, H)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = BRAND
  ctx.font = '600 44px Fredoka'
  ctx.fillText(`Bubs2Do · ${year}`, W / 2, H - 80)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'),
  )
}

export async function shareOrDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/story.test.ts`
Expected: PASS (8 testes).

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: sem erros.

```bash
git add src/lib/story.ts src/lib/story.test.ts
git commit -m "feat(retrospectiva): story helpers — line wrapping, image loading with timeout, canvas story and share-or-download"
```

---

### Task 2: `wrapped.ts`: as telas do ano

**Files:**
- Create: `src/lib/wrapped.ts`
- Test: `src/lib/wrapped.test.ts`

**Interfaces:**
- Consumes:
  - de `./story`: `ImageRef` e `StoryCard`;
  - de `./report`: `buildReport`, `yearPeriod` e `TimelineItem`;
  - de `./achievements`: `evaluateAchievements` e `AchievementStatus`.
- Produces:
  - `type Slide` (união por `kind`: `'intro' | 'total' | 'categories' | 'hardest' | 'best' | 'disagree' | 'medals' | 'album' | 'outro'`, com os campos abaixo)
  - `buildWrapped(year: number, data: AppData, me: string): Slide[]`. Retorna `[]` quando o ano não tem conclusões.
  - `storyCard(slide: Slide): StoryCard`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/wrapped.test.ts
import { describe, expect, it } from 'vitest'
import { CATS, ME, PARTNER, achievement, allCats, appData, completion, media, photo, quest, review } from '../test/fixtures'
import type { AppData } from './types'
import { buildWrapped, storyCard, type Slide } from './wrapped'

const batata = quest({ id: 'batata', title: 'Batata do Marechal', category_id: CATS.restaurante.id, difficulty: 'hard' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id, difficulty: 'medium', media_id: 'm-matrix' })
const fuji = quest({ id: 'fuji', title: 'Monte Fuji', category_id: CATS.atividade.id, difficulty: 'hard' })
const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, difficulty: 'epic' })
const matrixMedia = media({ id: 'm-matrix', source: 'tmdb_movie', poster_url: 'https://image.tmdb.org/matrix.jpg' })
const completions = [
  completion({ id: 'c1', quest_id: 'batata', done_on: '2026-03-10' }),
  completion({ id: 'c2', quest_id: 'matrix', done_on: '2026-03-20' }),
  completion({ id: 'c3', quest_id: 'fuji', done_on: '2026-07-01' }),
  completion({ id: 'c0', quest_id: 'batata', done_on: '2025-12-31' }),
]
const base = (o: Partial<AppData> = {}) =>
  appData({ categories: allCats(), media: [matrixMedia], quests: [batata, matrix, fuji, japao], completions, ...o })
const rated = (o: Partial<AppData> = {}) =>
  base({
    reviews: [
      review({ id: 'r1', completion_id: 'c1', user_id: ME, rating: 5 }),
      review({ id: 'r2', completion_id: 'c1', user_id: PARTNER, rating: 5 }),
      review({ id: 'r3', completion_id: 'c2', user_id: ME, rating: 5 }),
      review({ id: 'r4', completion_id: 'c2', user_id: PARTNER, rating: 2 }),
    ],
    photos: [photo({ review_id: 'r1', storage_path: 'batata.jpg' })],
    ...o,
  })
const kinds = (slides: Slide[]) => slides.map((s) => s.kind)
const find = <K extends Slide['kind']>(slides: Slide[], kind: K) => slides.find((s) => s.kind === kind) as Extract<Slide, { kind: K }>

describe('buildWrapped', () => {
  it('a year with completions but no reviews, medals or photos has the five fixed slides', () => {
    expect(kinds(buildWrapped(2026, base(), ME))).toEqual(['intro', 'total', 'categories', 'hardest', 'outro'])
  })

  it('a year without completions has no slides', () => {
    expect(buildWrapped(2024, base(), ME)).toEqual([])
  })

  it('the intro puts the viewer first', () => {
    expect(find(buildWrapped(2026, base(), ME), 'intro').names).toEqual(['Luis', 'Bubs'])
    expect(find(buildWrapped(2026, base(), PARTNER), 'intro').names).toEqual(['Bubs', 'Luis'])
  })

  it('total counts repeats in the year and picks the busiest month, the earliest on a tie', () => {
    const data = base({ completions: [...completions, completion({ quest_id: 'fuji', done_on: '2026-07-15' })] })
    expect(find(buildWrapped(2026, data, ME), 'total')).toMatchObject({ total: 4, busiestMonth: 'Março', busiestCount: 2 })
  })

  it('categories show the top three, most completed first', () => {
    const tokyo = quest({ id: 'tokyo', category_id: CATS.viagem.id })
    const data = base({
      quests: [batata, matrix, fuji, japao, tokyo],
      completions: [...completions, completion({ quest_id: 'tokyo', done_on: '2026-05-01' }), completion({ quest_id: 'batata', done_on: '2026-08-01' })],
    })
    const top = find(buildWrapped(2026, data, ME), 'categories').top
    expect(top).toHaveLength(3)
    expect(top[0]).toMatchObject({ category: { name: 'Restaurante' }, count: 2 })
  })

  it('hardest is the most difficult quest done in the year, the most recent on a tie', () => {
    expect(find(buildWrapped(2026, base(), ME), 'hardest').item.quest.id).toBe('fuji')
  })

  it('best and disagreement come from the ratings, with the photo or the poster as their image', () => {
    const slides = buildWrapped(2026, rated(), ME)
    expect(kinds(slides)).toEqual(['intro', 'total', 'categories', 'hardest', 'best', 'disagree', 'album', 'outro'])
    expect(find(slides, 'best')).toMatchObject({ item: { quest: { id: 'batata' } }, image: { path: 'batata.jpg' } })
    expect(find(slides, 'disagree')).toMatchObject({
      item: { quest: { id: 'matrix' } },
      image: { url: 'https://image.tmdb.org/matrix.jpg' },
      ratings: [{ name: 'Luis', rating: 5 }, { name: 'Bubs', rating: 2 }],
    })
  })

  it('skips the disagreement when they always agree', () => {
    const data = base({ reviews: [review({ completion_id: 'c1', user_id: ME, rating: 4 }), review({ completion_id: 'c1', user_id: PARTNER, rating: 4 })] })
    expect(kinds(buildWrapped(2026, data, ME))).toContain('best')
    expect(kinds(buildWrapped(2026, data, ME))).not.toContain('disagree')
  })

  it('medals and album appear when the year has them', () => {
    const data = base({
      reviews: [review({ id: 'r1', completion_id: 'c1', user_id: ME, rating: 5 })],
      photos: [photo({ review_id: 'r1' }), photo({ review_id: 'r1' })],
      achievements: [achievement({ name: 'Aurora boreal', kind: 'manual', rule_count: null, manual_unlocked_on: '2026-05-01' })],
    })
    const slides = buildWrapped(2026, data, ME)
    expect(find(slides, 'medals').unlocked.map((s) => s.achievement.name)).toEqual(['Aurora boreal'])
    expect(find(slides, 'album').photos).toHaveLength(2)
  })

  it('the outro counts top-level quests still pending', () => {
    expect(find(buildWrapped(2026, base(), ME), 'outro')).toEqual({ kind: 'outro', next: 2027, pending: 1 })
  })
})

describe('storyCard', () => {
  it('turns each slide into the text of its story', () => {
    const slides = buildWrapped(2026, rated(), ME)
    expect(storyCard(find(slides, 'intro'))).toEqual({ eyebrow: 'Retrospectiva', big: '2026', caption: 'Luis & Bubs', image: null })
    expect(storyCard(find(slides, 'total'))).toMatchObject({ big: '3 quests', caption: 'Março foi o mês mais movimentado (2)' })
    expect(storyCard(find(slides, 'hardest'))).toMatchObject({ eyebrow: 'A mais difícil', big: 'Monte Fuji', caption: 'Difícil · 01/07/2026' })
    expect(storyCard(find(slides, 'best'))).toMatchObject({ big: 'Batata do Marechal', caption: 'Nota 5 de 5', image: { path: 'batata.jpg' } })
    expect(storyCard(find(slides, 'disagree'))).toMatchObject({ caption: 'Luis deu 5, Bubs deu 2', image: { url: 'https://image.tmdb.org/matrix.jpg' } })
    expect(storyCard(find(slides, 'album'))).toMatchObject({ big: '1 foto', image: { path: 'batata.jpg' } })
    expect(storyCard(find(slides, 'outro'))).toMatchObject({ eyebrow: 'Bora pra 2027', big: '1 quest' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/wrapped.test.ts`
Expected: FAIL. O import falha porque o módulo `./wrapped` ainda não existe.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/wrapped.ts
import { evaluateAchievements, type AchievementStatus } from './achievements'
import { formatDate } from './dates'
import { DIFFICULTIES, DIFFICULTY_LABEL } from './difficulty'
import { buildReport, yearPeriod, type TimelineItem } from './report'
import type { ImageRef, StoryCard } from './story'
import { doneQuestIds } from './tree'
import type { AppData, Category, Photo } from './types'

export type Slide =
  | { kind: 'intro'; year: number; names: string[] }
  | { kind: 'total'; total: number; busiestMonth: string; busiestCount: number }
  | { kind: 'categories'; top: { category: Category; count: number }[] }
  | { kind: 'hardest'; item: TimelineItem; image: ImageRef | null }
  | { kind: 'best'; item: TimelineItem; image: ImageRef | null }
  | { kind: 'disagree'; item: TimelineItem; image: ImageRef | null; ratings: { name: string; rating: number }[] }
  | { kind: 'medals'; unlocked: AchievementStatus[] }
  | { kind: 'album'; photos: Photo[] }
  | { kind: 'outro'; next: number; pending: number }

const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const rank = (i: TimelineItem) => DIFFICULTIES.indexOf(i.quest.difficulty)
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// The year's slides in order; slides without data are left out. Empty when the year has no completions.
export function buildWrapped(year: number, data: AppData, me: string): Slide[] {
  const report = buildReport(yearPeriod(year), data, evaluateAchievements(data.achievements, data.quests, data.completions))
  if (report.total === 0) return []
  const { timeline } = report // most recent first
  const nameOf = (id: string) => data.profiles.find((p) => p.id === id)?.display_name ?? '?'
  const names = [...data.profiles].sort((a, b) => Number(b.id === me) - Number(a.id === me)).map((p) => p.display_name)

  const perMonth = Array.from({ length: 12 }, () => 0)
  for (const i of timeline) perMonth[Number(i.completion.done_on.slice(5, 7)) - 1]++
  const busiest = perMonth.indexOf(Math.max(...perMonth)) // indexOf: the earliest month wins a tie

  const imageOf = (i: TimelineItem): ImageRef | null => {
    const reviewIds = new Set(i.ratings.map((r) => r.id))
    const photo =
      data.photos.find((p) => p.review_id !== null && reviewIds.has(p.review_id)) ?? data.photos.find((p) => p.quest_id === i.quest.id)
    if (photo) return { path: photo.storage_path }
    const poster = data.media.find((m) => m.id === i.quest.media_id)?.poster_url
    return poster ? { url: poster } : null
  }

  const hardest = timeline.reduce((a, b) => (rank(b) > rank(a) ? b : a))
  let disagree: { item: TimelineItem; diff: number } | null = null
  for (const item of timeline) {
    if (new Set(item.ratings.map((r) => r.user_id)).size < 2) continue
    const values = item.ratings.map((r) => r.rating)
    const diff = Math.max(...values) - Math.min(...values)
    if (diff > (disagree?.diff ?? 0)) disagree = { item, diff }
  }
  const best = report.best[0]
  const done = doneQuestIds(data.completions)

  const slides: (Slide | null)[] = [
    { kind: 'intro', year, names },
    { kind: 'total', total: report.total, busiestMonth: capitalize(MONTH.format(Date.UTC(year, busiest, 1))), busiestCount: perMonth[busiest] },
    report.byCategory.length ? { kind: 'categories', top: report.byCategory.slice(0, 3) } : null,
    { kind: 'hardest', item: hardest, image: imageOf(hardest) },
    best ? { kind: 'best', item: best, image: imageOf(best) } : null,
    disagree
      ? {
          kind: 'disagree',
          item: disagree.item,
          image: imageOf(disagree.item),
          ratings: [...disagree.item.ratings].sort((a, b) => b.rating - a.rating).map((r) => ({ name: nameOf(r.user_id), rating: r.rating })),
        }
      : null,
    report.unlocked.length ? { kind: 'medals', unlocked: report.unlocked } : null,
    report.photos.length ? { kind: 'album', photos: report.photos } : null,
    { kind: 'outro', next: year + 1, pending: data.quests.filter((q) => q.parent_id === null && !done.has(q.id)).length },
  ]
  return slides.filter((s): s is Slide => s !== null)
}

export function storyCard(slide: Slide): StoryCard {
  switch (slide.kind) {
    case 'intro':
      return { eyebrow: 'Retrospectiva', big: String(slide.year), caption: slide.names.join(' & '), image: null }
    case 'total':
      return {
        eyebrow: 'No ano, vocês concluíram',
        big: count(slide.total, 'quest', 'quests'),
        caption: `${slide.busiestMonth} foi o mês mais movimentado (${slide.busiestCount})`,
        image: null,
      }
    case 'categories':
      return {
        eyebrow: 'Categoria favorita',
        big: slide.top[0].category.name,
        caption: slide.top.map((t) => `${t.category.name}: ${t.count}`).join(' · '),
        image: null,
      }
    case 'hardest':
      return {
        eyebrow: 'A mais difícil',
        big: slide.item.quest.title,
        caption: `${DIFFICULTY_LABEL[slide.item.quest.difficulty]} · ${formatDate(slide.item.completion.done_on)}`,
        image: slide.image,
      }
    case 'best':
      return {
        eyebrow: 'Melhor momento',
        big: slide.item.quest.title,
        caption: `Nota ${slide.item.average!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 5`,
        image: slide.image,
      }
    case 'disagree':
      return { eyebrow: 'Discordância', big: slide.item.quest.title, caption: slide.ratings.map((r) => `${r.name} deu ${r.rating}`).join(', '), image: slide.image }
    case 'medals':
      return {
        eyebrow: 'Conquistas do ano',
        big: count(slide.unlocked.length, 'medalha', 'medalhas'),
        caption: slide.unlocked.map((s) => s.achievement.name).join(' · '),
        image: null,
      }
    case 'album':
      return { eyebrow: 'Álbum do ano', big: count(slide.photos.length, 'foto', 'fotos'), caption: 'Os nossos momentos', image: { path: slide.photos[0].storage_path } }
    case 'outro':
      return { eyebrow: `Bora pra ${slide.next}`, big: count(slide.pending, 'quest', 'quests'), caption: 'esperando por vocês', image: null }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/wrapped.test.ts`
Expected: PASS (11 testes).

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: sem erros.

```bash
git add src/lib/wrapped.ts src/lib/wrapped.test.ts
git commit -m "feat(retrospectiva): build the year's slides and their story cards"
```

---

### Task 3: A tela da retrospectiva (`/retrospectiva/:year`)

**Files:**
- Create: `src/pages/WrappedPage.tsx`
- Modify: `src/routes.tsx` (nova rota irmã do `Layout`)
- Modify: `src/index.css` (animações `.story-fill`, `.bar-grow`, `.medal-spin` + reduzir movimento)
- Test: `src/pages/WrappedPage.test.tsx`

**Interfaces:**
- Consumes:
  - `buildWrapped`, `storyCard` e `Slide` (Task 2);
  - `drawStory`, `shareOrDownload` e `ImageRef` (Task 1);
  - os componentes existentes `Stagger`, `CountUp`, `Bubble`, `Gems`, `Icon`, `Stars`, `PageLoading`, `LoadError` e `SkyScene` (com a prop `moon`);
  - os hooks `useAppData`, `useSignedUrls` e `useUserId`.
- Produces: `export default function WrappedPage()`. A rota `/retrospectiva/:year` é usada pelo botão da Task 4.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/pages/WrappedPage.test.tsx
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import * as story from '../lib/story'
import { CATS, ME, PARTNER, allCats, appData, completion, media, quest, review } from '../test/fixtures'
import { renderRoute } from '../test/render'
import WrappedPage from './WrappedPage'

vi.mock('../data/api')
vi.mock('../components/SkyScene', () => ({ default: () => null }))
vi.mock('../lib/story', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/story')>()),
  drawStory: vi.fn(),
  shareOrDownload: vi.fn(),
}))

const batata = quest({ id: 'batata', title: 'Batata do Marechal', category_id: CATS.restaurante.id, difficulty: 'hard', media_id: 'm1' })
const poster = media({ id: 'm1', poster_url: 'https://image.tmdb.org/batata.jpg' })
const routes = [
  { path: '/retrospectiva/:year', element: <WrappedPage /> },
  { path: '/relatorio', element: <p>relatório</p> },
]
const open = (year = '2026') => renderRoute(routes, `/retrospectiva/${year}`)
const intro = () => screen.findByRole('heading', { level: 2, name: '2026' })

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({
      categories: allCats(),
      media: [poster],
      quests: [batata],
      completions: [completion({ id: 'c1', quest_id: 'batata', done_on: '2026-03-10' })],
      reviews: [review({ completion_id: 'c1', user_id: ME, rating: 5 }), review({ completion_id: 'c1', user_id: PARTNER, rating: 2 })],
    }),
  )
  vi.mocked(story.drawStory).mockResolvedValue(new Blob(['png']))
  vi.mocked(story.shareOrDownload).mockResolvedValue()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('opens on the intro and steps forward and back', async () => {
  const user = userEvent.setup()
  open()
  expect(await intro()).toBeInTheDocument()
  expect(screen.getByText('de Luis & Bubs')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Próxima' }))
  expect(screen.getByText('No ano, vocês concluíram')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Anterior' }))
  expect(await intro()).toBeInTheDocument()
})

it('arrow keys navigate and Escape goes back to the report', async () => {
  const router = open()
  await intro()
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  expect(screen.getByText('No ano, vocês concluíram')).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'Escape' })
  await waitFor(() => expect(router.state.location.pathname).toBe('/relatorio'))
})

it('Fechar goes back to the report', async () => {
  const user = userEvent.setup()
  const router = open()
  await intro()
  await user.click(screen.getByRole('button', { name: 'Fechar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/relatorio'))
})

it('sharing draws the current slide and stays on it', async () => {
  const user = userEvent.setup()
  open()
  await intro()
  await user.click(screen.getByRole('button', { name: 'Próxima' }))
  await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
  expect(story.drawStory).toHaveBeenCalledWith(expect.objectContaining({ big: '1 quest' }), 2026, null)
  expect(story.shareOrDownload).toHaveBeenCalledWith(expect.any(Blob), 'bubs2do-2026-total.png')
  expect(screen.getByText('No ano, vocês concluíram')).toBeInTheDocument()
})

it('a failed share shows a message and frees the button', async () => {
  vi.mocked(story.drawStory).mockRejectedValue(new Error('canvas'))
  const user = userEvent.setup()
  open()
  await intro()
  await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não deu para gerar a imagem.')
  expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeEnabled()
})

it('a cover that fails to load is hidden', async () => {
  const user = userEvent.setup()
  open()
  await intro()
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Próxima' }))
  expect(screen.getByText('A mais difícil')).toBeInTheDocument()
  const cover = document.querySelector<HTMLImageElement>('img[src="https://image.tmdb.org/batata.jpg"]')!
  fireEvent.error(cover)
  expect(cover).not.toBeVisible()
})

it('with reduced motion the slides never advance on their own', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  open()
  await intro()
  act(() => {
    vi.advanceTimersByTime(7000)
  })
  expect(screen.getByRole('heading', { level: 2, name: '2026' })).toBeInTheDocument()
})

it('with motion on, a slide advances after 6 seconds', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.useFakeTimers({ shouldAdvanceTime: true })
  open()
  await intro()
  act(() => {
    vi.advanceTimersByTime(6100)
  })
  expect(screen.getByText('No ano, vocês concluíram')).toBeInTheDocument()
})

it('an invalid year or a year without completions goes back to the report', async () => {
  const router = open('2025')
  await waitFor(() => expect(router.state.location.pathname).toBe('/relatorio'))
  const other = open('abc')
  await waitFor(() => expect(other.state.location.pathname).toBe('/relatorio'))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/WrappedPage.test.tsx`
Expected: FAIL. O import falha porque `./WrappedPage` ainda não existe.

- [ ] **Step 3: Write the page**

```tsx
// src/pages/WrappedPage.tsx
import { Share2, Star, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import Bubble from '../components/Bubble'
import CountUp from '../components/CountUp'
import Gems from '../components/Gems'
import Icon from '../components/Icon'
import Stagger from '../components/Stagger'
import Stars from '../components/Stars'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { formatDate } from '../lib/dates'
import { prefersReducedMotion } from '../lib/motion'
import { drawStory, shareOrDownload, type ImageRef } from '../lib/story'
import { buildWrapped, storyCard, type Slide } from '../lib/wrapped'

const SkyScene = lazy(() => import('../components/SkyScene'))
const SLIDE_MS = 6000 // same as the .story-fill animation in index.css

export default function WrappedPage() {
  const { year: param = '' } = useParams()
  const q = useAppData()
  const me = useUserId()
  if (q.error) return <Night><LoadError retry={() => q.refetch()} /></Night>
  if (!q.data) return <Night><PageLoading /></Night>
  const year = /^\d{4}$/.test(param) ? Number(param) : NaN
  const slides = Number.isNaN(year) ? [] : buildWrapped(year, q.data, me)
  if (slides.length === 0) return <Navigate to="/relatorio" replace />
  return <Stories year={year} slides={slides} />
}

// Loading and error heroes use white text: give them the night background outside the Layout.
function Night({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 overflow-y-auto bg-night px-4">{children}</div>
}

const pathsOf = (s: Slide): string[] => {
  if (s.kind === 'album') return s.photos.slice(0, 9).map((p) => p.storage_path)
  if ('image' in s && s.image && 'path' in s.image) return [s.image.path]
  return []
}

function Stories({ year, slides }: { year: number; slides: Slide[] }) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [animated] = useState(() => !prefersReducedMotion())
  const last = slides.length - 1
  const slide = slides[index]
  const urls = useSignedUrls(slides.flatMap(pathsOf)).data ?? {}
  const src = (ref: ImageRef | null) => (!ref ? null : 'url' in ref ? ref.url : (urls[ref.path] ?? null))
  const go = (delta: number) => setIndex((i) => Math.min(last, Math.max(0, i + delta)))
  const close = () => navigate('/relatorio')

  useEffect(() => {
    if (!animated || sharing || index === last) return
    const timer = setTimeout(() => go(1), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, sharing, animated, last])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function share() {
    setSharing(true)
    setFailed(false)
    try {
      const card = storyCard(slide)
      await shareOrDownload(await drawStory(card, year, src(card.image)), `bubs2do-${year}-${slide.kind}.png`)
    } catch {
      setFailed(true)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-night text-white">
      <div aria-hidden className="sky-static absolute inset-0" />
      {animated && (
        <Suspense fallback={null}>
          <SkyScene boltEvery={[9000, 18000]} moon="small" />
        </Suspense>
      )}
      <div className="relative mx-auto flex h-full max-w-md flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div aria-hidden className="flex gap-1">
          {slides.map((s, i) => (
            <span key={s.kind} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <span className={`block h-full rounded-full bg-white ${i < index ? 'w-full' : i > index ? 'w-0' : animated && i < last ? 'story-fill' : 'w-full'}`} />
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold text-white/90">Retrospectiva {year}</h1>
          <button type="button" aria-label="Fechar" onClick={close} className="grid size-11 place-items-center rounded-full hover:bg-white/10">
            <X aria-hidden className="size-6" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <section key={index} aria-roledescription="slide" aria-label={`${index + 1} de ${slides.length}`} className="absolute inset-0 overflow-y-auto">
            <SlideView slide={slide} cover={'image' in slide ? src(slide.image) : null} urls={urls} />
          </section>
          <button type="button" aria-label="Anterior" disabled={index === 0} onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/3 cursor-default" />
          <button type="button" aria-label="Próxima" disabled={index === last} onClick={() => go(1)} className="absolute inset-y-0 right-0 w-2/3 cursor-default" />
        </div>
        {failed && <p role="alert" className="text-center text-sm font-semibold text-rose-200">Não deu para gerar a imagem.</p>}
        <button type="button" className="btn btn-primary min-h-12" disabled={sharing} onClick={share}>
          <Share2 aria-hidden className="size-5" /> {sharing ? 'Gerando…' : 'Compartilhar'}
        </button>
      </div>
    </div>
  )
}

function SlideView({ slide, cover, urls }: { slide: Slide; cover: string | null; urls: Record<string, string> }) {
  return (
    <Stagger className="flex min-h-full flex-col items-center justify-center gap-4 py-6 text-center">
      <p className="text-sm font-extrabold uppercase tracking-widest text-blush">{storyCard(slide).eyebrow}</p>
      {cover && (
        <img
          src={cover}
          alt=""
          className="max-h-64 w-56 rounded-3xl object-cover shadow-2xl"
          onError={(e) => {
            e.currentTarget.hidden = true
          }}
        />
      )}
      <Body slide={slide} urls={urls} />
    </Stagger>
  )
}

const title = 'break-words font-display text-4xl font-bold leading-tight'

function Body({ slide, urls }: { slide: Slide; urls: Record<string, string> }) {
  switch (slide.kind) {
    case 'intro':
      return (
        <>
          <h2 className="font-display text-8xl font-bold">{slide.year}</h2>
          <p className="font-display text-2xl font-semibold text-white/90">de {slide.names.join(' & ')}</p>
        </>
      )
    case 'total':
      return (
        <>
          <h2 className="font-display text-8xl font-bold"><CountUp value={slide.total} /></h2>
          <p className="text-xl font-bold">{slide.total === 1 ? 'quest' : 'quests'}</p>
          <p className="text-white/80">{slide.busiestMonth} foi o mês mais movimentado ({slide.busiestCount})</p>
        </>
      )
    case 'categories': {
      const top = slide.top[0]
      return (
        <>
          <Bubble icon={top.category.icon} color={top.category.color} size="lg" />
          <h2 className={title}>{top.category.name}</h2>
          <ul className="w-full max-w-xs space-y-3 text-left">
            {slide.top.map(({ category, count }) => (
              <li key={category.id} className="space-y-1">
                <p className="flex justify-between gap-3 text-sm font-bold"><span className="break-words">{category.name}</span><span>{count}</span></p>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                  <div className="bar-grow h-full rounded-full" style={{ width: `${(count / top.count) * 100}%`, background: category.color }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )
    }
    case 'hardest':
      return (
        <>
          <h2 className={title}>{slide.item.quest.title}</h2>
          <Gems difficulty={slide.item.quest.difficulty} onDark />
          <p className="text-white/80">{formatDate(slide.item.completion.done_on)}</p>
        </>
      )
    case 'best':
      return (
        <>
          <h2 className={title}>{slide.item.quest.title}</h2>
          <p className="inline-flex items-center gap-2 font-display text-3xl font-bold text-blush">
            <Star aria-hidden className="size-7 fill-current" /> {slide.item.average!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </p>
        </>
      )
    case 'disagree':
      return (
        <>
          <h2 className={title}>{slide.item.quest.title}</h2>
          <ul className="space-y-2">
            {slide.ratings.map((r) => (
              <li key={r.name} className="flex items-center justify-center gap-3 font-semibold">
                <span>{r.name} deu {r.rating}</span>
                <Stars value={r.rating} />
              </li>
            ))}
          </ul>
        </>
      )
    case 'medals':
      return (
        <>
          <h2 className="font-display text-7xl font-bold"><CountUp value={slide.unlocked.length} /></h2>
          <p className="text-xl font-bold">{slide.unlocked.length === 1 ? 'medalha' : 'medalhas'}</p>
          <ul className="flex flex-wrap justify-center gap-4">
            {slide.unlocked.slice(0, 6).map(({ achievement: a }) => (
              <li key={a.id} className={`medal-${a.rarity} flex w-24 flex-col items-center gap-2 [perspective:600px]`}>
                <span className="medallion medal-spin size-16"><Icon name={a.icon} className="size-7" /></span>
                <span className="text-xs font-bold leading-tight">{a.name}</span>
              </li>
            ))}
          </ul>
        </>
      )
    case 'album':
      return (
        <>
          <ul className="grid w-full max-w-xs grid-cols-3 gap-2">
            {slide.photos.slice(0, 9).map((p) => (
              <li key={p.id}><img src={urls[p.storage_path]} alt="" className="aspect-square w-full rounded-xl bg-white/10 object-cover" /></li>
            ))}
          </ul>
          <h2 className="font-display text-4xl font-bold">{slide.photos.length} {slide.photos.length === 1 ? 'foto' : 'fotos'}</h2>
        </>
      )
    case 'outro':
      return (
        <>
          <h2 className="font-display text-8xl font-bold"><CountUp value={slide.pending} /></h2>
          <p className="text-xl font-bold">{slide.pending === 1 ? 'quest esperando' : 'quests esperando'} por vocês</p>
        </>
      )
  }
}
```

- [ ] **Step 4: Add the route**

In `src/routes.tsx`, add the import in alphabetical order with the other pages:

```tsx
import WrappedPage from './pages/WrappedPage'
```

Then add the route as a sibling of the `Layout` entry (tela cheia, sem menu):

```tsx
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      // …(as rotas existentes, sem mudança)
    ],
  },
  { path: '/retrospectiva/:year', element: <WrappedPage /> },
]
```

- [ ] **Step 5: Add the CSS animations**

Append at the end of `src/index.css`:

```css
/* Retrospectiva: story progress (6s = SLIDE_MS in WrappedPage), category bars, medals */
@keyframes story-fill { from { width: 0; } to { width: 100%; } }
.story-fill { width: 100%; animation: story-fill 6s linear both; }
@keyframes bar-grow { from { transform: scaleX(0); } }
.bar-grow { transform-origin: left; animation: bar-grow 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both; }
@keyframes medal-spin { from { transform: rotateY(180deg) scale(0.4); } }
.medal-spin { animation: medal-spin 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }
@media (prefers-reduced-motion: reduce) {
  .story-fill, .bar-grow, .medal-spin { animation: none; }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/pages/WrappedPage.test.tsx`
Expected: PASS (9 testes).

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros. O `src/design.test.ts` continua passando, porque a página não usa `text-ink/` abaixo de 60.

- [ ] **Step 8: Commit**

```bash
git add src/pages/WrappedPage.tsx src/pages/WrappedPage.test.tsx src/routes.tsx src/index.css
git commit -m "feat(retrospectiva): full-screen story slides with sky, tap/keyboard navigation, auto-advance and share"
```

---

### Task 4: Botão "Retrospectiva {ano}" no Relatório

**Files:**
- Modify: `src/pages/ReportPage.tsx` (import `Sparkles` e o `actions` do `PageHero`)
- Test: `src/pages/ReportPage.test.tsx`

**Interfaces:**
- Consumes: a rota `/retrospectiva/:year` (Task 3) e o `PageHero.actions` existente.
- Produces: nada consumido depois.

- [ ] **Step 1: Write the failing test**

Append to `src/pages/ReportPage.test.tsx`:

```tsx
it('offers the year retrospective only for a year with completions', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({ categories: allCats(), quests: [batata], completions: [completion({ quest_id: 'batata', done_on: '2026-03-02' })] }),
  )
  const user = userEvent.setup()
  open()
  await screen.findByRole('tab', { name: 'Ano' })
  expect(screen.queryByRole('link', { name: /Retrospectiva/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Ano' }))
  expect(screen.getByRole('link', { name: 'Retrospectiva 2026' })).toHaveAttribute('href', '/retrospectiva/2026')
  await user.click(screen.getByRole('button', { name: 'Período anterior' }))
  expect(screen.queryByRole('link', { name: /Retrospectiva/ })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/ReportPage.test.tsx -t "retrospective"`
Expected: FAIL. O link "Retrospectiva 2026" não é encontrado.

- [ ] **Step 3: Add the button**

In `src/pages/ReportPage.tsx`:
- Change the lucide import to `import { ChevronLeft, ChevronRight, Sparkles, Star } from 'lucide-react'`.
- Replace `<PageHero title="Relatório">` with:

```tsx
      <PageHero
        title="Relatório"
        actions={
          period.kind === 'year' && report.total > 0 ? (
            <Link to={`/retrospectiva/${period.year}`} className="btn btn-primary">
              <Sparkles aria-hidden className="size-5" /> Retrospectiva {period.year}
            </Link>
          ) : undefined
        }
      >
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/ReportPage.test.tsx`
Expected: PASS, todos os testes do arquivo.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ReportPage.tsx src/pages/ReportPage.test.tsx
git commit -m "feat(retrospectiva): entry button on the report for a year with completions"
```

---

### Task 5: Conferência visual e verificação final

**Files:**
- Modify: `scripts/shot.mjs`, com três flags:
  - `--click` também casa pelo `aria-label`, aceita repetição e vários passos separados por vírgula, como em `Próxima*3,Compartilhar`;
  - `--eval=<js>` roda um código antes dos cliques;
  - `--downloads=<dir>` permite downloads.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 4, através do preview `preview.html?url=/retrospectiva/2026`. Os dados de exemplo têm conclusões e notas dos dois em 2026.
- Produces: prints no scratchpad e eventuais correções de layout.

- [ ] **Step 1: Extend the screenshot script**

In `scripts/shot.mjs`:
1. Update the usage comment to include `[--eval=<js>] [--click=<label>[*N][,<label>[*N]…]] [--downloads=<dir>]`.
2. Right before `await call('Page.navigate', { url })`, add:

```js
const downloads = [...flags].find((f) => f.startsWith('--downloads='))?.slice(12)
if (downloads) await call('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
```

3. Replace the existing `--click` block with:

```js
const evaluate = [...flags].find((f) => f.startsWith('--eval='))?.slice(7)
if (evaluate) await call('Runtime.evaluate', { expression: evaluate })
const click = [...flags].find((f) => f.startsWith('--click='))?.slice(8)
if (click) {
  for (const step of click.split(',')) {
    const [label, times = '1'] = step.split('*')
    for (let i = 0; i < +times; i++) {
      await call('Runtime.evaluate', {
        expression: `[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === ${JSON.stringify(label)} || b.textContent.includes(${JSON.stringify(label)}))?.click()`,
      })
      await sleep(700)
    }
  }
  await sleep(1500)
}
```

- [ ] **Step 2: Print every slide at 390px (reduced motion = deterministic)**

Run, with `D` = the session scratchpad `…/scratchpad/wrapped` (create it) and `B="http://localhost:5173/preview.html?url="`. The dev server must be running.

```bash
for n in 0 1 2 3 4 5 6 7 8; do node scripts/shot.mjs "${B}/retrospectiva/2026" $D/slide-$n.png 390 844 3000 --reduce "--click=Próxima*$n"; done
```

Expected:
- Read each PNG. White text over the night sky.
- Nothing cut off.
- "Compartilhar" visible at the bottom.
- Long titles wrap.
- The progress segments are full up to the current slide.
- Slides that don't exist in the sample data repeat the last one; that's fine.

- [ ] **Step 3: Print the animated version and the desktop**

```bash
node scripts/shot.mjs "${B}/retrospectiva/2026" $D/anim-390.png 390 844 4000
node scripts/shot.mjs "${B}/retrospectiva/2026" $D/desk-1280.png 1280 800 4000 "--click=Próxima*2"
node scripts/shot.mjs "${B}/relatorio" $D/report-year.png 390 844 3000 --click=Ano
```

Expected:
- O céu 3D aparece atrás.
- No desktop, a coluna fica centralizada (`max-w-md`).
- O Relatório no período Ano mostra o botão "Retrospectiva 2026".

- [ ] **Step 4: Generate the story PNG (forces the download path)**

Use the absolute Windows path of `$D` for `--downloads`:

```bash
node scripts/shot.mjs "${B}/retrospectiva/2026" $D/share-intro.png 390 844 3000 --reduce "--downloads=<windows path of D>" "--eval=navigator.canShare = undefined" --click=Compartilhar
node scripts/shot.mjs "${B}/retrospectiva/2026" $D/share-hardest.png 390 844 3000 --reduce "--downloads=<windows path of D>" "--eval=navigator.canShare = undefined" "--click=Próxima*3,Compartilhar"
```

Expected:
- `bubs2do-2026-*.png` (1080×1920) aparece em `$D`.
- Ao ler o arquivo: céu com estrelas, eyebrow, título, legenda, onda clara e rodapé "Bubs2Do · 2026".
- Nenhum texto sobreposto à onda.

- [ ] **Step 5: Fix what the prints show**

Para cada problema visual, ajuste as classes em `WrappedPage.tsx` ou as coordenadas em `drawStory` e repita o print. Registre cada ajuste no ledger como `Ruling:`.

- [ ] **Step 6: Final verification**

Run: `npx vitest run && npm run typecheck && npm run build && ls dist/preview.html`
Expected:
- Todos os testes passando e typecheck limpo.
- O build termina com sucesso, com o three.js ainda num chunk separado.
- O `ls` falha com "No such file", ou seja, o preview não vai para produção.

- [ ] **Step 7: Commit**

```bash
git add scripts/shot.mjs src
git commit -m "chore(retrospectiva): screenshot flags for slides and story export; visual fixes"
```
