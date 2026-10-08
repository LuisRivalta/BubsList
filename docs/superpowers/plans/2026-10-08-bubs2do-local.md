# Local em níveis e categorias com lugar físico — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O filtro de local do sorteio passa a valer só para categorias com lugar físico (interruptor no Perfil) e ganha níveis (país → estado → cidade), com o lugar informado por uma busca no OpenStreetMap.

**Architecture:**
- **Banco:** uma migração cria `categories.has_place` e as colunas `state`, `country`, `place_label`, `lat` e `lng` em `quests`.
- **Funções puras** em `src/lib/place.ts`:
  - `normalizePlace` e `searchPlaces` (Nominatim);
  - `effectivePlace`, `placeOptions` e `placeWithin`.
- **Integração:**
  - `drawPool` usa `placeWithin` só para quests de categorias com `has_place`;
  - o formulário usa um `PlaceField` novo;
  - o sorteio troca "Cidade" por "Local", com chips de Países, Estados e Cidades;
  - o Perfil ganha o interruptor.

**Tech Stack:** React 19, TS strict, Supabase (Postgres + RLS), Vitest + Testing Library, OpenStreetMap Nominatim (HTTP direto do navegador).

**Spec:** `docs/superpowers/specs/2026-10-08-bubs2do-local-design.md`

## Global Constraints

- **Textos e código:**
  - textos da interface em pt-BR; identificadores de código em inglês;
  - nenhuma dependência nova.
- **Git:**
  - direto na `main`;
  - commits **sem** `Co-Authored-By` nem atribuição ao Claude;
  - **sem push sem o OK explícito do usuário**.
- **Supabase:**
  - nunca usar ferramentas `mcp__supabase__*`;
  - a migração é rodada pelo usuário no SQL Editor **antes do deploy**, porque o app novo lê e grava as colunas novas.
- **Nominatim:**
  - `https://nominatim.openstreetmap.org/search` com `format=jsonv2`, `addressdetails=1`, `limit=5` e `accept-language=pt-BR`;
  - busca só com 3 caracteres ou mais, 500 ms depois da última tecla;
  - uma busca em andamento é abortada quando outra começa;
  - atribuição "Lugares © OpenStreetMap" com link.
- **Limites no banco:** `state` e `country` com 1 a 80 caracteres, `place_label` com 1 a 200, `lat` entre −90 e 90, `lng` entre −180 e 180.
- **Comparações de nomes de lugar:** sempre por `normalizeText` / `sameText`, ou seja, ignorando acentos, maiúsculas e espaços nas pontas.
- **Contraste:** texto `ink` com opacidade mínima de 60% (`src/design.test.ts`).

## Review Focus

1. **Digitar rápido no Local** dispara uma busca só depois da pausa, nunca uma por tecla. Busca lenta ou sem rede mostra a mensagem, e salvar continua funcionando, com o texto virando cidade.
2. **Quest antiga só com cidade** ("Ribeirão Preto") e quest nova com o lugar completo da mesma cidade: aparecem como um único chip "Ribeirão Preto", que pega as duas.
3. **Trocar a quest para uma categoria sem lugar físico** esconde o campo, mas não apaga o lugar guardado. No sorteio, a quest dessa categoria não é cortada pelo local.
4. **Grafias diferentes** ("sao paulo" × "São Paulo") casam no filtro e não duplicam chips.
5. **Interruptor desligado** numa categoria: as quests dela deixam de ser cortadas pelo local. Ligado numa categoria com quests sem lugar: elas ficam de fora quando há local marcado.

---

### Task 1: Banco e camada de dados (`has_place`, lugar da quest)

**Files:**
- Create: `supabase/migrations/20261008000001_places.sql`
- Modify: `src/lib/types.ts`, `src/data/api.ts`, `src/test/fixtures.ts`, `src/dev/sampleData.ts`, `src/pages/QuestFormPage.tsx` (payload), `src/pages/QuestFormPage.test.tsx` (payload esperado)
- Test: `src/data/api.test.ts`

**Interfaces:**
- Produces:
  - `Category.has_place: boolean`;
  - `Quest.state`, `Quest.country` e `Quest.place_label` (`string | null`); `Quest.lat` e `Quest.lng` (`number | null`);
  - `QuestInput` inclui os cinco;
  - `setCategoryPlace(id: string, hasPlace: boolean): Promise<void>`;
  - nas fixtures, `CATS.viagem`, `CATS.restaurante` e `CATS.atividade` com `has_place: true`.

- [ ] **Step 1: Write the failing test**

In `src/data/api.test.ts`, add `setCategoryPlace` to the `./api` import and append:

```ts
it('setCategoryPlace switches the physical place of a category', async () => {
  const eq = vi.fn().mockResolvedValue({ data: null, error: null })
  const update = vi.fn(() => ({ eq }))
  vi.mocked(supabase.from).mockReturnValue({ update } as never)
  await setCategoryPlace('c1', true)
  expect(supabase.from).toHaveBeenCalledWith('categories')
  expect(update).toHaveBeenCalledWith({ has_place: true })
  expect(eq).toHaveBeenCalledWith('id', 'c1')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/api.test.ts`
Expected: FAIL. `setCategoryPlace is not a function`.

- [ ] **Step 3: Migration, types, API, fixtures, sample data and payload**

```sql
-- supabase/migrations/20261008000001_places.sql
-- Categories with a physical place, and the quest's place in levels (city/state/country) from the place search.
-- Run in the SQL Editor BEFORE deploying the app that reads and writes these columns.
alter table public.categories add column has_place boolean not null default false;
update public.categories set has_place = true where builtin and name in ('Viagem', 'Restaurante', 'Atividade');

alter table public.quests
  add column state text check (state is null or length(trim(state)) between 1 and 80),
  add column country text check (country is null or length(trim(country)) between 1 and 80),
  add column place_label text check (place_label is null or length(trim(place_label)) between 1 and 200),
  add column lat double precision check (lat is null or lat between -90 and 90),
  add column lng double precision check (lng is null or lng between -180 and 180);
```

