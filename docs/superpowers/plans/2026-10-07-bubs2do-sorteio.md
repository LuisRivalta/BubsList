# Tipos, cidade e o sorteio-constelação — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada quest ganha um tipo (lista por categoria) e uma cidade, e o "Sortear" vira uma janela com filtros (categoria, tipos, dificuldades, cidades) e uma animação de constelação em three.js.

**Architecture:**
- **Banco:** uma migração cria `quest_types` e as colunas `quests.type_id` e `quests.city`. O `loadAll` passa a trazer os tipos para `AppData.questTypes`.
- **Funções puras:**
  - `effectiveCity` e `questMeta` (em `tree.ts`);
  - `drawPool` com os novos filtros e `cityOptions` (em `filters.ts`);
  - a linha do tempo da constelação (em `constellation.ts`).
- **Telas:**
  - os tipos são gerenciados no Perfil e escolhidos ou criados no formulário;
  - o `DrawDialog` é reescrito em três passos (filtros → constelação → resultado);
  - a constelação fica no componente lazy `DrawConstellation`;
  - enquanto ela está aberta, o céu do `Layout` desmonta (`useHideSky`).

**Tech Stack:**
- React 19, React Router 7, TanStack Query 5, Supabase (Postgres + RLS);
- three.js 0.186, animejs 4;
- Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-07-bubs2do-sorteio-design.md`

## Global Constraints

- **Textos e código:**
  - textos da interface em pt-BR; identificadores de código em inglês;
  - nenhuma dependência nova.
- **Git:**
  - trabalho direto na `main`;
  - commits **sem** `Co-Authored-By` nem atribuição ao Claude;
  - **nada de push sem o OK explícito do usuário**.
- **Supabase:**
  - nunca usar ferramentas `mcp__supabase__*`;
  - a migração é rodada pelo usuário no SQL Editor.
- **Ordem do deploy:** o app passa a ler `quest_types`. Subir o front antes de o usuário rodar a migração quebra o site (o `loadAll` falha). O push só vem depois de o usuário confirmar que rodou o SQL.
- **Limites:**
  - nome do tipo com 1 a 40 caracteres;
  - cidade com 1 a 80 caracteres;
  - tipos únicos por categoria, ignorando maiúsculas no banco e maiúsculas e acentos no app (`sameText`).
- **Um contexto WebGL por vez:** o `DrawDialog` chama `useHideSky()`.
- **Animações:**
  - respeitam `prefersReducedMotion()` (o jsdom é "reduzido");
  - não deixam `transform` inline no fim.
- **Contraste:** texto `ink` com opacidade mínima de 60% (o `src/design.test.ts` falha abaixo disso).

## Review Focus

1. **Quests sem tipo nem cidade** (todas as que existem hoje):
   - continuam entrando no sorteio sem filtro de tipo ou cidade;
   - um filtro de tipo as exclui;
   - card e topo da quest não mostram linha extra.
2. **A mesma cidade escrita de jeitos diferentes** ("ribeirao preto ", "Ribeirão Preto"): vira um único chip e casa com as duas.
3. **Tipo apagado** que uma quest ainda referencia (ou categoria trocada): o formulário mostra "Nenhum" selecionado e salvar não quebra.
4. **Sorteio com 1 ou 0 quests:**
   - com 1, não há "Sortear outra";
   - com 0, o botão fica desativado e aparece "Nenhuma quest com esses filtros".
5. **Constelação:**
   - sem WebGL, cai direto no resultado;
   - "Pular" funciona;
   - fechar a janela no meio devolve o céu da página.

---

### Task 1: Banco e camada de dados (tipos, cidade, `loadAll`)

**Files:**
- Create: `supabase/migrations/20261007000002_types_city.sql`
- Modify: `src/lib/types.ts`, `src/data/api.ts`, `src/test/fixtures.ts`, `src/dev/sampleData.ts`, `src/pages/QuestFormPage.tsx` (payload), `src/pages/QuestFormPage.test.tsx` (payload esperado), `scripts/rls-smoke.mjs`
- Test: `src/data/api.test.ts`

**Interfaces:**
- Produces:
  - `interface QuestType { id: string; category_id: string; name: string; created_at: string }`;
  - `Quest.type_id: string | null` e `Quest.city: string | null`;
  - `AppData.questTypes: QuestType[]`;
  - `QuestInput` inclui `type_id` e `city`;
  - `saveQuestType(t: { id?: string; category_id: string; name: string }): Promise<QuestType>` e `deleteQuestType(id: string): Promise<void>`;
  - fixture `questType(o?: Partial<QuestType>): QuestType`.

- [ ] **Step 1: Write the failing tests**

Change the import in `src/data/api.test.ts` to `import { loadAll, saveQuestType, uploadAvatar } from './api'` and append:

```ts
it('loads the quest types with everything else', async () => {
  const tables: string[] = []
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    tables.push(table)
    const b = { select: () => b, order: () => b, range: () => Promise.resolve({ data: table === 'quest_types' ? [{ id: 't1' }] : [], error: null }) }
    return b
  }) as never)
  const data = await loadAll()
  expect(tables).toContain('quest_types')
  expect(data.questTypes).toEqual([{ id: 't1' }])
})

