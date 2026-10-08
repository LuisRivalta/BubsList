# Atualização, Local, sorteio em Todas, agenda e mapa — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As cinco melhorias do spec:
- aviso de versão nova;
- acertos no campo Local;
- sorteio sempre em "Todas";
- agenda com Próximas e "Adicionar ao calendário";
- aba Mapa.

**Architecture:**
- **Lógica:** fica em módulos puros de `src/lib` (`schedule.ts`, `map.ts`), testados à parte.
- **Calendário:** é uma função da Vercel autocontida em `api/calendario.ts`, com o gerador ICS dentro do mesmo arquivo. Assim não há import relativo em ESM no runtime da Vercel.
- **Mapa:** o Leaflet entra só num componente carregado com `lazy`. O cartão do alfinete é React.
- **Atualização:** o aviso usa `useRegisterSW` do vite-plugin-pwa no `Layout`.

**Tech Stack:** React 19, TS strict, Vite 7, vite-plugin-pwa, Vitest + Testing Library, Supabase, Leaflet 1.9 (novo).

**Spec:** `docs/superpowers/specs/2026-10-08-bubs2do-agenda-mapa-design.md`

## Global Constraints

- **Repositório:**
  - tudo direto na `main`, sem branch;
  - commits **sem** `Co-Authored-By` e sem atribuição ao Claude;
  - **não dar push**.
- **Banco:**
  - nunca usar as ferramentas `mcp__supabase__*`;
  - a migração é rodada pelo usuário no SQL Editor **antes** do push.
- **Textos:**
  - em pt-BR;
  - sem emoji (`src/no-emoji.test.ts`);
  - `text-ink` com opacidade ≥ 60 (`src/design.test.ts`).
- **Nominatim:** nada de busca enquanto digita, como já está.
- **Mapa:** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, crédito "© OpenStreetMap" com link para `https://www.openstreetmap.org/copyright`.
- **Calendário:**
  - `GET /api/calendario?t=&d=&h=&l=&id=`, com `h` e `l` opcionais;
  - `400` para data ou horário inválido;
  - `Content-Type: text/calendar; charset=utf-8`.
- **Comando de teste da suíte:** `npx vitest run > <workspace>/vitest.log 2>&1; tail -5 <workspace>/vitest.log`. Typecheck: `npm run typecheck`.

## Review Focus

1. **Busca do Local:** o timer de 10 s dispara depois que a pessoa já digitou de novo ou escolheu um lugar. Não pode aparecer erro falso (teste na Task 2).
2. **Atualização sem internet:** `registration.update()` rejeita offline. Isso não pode virar o aviso "Não deu para salvar", que ouve `unhandledrejection` (teste na Task 3).
3. **Agenda:**
   - editar uma quest agendada e apagar a data precisa mandar `scheduled_time: null`, senão a constraint do banco recusa;
   - um horário sem data nunca é enviado (teste na Task 5).
4. **Calendário:** título com vírgula, ponto e vírgula, acento e quebra de linha, e título longo. Tem que sair escapado e dobrado sem partir caractere (teste na Task 6).
5. **Mapa:** os painéis do Leaflet (z-index 400–1000) não podem passar por cima da barra do menu (z-30) ao rolar. O contêiner do mapa usa `isolate` (conferido no screenshot da Task 8).

---

### Task 1: Sorteio sempre abre em "Todas"

**Files:**
- Modify: `src/components/DrawDialog.tsx` (assinatura e estado inicial)
- Modify: `src/components/QuestActions.tsx:25`
- Test: `src/pages/CategoryPage.test.tsx`, `src/components/DrawDialog.test.tsx`

**Interfaces:**
- Produces: `DrawDialog({ data, onClose }: { data: AppData; onClose: () => void })`, sem `categoryId`.

- [ ] **Step 1: Teste que falha.** Acrescentar ao fim de `src/pages/CategoryPage.test.tsx`:

```tsx
it('the draw opens on Todas even from a category page', async () => {
  const user = userEvent.setup()
  open('cat-viagem')
  await user.click(await screen.findByRole('button', { name: 'Sortear' }))
  const dialog = screen.getByRole('dialog', { name: 'Sorteio' })
  expect(within(dialog).getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(dialog).getByRole('button', { name: 'Viagem' })).toHaveAttribute('aria-pressed', 'false')
})
```

- [ ] **Step 2: Rodar.** `npx vitest run src/pages/CategoryPage.test.tsx`
Expected: FAIL. "Todas" vem com `aria-pressed="false"`, porque a página pré-marca Viagem.

- [ ] **Step 3: Implementar.**

Em `DrawDialog.tsx`:

```tsx
export default function DrawDialog({ data, onClose }: { data: AppData; onClose: () => void }) {
```

```tsx
  const [filter, setFilter] = useState<DrawFilter>({ categoryIds: [], typeIds: [], difficulties: [], places: [] })
```

Em `QuestActions.tsx`:

```tsx
      {drawing && <DrawDialog data={data} onClose={() => setDrawing(false)} />}
```

Em `DrawDialog.test.tsx`, o sorteio passa a abrir sempre em Todas, e os testes que começavam numa categoria passam a tocá-la:

```tsx
// The draw always opens on Todas; tests that start in a category tap it first.
const open = async (category?: string) => {
  render(<MemoryRouter><DrawDialog data={data} onClose={() => {}} /></MemoryRouter>)
  if (category) await userEvent.click(button(category))
}
```

- **Substituições no arquivo:**
  - `open(CATS.restaurante.id)` → `await open('Restaurante')`;
  - `open(CATS.filme.id)` → `await open('Filme')`;
  - `open()` → `await open()`.
- **Testes síncronos:** os que chamam `open` passam a ser `async` ("filter chips keep dark text…" e "difficulty chips show their gems").
- **Teste "Escape closes the draw":** o render passa a ser `<DrawDialog data={data} onClose={onClose} />`.
- **Primeiro teste:** vira:

```tsx
it('always opens on Todas and counts the pool live', async () => {
  const user = userEvent.setup()
  await open()
  expect(button('Todas')).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('4 quests no sorteio')).toBeInTheDocument()
  await user.click(button('Restaurante'))
  expect(screen.getByText('2 quests no sorteio')).toBeInTheDocument()
  await user.click(button('Fácil'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
})
```

- [ ] **Step 4: Rodar.** `npx vitest run src/pages/CategoryPage.test.tsx src/components/DrawDialog.test.tsx && npm run typecheck`
Expected: PASS, typecheck limpo.

- [ ] **Step 5: Commit.**

```bash
git add src/components/DrawDialog.tsx src/components/QuestActions.tsx src/components/DrawDialog.test.tsx src/pages/CategoryPage.test.tsx
git commit -m "fix(sorteio): always opens on Todas, whatever page it starts from"
```

---

### Task 2: Campo Local (tempo limite, anúncios, foco, nome enorme)

**Files:**
- Modify: `src/lib/place.ts` (`normalizePlace`)
- Modify: `src/components/PlaceField.tsx`
- Test: `src/lib/place.test.ts`, `src/pages/QuestFormPage.test.tsx`

**Interfaces:**
- Produces: `PLACE_SEARCH_TIMEOUT_MS = 10_000`, exportado de `PlaceField.tsx`. `normalizePlace` mantém a assinatura.

- [ ] **Step 1: Testes que falham.**

Em `src/lib/place.test.ts`, dentro do `describe` de `normalizePlace` (ou no fim do arquivo, se não houver `describe`):