`src/lib/types.ts`:
- In `Category`, after `builtin: boolean`, add `has_place: boolean`.
- In `Quest`, after `city: string | null`, add:

```ts
  state: string | null
  country: string | null
  place_label: string | null
  lat: number | null
  lng: number | null
```

`src/data/api.ts`:
- `QuestInput` becomes:

```ts
export type QuestInput = Pick<
  Quest,
  'parent_id' | 'category_id' | 'title' | 'notes' | 'difficulty' | 'media_id' | 'type_id' | 'city' | 'state' | 'country' | 'place_label' | 'lat' | 'lng'
>
```

- Right after `deleteCategory`, add:

```ts
export async function setCategoryPlace(id: string, hasPlace: boolean) {
  check(await supabase.from('categories').update({ has_place: hasPlace }).eq('id', id))
}
```

`src/test/fixtures.ts`:
- In `category()`, change `kind: 'general', builtin: true, created_at: T,` to `kind: 'general', builtin: true, has_place: false, created_at: T,`.
- In `quest()`, change `type_id: null, city: null,` to `type_id: null, city: null, state: null, country: null, place_label: null, lat: null, lng: null,`.
- In `CATS`, add `has_place: true` to `viagem`, `restaurante` and `atividade`:

```ts
  viagem: category({ id: 'cat-viagem', name: 'Viagem', icon: 'plane', color: '#0ea5e9', has_place: true }),
  restaurante: category({ id: 'cat-rest', name: 'Restaurante', icon: 'utensils', color: '#f97316', has_place: true }),
  atividade: category({ id: 'cat-ativ', name: 'Atividade', icon: 'target', color: '#22c55e', has_place: true }),
```

`src/dev/sampleData.ts`:
- The `cat` helper gains a last parameter `has_place = false` and includes it in the object:

```ts
const cat = (id: string, name: string, icon: string, color: string, kind: CategoryKind = 'general', has_place = false): Category => ({
  id, name, icon, color, kind, builtin: true, has_place, created_at: T,
})
```

- The calls for viagem, rest and ativ become `cat('viagem', 'Viagem', 'plane', '#0ea5e9', 'general', true)`, `cat('rest', 'Restaurante', 'utensils', '#f97316', 'general', true)` and `cat('ativ', 'Atividade', 'target', '#22c55e', 'general', true)`.
- In the `quest` helper, change `type_id: null, city: null,` to `type_id: null, city: null, state: null, country: null, place_label: null, lat: null, lng: null,`.

`src/pages/QuestFormPage.tsx`: in `save()`, add the five fields to the `input`, keeping the existing values. Task 3 replaces this with the form's `place`.

```ts
        type_id: typeId, city: city.trim() || null,
        state: existing?.state ?? null, country: existing?.country ?? null, place_label: existing?.place_label ?? null,
        lat: existing?.lat ?? null, lng: existing?.lng ?? null,
```

`src/pages/QuestFormPage.test.tsx`: in `'creates a top-level quest'`, the expected object gains `state: null, country: null, place_label: null, lat: null, lng: null` after `city: null`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/data/api.test.ts && npx vitest run && npm run typecheck`
Expected:
- o teste da API passa;
- todos os testes passam;
- o typecheck fica limpo.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261008000001_places.sql src/lib/types.ts src/data/api.ts src/data/api.test.ts src/test/fixtures.ts src/dev/sampleData.ts src/pages/QuestFormPage.tsx src/pages/QuestFormPage.test.tsx
git commit -m "feat(local): categories with a physical place and the quest place in levels (state, country, label, coordinates)"
```

---

### Task 2: `place.ts` (busca, lugar efetivo, opções e "dentro de")

**Files:**
- Create: `src/lib/place.ts`
- Modify: `src/lib/text.ts` (recebe `normalizeText` e `sameText`), `src/lib/filters.ts` (re-exporta os dois de `./text`)
- Test: `src/lib/place.test.ts`

**Interfaces:**
- Consumes: `Quest` com os campos de lugar (Task 1).
- Produces (`src/lib/place.ts`):
  - `interface Place { city: string | null; state: string | null; country: string | null }`;
  - `interface PlaceChoice extends Place { label: string; lat: number; lng: number }`;
  - `type PlaceLevel = 'country' | 'state' | 'city'`;
  - `interface PlaceOption { key: string; label: string; level: PlaceLevel }`;
  - `normalizePlace(r: NominatimResult): PlaceChoice`;
  - `searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceChoice[]>`;
  - `effectivePlace(quests: Quest[], id: string): Place | null`;
  - `placeLabel(p: Place): string` e `mostSpecific(p: Place): string | null`;
  - `placeOptions(quests: Quest[], among?: Quest[]): Record<PlaceLevel, PlaceOption[]>`;
  - `placeWithin(p: Place, key: string): boolean`.
- `normalizeText` e `sameText` passam a morar em `src/lib/text.ts`; `src/lib/filters.ts` os re-exporta, então os imports atuais continuam valendo.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/place.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { quest } from '../test/fixtures'
import { effectivePlace, mostSpecific, normalizePlace, placeLabel, placeOptions, placeWithin, searchPlaces } from './place'

describe('normalizePlace', () => {
  it('reads city, state and country, and builds a label without repeats', () => {
    expect(
      normalizePlace({ name: 'Ribeirão Preto', lat: '-21.17', lon: '-47.81', address: { city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil' } }),
    ).toEqual({ city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', label: 'Ribeirão Preto, São Paulo, Brasil', lat: -21.17, lng: -47.81 })
  })
  it('uses town or village when there is no city, and keeps a place name before it', () => {
    expect(normalizePlace({ name: 'Brabus Burguer', lat: '1', lon: '2', address: { town: 'Brodowski', state: 'São Paulo', country: 'Brasil' } }).label)
      .toBe('Brabus Burguer, Brodowski, São Paulo, Brasil')
    expect(normalizePlace({ name: 'Cunha', lat: '1', lon: '2', address: { village: 'Cunha', country: 'Brasil' } }).city).toBe('Cunha')
  })
  it('a country or a state alone keeps only its levels', () => {
    expect(normalizePlace({ name: 'Japão', lat: '36', lon: '138', address: { country: 'Japão' } })).toMatchObject({ city: null, state: null, country: 'Japão', label: 'Japão' })
    expect(normalizePlace({ name: 'São Paulo', lat: '1', lon: '2', address: { state: 'São Paulo', country: 'Brasil' } })).toMatchObject({ city: null, state: 'São Paulo', label: 'São Paulo, Brasil' })
  })
})

describe('searchPlaces', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('asks Nominatim in Portuguese for 5 places with address details', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ name: 'Japão', lat: '36', lon: '138', address: { country: 'Japão' } }] })
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchPlaces('japao')).toEqual([{ city: null, state: null, country: 'Japão', label: 'Japão', lat: 36, lng: 138 }])
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search')
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'japao', format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'pt-BR' })
  })
  it('fails loudly on an HTTP error so the field can say so', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(searchPlaces('japao')).rejects.toThrow('429')
  })
})