it('saving a quest type inserts it, or updates it by id, and returns the row', async () => {
  const single = vi.fn().mockResolvedValue({ data: { id: 't1', name: 'Hamburgueria' }, error: null })
  const chain = { select: () => ({ single }) }
  const insert = vi.fn(() => chain)
  const eq = vi.fn(() => chain)
  const update = vi.fn(() => ({ eq }))
  vi.mocked(supabase.from).mockReturnValue({ insert, update } as never)
  expect(await saveQuestType({ category_id: 'c1', name: 'Hamburgueria' })).toEqual({ id: 't1', name: 'Hamburgueria' })
  expect(insert).toHaveBeenCalledWith({ category_id: 'c1', name: 'Hamburgueria' })
  await saveQuestType({ id: 't1', category_id: 'c1', name: 'Hamburguer' })
  expect(update).toHaveBeenCalledWith({ category_id: 'c1', name: 'Hamburguer' })
  expect(eq).toHaveBeenCalledWith('id', 't1')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/data/api.test.ts`
Expected: FAIL. `saveQuestType` não existe ("is not a function") e `data.questTypes` está `undefined`.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20261007000002_types_city.sql
-- Quest types (a list per category) and the quest's city. Run in the SQL Editor BEFORE deploying the app that reads them.
create table public.quest_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
create unique index quest_types_category_name on public.quest_types (category_id, lower(name));

alter table public.quests
  add column type_id uuid references public.quest_types on delete set null,
  add column city text check (city is null or length(trim(city)) between 1 and 80);

alter table public.quest_types enable row level security;
create policy "couple reads quest types" on public.quest_types for select to authenticated using (true);
create policy "couple adds quest types" on public.quest_types for insert to authenticated with check (true);
create policy "couple edits quest types" on public.quest_types for update to authenticated using (true) with check (true);
create policy "couple deletes quest types" on public.quest_types for delete to authenticated using (true);

alter publication supabase_realtime add table public.quest_types;
```

- [ ] **Step 4: Types, API, fixtures and sample data**

`src/lib/types.ts`:
1. In `Quest`, after `media_id: string | null`, add:

```ts
  type_id: string | null
  city: string | null
```

2. After the `Category` interface, add:

```ts
export interface QuestType {
  id: string
  category_id: string
  name: string
  created_at: string
}
```

3. In `AppData`, after `categories: Category[]`, add `questTypes: QuestType[]`.

`src/data/api.ts`:
1. Add `QuestType` to the `import type { … } from '../lib/types'` list.
2. Replace `loadAll` with:

```ts
export async function loadAll(): Promise<AppData> {
  const [profiles, categories, questTypes, media, quests, completions, reviews, photos, achievements] = await Promise.all([
    all<Profile>('profiles'),
    all<Category>('categories'),
    all<QuestType>('quest_types'),
    all<Media>('media'),
    all<Quest>('quests'),
    all<Completion>('completions'),
    all<Review>('reviews'),
    all<Photo>('photos'),
    all<Achievement>('achievements'),
  ])
  return { profiles, categories, questTypes, media, quests, completions, reviews, photos, achievements }
}
```

3. Change `QuestInput` to:

```ts
export type QuestInput = Pick<Quest, 'parent_id' | 'category_id' | 'title' | 'notes' | 'difficulty' | 'media_id' | 'type_id' | 'city'>
```

4. Right after `deleteCategory`, add:

```ts
export async function saveQuestType({ id, ...row }: { id?: string; category_id: string; name: string }): Promise<QuestType> {
  const res = id
    ? await supabase.from('quest_types').update(row).eq('id', id).select().single()
    : await supabase.from('quest_types').insert(row).select().single()
  return check<QuestType>(res)
}

export async function deleteQuestType(id: string) {
  check(await supabase.from('quest_types').delete().eq('id', id))
}
```

`src/test/fixtures.ts`:
1. Add `QuestType` to the type import.
2. In `quest()`, change `media_id: null,` to `media_id: null, type_id: null, city: null,`.
3. After `category`, add:

```ts
export const questType = (o: Partial<QuestType> = {}): QuestType => ({
  id: nextId('t'), category_id: 'cat-none', name: 'Tipo', created_at: T, ...o,
})
```

4. In `appData`, change `categories: [], media: [],` to `categories: [], questTypes: [], media: [],`.

`src/dev/sampleData.ts`:
1. In the `quest` helper, change `media_id: null, progress_season: null,` to `media_id: null, type_id: null, city: null, progress_season: null,`.
2. In `sampleData`, right after the `categories: [ … ],` array, add `questTypes: [],`. Task 9 fills it in.

`src/pages/QuestFormPage.tsx`: in `save()`, add the two new fields to the `input` object, keeping the existing values. Task 4 replaces them with the form's own fields.

```ts
      const input: QuestInput = {
        parent_id: parentId, category_id: category.id, title: title.trim(), notes: notes.trim() || null, difficulty, media_id: mediaId,
        type_id: existing?.type_id ?? null, city: existing?.city ?? null,
      }
```

`src/pages/QuestFormPage.test.tsx`: in `'creates a top-level quest'`, the expected object becomes:

```ts
  expect(api.createQuest).toHaveBeenCalledWith({
    parent_id: null, category_id: CATS.restaurante.id, title: 'Batata do Marechal', notes: null, difficulty: 'medium', media_id: null, type_id: null, city: null,
  })
```

`scripts/rls-smoke.mjs`: add `'quest_types'` to the `tables` array, after `'categories'`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/data/api.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 6: Full suite and typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261007000002_types_city.sql src/lib/types.ts src/data/api.ts src/data/api.test.ts src/test/fixtures.ts src/dev/sampleData.ts src/pages/QuestFormPage.tsx src/pages/QuestFormPage.test.tsx scripts/rls-smoke.mjs
git commit -m "feat(tipos): quest_types table, quest type and city columns, loaded with the app data"
```

---

### Task 2: Funções puras (cidade efetiva, linha "tipo · cidade", opções de cidade, `drawPool` com filtros)

**Files:**
- Modify: `src/lib/tree.ts` (`effectiveCity`, `questMeta`)
- Modify: `src/lib/filters.ts` (`sameText`, `DrawFilter`, `drawPool`, `cityOptions`)
- Modify: `src/lib/filters.test.ts` (remove the old `describe('drawPool', …)`)
- Modify: `src/components/QuestActions.tsx` (new `drawPool` signature)
- Test: `src/lib/draw.test.ts` (new)

**Interfaces:**
- Consumes: `Quest.type_id`, `Quest.city`, `AppData.questTypes`, `QuestType` (Task 1); fixture `questType`.
- Produces:
  - `effectiveCity(quests: Quest[], id: string): string | null`;
  - `questMeta(data: Pick<AppData, 'quests' | 'questTypes'>, quest: Quest): string`;
  - `sameText(a: string, b: string): boolean`;
  - `interface DrawFilter { categoryId: string | null; typeIds: string[]; difficulties: Difficulty[]; cities: string[] }`;
  - `drawPool(quests: Quest[], done: Set<string>, f: DrawFilter): Quest[]`;
  - `cityOptions(quests: Quest[], among?: Quest[]): string[]`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/draw.test.ts
import { describe, expect, it } from 'vitest'
import { quest, questType } from '../test/fixtures'
import { cityOptions, drawPool, sameText, type DrawFilter } from './filters'
import { effectiveCity, questMeta } from './tree'

const japao = quest({ id: 'japao', title: 'Japão', category_id: 'viagem', difficulty: 'epic', city: 'Tóquio ' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', category_id: 'ativ', difficulty: 'hard' })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', category_id: 'viagem', difficulty: 'medium' })
const brabus = quest({ id: 'brabus', title: 'Brabus Burguer', category_id: 'rest', type_id: 't-burger', city: 'Ribeirão Preto', difficulty: 'easy' })
const forno = quest({ id: 'forno', title: 'Forno a Lenha', category_id: 'rest', type_id: 't-pizza', city: 'ribeirao preto ', difficulty: 'medium' })
const sushi = quest({ id: 'sushi', title: 'Sushi', category_id: 'rest', city: 'São Paulo', difficulty: 'easy' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: 'filme', difficulty: 'easy' })
const quests = [japao, fuji, toquio, brabus, forno, sushi, matrix]
const none: DrawFilter = { categoryId: null, typeIds: [], difficulties: [], cities: [] }
const pool = (done: string[], f: Partial<DrawFilter> = {}) => drawPool(quests, new Set(done), { ...none, ...f }).map((q) => q.id).sort()

describe('effectiveCity', () => {
  it('uses the quest own city, trimmed', () => expect(effectiveCity(quests, 'japao')).toBe('Tóquio'))
  it('inherits the city of the nearest ancestor that has one', () => expect(effectiveCity(quests, 'fuji')).toBe('Tóquio'))
  it('its own city wins over the ancestors', () => {
    const ramen = quest({ id: 'ramen', parent_id: 'toquio', city: 'Kyoto' })
    expect(effectiveCity([...quests, ramen], 'ramen')).toBe('Kyoto')
  })
  it('is null when nobody up the tree has a city', () => expect(effectiveCity(quests, 'matrix')).toBeNull())
})

describe('questMeta', () => {
  const data = { quests, questTypes: [questType({ id: 't-burger', name: 'Hamburgueria' })] }
  it('joins the type and the effective city', () => expect(questMeta(data, brabus)).toBe('Hamburgueria · Ribeirão Preto'))
  it('shows only what exists', () => {
    expect(questMeta(data, fuji)).toBe('Tóquio')
    expect(questMeta(data, matrix)).toBe('')
  })
})

describe('drawPool', () => {
  it('without filters: pending quests with no pending subquests, with or without type and city', () => {
    expect(pool(['matrix'])).toEqual(['brabus', 'forno', 'fuji', 'sushi', 'toquio'])
  })
  it('a quest whose subquests are all done can be drawn itself', () => {
    expect(pool(['matrix', 'fuji', 'toquio'])).toEqual(['brabus', 'forno', 'japao', 'sushi'])
  })
  it('filters by category', () => expect(pool([], { categoryId: 'rest' })).toEqual(['brabus', 'forno', 'sushi']))
  it('a type filter keeps any of the chosen types and drops quests without a type', () => {
    expect(pool([], { typeIds: ['t-burger', 't-pizza'] })).toEqual(['brabus', 'forno'])
  })
  it('keeps any of the chosen difficulties', () => expect(pool(['matrix'], { difficulties: ['easy', 'hard'] })).toEqual(['brabus', 'fuji', 'sushi']))
  it('cities ignore accents, case and spaces, and count the inherited city', () => {
    expect(pool([], { cities: ['Ribeirão Preto'] })).toEqual(['brabus', 'forno'])
    expect(pool([], { cities: ['tóquio'] })).toEqual(['fuji', 'toquio'])
  })
  it('combines every filter', () => {
    expect(pool([], { categoryId: 'rest', difficulties: ['medium'], cities: ['Ribeirão Preto'] })).toEqual(['forno'])
  })
})

describe('cityOptions', () => {
  it('lists the effective cities once each, with the first spelling, alphabetically', () => {
    expect(cityOptions(quests)).toEqual(['Ribeirão Preto', 'São Paulo', 'Tóquio'])
  })
  it('can be limited to some quests', () => expect(cityOptions(quests, [brabus, matrix])).toEqual(['Ribeirão Preto']))
})

it('sameText ignores accents, case and surrounding spaces', () => {
  expect(sameText('Ribeirão Preto', ' ribeirao preto')).toBe(true)
  expect(sameText('Pizzaria', 'Hamburgueria')).toBe(false)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/draw.test.ts`
Expected: FAIL. `effectiveCity` e `questMeta` não existem, e `drawPool` ainda usa o filtro antigo.

- [ ] **Step 3: Implement**

`src/lib/tree.ts`: append

```ts
// The quest's own city, or the nearest ancestor's (a subquest of "Japão — Tóquio" lives in Tóquio).
export function effectiveCity(quests: Quest[], id: string): string | null {
  const byId = new Map(quests.map((q) => [q.id, q]))
  let q = byId.get(id)
  for (let hops = 0; q && hops <= quests.length; hops++) {
    if (q.city?.trim()) return q.city.trim()
    q = q.parent_id ? byId.get(q.parent_id) : undefined
  }
  return null
}

// "Hamburgueria · Ribeirão Preto" — only the parts that exist.
export function questMeta(data: Pick<AppData, 'quests' | 'questTypes'>, quest: Quest): string {
  const type = data.questTypes.find((t) => t.id === quest.type_id)?.name
  return [type, effectiveCity(data.quests, quest.id)].filter(Boolean).join(' · ')
}
```

`src/lib/filters.ts`:
1. Add `import { effectiveCity } from './tree'` after the types import.
2. Right after `normalizeText`, add:

```ts
export const sameText = (a: string, b: string) => normalizeText(a) === normalizeText(b)
```

3. Replace the whole `drawPool` function (and its comment) with:

```ts
export interface DrawFilter {
  categoryId: string | null
  typeIds: string[] // empty = any
  difficulties: Difficulty[] // empty = any
  cities: string[] // empty = any; compared with sameText against the effective city
}

// What "Sortear" picks from: pending quests you can do right now (none of their subquests still pending) that pass the filters.
export function drawPool(quests: Quest[], done: Set<string>, f: DrawFilter): Quest[] {
  const pending = quests.filter((q) => !done.has(q.id))
  const hasPendingChild = new Set(pending.flatMap((q) => q.parent_id ?? []))
  const cities = new Set(f.cities.map(normalizeText))
  return pending
    .filter((q) => !hasPendingChild.has(q.id))
    .filter((q) => !f.categoryId || q.category_id === f.categoryId)
    .filter((q) => !f.typeIds.length || (q.type_id !== null && f.typeIds.includes(q.type_id)))
    .filter((q) => !f.difficulties.length || f.difficulties.includes(q.difficulty))
    .filter((q) => !cities.size || cities.has(normalizeText(effectiveCity(quests, q.id) ?? '')))
}

// Effective cities of `among`, once each (first spelling wins), alphabetical.
export function cityOptions(quests: Quest[], among: Quest[] = quests): string[] {
  const seen = new Map<string, string>()
  for (const q of among) {
    const city = effectiveCity(quests, q.id)
    if (city && !seen.has(normalizeText(city))) seen.set(normalizeText(city), city)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
```

`src/lib/filters.test.ts`: remove the whole `describe('drawPool', () => { … })` block at the end of the file, and `drawPool` from the `import { … } from './filters'` line. Its cases now live in `draw.test.ts`.

`src/components/QuestActions.tsx`: change the `pool` line to:

```ts
  const pool = drawPool(data.quests, doneQuestIds(data.completions), { categoryId, typeIds: [], difficulties: [], cities: [] })
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/draw.test.ts src/lib/filters.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite and typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tree.ts src/lib/filters.ts src/lib/draw.test.ts src/lib/filters.test.ts src/components/QuestActions.tsx
git commit -m "feat(sorteio): effective city, type/city meta line and a draw pool filtered by category, types, difficulties and cities"
```

---

### Task 3: Tipos no Perfil (adicionar, renomear, excluir)

**Files:**
- Modify: `src/pages/ProfilePage.tsx` (`Categories`, `CategoryRow`, novo `TypeChips`)
- Test: `src/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes:
  - de `src/data/api`: `saveQuestType` e `deleteQuestType` (Task 1);
  - de `src/lib/filters`: `sameText` (Task 2);
  - os tipos `AppData.questTypes` e `QuestType`.
- Produces: nada consumido depois.

- [ ] **Step 1: Write the failing tests**

In `src/pages/ProfilePage.test.tsx`, add `questType` to the fixtures import and append:

```tsx
const burger = questType({ id: 't-burger', category_id: 'cat-rest', name: 'Hamburgueria' })
const pizza = questType({ id: 't-pizza', category_id: 'cat-rest', name: 'Pizzaria' })

it('adds a type to a category', async () => {
  vi.mocked(api.saveQuestType).mockResolvedValue(questType({ id: 't-new' }))
  open()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Adicionar tipo em Restaurante' }))
  await user.type(screen.getByLabelText('Nome do tipo em Restaurante'), ' Hamburgueria ')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(api.saveQuestType).toHaveBeenCalledWith({ id: undefined, category_id: 'cat-rest', name: 'Hamburgueria' })
})

it('renames a type, refusing a name that already exists in the category', async () => {
  vi.mocked(api.saveQuestType).mockResolvedValue(pizza)
  open({ questTypes: [burger, pizza] })
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Editar tipo Pizzaria' }))
  const name = screen.getByLabelText('Nome do tipo em Restaurante')
  await user.clear(name)
  await user.type(name, 'hamburgueria')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Esse tipo já existe.')
  expect(api.saveQuestType).not.toHaveBeenCalled()
  await user.clear(name)
  await user.type(name, 'Pizza napolitana')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(api.saveQuestType).toHaveBeenCalledWith({ id: 't-pizza', category_id: 'cat-rest', name: 'Pizza napolitana' })
})

it('deleting a type in use warns how many quests lose it', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  open({ questTypes: [burger], quests: [quest({ type_id: 't-burger' }), quest({ type_id: 't-burger' })] })
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Editar tipo Hamburgueria' }))
  await user.click(screen.getByRole('button', { name: 'Excluir' }))
  expect(confirm).toHaveBeenCalledWith('2 quest(s) usam esse tipo; elas ficam sem tipo. Excluir "Hamburgueria"?')
  await waitFor(() => expect(api.deleteQuestType).toHaveBeenCalledWith('t-burger'))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: FAIL. O botão "Adicionar tipo em Restaurante" não existe.

- [ ] **Step 3: Implement**

In `src/pages/ProfilePage.tsx`:
- Add `deleteQuestType, saveQuestType` to the `../data/api` import.
- Add `QuestType` to the `../lib/types` type import.
- Add `import { sameText } from '../lib/filters'`.

In `Categories`, add these two handlers after `remove`:

```tsx
  async function saveType(input: { id?: string; category_id: string; name: string }): Promise<boolean> {
    const name = input.name.trim()
    if (!name) {
      setMessage('Dê um nome ao tipo.')
      return false
    }
    if (data.questTypes.some((t) => t.category_id === input.category_id && t.id !== input.id && sameText(t.name, name))) {
      setMessage('Esse tipo já existe.')
      return false
    }
    try {
      await saveQuestType({ ...input, name })
      setMessage(null)
      onChange()
      return true
    } catch {
      setMessage('Não foi possível salvar.')
      return false
    }
  }

  async function removeType(t: QuestType) {
    const n = data.quests.filter((q) => q.type_id === t.id).length
    const question = n ? `${n} quest(s) usam esse tipo; elas ficam sem tipo. Excluir "${t.name}"?` : `Excluir o tipo "${t.name}"?`
    if (!window.confirm(question)) return
    try {
      await deleteQuestType(t.id)
      onChange()
    } catch {
      setMessage('Não foi possível excluir.')
    }
  }
```

and change the row rendering in its `<ul>` to:

```tsx
        {data.categories.map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            types={data.questTypes.filter((t) => t.category_id === c.id).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))}
            onSave={save}
            onDelete={remove}
            onSaveType={saveType}
            onDeleteType={removeType}
          />
        ))}
```

Replace `RowProps` and the non-editing return of `CategoryRow` with:

```tsx
interface RowProps {
  category: Category
  types: QuestType[]
  onSave: (c: CategoryInput & { id?: string }) => Promise<boolean>
  onDelete: (c: Category) => void
  onSaveType: (t: { id?: string; category_id: string; name: string }) => Promise<boolean>
  onDeleteType: (t: QuestType) => void
}

function CategoryRow({ category: c, types, onSave, onDelete, onSaveType, onDeleteType }: RowProps) {
```

(keep its `editing` state and the editing branch as they are), and for the normal branch:

```tsx
  return (
    <li className="space-y-2 rounded-2xl bg-paper/70 p-2 pr-3">
      <div className="flex items-center gap-3">
        <Bubble icon={c.icon} color={c.color} />
        <span className="flex-1">{c.name}</span>
        {c.builtin ? (
          <span className="text-xs text-ink/60">padrão</span>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => setEditing(true)}>Editar</button>
            <button type="button" className="btn btn-danger" aria-label={`Excluir ${c.name}`} onClick={() => onDelete(c)}>
              <Trash2 aria-hidden className="size-4" />
            </button>
          </>
        )}
      </div>
      <TypeChips category={c} types={types} onSave={onSaveType} onDelete={onDeleteType} />
    </li>
  )
}

// A category's types: tap one to rename or delete it, "+ Tipo" to add.
function TypeChips({ category, types, onSave, onDelete }: {
  category: Category
  types: QuestType[]
  onSave: (t: { id?: string; category_id: string; name: string }) => Promise<boolean>
  onDelete: (t: QuestType) => void
}) {
  const [editing, setEditing] = useState<string | null>(null) // a type id, 'new', or closed
  const [name, setName] = useState('')
  const current = types.find((t) => t.id === editing)
  const open = (id: string, initial: string) => {
    setEditing(id)
    setName(initial)
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (await onSave({ id: current?.id, category_id: category.id, name })) setEditing(null)
  }
  return (
    <div className="flex flex-wrap items-center gap-2 pl-12">
      {types.map((t) => (
        <button key={t.id} type="button" className="chip pl-3" aria-label={`Editar tipo ${t.name}`} onClick={() => open(t.id, t.name)}>{t.name}</button>
      ))}
      <button type="button" className="chip pl-3" aria-label={`Adicionar tipo em ${category.name}`} onClick={() => open('new', '')}>+ Tipo</button>
      {editing && (
        <form onSubmit={submit} className="flex w-full flex-wrap gap-2">
          <input aria-label={`Nome do tipo em ${category.name}`} className="input min-w-0 flex-1" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary">Salvar</button>
          {current && <button type="button" className="btn btn-danger" onClick={() => onDelete(current)}>Excluir</button>}
          <button type="button" className="btn" onClick={() => setEditing(null)}>Cancelar</button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: PASS, todos os testes do arquivo, os antigos e os 3 novos.

- [ ] **Step 5: Full suite, typecheck and commit**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros.

```bash
git add src/pages/ProfilePage.tsx src/pages/ProfilePage.test.tsx
git commit -m "feat(tipos): manage each category's types on the profile (add, rename, delete with a warning)"
```

---

### Task 4: Formulário da quest (tipo, novo tipo, gênero do catálogo, cidade)

**Files:**
- Modify: `src/pages/QuestFormPage.tsx`
- Test: `src/pages/QuestFormPage.test.tsx`

**Interfaces:**
- Consumes:
  - `saveQuestType` (Task 1);
  - `sameText` e `cityOptions` (Task 2);
  - `effectiveCity` (Task 2);
  - `AppData.questTypes`.
- Produces: o payload da quest com `type_id` e `city` vindos do formulário.

- [ ] **Step 1: Write the failing tests**

In `src/pages/QuestFormPage.test.tsx`, add `questType` to the fixtures import and append:

```tsx
const burger = questType({ id: 't-burger', category_id: CATS.restaurante.id, name: 'Hamburgueria' })
const scifi = questType({ id: 't-scifi', category_id: CATS.filme.id, name: 'Ficção científica' })
const withTypes = (o: Parameters<typeof appData>[0] = {}) =>
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), questTypes: [burger, scifi], quests: [japao], ...o }))