```ts
it('cuts the parts at 80 characters and the label at 200, the database limits', () => {
  const long = (c: string) => c.repeat(120)
  const p = normalizePlace({ name: long('N'), lat: '1', lon: '2', address: { city: long('C'), state: long('S'), country: long('P') } })
  expect([p.city!.length, p.state!.length, p.country!.length]).toEqual([80, 80, 80])
  expect(p.label.length).toBeLessThanOrEqual(200)
  expect(p.label).not.toMatch(/[\s,]$/)
})
```

Em `src/pages/QuestFormPage.test.tsx`, adicionar `act` ao import de `@testing-library/react` e `afterEach` ao import de `vitest`, e acrescentar no fim:

```tsx
const saoPaulo = { city: null, state: 'São Paulo', country: 'Brasil', label: 'São Paulo, Brasil', lat: -22, lng: -48 }
const hanging = (_q: string, signal?: AbortSignal) =>
  new Promise<never>((_, reject) => signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))

afterEach(() => vi.useRealTimers())

async function searchRibeirao() {
  const user = userEvent.setup(vi.isFakeTimers() ? { advanceTimers: vi.advanceTimersByTime } : {})
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  return user
}

it('a search that never answers gives up after 10 s and says so', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  withTypes()
  vi.mocked(place.searchPlaces).mockImplementation(hanging)
  await searchRibeirao()
  expect(screen.getByText('Buscando…').closest('[role="status"]')).not.toBeNull()
  await act(() => vi.advanceTimersByTimeAsync(10_000))
  expect(screen.getByRole('alert')).toHaveTextContent('Não deu para buscar agora')
})

it('typing again during a search never ends in a false error', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  withTypes()
  vi.mocked(place.searchPlaces).mockImplementation(hanging)
  const user = await searchRibeirao()
  await user.type(screen.getByLabelText(/Local/), ' Preto')
  await act(() => vi.advanceTimersByTimeAsync(10_000))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('screen readers hear how many places came back', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao, saoPaulo])
  await searchRibeirao()
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 lugares encontrados'))
})

it('picking a place moves the focus to Limpar local, and clearing brings it back to the field', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao])
  const user = await searchRibeirao()
  await user.click(await screen.findByRole('button', { name: 'Ribeirão Preto, São Paulo, Brasil' }))
  expect(screen.getByRole('button', { name: 'Limpar local' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Limpar local' }))
  expect(screen.getByLabelText(/Local/)).toHaveFocus()
})
```

- [ ] **Step 2: Rodar.** `npx vitest run src/lib/place.test.ts src/pages/QuestFormPage.test.tsx`
Expected: FAIL nos 5 testes novos:
- `city` com 120 caracteres;
- sem alerta depois de 10 s;
- "typing again…" passa (já é o comportamento: ele guarda contra regressão);
- sem `role="status"`;
- foco no `body`.

- [ ] **Step 3: Implementar.**

Em `src/lib/place.ts`:

```ts
// Database limits: 80 characters per level, 200 for the label. Cutting never leaves a dangling comma or space.
const cut = (s: string | null | undefined, max: number) => (s ? s.trim().slice(0, max).replace(/[\s,]+$/, '') || null : null)

export function normalizePlace(r: NominatimResult): PlaceChoice {
  const a = r.address ?? {}
  const city = cut(a.city ?? a.town ?? a.village ?? a.municipality, 80)
  const state = cut(a.state, 80)
  const country = cut(a.country, 80)
  const parts = [city, state, country].filter((p): p is string => !!p)
  const name = r.name && !parts.some((p) => sameText(p, r.name!)) ? r.name : null
  return { city, state, country, label: cut([name, ...parts].filter(Boolean).join(', '), 200) ?? '', lat: Number(r.lat), lng: Number(r.lon) }
}
```

Em `src/components/PlaceField.tsx`:
- imports: `import { useEffect, useRef, useState } from 'react'`, mais `import { count } from '../lib/text'`;
- depois de `NO_PLACE`:

```tsx
export const PLACE_SEARCH_TIMEOUT_MS = 10_000
```

- dentro do componente, junto de `pending`:

```tsx
  const input = useRef<HTMLInputElement>(null)
  const clearButton = useRef<HTMLButtonElement>(null)
  const focusNext = useRef<'clear' | 'input' | null>(null)
  useEffect(() => {
    if (focusNext.current === 'clear') clearButton.current?.focus()
    if (focusNext.current === 'input') input.current?.focus()
    focusNext.current = null
  }, [chosen])
```

- `search()` passa a ser:

```tsx
  async function search() {
    const q = text.trim()
    if (q.length < 3) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    // A search that hangs gives up instead of saying "Buscando…" forever. Typing or picking aborts first, so no false error.
    const timer = setTimeout(() => {
      if (controller.signal.aborted) return
      controller.abort()
      setStatus('error')
    }, PLACE_SEARCH_TIMEOUT_MS)
    setResults([])
    setStatus('loading')
    try {
      const list = await searchPlaces(q, controller.signal)
      if (controller.signal.aborted) return
      setResults(list)
      setStatus(list.length ? 'idle' : 'empty')
    } catch {
      if (!controller.signal.aborted) setStatus('error')
    } finally {
      clearTimeout(timer)
    }
  }
```

- em `pick`, primeira linha: `focusNext.current = 'clear'`. Em `clear`, primeira linha: `focusNext.current = 'input'`.
- o `<input>` ganha `ref={input}` e o botão "Limpar local" ganha `ref={clearButton}`.
- as duas linhas de "Buscando…" e "Nenhum lugar encontrado." são trocadas por uma região sempre presente:

```tsx
      <p role="status" className="text-sm text-ink/60">
        {status === 'loading' ? 'Buscando…' : status === 'empty' ? 'Nenhum lugar encontrado.' : results.length > 0 && <span className="sr-only">{count(results.length, 'lugar encontrado', 'lugares encontrados')}</span>}
      </p>
```

- [ ] **Step 4: Rodar.** `npx vitest run src/lib/place.test.ts src/pages/QuestFormPage.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/place.ts src/lib/place.test.ts src/components/PlaceField.tsx src/pages/QuestFormPage.test.tsx
git commit -m "fix(local): search gives up after 10 s, states announced, focus kept, huge names cut to the database limits"
```

---

### Task 3: Aviso de versão nova

**Files:**
- Modify: `vite.config.ts` (`registerType: 'prompt'`)
- Modify: `src/vite-env.d.ts`
- Modify: `src/test/setup.ts` (mock global do módulo virtual)
- Modify: `src/components/Layout.tsx`
- Test: `src/components/Layout.test.tsx`

**Interfaces:**
- Consumes: `useRegisterSW` de `virtual:pwa-register/react`.
- Produces: o aviso "Nova versão do Bubs2Do" com o botão "Atualizar", `role="status"`, no contêiner fixo do topo.

- [ ] **Step 1: Mock global e testes que falham.**

Em `src/test/setup.ts`, mudar o import para `import { afterEach, vi } from 'vitest'` e acrescentar:

```ts
// The service worker only exists in the built app; tests see no new version unless they say so.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(() => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: vi.fn() })),
}))
```

Em `src/components/Layout.test.tsx`, adicionar `import userEvent from '@testing-library/user-event'` e `import { useRegisterSW } from 'virtual:pwa-register/react'`, e acrescentar:

```tsx
const newVersion = (update = vi.fn(), registration?: Partial<ServiceWorkerRegistration>) =>
  vi.mocked(useRegisterSW).mockImplementation((options) => {
    if (registration) options?.onRegisteredSW?.('/sw.js', registration as ServiceWorkerRegistration)
    return { needRefresh: [!registration, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: update }
  })

it('offers the new version and only reloads when asked', async () => {
  const update = vi.fn()
  newVersion(update)
  renderLayout()
  expect(screen.getByRole('status')).toHaveTextContent('Nova versão do Bubs2Do')
  expect(update).not.toHaveBeenCalled()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar' }))
  expect(update).toHaveBeenCalledWith(true)
})

it('looks for a new version whenever the app comes back to the screen, quietly when offline', async () => {
  const check = vi.fn().mockRejectedValue(new Error('offline'))
  newVersion(vi.fn(), { update: check })
  renderLayout()
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(check).toHaveBeenCalled()
  await new Promise((r) => setTimeout(r, 0))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar.** `npx vitest run src/components/Layout.test.tsx`
Expected: FAIL nos dois testes novos, sem `role="status"` e `check` não chamado. Se o import do módulo virtual não resolver, conferir que `vite.config.ts` carrega o `VitePWA` (é o que resolve `virtual:pwa-register/react`).

- [ ] **Step 3: Implementar.**

Em `vite.config.ts`: `registerType: 'prompt',`.

Em `src/vite-env.d.ts`, acrescentar: `/// <reference types="vite-plugin-pwa/react" />`.

Em `src/components/Layout.tsx`, `import { useRegisterSW } from 'virtual:pwa-register/react'`, e o hook novo:

```tsx
// A deploy shows "Nova versão" instead of reloading on its own, so nothing typed is lost.
// The installed iPhone app stays open in the background for days: look for a new version whenever it comes back.
function useNewVersion() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {})
      })
    },
  })
  return needRefresh ? () => updateServiceWorker(true) : null
}
```

No `Layout`: `const update = useNewVersion()`. No contêiner fixo do topo, antes do aviso offline:

```tsx
          {update && (
            <div role="status" className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-ink shadow-lg">
              <span className="flex-1">Nova versão do Bubs2Do</span>
              <button type="button" className="btn btn-primary" onClick={update}>Atualizar</button>
            </div>
          )}
```

- [ ] **Step 4: Rodar.** `npx vitest run src/components/Layout.test.tsx && npm run typecheck && npm run build > <workspace>/build.log 2>&1; tail -3 <workspace>/build.log`
Expected: PASS, typecheck limpo, build ok.

- [ ] **Step 5: Commit.**

```bash
git add vite.config.ts src/vite-env.d.ts src/test/setup.ts src/components/Layout.tsx src/components/Layout.test.tsx
git commit -m "feat(app): Nova versão do Bubs2Do with an Atualizar button, checked whenever the app comes back"
```

---

### Task 4: Agenda — dados e lógica

**Files:**
- Create: `supabase/migrations/20261008000002_schedule.sql`
- Create: `src/lib/schedule.ts`, `src/lib/schedule.test.ts`
- Modify: `src/lib/types.ts` (`Quest`), `src/data/api.ts` (`QuestInput`), `src/test/fixtures.ts` (`quest`), `src/dev/sampleData.ts` (`quest`)

**Interfaces:**
- Produces:
  - `Quest.scheduled_on: string | null`, `Quest.scheduled_time: string | null`;
  - `QuestInput` com os dois;
  - `scheduleLabel(on: string, time: string | null, today: string): string`;
  - `isOverdue(on: string, today: string): boolean`;
  - `upcoming(quests: Quest[], done: Set<string>): Quest[]`;
  - `calendarUrl(q: Pick<Quest, 'id' | 'title' | 'scheduled_on' | 'scheduled_time'>, place: string | null): string`.
- **Nota:** o spec escreve `upcoming(quests, done, today)`, mas a ordem por data já põe as atrasadas no topo, então `today` não é necessário.

- [ ] **Step 1: Migração.** Criar `supabase/migrations/20261008000002_schedule.sql`:

```sql
-- When a quest is planned: a date and an optional time (floating local time, both of them live in Brazil).
-- Run in the SQL Editor BEFORE deploying the app that reads and writes these columns.
alter table public.quests
  add column scheduled_on date,
  add column scheduled_time time,
  add constraint quests_schedule_time_needs_date check (scheduled_time is null or scheduled_on is not null);
```

- [ ] **Step 2: Teste que falha.** Criar `src/lib/schedule.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { quest } from '../test/fixtures'
import { calendarUrl, isOverdue, scheduleLabel, upcoming } from './schedule'

const TODAY = '2026-10-08' // quinta-feira

describe('scheduleLabel', () => {
  it('says Hoje, Amanhã, or the weekday and date', () => {
    expect(scheduleLabel('2026-10-08', null, TODAY)).toBe('Hoje')
    expect(scheduleLabel('2026-10-09', null, TODAY)).toBe('Amanhã')
    expect(scheduleLabel('2026-10-10', null, TODAY)).toBe('sáb, 10/10')
    expect(scheduleLabel('2027-01-03', null, TODAY)).toBe('dom, 03/01')
  })
  it('adds the time, with minutes only when they are not zero', () => {
    expect(scheduleLabel('2026-10-10', '20:00:00', TODAY)).toBe('sáb, 10/10 · 20h')
    expect(scheduleLabel('2026-10-08', '08:30', TODAY)).toBe('Hoje · 8h30')
  })
  it('a past date is late', () => {
    expect(scheduleLabel('2026-10-03', '20:00:00', TODAY)).toBe('Atrasada · 03/10')
    expect(isOverdue('2026-10-03', TODAY)).toBe(true)
    expect(isOverdue('2026-10-08', TODAY)).toBe(false)
  })
})

describe('upcoming', () => {
  it('lists pending scheduled quests by date, then time, a day without time first', () => {
    const late = quest({ id: 'late', scheduled_on: '2026-10-01' })
    const night = quest({ id: 'night', scheduled_on: '2026-10-10', scheduled_time: '20:00:00' })
    const allDay = quest({ id: 'allday', scheduled_on: '2026-10-10' })
    const morning = quest({ id: 'morning', scheduled_on: '2026-10-10', scheduled_time: '09:00:00' })
    const done = quest({ id: 'done', scheduled_on: '2026-10-09' })
    const loose = quest({ id: 'loose' })
    expect(upcoming([night, done, loose, morning, allDay, late], new Set(['done'])).map((q) => q.id)).toEqual(['late', 'allday', 'morning', 'night'])
  })
})

describe('calendarUrl', () => {
  it('carries title, date, time, place and id', () => {
    const q = quest({ id: 'brabus', title: 'Brabus Burguer', scheduled_on: '2026-10-10', scheduled_time: '20:30:00' })
    expect(calendarUrl(q, 'Ribeirão Preto, São Paulo, Brasil')).toBe(
      '/api/calendario?t=Brabus+Burguer&d=2026-10-10&h=20%3A30&l=Ribeir%C3%A3o+Preto%2C+S%C3%A3o+Paulo%2C+Brasil&id=brabus',
    )
  })
  it('leaves out what is missing', () => {
    expect(calendarUrl(quest({ id: 'x', title: 'Cinema', scheduled_on: '2026-10-10' }), null)).toBe('/api/calendario?t=Cinema&d=2026-10-10&id=x')
  })
})
```

- [ ] **Step 3: Rodar.** `npx vitest run src/lib/schedule.test.ts`
Expected: FAIL, `Failed to resolve import "./schedule"`.

- [ ] **Step 4: Implementar.**

Em `src/lib/types.ts`, no `Quest`, depois de `lng: number | null`:

```ts
  scheduled_on: string | null // YYYY-MM-DD
  scheduled_time: string | null // HH:MM:SS from the database, HH:MM from the form
```

Em `src/data/api.ts`, no `QuestInput`, acrescentar `| 'scheduled_on' | 'scheduled_time'` à lista do `Pick`.

Em `src/test/fixtures.ts` (`quest`) e `src/dev/sampleData.ts` (`quest`), acrescentar `scheduled_on: null, scheduled_time: null,` aos padrões, logo depois de `lng: null,`.