const japao = quest({ id: 'japao', city: null, country: 'Japão ' })
const toquio = quest({ id: 'toquio', parent_id: 'japao', city: 'Tóquio', country: 'Japão' })
const ramen = quest({ id: 'ramen', parent_id: 'toquio' })
const rp = quest({ id: 'rp', city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil' })
const rpOld = quest({ id: 'rp-old', city: 'ribeirao preto ' })
const camp = quest({ id: 'camp', city: 'Campinas', state: 'São Paulo', country: 'Brasil' })
const sm = quest({ id: 'sm', city: 'Santa Maria', state: 'Rio Grande do Sul', country: 'Brasil' })
const smDf = quest({ id: 'sm-df', city: 'Santa Maria', state: 'Distrito Federal', country: 'Brasil' })
const anime = quest({ id: 'anime' })
const all = [japao, toquio, ramen, rp, rpOld, camp, sm, smDf, anime]

describe('effectivePlace', () => {
  it('uses the quest own place, trimmed', () => expect(effectivePlace(all, 'japao')).toEqual({ city: null, state: null, country: 'Japão' }))
  it('inherits the nearest ancestor place', () => expect(effectivePlace(all, 'ramen')).toEqual({ city: 'Tóquio', state: null, country: 'Japão' }))
  it('is null when nobody up the tree has a place', () => expect(effectivePlace(all, 'anime')).toBeNull())
  it('labels and picks the most specific level', () => {
    const p = effectivePlace(all, 'rp')!
    expect(placeLabel(p)).toBe('Ribeirão Preto, São Paulo, Brasil')
    expect(mostSpecific(p)).toBe('Ribeirão Preto')
    expect(mostSpecific(effectivePlace(all, 'japao')!)).toBe('Japão')
  })
})

describe('placeOptions', () => {
  const labels = (list: { label: string }[]) => list.map((o) => o.label)
  it('lists countries, states and cities once each, alphabetically', () => {
    const o = placeOptions(all)
    expect(labels(o.country)).toEqual(['Brasil', 'Japão'])
    expect(labels(o.state)).toEqual(['Distrito Federal', 'Rio Grande do Sul', 'São Paulo'])
  })
  it('a legacy city typed without state merges into the full city of the same name', () => {
    expect(labels(placeOptions(all, [rp, rpOld]).city)).toEqual(['Ribeirão Preto'])
  })
  it('cities with the same name in different states show the state', () => {
    expect(labels(placeOptions(all, [sm, smDf]).city)).toEqual(['Santa Maria · Distrito Federal', 'Santa Maria · Rio Grande do Sul'])
  })
})

describe('placeWithin', () => {
  const key = (level: 'country' | 'state' | 'city', label: string) => placeOptions(all)[level].find((o) => o.label === label)!.key
  const within = (id: string, k: string) => placeWithin(effectivePlace(all, id)!, k)
  it('a country takes every place inside it', () => {
    expect(within('rp', key('country', 'Brasil'))).toBe(true)
    expect(within('camp', key('country', 'Brasil'))).toBe(true)
    expect(within('toquio', key('country', 'Brasil'))).toBe(false)
  })
  it('a state takes its cities only', () => {
    expect(within('camp', key('state', 'São Paulo'))).toBe(true)
    expect(within('sm', key('state', 'São Paulo'))).toBe(false)
  })
  it('a city takes that city, including the legacy one typed without state', () => {
    expect(within('rp', key('city', 'Ribeirão Preto'))).toBe(true)
    expect(within('rp-old', key('city', 'Ribeirão Preto'))).toBe(true)
    expect(within('camp', key('city', 'Ribeirão Preto'))).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/place.test.ts`
Expected: FAIL. O import falha porque o módulo `./place` ainda não existe.

- [ ] **Step 3: Move the text helpers**

`src/lib/text.ts`: append

```ts
export const normalizeText = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export const sameText = (a: string, b: string) => normalizeText(a) === normalizeText(b)
```

`src/lib/filters.ts`:
- delete its own `normalizeText` and `sameText` definitions;
- add at the top `import { normalizeText } from './text'` and `export { normalizeText, sameText } from './text'`.

- [ ] **Step 4: Write `place.ts`**

```ts
// src/lib/place.ts
// Places in levels (country → state → city), from the OpenStreetMap search, and how the draw matches them.
import { normalizeText, sameText } from './text'
import type { Quest } from './types'

export interface Place {
  city: string | null
  state: string | null
  country: string | null
}
export interface PlaceChoice extends Place {
  label: string
  lat: number
  lng: number
}
export type PlaceLevel = 'country' | 'state' | 'city'
export interface PlaceOption {
  key: string
  label: string
  level: PlaceLevel
}

interface NominatimResult {
  name?: string
  lat: string
  lon: string
  address?: Record<string, string | undefined>
}

export function normalizePlace(r: NominatimResult): PlaceChoice {
  const a = r.address ?? {}
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? null
  const state = a.state ?? null
  const country = a.country ?? null
  const parts = [city, state, country].filter((p): p is string => !!p)
  const name = r.name && !parts.some((p) => sameText(p, r.name!)) ? r.name : null
  return { city, state, country, label: [name, ...parts].filter(Boolean).join(', '), lat: Number(r.lat), lng: Number(r.lon) }
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceChoice[]> {
  const params = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'pt-BR' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  return ((await res.json()) as NominatimResult[]).map(normalizePlace)
}

const clean = (s: string | null | undefined) => (s?.trim() ? s.trim() : null)

// The quest's own place, or the nearest ancestor's (Japão → Tóquio → Ichiran).
export function effectivePlace(quests: Quest[], id: string): Place | null {
  const byId = new Map(quests.map((q) => [q.id, q]))
  let q = byId.get(id)
  for (let hops = 0; q && hops <= quests.length; hops++) {
    const p = { city: clean(q.city), state: clean(q.state), country: clean(q.country) }
    if (p.city || p.state || p.country) return p
    q = q.parent_id ? byId.get(q.parent_id) : undefined
  }
  return null
}

export const placeLabel = (p: Place) => [p.city, p.state, p.country].filter(Boolean).join(', ')
export const mostSpecific = (p: Place) => p.city ?? p.state ?? p.country

const n = (s: string | null) => (s ? normalizeText(s) : '')

// Chips for the draw, from the effective places of `among`. Keys: "country:c", "state:c|s", "city:c|s|ci" (normalized).
export function placeOptions(quests: Quest[], among: Quest[] = quests): Record<PlaceLevel, PlaceOption[]> {
  const found: Record<PlaceLevel, Map<string, PlaceOption & { state: string | null }>> = { country: new Map(), state: new Map(), city: new Map() }
  const add = (level: PlaceLevel, key: string, label: string, state: string | null) => {
    if (!found[level].has(key)) found[level].set(key, { key, label, level, state })
  }
  for (const q of among) {
    const p = effectivePlace(quests, q.id)
    if (!p) continue
    if (p.country) add('country', `country:${n(p.country)}`, p.country, null)
    if (p.state) add('state', `state:${n(p.country)}|${n(p.state)}`, p.state, null)
    if (p.city) add('city', `city:${n(p.country)}|${n(p.state)}|${n(p.city)}`, p.city, p.state)
  }
  // A city typed without state/country (before the search existed) merges into a full city of the same name.
  const cities = [...found.city.values()]
  const legacy = (c: { key: string }) => c.key.startsWith('city:||')
  const kept = cities.filter((c) => !legacy(c) || !cities.some((f) => !legacy(f) && sameText(f.label, c.label)))
  const named = kept.map((c) => (c.state && kept.some((o) => o !== c && sameText(o.label, c.label)) ? { ...c, label: `${c.label} · ${c.state}` } : c))
  const sorted = (list: PlaceOption[]) =>
    list.map(({ key, label, level }) => ({ key, label, level })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  return { country: sorted([...found.country.values()]), state: sorted([...found.state.values()]), city: sorted(named) }
}

// Is this place inside the chip `key`? Missing levels on either side don't block a match (legacy cities).
export function placeWithin(p: Place, key: string): boolean {
  const [level, rest = ''] = key.split(':')
  const [country = '', state = '', city = ''] = rest.split('|')
  const matches = (value: string | null, wanted: string) => !wanted || !value || n(value) === wanted
  if (level === 'country') return !!p.country && n(p.country) === country
  if (level === 'state') return !!p.state && n(p.state) === state && matches(p.country, country)
  return !!p.city && n(p.city) === city && matches(p.state, state) && matches(p.country, country)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/place.test.ts && npx vitest run && npm run typecheck`
Expected:
- `place.test.ts` passa (13 testes);
- a suíte inteira passa;
- o typecheck fica limpo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/place.ts src/lib/place.test.ts src/lib/text.ts src/lib/filters.ts
git commit -m "feat(local): place search (OpenStreetMap), effective place, place options in levels and 'within' matching"
```

---

### Task 3: Campo "Local" no formulário (busca, herdado, fallback)

**Files:**
- Create: `src/components/PlaceField.tsx`
- Modify: `src/pages/QuestFormPage.tsx` (substitui o campo "Cidade")
- Test: `src/pages/QuestFormPage.test.tsx`

**Interfaces:**
- Consumes: `searchPlaces`, `PlaceChoice`, `effectivePlace` e `placeLabel` (Task 2); `Category.has_place` (Task 1).
- Produces:
  - `export interface PlaceFields { city; state; country; place_label: string | null; lat; lng: number | null }`;
  - `export const NO_PLACE: PlaceFields`;
  - `export default function PlaceField({ value, inherited, onChange }: { value: PlaceFields; inherited: string | null; onChange: (v: PlaceFields) => void })`.

- [ ] **Step 1: Write the failing tests**

In `src/pages/QuestFormPage.test.tsx`:

1. Add this mock below the existing `vi.mock('../lib/catalog', …)`, and add `import * as place from '../lib/place'` to the imports:

```tsx
vi.mock('../lib/place', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/place')>()),
  searchPlaces: vi.fn(),
}))
```

2. In the existing `beforeEach`, add `vi.mocked(place.searchPlaces).mockResolvedValue([])`.

3. In `'creates a top-level quest'`, nothing else changes.

4. Replace the test `'saves the chosen type and the trimmed city'` with:

```tsx
it('saves the chosen type, and text typed in Local without picking becomes the city', async () => {
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.click(screen.getByRole('button', { name: 'Hamburgueria' }))
  await user.type(screen.getByLabelText('Título'), 'Brabus Burguer')
  await user.click(screen.getByRole('button', { name: 'Fácil' }))
  await user.type(screen.getByLabelText(/Local/), '  Ribeirão Preto ')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() =>
    expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ type_id: 't-burger', city: 'Ribeirão Preto', state: null, country: null, place_label: null })),
  )
})
```

5. Replace `'a new subquest starts with the city of its parent'` with:

```tsx
it('a new subquest shows the place it inherits and stores none of its own', async () => {
  withTypes({ quests: [quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, city: 'Tóquio', country: 'Japão' })] })
  renderRoute(routes, '/quests/nova?parent=japao')
  expect(await screen.findByText('Herdado: Tóquio, Japão')).toBeInTheDocument()
  expect(screen.getByLabelText(/Local/)).toHaveValue('')
})
```

6. Append:

```tsx
const ribeirao = { city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', label: 'Ribeirão Preto, São Paulo, Brasil', lat: -21.17, lng: -47.81 }

it('Local only shows for categories with a physical place', async () => {
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  expect(screen.getByLabelText(/Local/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Anime' }))
  expect(screen.queryByLabelText(/Local/)).not.toBeInTheDocument()
})

it('typing searches once after a pause, and picking a suggestion saves the whole place', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao])
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText('Título'), 'Brabus')
  await user.click(screen.getByRole('button', { name: 'Fácil' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão')
  await user.click(await screen.findByRole('button', { name: 'Ribeirão Preto, São Paulo, Brasil' }))
  expect(place.searchPlaces).toHaveBeenCalledTimes(1)
  expect(vi.mocked(place.searchPlaces).mock.calls[0][0]).toBe('Ribeirão')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() =>
    expect(api.createQuest).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', place_label: 'Ribeirão Preto, São Paulo, Brasil', lat: -21.17, lng: -47.81 }),
    ),
  )
})

it('× clears the chosen place', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockResolvedValue([ribeirao])
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão')
  await user.click(await screen.findByRole('button', { name: 'Ribeirão Preto, São Paulo, Brasil' }))
  await user.click(screen.getByRole('button', { name: 'Limpar local' }))
  expect(screen.getByLabelText(/Local/)).toHaveValue('')
})

it('a failed search says so', async () => {
  withTypes()
  vi.mocked(place.searchPlaces).mockRejectedValue(new Error('offline'))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText(/Local/), 'Ribeirão')
  expect(await screen.findByRole('alert')).toHaveTextContent('Não deu para buscar agora')
})

it('moving a quest to a category without a physical place keeps its stored place', async () => {
  withTypes({ quests: [quest({ id: 'brabus', title: 'Brabus', category_id: CATS.restaurante.id, city: 'Ribeirão Preto', country: 'Brasil', place_label: 'Ribeirão Preto, Brasil' })] })
  const user = userEvent.setup()
  renderRoute([{ path: '/quests/:id/editar', element: <QuestFormPage /> }, { path: '/quests/:id', element: <p>quest</p> }], '/quests/brabus/editar')
  await user.click(await screen.findByRole('button', { name: 'Atividade' }))
  await user.click(screen.getByRole('button', { name: 'Anime' }))
  expect(screen.queryByLabelText(/Local/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.updateQuest).toHaveBeenCalledWith('brabus', expect.objectContaining({ city: 'Ribeirão Preto', country: 'Brasil', place_label: 'Ribeirão Preto, Brasil' })))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/QuestFormPage.test.tsx`
Expected: FAIL. Não há campo "Local", nem "Herdado:", nem as sugestões.

- [ ] **Step 3: Write `PlaceField`**

```tsx
// src/components/PlaceField.tsx
import { MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { searchPlaces, type PlaceChoice } from '../lib/place'

export interface PlaceFields {
  city: string | null
  state: string | null
  country: string | null
  place_label: string | null
  lat: number | null
  lng: number | null
}
export const NO_PLACE: PlaceFields = { city: null, state: null, country: null, place_label: null, lat: null, lng: null }

// Place search (OpenStreetMap): 3+ letters and a 500 ms pause, then pick a suggestion. Text typed without picking is kept as the city.
export default function PlaceField({ value, inherited, onChange }: { value: PlaceFields; inherited: string | null; onChange: (v: PlaceFields) => void }) {
  const chosen = value.place_label
  const [text, setText] = useState(chosen ? '' : (value.city ?? ''))
  const [results, setResults] = useState<PlaceChoice[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')

  useEffect(() => {
    const q = text.trim()
    if (chosen || q.length < 3) {
      setResults([])
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setStatus('loading')
      searchPlaces(q, controller.signal)
        .then((list) => {
          setResults(list)
          setStatus(list.length ? 'idle' : 'empty')
        })
        .catch(() => {
          if (!controller.signal.aborted) setStatus('error')
        })
    }, 500)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text, chosen])

  function type(t: string) {
    setText(t)
    onChange({ ...NO_PLACE, city: t.trim() || null })
  }

  function pick(p: PlaceChoice) {
    onChange({ city: p.city, state: p.state, country: p.country, place_label: p.label, lat: p.lat, lng: p.lng })
    setResults([])
  }

  function clear() {
    setText('')
    onChange(NO_PLACE)
  }

  return (
    <div className="space-y-2">
      <span id="place-label" className="block font-bold">Local <span className="font-normal text-ink/60">(opcional)</span></span>
      {chosen ? (
        <div className="flex items-center gap-2 rounded-2xl bg-blush/30 p-2 pl-3">
          <MapPin aria-hidden className="size-4 shrink-0 text-accent" />
          <span className="flex-1 font-semibold">{chosen}</span>
          <button type="button" aria-label="Limpar local" onClick={clear} className="grid size-9 place-items-center rounded-full hover:bg-blush/50">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : (
        <input aria-labelledby="place-label" className="input" value={text} maxLength={80} placeholder="Cidade, estado ou país" onChange={(e) => type(e.target.value)} />
      )}
      {!chosen && !text && inherited && <p className="text-sm text-ink/60">Herdado: {inherited}</p>}
      {status === 'loading' && <p className="text-sm text-ink/60">Buscando…</p>}
      {status === 'empty' && <p className="text-sm text-ink/60">Nenhum lugar encontrado.</p>}
      {status === 'error' && <p role="alert" className="text-sm text-red-600">Não deu para buscar agora. O que você digitou fica salvo como cidade.</p>}
      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((p) => (
            <li key={`${p.label}-${p.lat}-${p.lng}`}>
              <button type="button" onClick={() => pick(p)} className="w-full rounded-xl px-3 py-2 text-left hover:bg-blush/30">{p.label}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink/60">
        Lugares © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Use it in the form**

In `src/pages/QuestFormPage.tsx`:

1. **Imports:**
   - remove `cityOptions` from the `../lib/filters` import (keep `sameText`);
   - remove `import { effectiveCity } from '../lib/tree'`;
   - add `import PlaceField, { NO_PLACE, type PlaceFields } from '../components/PlaceField'` and `import { effectivePlace, placeLabel } from '../lib/place'`.

2. **State:** replace the `city` state line with:

```tsx
  const [place, setPlace] = useState<PlaceFields>(
    existing
      ? { city: existing.city, state: existing.state, country: existing.country, place_label: existing.place_label, lat: existing.lat, lng: existing.lng }
      : NO_PLACE,
  )
  const inherited = parentId ? effectivePlace(data.quests, parentId) : null
```

3. **Payload:** in `save()`, replace the place fields with:

```tsx
        type_id: typeId,
        city: place.city?.trim() || null, state: place.state, country: place.country, place_label: place.place_label, lat: place.lat, lng: place.lng,
```

4. **JSX:** replace the whole `<label className="block">…Cidade…</label>` block (with its `<datalist>`) with:

```tsx
          {category?.has_place && <PlaceField value={place} inherited={inherited ? placeLabel(inherited) : null} onChange={setPlace} />}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/pages/QuestFormPage.test.tsx && npx vitest run && npm run typecheck`
Expected:
- os testes do formulário passam;
- a suíte inteira passa;
- o typecheck fica limpo.

- [ ] **Step 6: Commit**

```bash
git add src/components/PlaceField.tsx src/pages/QuestFormPage.tsx src/pages/QuestFormPage.test.tsx
git commit -m "feat(local): Local field with the OpenStreetMap search in the quest form (physical categories only, inherited hint, city fallback)"
```

---

### Task 4: Sorteio e linha do card com os níveis de local

**Files:**
- Modify: `src/lib/filters.ts` (`DrawFilter.places`, `drawPool` com categorias; remove `cityOptions`)
- Modify: `src/lib/tree.ts` (`questMeta` com `effectivePlace`; remove `effectiveCity`)
- Modify: `src/components/DrawDialog.tsx` (grupo "Local"), `src/components/QuestActions.tsx`
- Test: `src/lib/draw.test.ts`, `src/components/DrawDialog.test.tsx`

**Interfaces:**
- Consumes: `effectivePlace`, `placeOptions`, `placeWithin`, `mostSpecific`, `PlaceOption` e `PlaceLevel` (Task 2); `Category.has_place` (Task 1).
- Produces:
  - `DrawFilter { categoryIds: string[]; typeIds: string[]; difficulties: Difficulty[]; places: string[] }`;
  - `drawPool(quests, done, f, ctx?: { types?: QuestType[]; categories?: Category[] })`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/draw.test.ts`:
- **Imports:**
  - change the fixtures import to `import { category, quest, questType } from '../test/fixtures'`;
  - change the filters import to `import { drawPool, sameText, type DrawFilter } from './filters'`;
  - change the tree import to `import { questMeta } from './tree'`.
- **Remove:**
  - the `describe('effectiveCity', …)` and `describe('cityOptions', …)` blocks (Task 2 covers them in `place.test.ts`);
  - inside `describe('drawPool')`, the tests `'cities ignore accents, case and spaces, and count the inherited city'` and `'combines every filter'`.
- **Change:** the `none`/`pool` lines to:

```ts
const categories = [
  category({ id: 'viagem', has_place: true }),
  category({ id: 'ativ', has_place: true }),
  category({ id: 'rest', has_place: true }),
  category({ id: 'filme' }),
]
const none: DrawFilter = { categoryIds: [], typeIds: [], difficulties: [], places: [] }
const pool = (done: string[], f: Partial<DrawFilter> = {}) => drawPool(quests, new Set(done), { ...none, ...f }, { types, categories }).map((q) => q.id).sort()
```

- **Append inside `describe('drawPool')`:**

```ts
  it('a place ignores accents, case and spaces, and counts the inherited place', () => {
    expect(pool([], { places: ['city:||ribeirao preto'] })).toEqual(['brabus', 'forno', 'matrix'])
    expect(pool(['matrix'], { places: ['city:||toquio'] })).toEqual(['fuji', 'toquio'])
  })
  it('a place never cuts categories without a physical place', () => {
    expect(pool([], { places: ['city:||ribeirao preto'] })).toContain('matrix')
  })
  it('combines every filter', () => {
    expect(pool([], { categoryIds: ['rest'], difficulties: ['medium'], places: ['city:||ribeirao preto'] })).toEqual(['forno'])
  })
  it('a country or a state takes everything inside it', () => {
    const rp = quest({ id: 'rp', category_id: 'rest', city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil' })
    const rio = quest({ id: 'rio', category_id: 'rest', city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brasil' })
    const tk = quest({ id: 'tk', category_id: 'viagem', city: 'Tóquio', country: 'Japão' })
    const ids = (places: string[]) => drawPool([rp, rio, tk], new Set(), { ...none, places }, { categories }).map((q) => q.id).sort()
    expect(ids(['country:brasil'])).toEqual(['rio', 'rp'])
    expect(ids(['state:brasil|sao paulo'])).toEqual(['rp'])
    expect(ids(['country:japao', 'state:brasil|rio de janeiro'])).toEqual(['rio', 'tk'])
  })
```

In `src/components/DrawDialog.test.tsx`:
- Add `country: 'Brasil', state: 'São Paulo'` to `brabus`.
- Change `forno` to `city: 'Niterói', state: 'Rio de Janeiro', country: 'Brasil'`.
- Add an anime quest and include it in `data.quests`:

```tsx
const naruto = quest({ id: 'naruto', title: 'Naruto', category_id: CATS.anime.id })
```

- Replace `'cities narrow the draw, and no match disables it'` with:

```tsx
it('a place narrows the physical categories only, and no match disables the draw', async () => {
  const user = userEvent.setup()
  open(CATS.restaurante.id)
  await user.click(button('Anime'))
  expect(screen.getByText('3 quests no sorteio')).toBeInTheDocument()
  await user.click(button('Ribeirão Preto'))
  expect(screen.getByText('2 quests no sorteio')).toBeInTheDocument()
  await user.click(button('Anime'))
  await user.click(button('Difícil'))
  expect(screen.getByText('Nenhuma quest com esses filtros')).toBeInTheDocument()
  expect(draw()).toBeDisabled()
})

it('Local shows countries, states and cities, and a country or state takes everything inside', async () => {
  const user = userEvent.setup()
  open(CATS.restaurante.id)
  expect(within(screen.getByRole('group', { name: 'Países' })).getByRole('button', { name: 'Brasil' })).toBeInTheDocument()
  expect(within(screen.getByRole('group', { name: 'Estados' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['Rio de Janeiro', 'São Paulo'])
  await user.click(button('Brasil'))
  expect(screen.getByText('2 quests no sorteio')).toBeInTheDocument()
  await user.click(button('Brasil'))
  await user.click(button('São Paulo'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/draw.test.ts src/components/DrawDialog.test.tsx`
Expected: FAIL.
- O `drawPool` ainda ignora `places` e as categorias.
- O sorteio ainda mostra "Cidade" sem países nem estados.
- O anime é cortado pela cidade.

- [ ] **Step 3: Implement**

`src/lib/filters.ts`:
- Imports: add `import { effectivePlace, placeWithin } from './place'`, and add `Category` to the types import.
- In `DrawFilter`, replace the `cities` line with:

```ts
  places: string[] // placeOptions keys; empty = any; only narrows categories with a physical place
```

- Change the `drawPool` signature and its last filter, and keep the other filters as they are:

```ts
export function drawPool(quests: Quest[], done: Set<string>, f: DrawFilter, ctx: { types?: QuestType[]; categories?: Category[] } = {}): Quest[] {
  const pending = quests.filter((q) => !done.has(q.id))
  const hasPendingChild = new Set(pending.flatMap((q) => q.parent_id ?? []))
  const categoryOf = new Map((ctx.types ?? []).map((t) => [t.id, t.category_id]))
  const physical = new Set((ctx.categories ?? []).filter((c) => c.has_place).map((c) => c.id))
  // "Filme + Restaurante + Hamburgueria" = any film, or a burger place: a chosen type narrows only its own category.
  const chosenTypes = (categoryId: string) => f.typeIds.filter((id) => categoryOf.get(id) === categoryId)
  return pending
    .filter((q) => !hasPendingChild.has(q.id))
    .filter((q) => !f.categoryIds.length || f.categoryIds.includes(q.category_id))
    .filter((q) => {
      const chosen = chosenTypes(q.category_id)
      return !chosen.length || (q.type_id !== null && chosen.includes(q.type_id))
    })
    .filter((q) => !f.difficulties.length || f.difficulties.includes(q.difficulty))
    // A place only narrows categories with a physical place: an anime is never cut by "Ribeirão Preto".
    .filter((q) => {
      if (!f.places.length || !physical.has(q.category_id)) return true
      const place = effectivePlace(quests, q.id)
      return !!place && f.places.some((k) => placeWithin(place, k))
    })
}
```

- Delete `cityOptions` and the `import { effectiveCity } from './tree'` line.

`src/lib/tree.ts`:
- Delete `effectiveCity`.
- Add `import { effectivePlace, mostSpecific } from './place'`.
- Change `questMeta` to:

```ts
// "Hamburgueria · Ribeirão Preto" — the type and the most specific level of the effective place, when they exist.
export function questMeta(data: Pick<AppData, 'quests' | 'questTypes'>, quest: Quest): string {
  const type = data.questTypes.find((t) => t.id === quest.type_id)?.name
  const place = effectivePlace(data.quests, quest.id)
  return [type, place && mostSpecific(place)].filter(Boolean).join(' · ')
}
```

`src/components/QuestActions.tsx`: the filter object becomes `{ categoryIds: [], typeIds: [], difficulties: [], places: [] }`.

`src/components/DrawDialog.tsx`:
1. **Imports:**
   - the filters import becomes `import { drawPool, type DrawFilter } from '../lib/filters'`;
   - add `import { placeOptions, type PlaceLevel, type PlaceOption } from '../lib/place'`.
2. **Initial filter:** `places: []` instead of `cities: []`.
3. **Options and pruning:** replace the `cities`/`active`/`pool` lines with:

```tsx
  const physical = data.categories.filter((c) => c.has_place).map((c) => c.id)
  const candidates = drawPool(data.quests, done, { categoryIds: filter.categoryIds, typeIds: [], difficulties: [], places: [] }).filter((q) =>
    physical.includes(q.category_id),
  )
  const places = placeOptions(data.quests, candidates)
  const placeKeys = [...places.country, ...places.state, ...places.city].map((o) => o.key)
  // Selections whose chip is not on screen (a place of another category, a type deleted meanwhile) are ignored, never silently applied.
  const active: DrawFilter = {
    ...filter,
    typeIds: filter.typeIds.filter((id) => types.some((t) => t.id === id)),
    places: filter.places.filter((k) => placeKeys.includes(k)),
  }
  const pool = drawPool(data.quests, done, active, { types: data.questTypes, categories: data.categories })
```

4. **Props:** pass `places={places}` instead of `cities={cities}` to `<Filters>`. In the `Filters` props type, replace `cities: string[]` with `places: Record<PlaceLevel, PlaceOption[]>`.
5. **Local group:** in `Filters`, replace the whole `{cities.length > 0 && (<Group id="draw-city" title="Cidade">…</Group>)}` block with:

```tsx
      {LEVELS.some((l) => places[l].length > 0) && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-white/80">Local</h3>
          {LEVELS.filter((l) => places[l].length > 0).map((level) => (
            <div key={level} role="group" aria-label={LEVEL_LABEL[level]} className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-xs font-semibold text-white/70">{LEVEL_LABEL[level]}</span>
              {places[level].map((o) => (
                <button key={o.key} type="button" className={`${CHIP} pl-3`} aria-pressed={filter.places.includes(o.key)} onClick={() => onChange({ ...filter, places: toggle(filter.places, o.key) })}>
                  {o.label}
                </button>
              ))}
            </div>
          ))}
        </section>
      )}
```

   and next to the other constants at the top of the file:

```tsx
const LEVELS: PlaceLevel[] = ['country', 'state', 'city']
const LEVEL_LABEL: Record<PlaceLevel, string> = { country: 'Países', state: 'Estados', city: 'Cidades' }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/draw.test.ts src/components/DrawDialog.test.tsx && npx vitest run && npm run typecheck`
Expected:
- os testes do sorteio passam;
- a suíte inteira passa, incluindo os testes de card e topo com "Roteiro · Tóquio";
- o typecheck fica limpo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filters.ts src/lib/tree.ts src/lib/draw.test.ts src/components/DrawDialog.tsx src/components/DrawDialog.test.tsx src/components/QuestActions.tsx
git commit -m "fix(sorteio): places only narrow categories with a physical place; Local filter in levels (countries, states, cities)"
```

---

### Task 5: Interruptor "Lugar físico" e crédito no Perfil

**Files:**
- Modify: `src/pages/ProfilePage.tsx` (`CategoryRow`, Créditos)
- Test: `src/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes: `setCategoryPlace` (Task 1), `Category.has_place`.
- Produces: nada consumido depois.

- [ ] **Step 1: Write the failing tests**

Append to `src/pages/ProfilePage.test.tsx`:

```tsx
it('each category has a physical-place switch', async () => {
  vi.mocked(api.setCategoryPlace).mockResolvedValue()
  open()
  const user = userEvent.setup()
  const filme = await screen.findByRole('switch', { name: 'Lugar físico em Filme' })
  expect(filme).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('switch', { name: 'Lugar físico em Restaurante' })).toHaveAttribute('aria-checked', 'true')
  await user.click(filme)
  expect(api.setCategoryPlace).toHaveBeenCalledWith('cat-filme', true)
})

it('credits OpenStreetMap for the places', async () => {
  open()
  expect(await screen.findByRole('link', { name: '© OpenStreetMap contributors' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: FAIL. Não há o `switch` nem o link de crédito.

- [ ] **Step 3: Implement**

In `src/pages/ProfilePage.tsx`:
- Add `setCategoryPlace` to the `../data/api` import.
- In `CategoryRow`'s normal branch, inside the first `<div className="flex items-center gap-3">`, right after `<span className="flex-1">{c.name}</span>`, add:

```tsx
        <span aria-hidden className="text-xs font-semibold text-ink/60">Lugar</span>
        <button
          type="button"
          role="switch"
          aria-checked={c.has_place}
          aria-label={`Lugar físico em ${c.name}`}
          onClick={async () => {
            await setCategoryPlace(c.id, !c.has_place)
            onChange()
          }}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${c.has_place ? 'bg-accent' : 'bg-ink/20'}`}
        >
          <span aria-hidden className={`size-5 rounded-full bg-white shadow transition-transform ${c.has_place ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
```

  A failure falls into the global "Não deu para salvar" warning.
- In the Créditos section, after the AniList paragraph, add:

```tsx
          <p>Lugares: <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/ProfilePage.test.tsx && npx vitest run && npm run typecheck`
Expected:
- os testes do Perfil passam;
- a suíte inteira passa;
- o typecheck fica limpo.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProfilePage.tsx src/pages/ProfilePage.test.tsx
git commit -m "feat(local): physical-place switch per category and OpenStreetMap credit on the profile"
```

---

### Task 6: Dados de exemplo, conferência visual e verificação final

**Files:**
- Modify: `src/dev/sampleData.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1 a 5, através do preview.
- Produces: prints no scratchpad e eventuais ajustes visuais, cada um registrado com `Ruling:`.

- [ ] **Step 1: Sample places**

In `src/dev/sampleData.ts`, in the `quests` array:
- `toquio`: `{ parent_id: 'japao', city: 'Tóquio', country: 'Japão' }`;
- `batata`: `{ type_id: 't-batata', city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brasil' }`;
- `brabus`: `{ type_id: 't-burger', city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', place_label: 'Ribeirão Preto, São Paulo, Brasil' }`;
- `serra`: `{ city: 'Campos do Jordão', state: 'São Paulo', country: 'Brasil' }`.

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck limpo.

- [ ] **Step 2: Prints**

With `D` = the session scratchpad `…/scratchpad/local` (create it), `B="http://localhost:5173/preview.html?url="`, and the dev server running:

```bash
node scripts/shot.mjs "${B}%2Fquests%2Fnova%3Fcategoria%3Drest" $D/form.png 390 844 3000 --reduce
node scripts/shot.mjs "${B}/perfil" $D/perfil.png 390 844 3000 --reduce --bottom
OPEN="(() => { const by = (t) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t); by('Sortear').click(); setTimeout(() => { by('Restaurante').click(); setTimeout(() => by('Anime').click(), 200) }, 500) })()"
node scripts/shot.mjs "${B}/" $D/sorteio-local.png 390 844 3500 "--eval=$OPEN" --after=1200
```

Expected, reading each PNG:
- **Formulário:** o campo "Local (opcional)", com o crédito do OpenStreetMap.
- **Perfil:** um interruptor "Lugar" em cada categoria; Viagem, Restaurante e Atividade ligados.
- **Sorteio:** com Restaurante + Anime, o grupo "Local" tem as linhas Países (Brasil), Estados (Rio de Janeiro, São Paulo) e Cidades, e a contagem inclui os animes.

- [ ] **Step 3: Fix what the prints show**

Ajuste as classes e repita o print. Registre cada ajuste no ledger como `Ruling:`.

- [ ] **Step 4: Final verification**

Run: `npx vitest run && npm run typecheck && npm run build && ls dist/preview.html`
Expected:
- todos os testes passando, typecheck limpo e build com sucesso;
- o `ls` falha com "No such file".

- [ ] **Step 5: Commit**

```bash
git add src/dev/sampleData.ts src
git commit -m "chore(local): sample places and visual fixes"
```

Depois, **não dê push**. Passe ao usuário o SQL de `supabase/migrations/20261008000001_places.sql` para rodar no SQL Editor, e só então peça o push.