it('types follow the category; a new type is created and selected', async () => {
  withTypes()
  vi.mocked(api.saveQuestType).mockResolvedValue(questType({ id: 't-new', category_id: CATS.restaurante.id, name: 'Pizzaria' }))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  expect(screen.getByRole('button', { name: 'Hamburgueria' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ficção científica' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Novo tipo' }))
  await user.type(screen.getByLabelText('Nome do novo tipo'), 'Pizzaria')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
  expect(api.saveQuestType).toHaveBeenCalledWith({ category_id: CATS.restaurante.id, name: 'Pizzaria' })
  expect(await screen.findByRole('button', { name: 'Pizzaria' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Filme' }))
  expect(screen.getByRole('button', { name: 'Nenhum' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Ficção científica' })).toBeInTheDocument()
})

it('a new type with an existing name selects the existing one', async () => {
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.click(screen.getByRole('button', { name: 'Novo tipo' }))
  await user.type(screen.getByLabelText('Nome do novo tipo'), ' hamburgueria')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
  expect(api.saveQuestType).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Hamburgueria' })).toHaveAttribute('aria-pressed', 'true')
})

it('saves the chosen type and the trimmed city', async () => {
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.click(screen.getByRole('button', { name: 'Hamburgueria' }))
  await user.type(screen.getByLabelText('Título'), 'Brabus Burguer')
  await user.click(screen.getByRole('button', { name: 'Fácil' }))
  await user.type(screen.getByLabelText(/Cidade/), '  Ribeirão Preto ')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ type_id: 't-burger', city: 'Ribeirão Preto' })))
})

it('a new subquest starts with the city of its parent', async () => {
  withTypes({ quests: [quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, city: 'Tóquio' })] })
  renderRoute(routes, '/quests/nova?parent=japao')
  expect(await screen.findByLabelText(/Cidade/)).toHaveValue('Tóquio')
})