Criar `src/lib/schedule.ts`:

```ts
// Scheduled quests: the date label ("Hoje", "sáb, 10/10 · 20h", "Atrasada · 03/10"), Próximas, and the calendar link.
import type { Quest } from './types'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const DAY_MS = 86_400_000
const dayNumber = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export const isOverdue = (on: string, today: string) => on < today

export function timeLabel(time: string): string {
  const [h, m] = time.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function scheduleLabel(on: string, time: string | null, today: string): string {
  if (isOverdue(on, today)) return `Atrasada · ${dayMonth(on)}`
  const diff = dayNumber(on) - dayNumber(today)
  const day = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${WEEKDAYS[new Date(dayNumber(on) * DAY_MS).getUTCDay()]}, ${dayMonth(on)}`
  return time ? `${day} · ${timeLabel(time)}` : day
}

// Pending quests with a date, soonest first; late ones come first because their date is smaller.
export function upcoming(quests: Quest[], done: Set<string>): Quest[] {
  const key = (q: Quest) => `${q.scheduled_on} ${q.scheduled_time ?? ''}`
  return quests.filter((q) => q.scheduled_on && !done.has(q.id)).sort((a, b) => key(a).localeCompare(key(b)))
}

export function calendarUrl(q: Pick<Quest, 'id' | 'title' | 'scheduled_on' | 'scheduled_time'>, place: string | null): string {
  const p = new URLSearchParams({ t: q.title, d: q.scheduled_on ?? '' })
  if (q.scheduled_time) p.set('h', q.scheduled_time.slice(0, 5))
  if (place) p.set('l', place)
  p.set('id', q.id)
  return `/api/calendario?${p}`
}
```

- [ ] **Step 5: Rodar.** `npx vitest run src/lib/schedule.test.ts && npm run typecheck`
Expected: PASS. Se o typecheck acusar algum literal de `Quest` montado à mão, acrescentar os dois campos `null` nele.

- [ ] **Step 6: Commit.**

```bash
git add supabase/migrations/20261008000002_schedule.sql src/lib/schedule.ts src/lib/schedule.test.ts src/lib/types.ts src/data/api.ts src/test/fixtures.ts src/dev/sampleData.ts
git commit -m "feat(agenda): scheduled date and optional time on quests, labels, Próximas order and calendar link"
```

---

### Task 5: Agenda — formulário, Próximas e página da quest

**Files:**
- Modify: `src/pages/QuestFormPage.tsx`, `src/pages/QuestsPage.tsx`, `src/pages/QuestPage.tsx`
- Test: `src/pages/QuestFormPage.test.tsx`, `src/pages/QuestsPage.test.tsx`, `src/pages/QuestPage.test.tsx`

**Interfaces:**
- Consumes: `scheduleLabel`, `isOverdue`, `upcoming` e `calendarUrl` da Task 4; `todayISO` de `src/lib/dates.ts`; `effectivePlace` e `placeLabel` de `src/lib/place.ts`.

- [ ] **Step 1: Testes que falham.**

`src/pages/QuestFormPage.test.tsx`:
- adicionar `fireEvent` ao import de `@testing-library/react`;
- no teste "creates a top-level quest", o objeto esperado ganha `scheduled_on: null, scheduled_time: null` no fim;
- acrescentar no fim:

```tsx
it('schedules a date and an optional time; the time needs a date', async () => {
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText('Título'), 'Brabus')
  await user.click(screen.getByRole('button', { name: 'Fácil' }))
  expect(screen.getByLabelText('Horário')).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-10-10' } })
  fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '20:00' } })
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ scheduled_on: '2026-10-10', scheduled_time: '20:00' })))
})

it('clearing the date clears the time, so the schedule is removed', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({ categories: allCats(), quests: [quest({ id: 'brabus', title: 'Brabus', category_id: CATS.restaurante.id, scheduled_on: '2026-10-10', scheduled_time: '20:00:00' })] }),
  )
  const user = userEvent.setup()
  renderRoute([{ path: '/quests/:id/editar', element: <QuestFormPage /> }, { path: '/quests/:id', element: <p>quest</p> }], '/quests/brabus/editar')
  expect(await screen.findByLabelText('Horário')).toHaveValue('20:00')
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: '' } })
  expect(screen.getByLabelText('Horário')).toHaveValue('')
  expect(screen.getByLabelText('Horário')).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.updateQuest).toHaveBeenCalledWith('brabus', expect.objectContaining({ scheduled_on: null, scheduled_time: null })))
})
```

`src/pages/QuestsPage.test.tsx`: adicionar `import { todayISO } from '../lib/dates'` e acrescentar no fim:

```tsx
const shift = (days: number) => todayISO(new Date(Date.now() + days * 86_400_000))
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

it('Próximas lists pending scheduled quests by date, late ones first and flagged, done ones left out', async () => {
  vi.mocked(api.loadAll).mockResolvedValue({
    ...data,
    quests: [
      ...data.quests.filter((x) => x.id !== 'matrix'),
      { ...matrix, scheduled_on: shift(0) },
      quest({ id: 'brabus', title: 'Brabus', category_id: CATS.restaurante.id, scheduled_on: shift(1), scheduled_time: '20:00:00' }),
      quest({ id: 'sushi', title: 'Sushi', category_id: CATS.restaurante.id, scheduled_on: shift(-2) }),
    ],
  })
  open()
  const next = await screen.findByRole('region', { name: 'Próximas' })
  const items = within(next).getAllByRole('link')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent(`Sushi`)
  expect(within(items[0]).getByText(`Atrasada · ${dayMonth(shift(-2))}`)).toHaveClass('text-red-600')
  expect(items[1]).toHaveTextContent('BrabusAmanhã · 20h')
  expect(items[1]).toHaveAttribute('href', '/quests/brabus')
})

it('without scheduled quests there is no Próximas', async () => {
  open()
  await screen.findByRole('link', { name: /^Viagem/ })
  expect(screen.queryByRole('region', { name: 'Próximas' })).not.toBeInTheDocument()
})
```

`src/pages/QuestPage.test.tsx`, acrescentar no fim:

```tsx
it('a scheduled pending quest shows when, and the calendar link carries it', async () => {
  load({
    quests: [
      quest({ id: 'brabus', title: 'Brabus Burguer', category_id: CATS.restaurante.id, scheduled_on: '2099-01-03', scheduled_time: '20:30:00', city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', place_label: 'Ribeirão Preto, São Paulo, Brasil' }),
    ],
  })
  renderRoute(routes, '/quests/brabus')
  expect(await screen.findByText('Agendada · sáb, 03/01 · 20h30')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: 'Adicionar ao calendário' })
  expect(link).toHaveAttribute('href', '/api/calendario?t=Brabus+Burguer&d=2099-01-03&h=20%3A30&l=Ribeir%C3%A3o+Preto%2C+S%C3%A3o+Paulo%2C+Brasil&id=brabus')
  expect(link).toHaveAttribute('target', '_blank')
})

it('a done quest hides its schedule', async () => {
  load({ quests: [quest({ id: 'cine', title: 'Cinema', category_id: CATS.filme.id, scheduled_on: '2099-01-03' })], completions: [completion({ quest_id: 'cine' })] })
  renderRoute(routes, '/quests/cine')
  await screen.findByRole('heading', { level: 1, name: 'Cinema' })
  expect(screen.queryByRole('link', { name: 'Adicionar ao calendário' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar.** `npx vitest run src/pages/QuestFormPage.test.tsx src/pages/QuestsPage.test.tsx src/pages/QuestPage.test.tsx`
Expected: FAIL nos testes novos, e no "creates a top-level quest", que ainda não manda os dois campos. O teste "without scheduled quests…" já passa (guarda).

- [ ] **Step 3: Implementar.**

**`QuestFormPage.tsx`**
- **Estados**, depois de `notes`:

```tsx
  const [scheduledOn, setScheduledOn] = useState(existing?.scheduled_on ?? '')
  const [scheduledTime, setScheduledTime] = useState(existing?.scheduled_time?.slice(0, 5) ?? '')
```

- **Input:** no `input: QuestInput`, depois da linha do lugar:

```tsx
        scheduled_on: scheduledOn || null, scheduled_time: scheduledOn && scheduledTime ? scheduledTime : null,
```

- **Campo:** entre o `PlaceField` e o bloco de Dificuldade:

```tsx
          <fieldset>
            <legend className="mb-1 font-bold">Quando <span className="font-normal text-ink/60">(opcional)</span></legend>
            <div className="flex gap-2">
              <input
                type="date"
                aria-label="Data"
                className="input min-w-0 flex-1"
                value={scheduledOn}
                onChange={(e) => {
                  setScheduledOn(e.target.value)
                  if (!e.target.value) setScheduledTime('')
                }}
              />
              <input type="time" aria-label="Horário" className="input w-32" value={scheduledTime} disabled={!scheduledOn} onChange={(e) => setScheduledTime(e.target.value)} />
            </div>
          </fieldset>
```

**`QuestsPage.tsx`**
- **Imports:** `import { CalendarClock, PenLine } from 'lucide-react'` e `import { isOverdue, scheduleLabel, upcoming } from '../lib/schedule'`.
- **Cálculo:** depois de `const month = …`, trocar por:

```tsx
  const today = todayISO()
  const month = today.slice(0, 7)
  const next = upcoming(data.quests, done)
```

- **Seção:** primeiro filho do `<div className="space-y-4">`:

```tsx
        {next.length > 0 && (
          <section aria-labelledby="next-title" className="card space-y-2 p-4">
            <h2 id="next-title" className="flex items-center gap-2 font-bold">
              <CalendarClock aria-hidden className="size-4 text-accent" /> Próximas
            </h2>
            <ul className="space-y-1">
              {next.map((x) => {
                const c = data.categories.find((k) => k.id === x.category_id)
                return (
                  <li key={x.id}>
                    <Link to={`/quests/${x.id}`} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-blush/30">
                      <Bubble icon={c?.icon ?? ''} color={c?.color ?? '#e3b4cf'} size="sm" />
                      <span className="min-w-0 flex-1 truncate font-semibold">{x.title}</span>
                      <span className={`shrink-0 text-sm ${isOverdue(x.scheduled_on!, today) ? 'font-bold text-red-600' : 'text-ink/60'}`}>
                        {scheduleLabel(x.scheduled_on!, x.scheduled_time, today)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
```

**`QuestPage.tsx`**
- **Imports:**
  - `CalendarClock` em `lucide-react`;
  - `import { todayISO } from '../lib/dates'` (junto de `formatDate`);
  - `import { effectivePlace, placeLabel } from '../lib/place'`;
  - `import { calendarUrl, isOverdue, scheduleLabel } from '../lib/schedule'`.
- **Seção:** primeiro filho do `<div className="space-y-6">`:

```tsx
        {quest.scheduled_on && !isDone && <ScheduleCard quest={quest} data={data} />}
```

- **Componente:** acrescentar ao arquivo:

```tsx
function ScheduleCard({ quest, data }: { quest: Quest; data: AppData }) {
  const today = todayISO()
  const label = scheduleLabel(quest.scheduled_on!, quest.scheduled_time, today)
  const late = isOverdue(quest.scheduled_on!, today)
  const place = effectivePlace(data.quests, quest.id)
  return (
    <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <span className={`inline-flex items-center gap-2 font-semibold ${late ? 'text-red-600' : ''}`}>
        <CalendarClock aria-hidden className="size-4 text-accent" /> {late ? label : `Agendada · ${label}`}
      </span>
      <a href={calendarUrl(quest, quest.place_label ?? (place && placeLabel(place)))} target="_blank" rel="noreferrer" className="btn">
        Adicionar ao calendário
      </a>
    </section>
  )
}
```

- [ ] **Step 4: Rodar.** `npx vitest run src/pages && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/pages/QuestFormPage.tsx src/pages/QuestsPage.tsx src/pages/QuestPage.tsx src/pages/QuestFormPage.test.tsx src/pages/QuestsPage.test.tsx src/pages/QuestPage.test.tsx
git commit -m "feat(agenda): Quando in the form, Próximas on Quests, and Adicionar ao calendário on the quest"
```

---

### Task 6: Calendário (função da Vercel)

**Files:**
- Create: `api/calendario.ts`
- Create: `src/lib/calendario.test.ts`, fora de `api/`, porque todo arquivo em `api/` vira função na Vercel.
- Modify: `vercel.json`, `tsconfig.json` (`include` ganha `"api"`), `vite.config.ts` (`navigateFallbackDenylist`)

**Interfaces:**
- Produces:
  - `buildIcs(e: IcsEvent): string`, com `IcsEvent { title: string; date: string; time: string | null; location: string | null; uid: string; now: Date }`;
  - `GET(request: Request): Response`.

- [ ] **Step 1: Teste que falha.** Criar `src/lib/calendario.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildIcs, GET } from '../../api/calendario'

const now = new Date('2026-10-08T15:04:05Z')
const base = { title: 'Brabus Burguer', date: '2026-10-10', time: null, location: null, uid: 'brabus', now }
const lines = (ics: string) => ics.split('\r\n')

describe('buildIcs', () => {
  it('an all-day event ends the next day', () => {
    const l = lines(buildIcs(base))
    expect(l).toContain('DTSTART;VALUE=DATE:20261010')
    expect(l).toContain('DTEND;VALUE=DATE:20261011')
    expect(l).toContain('UID:brabus-2026-10-10@bubs2do')
    expect(l).toContain('DTSTAMP:20261008T150405Z')
    expect(l).toContain('SUMMARY:Brabus Burguer')
    expect(l.some((x) => x.startsWith('LOCATION'))).toBe(false)
  })
  it('a timed event lasts 2 h in floating local time, past midnight too', () => {
    expect(lines(buildIcs({ ...base, time: '20:30' }))).toEqual(expect.arrayContaining(['DTSTART:20261010T203000', 'DTEND:20261010T223000']))
    expect(lines(buildIcs({ ...base, date: '2026-12-31', time: '23:00' }))).toEqual(expect.arrayContaining(['DTSTART:20261231T230000', 'DTEND:20270101T010000']))
  })
  it('escapes commas, semicolons, backslashes and line breaks', () => {
    const ics = buildIcs({ ...base, title: 'Pizza; vinho\\e\nmais', location: 'Ribeirão Preto, São Paulo, Brasil' })
    expect(lines(ics)).toEqual(expect.arrayContaining(['SUMMARY:Pizza\\; vinho\\\\e\\nmais', 'LOCATION:Ribeirão Preto\\, São Paulo\\, Brasil']))
  })
  it('folds lines over 75 bytes without splitting a character, and ends with CRLF', () => {
    const ics = buildIcs({ ...base, title: 'Ação '.repeat(40) })
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${'Ação '.repeat(40)}`)
    for (const l of lines(ics)) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
    expect(ics).not.toContain('\uFFFD')
  })
  it('starts and ends the calendar', () => {
    const l = lines(buildIcs(base))
    expect(l.slice(0, 3)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bubs2Do//PT-BR'])
    expect(l).toContain('BEGIN:VEVENT')
  })
})

describe('GET /api/calendario', () => {
  const get = (q: string) => GET(new Request(`https://bubs2do.vercel.app/api/calendario?${q}`))
  it('answers text/calendar for a valid date', async () => {
    const res = get('t=Brabus&d=2026-10-10&h=20%3A00&l=Ribeir%C3%A3o+Preto&id=brabus')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
    const body = await res.text()
    expect(body).toContain('DTSTART:20261010T200000')
    expect(body).toContain('LOCATION:Ribeirão Preto')
  })
  it('refuses a date or time that does not exist', () => {
    for (const q of ['t=x&d=2026-02-30', 't=x&d=2026-13-01', 't=x&d=amanha', 't=x', 't=x&d=2026-10-10&h=24:00', 't=x&d=2026-10-10&h=8h']) expect(get(q).status).toBe(400)
  })
  it('a missing title or an odd id still makes a valid event', async () => {
    const body = await get('d=2026-10-10&id=../x').text()
    expect(body).toContain('SUMMARY:Quest')
    expect(body).toContain('UID:quest-2026-10-10@bubs2do')
  })
})
```

- [ ] **Step 2: Rodar.** `npx vitest run src/lib/calendario.test.ts`
Expected: FAIL, `Failed to resolve import "../../api/calendario"`.

- [ ] **Step 3: Implementar.** Criar `api/calendario.ts`:

```ts
// "Adicionar ao calendário": a real link that answers text/calendar makes the iPhone show its add-event sheet
// (a file built inside the installed app often fails there). Self-contained on purpose: Vercel runs this file as is.

export interface IcsEvent {
  title: string
  date: string // YYYY-MM-DD
  time: string | null // HH:MM, floating local time
  location: string | null
  uid: string
  now: Date
}

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const stamp = (d: Date) => d.toISOString().slice(0, 19).replace(/[-:]/g, '') // 20261010T203000, from the UTC parts
const encoder = new TextEncoder()

// Lines longer than 75 bytes go on as continuation lines (a leading space), never splitting a character.
function fold(line: string): string {
  const out: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const size = encoder.encode(ch).length
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += size
  }
  out.push(current)
  return out.join('\r\n ')
}

export function buildIcs(e: IcsEvent): string {
  // The date and time are read as UTC parts and written back without a zone: the phone shows them in its own time.
  const start = new Date(`${e.date}T${e.time ?? '00:00'}:00Z`)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bubs2Do//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${e.uid}-${e.date}@bubs2do`, `DTSTAMP:${stamp(e.now)}Z`]
  if (e.time) lines.push(`DTSTART:${stamp(start)}`, `DTEND:${stamp(new Date(start.getTime() + 2 * 3_600_000))}`)
  else lines.push(`DTSTART;VALUE=DATE:${stamp(start).slice(0, 8)}`, `DTEND;VALUE=DATE:${stamp(new Date(start.getTime() + 86_400_000)).slice(0, 8)}`)
  lines.push(`SUMMARY:${escape(e.title)}`)
  if (e.location) lines.push(`LOCATION:${escape(e.location)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
function realDate(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const t = new Date(`${d}T00:00:00Z`)
  return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(d)
}

export function GET(request: Request): Response {
  const p = new URL(request.url).searchParams
  const date = p.get('d') ?? ''
  const time = p.get('h')
  if (!realDate(date) || (time !== null && !TIME.test(time))) return new Response('Data ou horário inválido', { status: 400 })
  const id = p.get('id') ?? ''
  const ics = buildIcs({
    title: (p.get('t') ?? '').trim().slice(0, 200) || 'Quest',
    date,
    time,
    location: p.get('l')?.trim().slice(0, 200) || null,
    uid: /^[\w-]{1,64}$/.test(id) ? id : 'quest',
    now: new Date(),
  })
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="quest.ics"' } })
}
```

`vercel.json`:

```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }
```

`tsconfig.json`: `"include": ["src", "api", "supabase/functions/_shared"]`.

`vite.config.ts`, no `workbox`:

```ts
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg,webp,ico}'], navigateFallbackDenylist: [/^\/api\//] },
```

- [ ] **Step 4: Rodar.** `npx vitest run src/lib/calendario.test.ts && npm run typecheck && npm run build > <workspace>/build.log 2>&1; tail -3 <workspace>/build.log && grep -o 'api' dist/sw.js | head -1`
Expected: PASS, typecheck limpo, build ok, e `api` aparece no `dist/sw.js` (o denylist).

- [ ] **Step 5: Commit.**

```bash
git add api/calendario.ts src/lib/calendario.test.ts vercel.json tsconfig.json vite.config.ts
git commit -m "feat(agenda): /api/calendario answers the event as text/calendar for the iPhone add-event sheet"
```

---

### Task 7: Mapa

**Files:**
- Modify: `package.json`/`package-lock.json` (`npm i leaflet@1.9.4` e `npm i -D @types/leaflet@1.9.22`)
- Create: `src/lib/map.ts`, `src/lib/map.test.ts`
- Create: `src/components/QuestMap.tsx`
- Create: `src/pages/MapPage.tsx`, `src/pages/MapPage.test.tsx`
- Modify: `src/routes.tsx`, `src/components/Layout.tsx` (aba), `src/components/Layout.test.tsx`, `src/index.css` (`.map-pin`)

**Interfaces:**
- Consumes: `doneQuestIds(completions)` de `src/lib/tree.ts`; `useHideSky` do `Layout`; o `SegmentedControl` existente, com `role="tab"`.
- Produces:
  - `MapShow = 'all' | 'pending' | 'done'`;
  - `Pin { key: string; lat: number; lng: number; quests: Quest[]; pending: boolean }`;
  - `mapPins(data: Pick<AppData, 'quests' | 'completions'>, show: MapShow): { pins: Pin[]; unplaced: Quest[] }`;
  - `QuestMap({ pins, onPick })`, default export, carregado com `lazy`.

- [ ] **Step 1: Testes que falham.**

`src/lib/map.test.ts`:

```ts
import { expect, it } from 'vitest'
import { completion, quest } from '../test/fixtures'
import { mapPins } from './map'

const brabus = quest({ id: 'brabus', title: 'Brabus', lat: -21.1775, lng: -47.8103 })
const sushi = quest({ id: 'sushi', title: 'Akira Sushi', lat: -21.17751, lng: -47.81032 })
const rio = quest({ id: 'rio', title: 'Batata', lat: -22.9068, lng: -43.1729 })
const legacy = quest({ id: 'legacy', title: 'Pastel', city: 'Santos' })
const inherits = quest({ id: 'sub', title: 'Subquest', parent_id: 'brabus' })
const nothing = quest({ id: 'none', title: 'Filme' })
const data = { quests: [brabus, sushi, rio, legacy, inherits, nothing], completions: [completion({ quest_id: 'rio' })] }

it('groups quests on the same spot into one pin, quests by title', () => {
  const { pins } = mapPins(data, 'all')
  expect(pins.map((p) => p.quests.map((q) => q.id))).toEqual([['sushi', 'brabus'], ['rio']])
  expect(pins.map((p) => p.pending)).toEqual([true, false])
})

it('filters pending and done', () => {
  expect(mapPins(data, 'pending').pins.flatMap((p) => p.quests.map((q) => q.id))).toEqual(['sushi', 'brabus'])
  expect(mapPins(data, 'done').pins.flatMap((p) => p.quests.map((q) => q.id))).toEqual(['rio'])
})

it('a quest with a typed place but no position is listed apart; inherited or no place is neither', () => {
  const { pins, unplaced } = mapPins(data, 'all')
  expect(unplaced.map((q) => q.id)).toEqual(['legacy'])
  expect(pins.flatMap((p) => p.quests.map((q) => q.id))).not.toContain('sub')
})
```

Aqui o `-21.1775 → -21.1775` e o `-21.17751 → -21.1775` (4 casas) caem no mesmo ponto. A ordem das chaves por texto é `"-21.1775,-47.8103"` < `"-22.9068,-43.1729"`.

`src/pages/MapPage.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import type { Pin } from '../lib/map'
import { CATS, allCats, appData, completion, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import MapPage from './MapPage'

vi.mock('../data/api')
vi.mock('../components/QuestMap', () => ({
  default: ({ pins, onPick }: { pins: Pin[]; onPick: (p: Pin) => void }) => (
    <div>
      {pins.map((p) => (
        <button key={p.key} type="button" onClick={() => onPick(p)}>{`alfinete ${p.quests.map((q) => q.title).join(' + ')}`}</button>
      ))}
    </div>
  ),
}))

const brabus = quest({ id: 'brabus', title: 'Brabus', category_id: CATS.restaurante.id, city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', place_label: 'Brabus, Ribeirão Preto, São Paulo, Brasil', lat: -21.1775, lng: -47.8103 })
const sushi = quest({ id: 'sushi', title: 'Akira Sushi', category_id: CATS.restaurante.id, city: 'Ribeirão Preto', lat: -21.1775, lng: -47.8103 })
const rio = quest({ id: 'rio', title: 'Batata', category_id: CATS.restaurante.id, lat: -22.9, lng: -43.17 })
const legacy = quest({ id: 'legacy', title: 'Pastel', category_id: CATS.restaurante.id, city: 'Santos' })

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [brabus, sushi, rio, legacy], completions: [completion({ quest_id: 'rio' })] }))
})
const open = () => renderRoute([{ path: '/mapa', element: <MapPage /> }, { path: '/quests/:id', element: <p>quest</p> }], '/mapa')

it('a pin opens a card with each quest there, linked; Fechar closes it', async () => {
  const user = userEvent.setup()
  open()
  await user.click(await screen.findByRole('button', { name: 'alfinete Akira Sushi + Brabus' }))
  const card = screen.getByRole('region', { name: 'Neste ponto' })
  expect(within(card).getByRole('link', { name: /Brabus/ })).toHaveAttribute('href', '/quests/brabus')
  expect(within(card).getByRole('link', { name: /Akira Sushi/ })).toHaveAttribute('href', '/quests/sushi')
  expect(within(card).getByText('Brabus, Ribeirão Preto, São Paulo, Brasil')).toBeInTheDocument()
  await user.click(within(card).getByRole('button', { name: 'Fechar' }))
  expect(screen.queryByRole('region', { name: 'Neste ponto' })).not.toBeInTheDocument()
})

it('Pendentes and Feitas filter the pins, and changing the filter closes the card', async () => {
  const user = userEvent.setup()
  open()
  await user.click(await screen.findByRole('button', { name: 'alfinete Batata' }))
  await user.click(screen.getByRole('tab', { name: 'Pendentes' }))
  expect(screen.queryByRole('button', { name: 'alfinete Batata' })).not.toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Neste ponto' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Feitas' }))
  expect(screen.getByRole('button', { name: 'alfinete Batata' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'alfinete Akira Sushi + Brabus' })).not.toBeInTheDocument()
})

it('lists the quests with a place but no position, linked to edit', async () => {
  open()
  expect(await screen.findByText('1 quest com lugar fora do mapa:')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Pastel' })).toHaveAttribute('href', '/quests/legacy/editar')
})

it('without pins it says how to put quests on the map', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [legacy] }))
  open()
  expect(await screen.findByText('Nenhuma quest no mapa ainda. Escolham o lugar pela busca no formulário.')).toBeInTheDocument()
})
```

Em `src/components/Layout.test.tsx`, trocar o primeiro teste por:

```tsx
it('shows the five sections and the page content', () => {
  renderLayout()
  for (const name of ['Quests', 'Mapa', 'Conquistas', 'Relatório', 'Perfil']) expect(screen.getByRole('link', { name })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('href', '/mapa')
  expect(screen.getByText('conteúdo')).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar.** `npx vitest run src/lib/map.test.ts src/pages/MapPage.test.tsx src/components/Layout.test.tsx`
Expected: FAIL. `./map` e `./MapPage` não resolvem, e falta a aba Mapa.

- [ ] **Step 3: Implementar.**

`npm i leaflet@1.9.4 && npm i -D @types/leaflet@1.9.22`

`src/lib/map.ts`:

```ts
// Pins for the map: quests with their own position, grouped when they share a spot (two restaurants saved as "Ribeirão Preto").
import { doneQuestIds } from './tree'
import type { AppData, Quest } from './types'

export type MapShow = 'all' | 'pending' | 'done'
export interface Pin {
  key: string
  lat: number
  lng: number
  quests: Quest[]
  pending: boolean
}

const byTitle = (a: Quest, b: Quest) => a.title.localeCompare(b.title, 'pt-BR')

export function mapPins(data: Pick<AppData, 'quests' | 'completions'>, show: MapShow): { pins: Pin[]; unplaced: Quest[] } {
  const done = doneQuestIds(data.completions)
  const shown = data.quests.filter((q) => show === 'all' || (show === 'done') === done.has(q.id))
  const groups = new Map<string, Pin>()
  for (const q of shown) {
    if (q.lat === null || q.lng === null) continue
    const key = `${q.lat.toFixed(4)},${q.lng.toFixed(4)}` // about 11 m
    const pin = groups.get(key) ?? { key, lat: q.lat, lng: q.lng, quests: [], pending: false }
    pin.quests.push(q)
    pin.pending ||= !done.has(q.id)
    groups.set(key, pin)
  }
  const pins = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key)).map((p) => ({ ...p, quests: p.quests.sort(byTitle) }))
  // A place typed before the search existed (or saved offline) has no position: listed so it can be picked again.
  const unplaced = shown.filter((q) => (q.lat === null || q.lng === null) && [q.city, q.state, q.country].some((s) => s?.trim())).sort(byTitle)
  return { pins, unplaced }
}
```

`src/components/QuestMap.tsx`:

```tsx
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Pin } from '../lib/map'