it('editing a quest whose type was deleted shows Nenhum', async () => {
  withTypes({ quests: [quest({ id: 'velha', title: 'Velha', category_id: CATS.restaurante.id, type_id: 't-apagado' })] })
  renderRoute([{ path: '/quests/:id/editar', element: <QuestFormPage /> }], '/quests/velha/editar')
  expect(await screen.findByRole('button', { name: 'Nenhum' })).toHaveAttribute('aria-pressed', 'true')
})

it('a catalog genre selects the matching type, or offers to create it', async () => {
  const anime = (genres: string[]) =>
    ({ ...normalizeAniList({ id: 21, title: { english: 'ONE PIECE' }, episodes: 1100, duration: 24, seasonYear: 1999 }), genres })
  vi.mocked(catalog.searchCatalog).mockResolvedValue([{ source: 'anilist', external_id: '21', title: 'ONE PIECE', year: 1999, poster_url: null }])
  withTypes({ questTypes: [questType({ id: 't-adv', category_id: CATS.anime.id, name: 'Aventura' })] })
  vi.mocked(catalog.fetchCatalogDetails).mockResolvedValue(anime(['Ação', 'aventura']))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Anime' }))
  await user.type(screen.getByLabelText('Buscar no catálogo'), 'one piece')
  await user.click(await screen.findByRole('button', { name: 'ONE PIECE (1999)' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Aventura' })).toHaveAttribute('aria-pressed', 'true'))
})

it('a catalog genre that is not a type yet becomes a one-tap shortcut', async () => {
  vi.mocked(catalog.searchCatalog).mockResolvedValue([{ source: 'anilist', external_id: '21', title: 'ONE PIECE', year: 1999, poster_url: null }])
  vi.mocked(catalog.fetchCatalogDetails).mockResolvedValue({
    ...normalizeAniList({ id: 21, title: { english: 'ONE PIECE' }, episodes: 1100, duration: 24, seasonYear: 1999 }),
    genres: ['Comédia'],
  })
  vi.mocked(api.saveQuestType).mockResolvedValue(questType({ id: 't-com', category_id: CATS.anime.id, name: 'Comédia' }))
  withTypes()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Anime' }))
  await user.type(screen.getByLabelText('Buscar no catálogo'), 'one piece')
  await user.click(await screen.findByRole('button', { name: 'ONE PIECE (1999)' }))
  await user.click(await screen.findByRole('button', { name: 'Comédia' }))
  expect(api.saveQuestType).toHaveBeenCalledWith({ category_id: CATS.anime.id, name: 'Comédia' })
  expect(await screen.findByRole('button', { name: 'Comédia' })).toHaveAttribute('aria-pressed', 'true')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/QuestFormPage.test.tsx`
Expected: FAIL. Não há o grupo "Tipo", o botão "Novo tipo" nem o campo "Cidade".

- [ ] **Step 3: Implement**

In `src/pages/QuestFormPage.tsx`:

Imports:
- add `import { Plus } from 'lucide-react'` at the top;
- add `saveQuestType` to the `../data/api` import;
- add `import { cityOptions, sameText } from '../lib/filters'` and `import { effectiveCity } from '../lib/tree'`;
- add `QuestType` to the `../lib/types` type import.

In `QuestForm`, replace the `categoryId` state line and add the new states right after it:

```tsx
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? initialCategory ?? (parentId ? atividade?.id ?? '' : ''))
  // A type that was deleted meanwhile counts as none.
  const [typeId, setTypeId] = useState<string | null>(data.questTypes.some((t) => t.id === existing?.type_id) ? existing!.type_id : null)
  const [createdTypes, setCreatedTypes] = useState<QuestType[]>([])
  const [newType, setNewType] = useState<string | null>(null) // null = the "new type" field is closed
  const [genre, setGenre] = useState<string | null>(null)
  const [city, setCity] = useState(existing?.city ?? (parentId ? effectiveCity(data.quests, parentId) ?? '' : ''))
```

After `const existingPhotos = …`, add:

```tsx
  const types = [...data.questTypes, ...createdTypes.filter((c) => !data.questTypes.some((t) => t.id === c.id))]
    .filter((t) => t.category_id === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  function chooseCategory(id: string) {
    if (id !== categoryId) {
      setTypeId(null)
      setGenre(null)
      setNewType(null)
    }
    setCategoryId(id)
  }

  // Creates the type in this category (or picks the existing one with that name) and selects it.
  async function addType(name: string) {
    const clean = name.trim()
    if (!clean || !categoryId) return
    const found = types.find((t) => sameText(t.name, clean))
    if (found) setTypeId(found.id)
    else {
      try {
        const created = await saveQuestType({ category_id: categoryId, name: clean })
        setCreatedTypes((list) => [...list, created])
        setTypeId(created.id)
        refresh()
      } catch {
        setError('Não foi possível criar o tipo.')
        return
      }
    }
    setNewType(null)
    setGenre(null)
  }
```

In `pickMedia`, after the `if (!existing) { … }` block, add:

```tsx
    if (typeId === null) {
      const match = types.find((t) => m.genres.some((g) => sameText(g, t.name)))
      if (match) setTypeId(match.id)
      else setGenre(m.genres[0] ?? null)
    }
```

In `save()`, replace the two fields added in Task 1 with:

```tsx
        type_id: typeId, city: city.trim() || null,
```

In the JSX:
1. In the category tiles, change `onClick={() => setCategoryId(c.id)}` to `onClick={() => chooseCategory(c.id)}`.
2. Inside the same category `<section>`, right after the tiles `<div role="group" …>…</div>`, add:

```tsx
          {category && (
            <div className="space-y-2 border-t border-ink/10 pt-3">
              <h3 id="type-label" className="font-bold">Tipo</h3>
              <div role="group" aria-labelledby="type-label" className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={typeId === null} onClick={() => setTypeId(null)} className="chip pl-3">Nenhum</button>
                {types.map((t) => (
                  <button key={t.id} type="button" aria-pressed={typeId === t.id} onClick={() => setTypeId(t.id)} className="chip pl-3">{t.name}</button>
                ))}
                {genre && !types.some((t) => sameText(t.name, genre)) && (
                  <button type="button" onClick={() => addType(genre)} className="chip pl-3"><Plus aria-hidden className="size-4" /> {genre}</button>
                )}
                <button type="button" onClick={() => setNewType('')} className="chip pl-3"><Plus aria-hidden className="size-4" /> Novo tipo</button>
              </div>
              {newType !== null && (
                <div className="flex gap-2">
                  <input
                    aria-label="Nome do novo tipo"
                    className="input min-w-0 flex-1"
                    value={newType}
                    maxLength={40}
                    autoFocus
                    onChange={(e) => setNewType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addType(newType)
                      }
                    }}
                  />
                  <button type="button" className="btn btn-primary" onClick={() => addType(newType)}>Criar</button>
                </div>
              )}
            </div>
          )}
```

3. In the card with Título / Dificuldade / Notas, right after the Título `<label>`, add:

```tsx
          <label className="block">
            <span className="mb-1 block font-bold">Cidade <span className="font-normal text-ink/60">(opcional)</span></span>
            <input className="input" list="city-options" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} />
            <datalist id="city-options">
              {cityOptions(data.quests).map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/QuestFormPage.test.tsx`
Expected: PASS, todos os testes do arquivo.

- [ ] **Step 5: Full suite, typecheck and commit**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros.

```bash
git add src/pages/QuestFormPage.tsx src/pages/QuestFormPage.test.tsx
git commit -m "feat(tipos): pick or create a type in the quest form, catalog genre shortcut, and the quest city (inherited by subquests)"
```

---

### Task 5: Mostrar "tipo · cidade" no card e no topo da quest

**Files:**
- Modify: `src/components/QuestCard.tsx`, `src/pages/QuestPage.tsx`
- Test: `src/pages/CategoryPage.test.tsx`, `src/pages/QuestPage.test.tsx`

**Interfaces:**
- Consumes: `questMeta(data, quest)` (Task 2).
- Produces: nada consumido depois.

- [ ] **Step 1: Write the failing tests**

Append to `src/pages/CategoryPage.test.tsx` (add `questType` to the fixtures import):

```tsx
it('cards show the type and the city, and nothing extra when there is none', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({
      categories: allCats(),
      questTypes: [questType({ id: 't-roteiro', category_id: CATS.viagem.id, name: 'Roteiro' })],
      quests: [quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, type_id: 't-roteiro', city: 'Tóquio' }), quest({ id: 'praia', title: 'Praia', category_id: CATS.viagem.id })],
    }),
  )
  open('cat-viagem')
  expect(await screen.findByText('Roteiro · Tóquio')).toBeInTheDocument()
  expect(screen.getByText('Praia').closest('a')).not.toHaveTextContent('·')
})
```

Append to `src/pages/QuestPage.test.tsx` (add `questType` to the fixtures import):

```tsx
it('the hero shows the type and the city', async () => {
  load({
    questTypes: [questType({ id: 't-roteiro', category_id: CATS.viagem.id, name: 'Roteiro' })],
    quests: [quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, type_id: 't-roteiro', city: 'Tóquio' })],
  })
  renderRoute(routes, '/quests/japao')
  expect(await screen.findByText('Roteiro · Tóquio')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/CategoryPage.test.tsx src/pages/QuestPage.test.tsx -t "type and the city"`
Expected: FAIL. O texto "Roteiro · Tóquio" não é encontrado.

- [ ] **Step 3: Implement**

`src/components/QuestCard.tsx`: change the tree import to `import { pathLabel, questMeta, subquestProgress } from '../lib/tree'`, add `const meta = questMeta(data, quest)` after `const path = …`, and inside the gems row, after `<Gems … />`, add:

```tsx
          {meta && <span className="text-ink/60">{meta}</span>}
```

`src/pages/QuestPage.tsx`:
1. Add `questMeta` to the existing `../lib/tree` import.
2. Next to the other derived values (after `const path = ancestors(…)`), add `const meta = questMeta(data, quest)`.
3. In the hero `stats`, right after `<Gems difficulty={quest.difficulty} onDark />`, add:

```tsx
            {meta && <span>{meta}</span>}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/CategoryPage.test.tsx src/pages/QuestPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite, typecheck and commit**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros.

```bash
git add src/components/QuestCard.tsx src/pages/QuestPage.tsx src/pages/CategoryPage.test.tsx src/pages/QuestPage.test.tsx
git commit -m "feat(tipos): show 'type · city' on quest cards and the quest hero"
```

---

### Task 6: `useHideSky` (o céu da página some enquanto o sorteio está aberto)

**Files:**
- Modify: `src/components/Layout.tsx`
- Test: `src/components/Layout.test.tsx`

**Interfaces:**
- Produces: `export function useHideSky(): void` em `src/components/Layout.tsx`. Enquanto um componente que o chama estiver montado, o `Layout` não renderiza o `SkyScene`. Fora do `Layout` não faz nada.

- [ ] **Step 1: Write the failing test**

In `src/components/Layout.test.tsx`:
- change the SkyScene mock to `vi.mock('./SkyScene', () => ({ default: () => <div data-testid="sky" /> }))`;
- change `import Layout from './Layout'` to `import Layout, { useHideSky } from './Layout'`;
- append:

```tsx
it('a full-screen draw hides the page sky while it is open', async () => {
  withMotion()
  function Draw() {
    useHideSky()
    return <p>sorteio</p>
  }
  const r = createMemoryRouter([{ element: <Layout />, children: [{ path: '/', element: <p>conteúdo</p> }, { path: '/sorteio', element: <Draw /> }] }])
  render(<RouterProvider router={r} />)
  expect(await screen.findByTestId('sky')).toBeInTheDocument()
  await act(() => r.navigate('/sorteio'))
  expect(screen.queryByTestId('sky')).not.toBeInTheDocument()
  await act(() => r.navigate('/'))
  expect(await screen.findByTestId('sky')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/Layout.test.tsx`
Expected: FAIL. `useHideSky` não é exportado.

- [ ] **Step 3: Implement**

In `src/components/Layout.tsx`:
1. Change the react import to:

```tsx
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
```

2. After the `const SkyScene = lazy(…)` line, add:

```tsx
// Full-screen 3D overlays (the draw) hide the page sky while mounted, so only one WebGL context runs at a time.
const HideSkyContext = createContext<() => () => void>(() => () => {})

export function useHideSky() {
  const hide = useContext(HideSkyContext)
  useEffect(() => hide(), [hide])
}
```

3. In `Layout`, after `const [animated] = useState(…)`, add:

```tsx
  const [hiders, setHiders] = useState(0)
  const hide = useCallback(() => {
    setHiders((n) => n + 1)
    return () => setHiders((n) => n - 1)
  }, [])
```

4. Wrap the returned `<div className="min-h-dvh md:flex">…</div>` in `<HideSkyContext.Provider value={hide}> … </HideSkyContext.Provider>`.
5. Change `{animated && (` (the SkyScene block) to `{animated && hiders === 0 && (`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/Layout.test.tsx`
Expected: PASS, todos os testes do arquivo.

- [ ] **Step 5: Full suite, typecheck and commit**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros.

```bash
git add src/components/Layout.tsx src/components/Layout.test.tsx
git commit -m "feat(sorteio): useHideSky — the page sky unmounts while a full-screen 3D overlay is open"
```

---

### Task 7: A constelação (linha do tempo + componente three.js)

**Files:**
- Create: `src/lib/constellation.ts`, `src/components/DrawConstellation.tsx`
- Test: `src/lib/constellation.test.ts`

**Interfaces:**
- Produces:
  - `HOPS = 12`;
  - `hopDelays(hops?: number, first?: number, ratio?: number): number[]`;
  - `hopSequence(stars: number, winner: number, hops?: number, rand?: () => number): number[]`;
  - `pickStars<T>(items: T[], winner: T, max?: number, rand?: () => number): T[]`;
  - `export default function DrawConstellation({ titles, winner, onDone }: { titles: string[]; winner: number; onDone: () => void })`. Chama `onDone` uma vez, ao fim da animação ou na hora quando não há WebGL.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/constellation.test.ts
import { describe, expect, it } from 'vitest'
import { HOPS, hopDelays, hopSequence, pickStars } from './constellation'

describe('hopDelays', () => {
  it('slows down hop after hop and lasts about two seconds', () => {
    const d = hopDelays()
    expect(d).toHaveLength(HOPS)
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1])
    const total = d.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(1800)
    expect(total).toBeLessThan(2400)
  })
})

describe('hopSequence', () => {
  it('ends on the winner and never lights the same star twice in a row', () => {
    for (const stars of [2, 5, 40]) {
      const seq = hopSequence(stars, 1)
      expect(seq).toHaveLength(HOPS)
      expect(seq.at(-1)).toBe(1)
      seq.forEach((s, i) => {
        expect(s).toBeGreaterThanOrEqual(0)
        expect(s).toBeLessThan(stars)
        if (i > 0) expect(s).not.toBe(seq[i - 1])
      })
    }
  })
  it('with a single star every hop is that star', () => expect(hopSequence(1, 0)).toEqual(Array(HOPS).fill(0)))
})

describe('pickStars', () => {
  it('keeps at most 40 stars, always including the winner, without repeats', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const stars = pickStars(items, 37)
    expect(stars).toHaveLength(40)
    expect(stars).toContain(37)
    expect(new Set(stars).size).toBe(40)
  })
  it('uses every item when there are few', () => expect(pickStars(['a', 'b', 'c'], 'b').sort()).toEqual(['a', 'b', 'c']))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/constellation.test.ts`
Expected: FAIL. O módulo `./constellation` não existe.

- [ ] **Step 3: Implement the timeline**

```ts
// src/lib/constellation.ts
// Timeline of the draw: a glow hops from star to star, slowing down, and lands on the winner.
export const HOPS = 12

export const hopDelays = (hops = HOPS, first = 60, ratio = 1.18) => Array.from({ length: hops }, (_, i) => Math.round(first * ratio ** i))

// Built backwards from the winner so the last hop is always it and no star is lit twice in a row.
export function hopSequence(stars: number, winner: number, hops = HOPS, rand = Math.random): number[] {
  const seq = [winner]
  while (seq.length < hops) {
    const after = seq[0]
    let next = Math.floor(rand() * stars)
    if (stars > 1 && next === after) next = (after + 1 + Math.floor(rand() * (stars - 1))) % stars
    seq.unshift(next)
  }
  return seq
}

const shuffle = <T>(list: T[], rand: () => number) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

// Up to `max` stars on screen, the winner always among them.
export function pickStars<T>(items: T[], winner: T, max = 40, rand = Math.random): T[] {
  const others = shuffle(items.filter((i) => i !== winner), rand).slice(0, max - 1)
  return shuffle([winner, ...others], rand)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/constellation.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Write the three.js component**

This one is verified visually in Task 9, because jsdom has no WebGL.

```tsx
// src/components/DrawConstellation.tsx
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { hopDelays, hopSequence } from '../lib/constellation'

const FINALE_MS = 1100

function glowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,214,236,0.85)')
  g.addColorStop(1, 'rgba(227,180,207,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// The draw as a constellation: one star per candidate; a glow hops between them drawing lines,
// slows down, lands on the winner and flies at the camera in a burst of light.
export default function DrawConstellation({ titles, winner, onDone }: { titles: string[]; winner: number; onDone: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState('')
  const finish = useRef(onDone)
  finish.current = onDone

  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      finish.current() // no WebGL: straight to the result
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.z = 10
    const texture = glowTexture()
    const group = new THREE.Group()
    scene.add(group)

    const points = titles.map(() => {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.6 + Math.sqrt(Math.random()) * 3.4
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 1.25, (Math.random() - 0.5) * 1.5)
    })
    const starGeometry = new THREE.BufferGeometry().setFromPoints(points)
    const starMaterial = new THREE.PointsMaterial({
      size: 0.55, map: texture, color: '#f5d6e6', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    group.add(new THREE.Points(starGeometry, starMaterial))

    const sequence = hopSequence(points.length, winner)
    const hopAt: number[] = []
    hopDelays(sequence.length).reduce((t, d) => (hopAt.push(t + d), t + d), 0)
    const landed = hopAt[hopAt.length - 1]
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(sequence.map((s) => points[s]))
    lineGeometry.setDrawRange(0, 0)
    const lineMaterial = new THREE.LineBasicMaterial({ color: '#e3b4cf', transparent: true, opacity: 0.6 })
    group.add(new THREE.Line(lineGeometry, lineMaterial))

    const glowMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const glow = new THREE.Sprite(glowMaterial)
    glow.scale.setScalar(0)
    group.add(glow)

    const resize = () => {
      const w = el.clientWidth || window.innerWidth
      const h = el.clientHeight || window.innerHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      group.scale.setScalar(Math.min(1, camera.aspect / 0.75)) // keep the disc inside portrait screens
    }
    resize()
    window.addEventListener('resize', resize)

    const start = performance.now()
    let hop = -1
    let ended = false
    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const t = now - start
      group.rotation.z = t * 0.00006
      starMaterial.opacity = 0.75 + 0.15 * Math.sin(t * 0.004)
      let current = hop
      while (current + 1 < sequence.length && t >= hopAt[current + 1]) current++
      if (current !== hop) {
        hop = current
        lineGeometry.setDrawRange(0, hop + 1)
        setLabel(titles[sequence[hop]])
      }
      if (hop >= 0) {
        const p = points[sequence[hop]]
        if (t < landed + 250) {
          glow.position.copy(p)
          glow.scale.setScalar(1.1 * (1 + 0.25 * Math.sin(t * 0.02)))
        } else {
          // Finale: the others fade, the winner flies at the camera and bursts into light.
          const k = Math.min(1, (t - landed - 250) / FINALE_MS)
          starMaterial.opacity *= 1 - k
          lineMaterial.opacity = 0.6 * (1 - k)
          glow.position.set(p.x * (1 - k), p.y * (1 - k), p.z + k * 8.5)
          glow.scale.setScalar(1.1 + k * k * 9)
          if (k >= 1 && !ended) {
            ended = true
            finish.current()
          }
        }
      }
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      for (const d of [starGeometry, starMaterial, lineGeometry, lineMaterial, glowMaterial, texture]) d.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="absolute inset-0">
      <div ref={host} aria-hidden className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
      <p className="absolute inset-x-4 bottom-[22%] text-center font-display text-2xl font-bold text-white drop-shadow-[0_2px_12px_rgb(227_180_207/0.6)]">
        {label}
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: sem erros.

```bash
git add src/lib/constellation.ts src/lib/constellation.test.ts src/components/DrawConstellation.tsx
git commit -m "feat(sorteio): constellation timeline and the three.js scene (hops, lines, winner flying at the camera)"
```

---

### Task 8: A janela do sorteio (filtros → constelação → resultado)

**Files:**
- Modify: `src/components/DrawDialog.tsx` (rewritten)
- Modify: `src/components/QuestActions.tsx` (new props for the dialog)
- Modify: `src/pages/QuestsPage.test.tsx`, `src/pages/CategoryPage.test.tsx` (the dialog now opens on the filters)
- Test: `src/components/DrawDialog.test.tsx` (new)

**Interfaces:**
- Consumes:
  - `drawPool`, `DrawFilter`, `cityOptions`, `sameText` (Task 2);
  - `questMeta` (Task 2);
  - `pickStars` (Task 7);
  - `DrawConstellation` (Task 7);
  - `useHideSky` (Task 6);
  - `count` (`src/lib/text.ts`).
- Produces: `export default function DrawDialog({ data, categoryId, onClose }: { data: AppData; categoryId: string | null; onClose: () => void })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/DrawDialog.test.tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { CATS, allCats, appData, completion, quest, questType } from '../test/fixtures'
import DrawDialog from './DrawDialog'

vi.mock('./DrawConstellation', () => ({
  default: ({ onDone }: { onDone: () => void }) => <button type="button" onClick={onDone}>constelação</button>,
}))
afterEach(() => vi.unstubAllGlobals())

const brabus = quest({ id: 'brabus', title: 'Brabus Burguer', category_id: CATS.restaurante.id, type_id: 't-burger', city: 'Ribeirão Preto', difficulty: 'easy' })
const forno = quest({ id: 'forno', title: 'Forno a Lenha', category_id: CATS.restaurante.id, type_id: 't-pizza', city: 'São Paulo', difficulty: 'medium' })
const interstellar = quest({ id: 'interstellar', title: 'Interstellar', category_id: CATS.filme.id, difficulty: 'hard' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id })
const data = appData({
  categories: allCats(),
  questTypes: [
    questType({ id: 't-burger', category_id: CATS.restaurante.id, name: 'Hamburgueria' }),
    questType({ id: 't-pizza', category_id: CATS.restaurante.id, name: 'Pizzaria' }),
  ],
  quests: [brabus, forno, interstellar, matrix],
  completions: [completion({ quest_id: 'matrix' })],
})
const open = (categoryId: string | null = null) =>
  render(<MemoryRouter><DrawDialog data={data} categoryId={categoryId} onClose={() => {}} /></MemoryRouter>)
const button = (name: string) => screen.getByRole('button', { name })
const draw = () => within(screen.getByRole('dialog', { name: 'Sorteio' })).getByRole('button', { name: 'Sortear' })
const withMotion = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))

it('opens on the filters with the page category marked and counts the pool live', async () => {
  const user = userEvent.setup()
  open(CATS.restaurante.id)
  expect(button('Restaurante')).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('2 quests no sorteio')).toBeInTheDocument()
  await user.click(button('Fácil'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
})

it('types show for the chosen category and are cleared when it changes', async () => {
  const user = userEvent.setup()
  open(CATS.restaurante.id)
  await user.click(button('Pizzaria'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
  await user.click(button('Filme'))
  expect(screen.queryByRole('button', { name: 'Pizzaria' })).not.toBeInTheDocument()
  await user.click(button('Restaurante'))
  expect(button('Pizzaria')).toHaveAttribute('aria-pressed', 'false')
})

it('cities narrow the draw, and no match disables it', async () => {
  const user = userEvent.setup()
  open()
  await user.click(button('Ribeirão Preto'))
  expect(screen.getByText('1 quest no sorteio')).toBeInTheDocument()
  await user.click(button('Difícil'))
  expect(screen.getByText('Nenhuma quest com esses filtros')).toBeInTheDocument()
  expect(draw()).toBeDisabled()
})

it('with reduced motion the result shows right away and Bora! opens the quest', async () => {
  const user = userEvent.setup()
  open(CATS.filme.id)
  await user.click(draw())
  expect(screen.getByText('Interstellar')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Bora!' })).toHaveAttribute('href', '/quests/interstellar')
  expect(screen.queryByRole('button', { name: 'Sortear outra' })).not.toBeInTheDocument()
})

it('Sortear outra never repeats the last quest, and Filtros keeps the choices', async () => {
  const user = userEvent.setup()
  open(CATS.restaurante.id)
  await user.click(draw())
  const first = screen.getByRole('link', { name: 'Bora!' }).getAttribute('href')
  await user.click(button('Sortear outra'))
  expect(screen.getByRole('link', { name: 'Bora!' }).getAttribute('href')).not.toBe(first)
  await user.click(button('Filtros'))
  expect(button('Restaurante')).toHaveAttribute('aria-pressed', 'true')
})

it('with motion on it plays the constellation, and Pular jumps to the result', async () => {
  withMotion()
  const user = userEvent.setup()
  open(CATS.filme.id)
  await user.click(draw())
  expect(await screen.findByRole('button', { name: 'constelação' })).toBeInTheDocument()
  await user.click(button('Pular'))
  expect(screen.getByRole('link', { name: 'Bora!' })).toHaveAttribute('href', '/quests/interstellar')
})

it('when the constellation ends, the result appears', async () => {
  withMotion()
  const user = userEvent.setup()
  open(CATS.filme.id)
  await user.click(draw())
  await user.click(await screen.findByRole('button', { name: 'constelação' }))
  expect(screen.getByRole('link', { name: 'Bora!' })).toBeInTheDocument()
})
```

In `src/pages/QuestsPage.test.tsx`, replace the test `'draws a pending quest you can actually do and opens it'` with (add `within` to the testing-library import):

```tsx
it('draws a pending quest you can actually do and opens it', async () => {
  const user = userEvent.setup()
  open()
  await user.click(await screen.findByRole('button', { name: 'Sortear' }))
  const dialog = screen.getByRole('dialog', { name: 'Sorteio' })
  await user.click(within(dialog).getByRole('button', { name: 'Sortear' }))
  expect(dialog).toHaveTextContent('Tóquio')
  expect(screen.getByRole('link', { name: 'Bora!' })).toHaveAttribute('href', '/quests/toquio')
  await user.click(screen.getByRole('button', { name: 'Fechar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
```

In `src/pages/CategoryPage.test.tsx`, replace `'a new quest starts in this category and Sortear draws only from it'` with (add `within` to the testing-library import):

```tsx
it('a new quest starts in this category and Sortear draws only from it', async () => {
  const user = userEvent.setup()
  open('cat-viagem')
  expect(await screen.findByRole('link', { name: 'Nova quest' })).toHaveAttribute('href', '/quests/nova?categoria=cat-viagem')
  await user.click(screen.getByRole('button', { name: 'Sortear' }))
  const dialog = screen.getByRole('dialog', { name: 'Sorteio' })
  expect(within(dialog).getByRole('button', { name: 'Viagem' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(within(dialog).getByRole('button', { name: 'Sortear' }))
  expect(dialog).toHaveTextContent('Tóquio')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/DrawDialog.test.tsx src/pages/QuestsPage.test.tsx src/pages/CategoryPage.test.tsx`
Expected: FAIL. O `DrawDialog` ainda espera `pool` e não tem os passos.

- [ ] **Step 3: Rewrite the dialog**

```tsx
// src/components/DrawDialog.tsx
import { animate, stagger } from 'animejs'
import { X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { pickStars } from '../lib/constellation'
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../lib/difficulty'
import { cityOptions, drawPool, sameText, type DrawFilter } from '../lib/filters'
import { prefersReducedMotion } from '../lib/motion'
import { count } from '../lib/text'
import { doneQuestIds, pathLabel, questMeta } from '../lib/tree'
import type { AppData, Quest } from '../lib/types'
import Bubble from './Bubble'
import Gems from './Gems'
import { useHideSky } from './Layout'

const DrawConstellation = lazy(() => import('./DrawConstellation'))
const SPARKS = 14
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

type Step = 'filters' | 'rolling' | 'result'

// Full-screen draw: choose the filters, watch the constellation, get a quest.
export default function DrawDialog({ data, categoryId, onClose }: { data: AppData; categoryId: string | null; onClose: () => void }) {
  useHideSky()
  const [filter, setFilter] = useState<DrawFilter>({ categoryId, typeIds: [], difficulties: [], cities: [] })
  const [step, setStep] = useState<Step>('filters')
  const [winner, setWinner] = useState<Quest | null>(null)
  const [stars, setStars] = useState<Quest[]>([])
  const [animated] = useState(() => !prefersReducedMotion())
  const done = useMemo(() => doneQuestIds(data.completions), [data.completions])
  const pool = drawPool(data.quests, done, filter)

  function draw() {
    const options = winner && pool.length > 1 ? pool.filter((q) => q.id !== winner.id) : pool
    if (!options.length) return
    const next = options[Math.floor(Math.random() * options.length)]
    setWinner(next)
    if (animated) {
      setStars(pickStars(pool, next))
      setStep('rolling')
    } else setStep('result')
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="draw-title" className="fixed inset-0 z-50 overflow-y-auto bg-night text-white">
      <div aria-hidden className="sky-static fixed inset-0" />
      <h2 id="draw-title" className="fixed left-4 top-[max(1.1rem,env(safe-area-inset-top))] z-20 text-sm font-extrabold uppercase tracking-widest text-blush">
        Sorteio
      </h2>
      <button type="button" aria-label="Fechar" onClick={onClose} className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 grid size-11 place-items-center rounded-full hover:bg-white/10">
        <X aria-hidden className="size-6" />
      </button>

      {step === 'filters' && <Filters data={data} done={done} filter={filter} onChange={setFilter} poolSize={pool.length} onDraw={draw} />}

      {step === 'rolling' && winner && (
        <div className="fixed inset-0 z-10" onClick={() => setStep('result')}>
          <Suspense fallback={null}>
            <DrawConstellation titles={stars.map((s) => s.title)} winner={stars.indexOf(winner)} onDone={() => setStep('result')} />
          </Suspense>
          <button type="button" className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] mx-auto w-fit rounded-full px-5 py-2 text-sm font-bold text-white/80 hover:bg-white/10">
            Pular
          </button>
        </div>
      )}

      {step === 'result' && winner && (
        <Result data={data} quest={winner} canRedraw={pool.length > 1} onRedraw={draw} onFilters={() => setStep('filters')} />
      )}
    </div>
  )
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 id={id} className="text-sm font-bold text-white/80">{title}</h3>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function Filters({ data, done, filter, onChange, poolSize, onDraw }: {
  data: AppData
  done: Set<string>
  filter: DrawFilter
  onChange: (f: DrawFilter) => void
  poolSize: number
  onDraw: () => void
}) {
  const types = filter.categoryId
    ? data.questTypes.filter((t) => t.category_id === filter.categoryId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    : []
  const inCategory = drawPool(data.quests, done, { categoryId: filter.categoryId, typeIds: [], difficulties: [], cities: [] })
  const cities = cityOptions(data.quests, inCategory)
  const pickCategory = (categoryId: string | null) => onChange({ ...filter, categoryId, typeIds: [] })

  return (
    <div className="relative mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 pb-8 pt-20">
      <Group id="draw-category" title="Categoria">
        <button type="button" className="chip pl-3" aria-pressed={filter.categoryId === null} onClick={() => pickCategory(null)}>Todas</button>
        {data.categories.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={filter.categoryId === c.id} onClick={() => pickCategory(c.id)}>
            <Bubble icon={c.icon} color={c.color} size="sm" /> {c.name}
          </button>
        ))}
      </Group>
      {types.length > 0 && (
        <Group id="draw-type" title="Tipo">
          {types.map((t) => (
            <button key={t.id} type="button" className="chip pl-3" aria-pressed={filter.typeIds.includes(t.id)} onClick={() => onChange({ ...filter, typeIds: toggle(filter.typeIds, t.id) })}>
              {t.name}
            </button>
          ))}
        </Group>
      )}
      <Group id="draw-difficulty" title="Dificuldade">
        {DIFFICULTIES.map((d) => (
          <button key={d} type="button" className="chip pl-3" aria-pressed={filter.difficulties.includes(d)} onClick={() => onChange({ ...filter, difficulties: toggle(filter.difficulties, d) })}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </Group>
      {cities.length > 0 && (
        <Group id="draw-city" title="Cidade">
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              className="chip pl-3"
              aria-pressed={filter.cities.some((x) => sameText(x, c))}
              onClick={() => onChange({ ...filter, cities: filter.cities.some((x) => sameText(x, c)) ? filter.cities.filter((x) => !sameText(x, c)) : [...filter.cities, c] })}
            >
              {c}
            </button>
          ))}
        </Group>
      )}
      <div className="mt-auto space-y-3 pt-4 text-center">
        <p aria-live="polite" className="font-semibold text-white/90">
          {poolSize ? count(poolSize, 'quest no sorteio', 'quests no sorteio') : 'Nenhuma quest com esses filtros'}
        </p>
        <button type="button" className="btn btn-primary min-h-12 w-full text-lg" disabled={poolSize === 0} onClick={onDraw}>Sortear</button>
      </div>
    </div>
  )
}

function Result({ data, quest, canRedraw, onRedraw, onFilters }: {
  data: AppData
  quest: Quest
  canRedraw: boolean
  onRedraw: () => void
  onFilters: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const category = data.categories.find((c) => c.id === quest.category_id)
  const poster = quest.media_id ? data.media.find((m) => m.id === quest.media_id)?.poster_url : null
  const meta = questMeta(data, quest)
  const path = pathLabel(data.quests, quest.id)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = box.current!
    const angle = (i: number) => (i / SPARKS) * Math.PI * 2
    const anims = [
      animate(el, { scale: { from: 0.6 }, opacity: { from: 0 }, duration: 600, ease: 'outBack(1.6)', onComplete: (self) => self.revert() }),
      animate(el.querySelectorAll('[data-spark]'), {
        translateX: (_: unknown, i = 0) => Math.cos(angle(i)) * 150,
        translateY: (_: unknown, i = 0) => Math.sin(angle(i)) * 150,
        scale: [{ to: 1.4 }, { to: 0 }],
        opacity: [{ to: 1 }, { to: 0 }],
        duration: 1100,
        delay: stagger(18, { start: 120 }),
        ease: 'outExpo',
      }),
    ]
    return () => anims.forEach((a) => a.revert())
  }, [quest.id])

  return (
    <div className="relative mx-auto flex min-h-full max-w-sm flex-col justify-center px-4 py-20">
      <div ref={box} className="card relative space-y-3 p-6 text-center text-ink">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-24">
          {Array.from({ length: SPARKS }, (_, i) => <span key={i} data-spark className="spark" />)}
        </div>
        {poster ? (
          <img src={poster} alt="" className="mx-auto max-h-56 rounded-2xl shadow-lg" />
        ) : (
          <div className="flex justify-center"><Bubble icon={category?.icon ?? ''} color={category?.color ?? '#b3607e'} size="lg" /></div>
        )}
        {path && <p className="text-xs text-ink/60">{path} ›</p>}
        <p className="font-display text-2xl font-bold leading-tight">{quest.title}</p>
        {meta && <p className="text-sm text-ink/60">{meta}</p>}
        <div className="flex justify-center"><Gems difficulty={quest.difficulty} /></div>
        <div className="grid gap-2 pt-2">
          <Link to={`/quests/${quest.id}`} className="btn btn-primary min-h-12">Bora!</Link>
          {canRedraw && <button type="button" className="btn min-h-12" onClick={onRedraw}>Sortear outra</button>}
          <button type="button" className="btn min-h-12" onClick={onFilters}>Filtros</button>
        </div>
      </div>
    </div>
  )
}
```

In `src/components/QuestActions.tsx`, make the hero button disabled only when **nothing at all** can be drawn (the filters are chosen inside), and pass the new props:

```tsx
  const pool = drawPool(data.quests, doneQuestIds(data.completions), { categoryId: null, typeIds: [], difficulties: [], cities: [] })
```

```tsx
      {drawing && <DrawDialog data={data} categoryId={categoryId} onClose={() => setDrawing(false)} />}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/DrawDialog.test.tsx src/pages/QuestsPage.test.tsx src/pages/CategoryPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite, typecheck and commit**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros.

```bash
git add src/components/DrawDialog.tsx src/components/DrawDialog.test.tsx src/components/QuestActions.tsx src/pages/QuestsPage.test.tsx src/pages/CategoryPage.test.tsx
git commit -m "feat(sorteio): full-screen draw with filters (category, types, difficulties, cities), the constellation, and the result card"
```

---

### Task 9: Dados de exemplo, conferência visual e verificação final

**Files:**
- Modify: `src/dev/sampleData.ts` (tipos e cidades de exemplo)
- Modify: `scripts/shot.mjs` (flag `--after=<ms>`)

**Interfaces:**
- Consumes: tudo das Tasks 1 a 8, através do preview.
- Produces: prints no scratchpad e eventuais ajustes visuais (cada um registrado com `Ruling:`).

- [ ] **Step 1: Sample types and cities**

In `src/dev/sampleData.ts`:
1. Replace `questTypes: [],` with:

```ts
  questTypes: [
    { id: 't-burger', category_id: 'rest', name: 'Hamburgueria', created_at: T },
    { id: 't-ramen', category_id: 'rest', name: 'Lamen', created_at: T },
    { id: 't-batata', category_id: 'rest', name: 'Batata recheada', created_at: T },
    { id: 't-scifi', category_id: 'filme', name: 'Ficção científica', created_at: T },
    { id: 't-shonen', category_id: 'anime', name: 'Shonen', created_at: T },
  ],
```

2. In the `quests` array:
   - `toquio` gets `{ parent_id: 'japao', city: 'Tóquio' }`;
   - `ichiran` gets `{ parent_id: 'toquio', type_id: 't-ramen' }`;
   - `batata` gets `{ type_id: 't-batata', city: 'Rio de Janeiro' }`;
   - `hxh` adds `type_id: 't-shonen'`;
   - `matrix` gets `{ type_id: 't-scifi' }`;
   - `serra` gets `{ city: 'Campos do Jordão' }`;
   - a new item: `quest('brabus', 'Brabus Burguer', 'rest', 'easy', { type_id: 't-burger', city: 'Ribeirão Preto' }),`.

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes passando e typecheck sem erros. O preview não entra nos testes.

- [ ] **Step 2: `--after` flag for timed screenshots**

In `scripts/shot.mjs`:
1. Add `[--after=<ms>]` to the usage comment.
2. Right before `const { data } = await call('Page.captureScreenshot'`, add:

```js
const after = [...flags].find((f) => f.startsWith('--after='))?.slice(8)
if (after) await sleep(+after)
```

- [ ] **Step 3: Print the form, the profile and the cards (390 px)**

With `D` = the session scratchpad `…/scratchpad/sorteio` (create it) and `B="http://localhost:5173/preview.html?url="`:

```bash
node scripts/shot.mjs "${B}%2Fquests%2Fnova%3Fcategoria%3Drest" $D/form.png 390 844 3000 --reduce
node scripts/shot.mjs "${B}/perfil" $D/perfil.png 390 844 3000 --reduce --bottom
node scripts/shot.mjs "${B}/categoria/rest" $D/cards.png 390 844 3000 --reduce
```

Expected (read each PNG):
- **Formulário:** a seção "Tipo" com Nenhum, os tipos de Restaurante e "+ Novo tipo"; o campo "Cidade (opcional)".
- **Perfil:** as etiquetas dos tipos embaixo de cada categoria.
- **Cards:** a linha "Hamburgueria · Ribeirão Preto".

- [ ] **Step 4: Print the draw (filters, constellation in 3 moments, result)**

The `--eval` opens the dialog from the hero, and after 600 ms it presses the dialog's "Sortear":

```bash
OPEN="(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sortear').click() })()"
DRAW="(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sortear').click(); setTimeout(() => document.querySelector('[role=dialog] .btn-primary').click(), 600) })()"
node scripts/shot.mjs "${B}/" $D/filtros-390.png 390 844 3500 "--eval=$OPEN" --after=800
node scripts/shot.mjs "${B}/" $D/filtros-1280.png 1280 800 3500 "--eval=$OPEN" --after=800
node scripts/shot.mjs "${B}/" $D/const-05.png 390 844 3500 "--eval=$DRAW" --after=1100
node scripts/shot.mjs "${B}/" $D/const-15.png 390 844 3500 "--eval=$DRAW" --after=2100
node scripts/shot.mjs "${B}/" $D/const-28.png 390 844 3500 "--eval=$DRAW" --after=3400
node scripts/shot.mjs "${B}/" $D/resultado.png 390 844 3500 "--eval=$DRAW" --after=5000
node scripts/shot.mjs "${B}/" $D/resultado-reduce.png 390 844 3500 --reduce "--eval=$DRAW" --after=1500
```

Expected:
- **Filtros:** chips legíveis sobre a noite; a contagem "N quests no sorteio"; o "Sortear" embaixo.
- **Constelação:** as estrelas, as linhas crescendo e o nome da estrela acesa embaixo; perto de 2,8 s, a vencedora já crescendo em direção à tela.
- **Resultado:** o cartão com faíscas e "Bora!", "Sortear outra" e "Filtros".
- **Com reduzir movimento:** o resultado aparece direto, sem a cena.

- [ ] **Step 5: Fix what the prints show**

Ajuste classes ou números da cena (raio do disco, tamanho das estrelas, tempos) e repita o print. Registre cada ajuste no ledger como `Ruling:`.

- [ ] **Step 6: Final verification**

Run: `npx vitest run && npm run typecheck && npm run build && ls dist/preview.html`
Expected:
- Todos os testes passando, typecheck limpo e build com sucesso.
- O three.js aparece em chunk separado (`DrawConstellation-*.js` e/ou um chunk compartilhado com `SkyScene`).
- O `ls` falha com "No such file".

- [ ] **Step 7: Commit**

```bash
git add src/dev/sampleData.ts scripts/shot.mjs src
git commit -m "chore(sorteio): sample types and cities, timed screenshots, visual fixes"
```

Depois do commit, **não dê push**. Lembre o usuário de rodar `supabase/migrations/20261007000002_types_city.sql` no SQL Editor e só então pedir o push.