const BRASIL: L.LatLngTuple = [-14.2, -51.9]

// Leaflet with the OpenStreetMap tiles. Pins are drawn here; the card of the tapped pin is React (MapPage).
export default function QuestMap({ pins, onPick }: { pins: Pin[]; onPick: (pin: Pin) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    const m = L.map(box.current!).setView(BRASIL, 4)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m)
    map.current = m
    layer.current = L.layerGroup().addTo(m)
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const group = layer.current
    if (!m || !group) return
    group.clearLayers()
    for (const pin of pins) {
      const n = pin.quests.length
      const icon = L.divIcon({ className: '', html: `<span class="map-pin ${pin.pending ? 'map-pin-pending' : 'map-pin-done'}">${n > 1 ? n : ''}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] })
      L.marker([pin.lat, pin.lng], { icon, title: pin.quests.map((q) => q.title).join(', '), keyboard: true })
        .on('click', () => pick.current(pin))
        .addTo(group)
    }
    if (pins.length) m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [48, 48], maxZoom: 13 })
    else m.setView(BRASIL, 4)
  }, [pins])

  return <div ref={box} data-lenis-prevent className="size-full" />
}
```

`src/pages/MapPage.tsx`:

```tsx
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Bubble from '../components/Bubble'
import { useHideSky } from '../components/Layout'
import PageHero from '../components/PageHero'
import SegmentedControl from '../components/SegmentedControl'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData } from '../data/hooks'
import { mapPins, type MapShow, type Pin } from '../lib/map'
import { placeLabel } from '../lib/place'
import { count } from '../lib/text'
import type { AppData } from '../lib/types'

const QuestMap = lazy(() => import('../components/QuestMap'))

const SHOW: { value: MapShow; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'done', label: 'Feitas' },
]

export default function MapPage() {
  const q = useAppData()
  const [show, setShow] = useState<MapShow>('all')
  const [picked, setPicked] = useState<Pin | null>(null)
  useHideSky() // the map covers the page; no point animating the sky behind it
  // Memoized so tapping a pin (a re-render) does not refit the map.
  const result = useMemo(() => (q.data ? mapPins(q.data, show) : null), [q.data, show])

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data || !result) return <PageLoading />
  const { pins, unplaced } = result

  return (
    <>
      <PageHero title="Mapa" />
      <div className="space-y-4">
        <SegmentedControl
          label="Mostrar"
          options={SHOW}
          value={show}
          onChange={(v) => {
            setShow(v)
            setPicked(null)
          }}
        />
        {/* isolate: Leaflet panes (z-index up to 1000) stay under the menu bar */}
        <div className="relative isolate h-[60dvh] min-h-80 overflow-hidden rounded-3xl border border-white/70 bg-paper shadow-lg">
          <Suspense fallback={<p className="grid size-full place-items-center text-ink/60">Carregando o mapa…</p>}>
            <QuestMap pins={pins} onPick={setPicked} />
          </Suspense>
          {pins.length === 0 && (
            <p className="absolute inset-x-3 top-3 z-[1001] rounded-xl bg-white/95 p-3 text-sm font-semibold shadow">
              Nenhuma quest no mapa ainda. Escolham o lugar pela busca no formulário.
            </p>
          )}
          {picked && <PinCard pin={picked} data={q.data} onClose={() => setPicked(null)} />}
        </div>
        {unplaced.length > 0 && (
          <section className="card space-y-2 p-4 text-sm">
            <p className="font-semibold">{count(unplaced.length, 'quest', 'quests')} com lugar fora do mapa:</p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {unplaced.map((x) => (
                <li key={x.id}>
                  <Link to={`/quests/${x.id}/editar`} className="font-semibold text-brand underline underline-offset-2">{x.title}</Link>
                </li>
              ))}
            </ul>
            <p className="text-ink/60">Escolham o lugar pela busca para elas aparecerem.</p>
          </section>
        )}
      </div>
    </>
  )
}

function PinCard({ pin, data, onClose }: { pin: Pin; data: AppData; onClose: () => void }) {
  return (
    <section aria-label="Neste ponto" className="absolute inset-x-3 bottom-3 z-[1001] max-h-[55%] space-y-2 overflow-y-auto rounded-2xl bg-white p-3 shadow-xl">
      <ul className="space-y-1">
        {pin.quests.map((x) => {
          const c = data.categories.find((k) => k.id === x.category_id)
          return (
            <li key={x.id}>
              <Link to={`/quests/${x.id}`} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-blush/30">
                <Bubble icon={c?.icon ?? ''} color={c?.color ?? '#e3b4cf'} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{x.title}</span>
                  <span className="block truncate text-xs text-ink/60">{x.place_label ?? placeLabel(x)}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn w-full" onClick={onClose}>Fechar</button>
    </section>
  )
}
```

- **`src/routes.tsx`:** `import MapPage from './pages/MapPage'` e `{ path: '/mapa', element: <MapPage /> },` depois de `/categoria/:id`.
- **`src/components/Layout.tsx`:**
  - import `ChartColumn, Map as MapIcon, ScrollText, Trophy, User` de `lucide-react`;
  - `NAV` passa a ser:

```tsx
const NAV = [
  { to: '/', label: 'Quests', Icon: ScrollText },
  { to: '/mapa', label: 'Mapa', Icon: MapIcon },
  { to: '/conquistas', label: 'Conquistas', Icon: Trophy },
  { to: '/relatorio', label: 'Relatório', Icon: ChartColumn },
  { to: '/perfil', label: 'Perfil', Icon: User },
]
```

- **`src/index.css`**, no fim:

```css
/* Map pins (QuestMap): pink = something pending there, gold = all done. */
.map-pin {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 3px solid white;
  border-radius: 9999px;
  box-shadow: 0 4px 10px rgb(26 17 21 / 0.35);
  color: white;
  font: 700 13px/1 var(--font-sans, sans-serif);
}
.map-pin-pending {
  background: var(--color-accent);
}
.map-pin-done {
  background: var(--color-gold);
}
```

- [ ] **Step 4: Rodar.** `npx vitest run src/lib/map.test.ts src/pages/MapPage.test.tsx src/components/Layout.test.tsx && npm run typecheck && npm run build > <workspace>/build.log 2>&1; tail -5 <workspace>/build.log`
Expected: PASS, typecheck limpo, build ok, com um chunk separado de `QuestMap` com o Leaflet.

- [ ] **Step 5: Commit.**

```bash
git add package.json package-lock.json src/lib/map.ts src/lib/map.test.ts src/components/QuestMap.tsx src/pages/MapPage.tsx src/pages/MapPage.test.tsx src/routes.tsx src/components/Layout.tsx src/components/Layout.test.tsx src/index.css
git commit -m "feat(mapa): Mapa tab with OpenStreetMap pins, grouped by spot, filter and the quests left off the map"
```

---

### Task 8: Dados de exemplo e conferência visual

**Files:**
- Modify: `src/dev/sampleData.ts`

- [ ] **Step 1: Dados de exemplo.** Em `src/dev/sampleData.ts`:
- acrescentar `const ahead = (n: number) => todayISO(new Date(Date.now() + n * 86_400_000))`;
- nas quests:
  - `toquio` ganha `lat: 35.6762, lng: 139.6503`;
  - `batata` ganha `lat: -22.9068, lng: -43.1729`;
  - `brabus` ganha `lat: -21.1775, lng: -47.8103, scheduled_on: ahead(2), scheduled_time: '20:00:00'`;
  - `serra` ganha `scheduled_on: ahead(1)`, sem `lat`/`lng`, para aparecer em "fora do mapa";
- adicionar uma segunda quest no mesmo ponto de `brabus`:

```ts
    quest('akira', 'Akira Sushi', 'rest', 'medium', { city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', place_label: 'Ribeirão Preto, São Paulo, Brasil', lat: -21.1775, lng: -47.8103 }),
```

- [ ] **Step 2: Screenshots a 360 px** (dev server já rodando em `http://localhost:5173`), com `node scripts/shot.mjs "http://localhost:5173/preview.html?url=<rota>" <scratchpad>/<nome>.png 360 780 6000 --reduce`:
- `/mapa`: o mapa carrega, os alfinetes aparecem (2 em Ribeirão), e a barra do menu fica por cima do mapa;
- `/mapa` com `--click=` no alfinete "2": cartão "Neste ponto" com as duas quests;
- `/`: Próximas com Brabus e Acampar;
- `/quests/nova`: o campo Quando;
- `/quests/brabus`: "Agendada · …" e o botão do calendário;
- `/` com `--bottom`: o menu com 5 abas, sem cortar "Conquistas".

Abrir cada PNG e corrigir o que estiver feio, por exemplo um rótulo cortado ou o mapa sem altura.

- [ ] **Step 3: Rodar a suíte.** `npx vitest run > <workspace>/vitest.log 2>&1; tail -5 <workspace>/vitest.log && npm run typecheck`
Expected: tudo PASS.

- [ ] **Step 4: Commit.**

```bash
git add src/dev/sampleData.ts
git commit -m "chore(dev): sample schedule, map pins and a quest off the map"
```
