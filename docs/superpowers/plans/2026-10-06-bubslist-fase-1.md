# BubsList — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o BubsList Fase 1 — wishlist privada do casal com quests e subquests de profundidade ilimitada, catálogo TMDB/AniList com progresso de episódios, conclusões repetíveis com resenhas e fotos, conquistas com raridade, relatório por período, PWA publicado na Vercel.

**Architecture:** SPA React (Vite + TypeScript) que fala direto com um único projeto Supabase (Auth, Postgres com RLS, Storage, uma Edge Function `tmdb`). O app carrega todas as tabelas de uma vez (volume de duas pessoas) e calcula conquistas e relatório com funções puras em TypeScript. Todo acesso ao backend passa por `src/data/api.ts`, o que permite testar as telas com esse módulo mockado.

**Tech Stack:** React 19, Vite 7, TypeScript 5 (strict), React Router 7, TanStack Query 5, Tailwind CSS 4, vite-plugin-pwa 1, @supabase/supabase-js 2, Supabase CLI 2, Vitest 3 + Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-06-bubslist-design.md`

## Global Constraints

- **Nunca** chamar ferramentas `mcp__supabase__*` (o Supabase do MCP desta máquina é de outro projeto). Banco, migrações, segredos e funções só via `npx supabase …` ligado ao projeto `bubslist` do usuário.
- Um único projeto Supabase (`bubslist`); o desenvolvimento usa o projeto real. Dados de teste criados à mão são apagados pelo usuário antes do uso real.
- Fase 1 **não** tem nada de localização (busca de lugar, mapa, casa, alcance, conquistas geográficas).
- Interface somente em pt-BR; identificadores de código e banco em inglês (`easy|medium|hard|epic`, `bronze|silver|gold|platinum`, `general|movie|series|anime`, `tmdb_movie|tmdb_tv|anilist`).
- Datas de calendário são strings `YYYY-MM-DD`; nunca usar `new Date('YYYY-MM-DD')` (deslocamento de fuso). Exibição `dd/mm/aaaa`.
- Fotos: no máximo **15** por quest e **15** por resenha; redimensionar para no máximo **1600 px** no maior lado; **JPEG qualidade 0,8**.
- Dificuldade sugerida: total ≤ 900 min Fácil; ≤ 2400 Média; ≤ 6000 Difícil; acima Épica.
- Mobile-first: abaixo de 768 px (`md`) barra inferior; a partir de `md` menu lateral. Alvos de toque ≥ 44 px (`min-h-11`).
- Majors de dependência fixos: react 19, react-router 7, @tanstack/react-query 5, @supabase/supabase-js 2, vite 7, @vitejs/plugin-react 5, tailwindcss 4, vitest 3, jsdom 26, @testing-library/react 16, vite-plugin-pwa 1, supabase (CLI) 2. Se `npm install` reclamar de peer dependency, parar e reportar — não usar `--force`.
- Node v24 já instalado. Comandos rodam no Git Bash a partir de `C:\BubsList`.
- Toda mensagem de commit termina com a linha `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Anime em exibição sem total de episódios** (One Piece no AniList vem com `episodes: null`) — deve contar os episódios já exibidos (`nextAiringEpisode.episode − 1`) e sugerir **Épica**, não ficar sem sugestão. Testes na Task 2.
2. **Lembrança registrada depois** (conclusão com data no passado cadastrada hoje) — conquista desbloqueia na data do evento e o relatório conta no mês do evento, nunca pelo `created_at`. Testes nas Tasks 5 e 6.
3. **"Últimos 3 meses" em janeiro** — deve cobrir novembro e dezembro do ano anterior. Teste na Task 6.
4. **Busca sem acento/maiúscula** ("japao" acha "Japão", "ACAI" acha "Açaí") e **busca que acha subquest** ("fuji" acha "Monte Fuji" dentro de Japão). Testes nas Tasks 3 e 10.
5. **Excluir quest com sub-subquests que têm fotos** — os arquivos de foto de toda a subárvore (referência e resenhas) saem do Storage, não só os do nível de cima. Testes nas Tasks 3 e 12.

---

## File Structure

```
package.json · tsconfig.json · vite.config.ts · index.html · vercel.json · .env.example · .gitignore · README.md
pwa-assets.config.ts · public/logo.svg · public/tmdb.svg · public/(ícones gerados)
scripts/rls-smoke.mjs                     — teste de fumaça do RLS contra o projeto real
supabase/migrations/…_init.sql            — tabelas, RLS, storage, trigger de perfil
supabase/migrations/…_seed.sql            — categorias base + 36 conquistas
supabase/functions/_shared/catalog.ts     — tipos de mídia + normalizadores TMDB/AniList (puro, usado pelo app e pela função)
supabase/functions/tmdb/index.ts          — Edge Function (Deno) que esconde o token do TMDB
src/main.tsx · src/App.tsx · src/index.css · src/vite-env.d.ts
src/lib/types.ts        — tipos de domínio + AppData
src/lib/difficulty.ts   — rótulos, ordem, sugestão por tamanho
src/lib/tree.ts         — árvore de quests, caminho, progresso de filhas, fotos afetadas por exclusões
src/lib/filters.ts      — filtro/busca da lista, resenhas pendentes
src/lib/progress.ts     — +1 episódio, formatação
src/lib/achievements.ts — avaliação de conquistas, raridades, descrição da regra
src/lib/dates.ts        — hoje, formatação, dias do mês
src/lib/report.ts       — períodos e montagem do relatório
src/lib/supabase.ts     — cliente
src/lib/catalog.ts      — busca/detalhes no TMDB (via função) e AniList
src/lib/image.ts        — compressão de imagem
src/data/api.ts         — ÚNICO módulo que lê/escreve no Supabase (exceto auth do login)
src/data/hooks.ts       — useAppData, useRefresh, useSignedUrls, useMediaRefresh
src/data/session.tsx    — AuthGate, useUserId
src/components/*        — Layout, Status, QuestCard, DifficultyBadge, RarityBadge, Stars, PhotoGrid, PhotoPicker, CatalogSearch, Celebration
src/pages/*             — Login, NewPassword, Quests, QuestForm, Quest, Complete, Achievements, AchievementForm, Report, Profile
src/test/*              — setup, fixtures, renderRoute
```

Testes ficam ao lado do arquivo testado (`x.test.ts(x)`).

**Ordem e dependência de contas:** Tasks 1–6 são lógica pura. Task 7 precisa do projeto Supabase do usuário; Task 8 precisa do token TMDB. Se as contas não estiverem prontas ao chegar na Task 7, pular para as Tasks 9–16 (elas mockam o backend) e voltar depois.

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.env.example`, `src/vite-env.d.ts`, `src/index.css`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: scripts `npm test`, `npm run typecheck`, `npm run build`, `npm run dev`; classes CSS `btn`, `btn-primary`, `btn-danger`, `input`, `card`; cores Tailwind `brand`, `bronze`, `silver`, `gold`, `platinum`; variáveis de ambiente de teste `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "bubslist",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "smoke": "node --env-file=.env.local scripts/rls-smoke.mjs"
  }
}
```

- [ ] **Step 2: Instalar dependências**

```bash
npm install react@^19 react-dom@^19 react-router@^7 @tanstack/react-query@^5 @supabase/supabase-js@^2
npm install -D vite@^7 @vitejs/plugin-react@^5 typescript@^5 @types/react@^19 @types/react-dom@^19 tailwindcss@^4 @tailwindcss/vite@^4 vitest@^3 jsdom@^26 @testing-library/react@^16 @testing-library/dom@^10 @testing-library/user-event@^14 @testing-library/jest-dom@^6
```

Expected: instala sem erro de peer dependency.

- [ ] **Step 3: Criar arquivos de configuração**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "supabase/functions/_shared"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
  },
})
```

`index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#7c3aed" />
    <title>BubsList</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules
dist
dev-dist
.env.local
.env.*.local
supabase/.temp
supabase/.branches
*.tsbuildinfo
```

`.env.example`:
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-ou-anon-key>
# Só para `npm run smoke` (uma das duas contas). Nunca commitar valores reais.
BUBS_EMAIL=
BUBS_PASSWORD=
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}
```

`src/index.css`:
```css
@import "tailwindcss";

@theme {
  --color-brand: #7c3aed;
  --color-bronze: #b0743c;
  --color-silver: #9ca3af;
  --color-gold: #eab308;
  --color-platinum: #22d3ee;
}

@layer base {
  body {
    background: #faf7ff;
    color: #1f1b2e;
    -webkit-tap-highlight-color: transparent;
  }
}

@layer components {
  .btn {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background: #fff;
    padding: 0 1rem;
    font-weight: 500;
  }
  .btn:disabled { opacity: 0.6; }
  .btn-primary { background: var(--color-brand); border-color: transparent; color: #fff; }
  .btn-danger { color: #dc2626; }
  .input {
    width: 100%;
    min-height: 2.75rem;
    border-radius: 0.75rem;
    border: 1px solid #d1d5db;
    background: #fff;
    padding: 0.5rem 0.75rem;
  }
  .card { border-radius: 1rem; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
}
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
```

- [ ] **Step 4: Escrever o teste que falha**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'

it('renders the app name', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'BubsList' })).toBeInTheDocument()
})
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./App"`.

- [ ] **Step 6: Implementar**

`src/App.tsx`:
```tsx
export default function App() {
  return <h1 className="p-4 text-2xl font-bold text-brand">BubsList</h1>
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Verificar**

Run: `npm test && npm run build`
Expected: 1 teste PASS; build gera `dist/` sem erros de tipo.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + Tailwind + Vitest"
```

---

### Task 2: Tipos de domínio, normalizadores de catálogo e dificuldade

**Files:**
- Create: `supabase/functions/_shared/catalog.ts`, `src/lib/types.ts`, `src/lib/difficulty.ts`
- Test: `supabase/functions/_shared/catalog.test.ts`, `src/lib/difficulty.test.ts`

**Interfaces:**
- Produces (`supabase/functions/_shared/catalog.ts`): `type MediaSource`, `interface Season { season: number; episodes: number }`, `interface NormalizedMedia`, `interface CatalogHit`, `DEFAULT_RUNTIME: Record<MediaSource, number>`, `normalizeTmdbHit(type: 'movie'|'tv', raw): CatalogHit`, `normalizeTmdbMovie(raw): NormalizedMedia`, `normalizeTmdbTv(raw): NormalizedMedia`, `normalizeAniListHit(raw): CatalogHit`, `normalizeAniList(raw): NormalizedMedia`. Arquivo sem imports (roda no Deno e no Vite).
- Produces (`src/lib/types.ts`): `Difficulty`, `Rarity`, `CategoryKind`, `Profile`, `Category`, `Media`, `Quest`, `Completion`, `Review`, `Photo`, `Achievement`, `AppData` (+ reexporta `CatalogHit`, `MediaSource`, `NormalizedMedia`, `Season`).
- Produces (`src/lib/difficulty.ts`): `DIFFICULTIES`, `DIFFICULTY_LABEL`, `difficultyRank(d): number`, `totalMinutes(m): number | null`, `suggestDifficulty(m): Difficulty | null`.

- [ ] **Step 1: Escrever os testes que falham**

`supabase/functions/_shared/catalog.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { normalizeAniList, normalizeAniListHit, normalizeTmdbHit, normalizeTmdbMovie, normalizeTmdbTv } from './catalog'

describe('normalizeTmdbMovie', () => {
  it('maps the TMDB movie payload', () => {
    const m = normalizeTmdbMovie({
      id: 603, title: 'Matrix', original_title: 'The Matrix', release_date: '1999-03-30',
      poster_path: '/p.jpg', overview: 'Neo…', genres: [{ id: 1, name: 'Ação' }], runtime: 136,
    })
    expect(m).toEqual({
      source: 'tmdb_movie', external_id: '603', title: 'Matrix', year: 1999,
      poster_url: 'https://image.tmdb.org/t/p/w342/p.jpg', synopsis: 'Neo…', genres: ['Ação'],
      runtime_minutes: 136, seasons: [],
    })
  })

  it('falls back to the original title, 120 minutes and nulls', () => {
    const m = normalizeTmdbMovie({ id: 1, title: '', original_title: 'Orig', release_date: '', poster_path: null, overview: '', runtime: 0 })
    expect(m).toMatchObject({ title: 'Orig', year: null, poster_url: null, synopsis: null, genres: [], runtime_minutes: 120 })
  })
})

describe('normalizeTmdbTv', () => {
  const base = { id: 1396, name: 'Breaking Bad', first_air_date: '2008-01-20', poster_path: null, overview: 'x', genres: [] }

  it('drops specials and empty seasons and averages the run time', () => {
    const m = normalizeTmdbTv({
      ...base,
      episode_run_time: [42, 48],
      seasons: [
        { season_number: 0, episode_count: 9 },
        { season_number: 1, episode_count: 7 },
        { season_number: 2, episode_count: 13 },
        { season_number: 3, episode_count: 0 },
      ],
    })
    expect(m.seasons).toEqual([{ season: 1, episodes: 7 }, { season: 2, episodes: 13 }])
    expect(m).toMatchObject({ source: 'tmdb_tv', external_id: '1396', year: 2008, runtime_minutes: 45 })
  })

  it('uses the last episode runtime when episode_run_time is empty', () => {
    expect(normalizeTmdbTv({ ...base, episode_run_time: [], last_episode_to_air: { runtime: 22 }, seasons: [] }).runtime_minutes).toBe(22)
  })

  it('falls back to 45 minutes', () => {
    expect(normalizeTmdbTv({ ...base, seasons: [] }).runtime_minutes).toBe(45)
  })
})

describe('normalizeTmdbHit', () => {
  it('maps a tv search hit', () => {
    expect(normalizeTmdbHit('tv', { id: 1, name: 'Dark', first_air_date: '2017-12-01', poster_path: '/d.jpg' })).toEqual({
      source: 'tmdb_tv', external_id: '1', title: 'Dark', year: 2017, poster_url: 'https://image.tmdb.org/t/p/w342/d.jpg',
    })
  })
})

describe('normalizeAniList', () => {
  const frieren = {
    id: 154587,
    title: { romaji: 'Sousou no Frieren', english: "Frieren: Beyond Journey's End" },
    coverImage: { large: 'https://img/f.jpg' },
    description: 'Elf <i>mage</i><br>story',
    episodes: 28, duration: 24, genres: ['Adventure'], seasonYear: 2023, nextAiringEpisode: null,
  }

  it('prefers the english title, strips html and builds one season', () => {
    expect(normalizeAniList(frieren)).toEqual({
      source: 'anilist', external_id: '154587', title: "Frieren: Beyond Journey's End", year: 2023,
      poster_url: 'https://img/f.jpg', synopsis: 'Elf mage\nstory', genres: ['Adventure'],
      runtime_minutes: 24, seasons: [{ season: 1, episodes: 28 }],
    })
  })

  it('falls back to romaji and 24 minutes', () => {
    expect(normalizeAniList({ ...frieren, title: { romaji: 'Sousou no Frieren', english: null }, duration: null }))
      .toMatchObject({ title: 'Sousou no Frieren', runtime_minutes: 24 })
  })

  it('counts aired episodes of an airing show with unknown total (One Piece)', () => {
    const onePiece = { ...frieren, id: 21, title: { romaji: 'ONE PIECE', english: 'ONE PIECE' }, episodes: null, nextAiringEpisode: { episode: 1141 } }
    expect(normalizeAniList(onePiece).seasons).toEqual([{ season: 1, episodes: 1140 }])
  })

  it('leaves seasons empty when nothing is known', () => {
    expect(normalizeAniList({ ...frieren, episodes: null, nextAiringEpisode: null }).seasons).toEqual([])
  })

  it('maps a search hit', () => {
    expect(normalizeAniListHit(frieren)).toEqual({
      source: 'anilist', external_id: '154587', title: "Frieren: Beyond Journey's End", year: 2023, poster_url: 'https://img/f.jpg',
    })
  })
})
```

`src/lib/difficulty.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { normalizeAniList } from '../../supabase/functions/_shared/catalog'
import { difficultyRank, suggestDifficulty, totalMinutes } from './difficulty'
import type { Difficulty } from './types'

const tv = (minutes: number) => ({ source: 'tmdb_tv' as const, runtime_minutes: 1, seasons: [{ season: 1, episodes: minutes }] })

describe('suggestDifficulty', () => {
  it('any movie is easy', () => {
    expect(suggestDifficulty({ source: 'tmdb_movie', runtime_minutes: 180, seasons: [] })).toBe('easy')
  })

  it.each<[number, Difficulty]>([
    [900, 'easy'], [901, 'medium'], [2400, 'medium'], [2401, 'hard'], [6000, 'hard'], [6001, 'epic'],
  ])('%i minutes → %s', (minutes, expected) => {
    expect(suggestDifficulty(tv(minutes))).toBe(expected)
  })

  it('a 20-episode anime is easy', () => {
    expect(suggestDifficulty({ source: 'anilist', runtime_minutes: 24, seasons: [{ season: 1, episodes: 20 }] })).toBe('easy')
  })

  it('One Piece (airing, total unknown) is epic', () => {
    const onePiece = normalizeAniList({ id: 21, title: { english: 'ONE PIECE' }, episodes: null, nextAiringEpisode: { episode: 1141 }, duration: 24 })
    expect(suggestDifficulty(onePiece)).toBe('epic')
  })

  it('gives no suggestion when the episode count is unknown', () => {
    expect(suggestDifficulty({ source: 'anilist', runtime_minutes: 24, seasons: [] })).toBeNull()
  })

  it('uses the default runtime when missing', () => {
    expect(totalMinutes({ source: 'tmdb_tv', runtime_minutes: null, seasons: [{ season: 1, episodes: 10 }] })).toBe(450)
  })
})

it('ranks difficulties easy < medium < hard < epic', () => {
  const order: Difficulty[] = ['epic', 'easy', 'hard', 'medium']
  expect(order.map(difficultyRank)).toEqual([3, 0, 2, 1])
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — não resolve `./catalog` nem `./difficulty`.

- [ ] **Step 3: Implementar**

`supabase/functions/_shared/catalog.ts`:
```ts
// Pure module shared by the web app (Vite) and the Edge Function (Deno). No imports allowed.

export type MediaSource = 'tmdb_movie' | 'tmdb_tv' | 'anilist'

export interface Season {
  season: number
  episodes: number
}

export interface CatalogHit {
  source: MediaSource
  external_id: string
  title: string
  year: number | null
  poster_url: string | null
}

export interface NormalizedMedia extends CatalogHit {
  synopsis: string | null
  genres: string[]
  runtime_minutes: number
  seasons: Season[]
}

export const DEFAULT_RUNTIME: Record<MediaSource, number> = { tmdb_movie: 120, tmdb_tv: 45, anilist: 24 }

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

// deno-lint-ignore no-explicit-any
type Raw = any

const yearOf = (date?: string | null) => (date ? Number(date.slice(0, 4)) || null : null)
const tmdbPoster = (path?: string | null) => (path ? TMDB_IMG + path : null)
const genreNames = (genres?: { name: string }[]) => (genres ?? []).map((g) => g.name)

export function normalizeTmdbHit(type: 'movie' | 'tv', r: Raw): CatalogHit {
  const movie = type === 'movie'
  return {
    source: movie ? 'tmdb_movie' : 'tmdb_tv',
    external_id: String(r.id),
    title: (movie ? r.title || r.original_title : r.name || r.original_name) ?? '',
    year: yearOf(movie ? r.release_date : r.first_air_date),
    poster_url: tmdbPoster(r.poster_path),
  }
}

export function normalizeTmdbMovie(d: Raw): NormalizedMedia {
  return {
    ...normalizeTmdbHit('movie', d),
    synopsis: d.overview || null,
    genres: genreNames(d.genres),
    runtime_minutes: d.runtime || DEFAULT_RUNTIME.tmdb_movie,
    seasons: [],
  }
}

export function normalizeTmdbTv(d: Raw): NormalizedMedia {
  const runs: number[] = d.episode_run_time ?? []
  const average = runs.length ? Math.round(runs.reduce((a, b) => a + b, 0) / runs.length) : 0
  return {
    ...normalizeTmdbHit('tv', d),
    synopsis: d.overview || null,
    genres: genreNames(d.genres),
    runtime_minutes: average || d.last_episode_to_air?.runtime || DEFAULT_RUNTIME.tmdb_tv,
    seasons: (d.seasons ?? [])
      .filter((s: Raw) => s.season_number > 0 && s.episode_count > 0)
      .map((s: Raw) => ({ season: s.season_number, episodes: s.episode_count })),
  }
}

export function normalizeAniListHit(m: Raw): CatalogHit {
  return {
    source: 'anilist',
    external_id: String(m.id),
    title: m.title?.english || m.title?.romaji || '',
    year: m.seasonYear ?? null,
    poster_url: m.coverImage?.large ?? null,
  }
}

export function normalizeAniList(m: Raw): NormalizedMedia {
  const total: number | null = m.episodes ?? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null)
  const synopsis = m.description
    ? String(m.description).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
    : ''
  return {
    ...normalizeAniListHit(m),
    synopsis: synopsis || null,
    genres: m.genres ?? [],
    runtime_minutes: m.duration || DEFAULT_RUNTIME.anilist,
    seasons: total && total > 0 ? [{ season: 1, episodes: total }] : [],
  }
}
```

`src/lib/types.ts`:
```ts
import type { MediaSource, Season } from '../../supabase/functions/_shared/catalog'

export type { CatalogHit, MediaSource, NormalizedMedia, Season } from '../../supabase/functions/_shared/catalog'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'epic'
export type Rarity = 'bronze' | 'silver' | 'gold' | 'platinum'
export type CategoryKind = 'general' | 'movie' | 'series' | 'anime'

export interface Profile {
  id: string
  display_name: string
  avatar_path: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  kind: CategoryKind
  builtin: boolean
  created_at: string
}

export interface Media {
  id: string
  source: MediaSource
  external_id: string
  title: string
  poster_url: string | null
  synopsis: string | null
  year: number | null
  genres: string[]
  runtime_minutes: number | null
  seasons: Season[]
  fetched_at: string
  created_at: string
}

export interface Quest {
  id: string
  parent_id: string | null
  category_id: string
  title: string
  notes: string | null
  difficulty: Difficulty
  media_id: string | null
  progress_season: number | null
  progress_episode: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Completion {
  id: string
  quest_id: string
  done_on: string
  created_by: string
  created_at: string
}

export interface Review {
  id: string
  completion_id: string
  user_id: string
  rating: number
  body: string | null
  created_at: string
  updated_at: string
}

export interface Photo {
  id: string
  quest_id: string | null
  review_id: string | null
  storage_path: string
  created_by: string
  created_at: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: Rarity
  kind: 'auto' | 'manual'
  rule_category_id: string | null
  rule_min_difficulty: Difficulty | null
  rule_count: number | null
  manual_unlocked_on: string | null
  created_at: string
}

export interface AppData {
  profiles: Profile[]
  categories: Category[]
  media: Media[]
  quests: Quest[]
  completions: Completion[]
  reviews: Review[]
  photos: Photo[]
  achievements: Achievement[]
}
```

`src/lib/difficulty.ts`:
```ts
import { DEFAULT_RUNTIME } from '../../supabase/functions/_shared/catalog'
import type { Difficulty, MediaSource, Season } from './types'

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'epic']

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Média',
  hard: 'Difícil',
  epic: 'Épica',
}

export const difficultyRank = (d: Difficulty) => DIFFICULTIES.indexOf(d)

interface Sized {
  source: MediaSource
  runtime_minutes: number | null
  seasons: Season[]
}

export function totalMinutes(m: Sized): number | null {
  const perUnit = m.runtime_minutes || DEFAULT_RUNTIME[m.source]
  if (m.source === 'tmdb_movie') return perUnit
  if (m.seasons.length === 0) return null
  return m.seasons.reduce((sum, s) => sum + s.episodes, 0) * perUnit
}

export function suggestDifficulty(m: Sized): Difficulty | null {
  const total = totalMinutes(m)
  if (total === null) return null
  if (total <= 900) return 'easy'
  if (total <= 2400) return 'medium'
  if (total <= 6000) return 'hard'
  return 'epic'
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS; typecheck sem erros.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: domain types, catalog normalizers and difficulty suggestion"
```

---

### Task 3: Árvore de quests, lista e resenhas pendentes

**Files:**
- Create: `src/test/fixtures.ts`, `src/lib/tree.ts`, `src/lib/filters.ts`
- Test: `src/lib/tree.test.ts`, `src/lib/filters.test.ts`

**Interfaces:**
- Consumes: tipos de `src/lib/types.ts`.
- Produces (`src/test/fixtures.ts`): `ME`, `PARTNER`, `category(o)`, `quest(o)`, `completion(o)`, `review(o)`, `photo(o)`, `achievement(o)`, `media(o)`, `appData(o)`, `CATS` (viagem, restaurante, atividade, filme, serie, anime com ids fixos `cat-viagem`, `cat-rest`, `cat-ativ`, `cat-filme`, `cat-serie`, `cat-anime`), `allCats()`.
- Produces (`src/lib/tree.ts`): `doneQuestIds(completions): Set<string>`, `childrenOf(quests, parentId | null): Quest[]`, `ancestors(quests, id): Quest[]` (raiz primeiro, sem a própria), `pathLabel(quests, id): string` (`"Japão › Tóquio"`), `descendantIds(quests, id): string[]`, `subquestProgress(quests, done, id): { done: number; total: number }`, `subtreePhotos(data, questId): Photo[]`, `completionPhotos(data, completionId): Photo[]`.
- Produces (`src/lib/filters.ts`): `normalizeText(s): string`, `interface QuestFilter { tab: 'pending'|'done'; categoryId: string|null; difficulty: Difficulty|null; search: string }`, `filterQuests(quests, done, filter): Quest[]`, `pendingReviews(completions, reviews, userId): Completion[]`.

- [ ] **Step 1: Criar fixtures de teste**

`src/test/fixtures.ts`:
```ts
import type { Achievement, AppData, Category, Completion, Media, Photo, Quest, Review } from '../lib/types'

export const ME = 'user-me'
export const PARTNER = 'user-partner'

const T = '2026-01-01T00:00:00Z'
let seq = 0
const nextId = (prefix: string) => `${prefix}-${++seq}`

export const category = (o: Partial<Category> = {}): Category => ({
  id: nextId('cat'), name: 'Viagem', icon: '✈️', color: '#0ea5e9', kind: 'general', builtin: true, created_at: T, ...o,
})

export const quest = (o: Partial<Quest> = {}): Quest => ({
  id: nextId('q'), parent_id: null, category_id: 'cat-none', title: 'Quest', notes: null, difficulty: 'easy',
  media_id: null, progress_season: null, progress_episode: null, created_by: ME, created_at: T, updated_at: T, ...o,
})

export const completion = (o: Partial<Completion> = {}): Completion => ({
  id: nextId('c'), quest_id: 'q-none', done_on: '2026-10-01', created_by: ME, created_at: '2026-10-01T12:00:00Z', ...o,
})

export const review = (o: Partial<Review> = {}): Review => ({
  id: nextId('r'), completion_id: 'c-none', user_id: ME, rating: 5, body: null, created_at: T, updated_at: T, ...o,
})

export const photo = (o: Partial<Photo> = {}): Photo => ({
  id: nextId('p'), quest_id: null, review_id: null, storage_path: `${nextId('path')}.jpg`, created_by: ME, created_at: T, ...o,
})

export const achievement = (o: Partial<Achievement> = {}): Achievement => ({
  id: nextId('a'), name: 'Conquista', description: '', icon: '⭐', rarity: 'bronze', kind: 'auto',
  rule_category_id: null, rule_min_difficulty: null, rule_count: 1, manual_unlocked_on: null, created_at: T, ...o,
})

export const media = (o: Partial<Media> = {}): Media => ({
  id: nextId('m'), source: 'tmdb_tv', external_id: '1', title: 'Série', poster_url: null, synopsis: null, year: 2020,
  genres: [], runtime_minutes: 45, seasons: [{ season: 1, episodes: 10 }], fetched_at: new Date().toISOString(), created_at: T, ...o,
})

export const CATS = {
  viagem: category({ id: 'cat-viagem', name: 'Viagem', icon: '✈️', color: '#0ea5e9' }),
  restaurante: category({ id: 'cat-rest', name: 'Restaurante', icon: '🍽️', color: '#f97316' }),
  atividade: category({ id: 'cat-ativ', name: 'Atividade', icon: '🎯', color: '#22c55e' }),
  filme: category({ id: 'cat-filme', name: 'Filme', icon: '🎬', color: '#ef4444', kind: 'movie' }),
  serie: category({ id: 'cat-serie', name: 'Série', icon: '📺', color: '#8b5cf6', kind: 'series' }),
  anime: category({ id: 'cat-anime', name: 'Anime', icon: '🍥', color: '#ec4899', kind: 'anime' }),
}

export const allCats = () => Object.values(CATS)

export const appData = (o: Partial<AppData> = {}): AppData => ({
  profiles: [
    { id: ME, display_name: 'Luis', avatar_path: null, created_at: T },
    { id: PARTNER, display_name: 'Bubs', avatar_path: null, created_at: '2026-01-02T00:00:00Z' },
  ],
  categories: [], media: [], quests: [], completions: [], reviews: [], photos: [], achievements: [],
  ...o,
})
```

- [ ] **Step 2: Escrever os testes que falham**

`src/lib/tree.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { appData, completion, photo, quest, review } from '../test/fixtures'
import { ancestors, childrenOf, completionPhotos, descendantIds, doneQuestIds, pathLabel, subquestProgress, subtreePhotos } from './tree'

const japao = quest({ id: 'japao', title: 'Japão', created_at: '2026-01-01T00:00:00Z' })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', created_at: '2026-01-02T00:00:00Z' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', created_at: '2026-01-01T12:00:00Z' })
const ichiran = quest({ id: 'ichiran', parent_id: 'toquio', title: 'Ichiran' })
const rio = quest({ id: 'rio', title: 'Rio', created_at: '2026-03-01T00:00:00Z' })
const quests = [japao, toquio, fuji, ichiran, rio]

describe('tree', () => {
  it('lists direct children oldest first', () => {
    expect(childrenOf(quests, 'japao').map((q) => q.id)).toEqual(['fuji', 'toquio'])
    expect(childrenOf(quests, null).map((q) => q.id)).toEqual(['japao', 'rio'])
  })

  it('builds the ancestor path root first', () => {
    expect(ancestors(quests, 'ichiran').map((q) => q.title)).toEqual(['Japão', 'Tóquio'])
    expect(pathLabel(quests, 'ichiran')).toBe('Japão › Tóquio')
    expect(ancestors(quests, 'japao')).toEqual([])
  })

  it('collects descendants at any depth', () => {
    expect(descendantIds(quests, 'japao').sort()).toEqual(['fuji', 'ichiran', 'toquio'])
  })

  it('counts done direct children', () => {
    const done = doneQuestIds([completion({ quest_id: 'fuji' }), completion({ quest_id: 'ichiran' })])
    expect(subquestProgress(quests, done, 'japao')).toEqual({ done: 1, total: 2 })
  })
})

describe('photos affected by deletions', () => {
  it('collects reference and review photos of the whole subtree, sub-subquests included', () => {
    const c = completion({ id: 'c1', quest_id: 'ichiran' })
    const r = review({ id: 'r1', completion_id: 'c1' })
    const data = appData({
      quests,
      completions: [c],
      reviews: [r],
      photos: [photo({ id: 'p-ref', quest_id: 'ichiran' }), photo({ id: 'p-rev', review_id: 'r1' }), photo({ id: 'p-rio', quest_id: 'rio' })],
    })
    expect(subtreePhotos(data, 'japao').map((p) => p.id).sort()).toEqual(['p-ref', 'p-rev'])
    expect(completionPhotos(data, 'c1').map((p) => p.id)).toEqual(['p-rev'])
  })
})
```

`src/lib/filters.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ME, PARTNER, completion, quest, review } from '../test/fixtures'
import { filterQuests, pendingReviews, type QuestFilter } from './filters'

const japao = quest({ id: 'japao', title: 'Japão', category_id: 'viagem', difficulty: 'epic', created_at: '2026-01-01T00:00:00Z' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', category_id: 'ativ' })
const acai = quest({ id: 'acai', title: 'Açaí do Pará', category_id: 'rest', created_at: '2026-02-01T00:00:00Z' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: 'filme', created_at: '2026-03-01T00:00:00Z' })
const quests = [japao, fuji, acai, matrix]
const done = new Set(['matrix'])
const ids = (o: Partial<QuestFilter> = {}) =>
  filterQuests(quests, done, { tab: 'pending', categoryId: null, difficulty: null, search: '', ...o }).map((q) => q.id)

describe('filterQuests', () => {
  it('pending tab shows top-level pending quests, newest first', () => {
    expect(ids()).toEqual(['acai', 'japao'])
  })

  it('done tab shows done quests', () => {
    expect(ids({ tab: 'done' })).toEqual(['matrix'])
  })

  it('filters by category and difficulty', () => {
    expect(ids({ categoryId: 'viagem' })).toEqual(['japao'])
    expect(ids({ difficulty: 'epic' })).toEqual(['japao'])
  })

  it('search ignores accents and case', () => {
    expect(ids({ search: 'japao' })).toEqual(['japao'])
    expect(ids({ search: 'ACAI' })).toEqual(['acai'])
  })

  it('search also finds subquests', () => {
    expect(ids({ search: 'fuji' })).toEqual(['fuji'])
  })
})

describe('pendingReviews', () => {
  it('lists my unreviewed completions regardless of age, newest first', () => {
    const old = completion({ id: 'old', done_on: '2020-01-01' })
    const recent = completion({ id: 'recent', done_on: '2026-10-01' })
    const mine = completion({ id: 'mine', done_on: '2026-09-01' })
    const reviews = [review({ completion_id: 'mine', user_id: ME }), review({ completion_id: 'recent', user_id: PARTNER })]
    expect(pendingReviews([old, recent, mine], reviews, ME).map((c) => c.id)).toEqual(['recent', 'old'])
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — não resolve `./tree` nem `./filters`.

- [ ] **Step 4: Implementar**

`src/lib/tree.ts`:
```ts
import type { AppData, Completion, Photo, Quest } from './types'

export const doneQuestIds = (completions: Completion[]) => new Set(completions.map((c) => c.quest_id))

export function childrenOf(quests: Quest[], parentId: string | null): Quest[] {
  return quests.filter((q) => q.parent_id === parentId).sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function ancestors(quests: Quest[], id: string): Quest[] {
  const byId = new Map(quests.map((q) => [q.id, q]))
  const path: Quest[] = []
  let parentId = byId.get(id)?.parent_id ?? null
  while (parentId && path.length < quests.length) {
    const parent = byId.get(parentId)
    if (!parent) break
    path.unshift(parent)
    parentId = parent.parent_id
  }
  return path
}

export const pathLabel = (quests: Quest[], id: string) => ancestors(quests, id).map((q) => q.title).join(' › ')

export function descendantIds(quests: Quest[], id: string): string[] {
  const out: string[] = []
  const stack = [id]
  while (stack.length) {
    const current = stack.pop()!
    for (const q of quests) {
      if (q.parent_id === current) {
        out.push(q.id)
        stack.push(q.id)
      }
    }
  }
  return out
}

export function subquestProgress(quests: Quest[], done: Set<string>, id: string) {
  const kids = quests.filter((q) => q.parent_id === id)
  return { done: kids.filter((k) => done.has(k.id)).length, total: kids.length }
}

type PhotoData = Pick<AppData, 'quests' | 'completions' | 'reviews' | 'photos'>

export function subtreePhotos(data: PhotoData, questId: string): Photo[] {
  const questIds = new Set([questId, ...descendantIds(data.quests, questId)])
  const completionIds = new Set(data.completions.filter((c) => questIds.has(c.quest_id)).map((c) => c.id))
  const reviewIds = new Set(data.reviews.filter((r) => completionIds.has(r.completion_id)).map((r) => r.id))
  return data.photos.filter(
    (p) => (p.quest_id !== null && questIds.has(p.quest_id)) || (p.review_id !== null && reviewIds.has(p.review_id)),
  )
}

export function completionPhotos(data: PhotoData, completionId: string): Photo[] {
  const reviewIds = new Set(data.reviews.filter((r) => r.completion_id === completionId).map((r) => r.id))
  return data.photos.filter((p) => p.review_id !== null && reviewIds.has(p.review_id))
}
```

`src/lib/filters.ts`:
```ts
import type { Completion, Difficulty, Quest, Review } from './types'

export const normalizeText = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export interface QuestFilter {
  tab: 'pending' | 'done'
  categoryId: string | null
  difficulty: Difficulty | null
  search: string
}

export function filterQuests(quests: Quest[], done: Set<string>, f: QuestFilter): Quest[] {
  const term = normalizeText(f.search)
  return quests
    .filter((q) => (term ? normalizeText(q.title).includes(term) : q.parent_id === null))
    .filter((q) => done.has(q.id) === (f.tab === 'done'))
    .filter((q) => !f.categoryId || q.category_id === f.categoryId)
    .filter((q) => !f.difficulty || q.difficulty === f.difficulty)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function pendingReviews(completions: Completion[], reviews: Review[], userId: string): Completion[] {
  const reviewed = new Set(reviews.filter((r) => r.user_id === userId).map((r) => r.completion_id))
  return completions.filter((c) => !reviewed.has(c.id)).sort((a, b) => b.done_on.localeCompare(a.done_on))
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: quest tree helpers, list filtering and pending reviews"
```

---

### Task 4: Progresso de episódios

**Files:**
- Create: `src/lib/progress.ts`
- Test: `src/lib/progress.test.ts`

**Interfaces:**
- Consumes: `Quest`, `MediaSource`, `Season` de `src/lib/types.ts`.
- Produces: `interface Progress { season: number; episode: number }`, `nextEpisode(seasons, current: Progress | null): Progress | null` (null = já está no último episódio), `formatProgress(source, seasons, current): string`, `progressOf(quest): Progress | null`.

- [ ] **Step 1: Escrever o teste que falha**

`src/lib/progress.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { quest } from '../test/fixtures'
import { formatProgress, nextEpisode, progressOf } from './progress'

const seasons = [{ season: 1, episodes: 10 }, { season: 2, episodes: 8 }]

describe('nextEpisode', () => {
  it('starts at S1E1', () => expect(nextEpisode(seasons, null)).toEqual({ season: 1, episode: 1 }))
  it('advances within a season', () => expect(nextEpisode(seasons, { season: 1, episode: 3 })).toEqual({ season: 1, episode: 4 }))
  it('jumps to the next season after its last episode', () =>
    expect(nextEpisode(seasons, { season: 1, episode: 10 })).toEqual({ season: 2, episode: 1 }))
  it('returns null at the very last episode', () => expect(nextEpisode(seasons, { season: 2, episode: 8 })).toBeNull())
  it('handles unsorted seasons', () =>
    expect(nextEpisode([seasons[1], seasons[0]], { season: 1, episode: 10 })).toEqual({ season: 2, episode: 1 }))
  it('only increments when seasons are unknown', () =>
    expect(nextEpisode([], { season: 1, episode: 41 })).toEqual({ season: 1, episode: 42 }))
  it('starts at the first listed season', () =>
    expect(nextEpisode([{ season: 2, episodes: 5 }], null)).toEqual({ season: 2, episode: 1 }))
})

describe('formatProgress', () => {
  it('not started', () => expect(formatProgress('tmdb_tv', seasons, null)).toBe('Não começou'))
  it('series', () => expect(formatProgress('tmdb_tv', seasons, { season: 2, episode: 5 })).toBe('T2 E5'))
  it('anime with total', () => expect(formatProgress('anilist', [{ season: 1, episodes: 24 }], { season: 1, episode: 5 })).toBe('E5 / 24'))
  it('anime without total', () => expect(formatProgress('anilist', [], { season: 1, episode: 5 })).toBe('E5'))
})

it('reads progress from a quest', () => {
  expect(progressOf(quest({ progress_season: 2, progress_episode: 3 }))).toEqual({ season: 2, episode: 3 })
  expect(progressOf(quest())).toBeNull()
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/progress.test.ts`
Expected: FAIL — não resolve `./progress`.

- [ ] **Step 3: Implementar**

`src/lib/progress.ts`:
```ts
import type { MediaSource, Quest, Season } from './types'

export interface Progress {
  season: number
  episode: number
}

export function nextEpisode(seasons: Season[], current: Progress | null): Progress | null {
  const sorted = [...seasons].sort((a, b) => a.season - b.season)
  if (!current) return { season: sorted[0]?.season ?? 1, episode: 1 }
  if (sorted.length === 0) return { season: current.season, episode: current.episode + 1 }
  const season = sorted.find((s) => s.season === current.season)
  if (season && current.episode < season.episodes) return { season: current.season, episode: current.episode + 1 }
  const next = sorted.find((s) => s.season > current.season)
  return next ? { season: next.season, episode: 1 } : null
}

export function formatProgress(source: MediaSource, seasons: Season[], current: Progress | null): string {
  if (!current) return 'Não começou'
  if (source === 'anilist') {
    const total = seasons[0]?.episodes
    return total ? `E${current.episode} / ${total}` : `E${current.episode}`
  }
  return `T${current.season} E${current.episode}`
}

export const progressOf = (q: Quest): Progress | null =>
  q.progress_season !== null && q.progress_episode !== null ? { season: q.progress_season, episode: q.progress_episode } : null
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: episode progress stepping and formatting"
```

---

### Task 5: Avaliação de conquistas

**Files:**
- Create: `src/lib/achievements.ts`
- Test: `src/lib/achievements.test.ts`

**Interfaces:**
- Consumes: `difficultyRank` (Task 2), tipos.
- Produces: `RARITIES: Rarity[]` (ordem platina→bronze), `RARITY_LABEL: Record<Rarity, string>`, `interface AchievementStatus { achievement: Achievement; unlockedOn: string | null; current: number; target: number }`, `evaluateAchievements(achievements, quests, completions): AchievementStatus[]`, `newlyUnlocked(before, after): Achievement[]`.

- [ ] **Step 1: Escrever o teste que falha**

`src/lib/achievements.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { achievement, completion, quest } from '../test/fixtures'
import { evaluateAchievements, newlyUnlocked } from './achievements'

const q1 = quest({ id: 'q1', category_id: 'rest', difficulty: 'easy' })
const q2 = quest({ id: 'q2', category_id: 'rest', difficulty: 'hard' })
const q3 = quest({ id: 'q3', category_id: 'filme', difficulty: 'epic' })
const quests = [q1, q2, q3]
const one = (a: Parameters<typeof achievement>[0], completions: ReturnType<typeof completion>[], qs = quests) =>
  evaluateAchievements([achievement(a)], qs, completions)[0]

describe('evaluateAchievements', () => {
  it('counts completions of the rule category', () => {
    const s = one({ rule_category_id: 'rest', rule_count: 2 }, [
      completion({ quest_id: 'q1', done_on: '2026-01-05' }),
      completion({ quest_id: 'q3', done_on: '2026-01-06' }),
      completion({ quest_id: 'q2', done_on: '2026-02-10' }),
    ])
    expect(s).toMatchObject({ unlockedOn: '2026-02-10', current: 2, target: 2 })
  })

  it('minimum difficulty also counts harder quests', () => {
    const s = one({ rule_min_difficulty: 'hard', rule_count: 2 }, [
      completion({ quest_id: 'q1', done_on: '2026-01-01' }),
      completion({ quest_id: 'q2', done_on: '2026-03-01' }),
      completion({ quest_id: 'q3', done_on: '2026-03-02' }),
    ])
    expect(s).toMatchObject({ unlockedOn: '2026-03-02', current: 2 })
  })

  it('redoing the same quest does not count twice', () => {
    const s = one({ rule_count: 2 }, [
      completion({ quest_id: 'q1', done_on: '2026-01-01' }),
      completion({ quest_id: 'q1', done_on: '2026-06-01' }),
    ])
    expect(s).toMatchObject({ unlockedOn: null, current: 1, target: 2 })
  })

  it('two quests with the same media count once', () => {
    const a = quest({ id: 'a', media_id: 'm1' })
    const b = quest({ id: 'b', media_id: 'm1' })
    expect(one({ rule_count: 2 }, [completion({ quest_id: 'a' }), completion({ quest_id: 'b' })], [a, b]).current).toBe(1)
  })

  it('a memory registered later unlocks on the date it happened', () => {
    const late = completion({ quest_id: 'q1', done_on: '2025-12-24', created_at: '2026-10-05T10:00:00Z' })
    const early = completion({ quest_id: 'q2', done_on: '2026-03-01', created_at: '2026-03-01T10:00:00Z' })
    expect(one({ rule_count: 1 }, [early, late]).unlockedOn).toBe('2025-12-24')
  })

  it('is locked without completions and ignores deleted quests', () => {
    expect(one({ rule_count: 1 }, []).unlockedOn).toBeNull()
    expect(one({ rule_count: 1 }, [completion({ quest_id: 'gone' })]).current).toBe(0)
  })

  it('manual achievements use the stored date', () => {
    expect(one({ kind: 'manual', rule_count: null, manual_unlocked_on: '2026-07-01' }, [])).toMatchObject({ unlockedOn: '2026-07-01', current: 1, target: 1 })
    expect(one({ kind: 'manual', rule_count: null }, [])).toMatchObject({ unlockedOn: null, current: 0, target: 1 })
  })
})

it('newlyUnlocked lists only achievements unlocked by the change', () => {
  const first = achievement({ id: 'first', rule_count: 1 })
  const two = achievement({ id: 'two', rule_count: 2 })
  const before = evaluateAchievements([first, two], quests, [])
  const after = evaluateAchievements([first, two], quests, [completion({ quest_id: 'q1' })])
  expect(newlyUnlocked(before, after).map((a) => a.id)).toEqual(['first'])
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/achievements.test.ts`
Expected: FAIL — não resolve `./achievements`.

- [ ] **Step 3: Implementar**

`src/lib/achievements.ts`:
```ts
import { difficultyRank } from './difficulty'
import type { Achievement, Completion, Quest, Rarity } from './types'

export const RARITIES: Rarity[] = ['platinum', 'gold', 'silver', 'bronze']

export const RARITY_LABEL: Record<Rarity, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
}

export interface AchievementStatus {
  achievement: Achievement
  unlockedOn: string | null
  current: number
  target: number
}

export function evaluateAchievements(achievements: Achievement[], quests: Quest[], completions: Completion[]): AchievementStatus[] {
  const questById = new Map(quests.map((q) => [q.id, q]))
  const ordered = [...completions].sort((a, b) => a.done_on.localeCompare(b.done_on) || a.created_at.localeCompare(b.created_at))
  return achievements.map((a) =>
    a.kind === 'manual'
      ? { achievement: a, unlockedOn: a.manual_unlocked_on, current: a.manual_unlocked_on ? 1 : 0, target: 1 }
      : evaluateAuto(a, questById, ordered),
  )
}

function evaluateAuto(a: Achievement, questById: Map<string, Quest>, ordered: Completion[]): AchievementStatus {
  const target = a.rule_count ?? 1
  const seen = new Set<string>()
  let unlockedOn: string | null = null
  for (const c of ordered) {
    const q = questById.get(c.quest_id)
    if (!q) continue
    if (a.rule_category_id && q.category_id !== a.rule_category_id) continue
    if (a.rule_min_difficulty && difficultyRank(q.difficulty) < difficultyRank(a.rule_min_difficulty)) continue
    seen.add(q.media_id ?? q.id)
    if (!unlockedOn && seen.size >= target) unlockedOn = c.done_on
  }
  return { achievement: a, unlockedOn, current: Math.min(seen.size, target), target }
}

export function newlyUnlocked(before: AchievementStatus[], after: AchievementStatus[]): Achievement[] {
  const already = new Set(before.filter((s) => s.unlockedOn).map((s) => s.achievement.id))
  return after.filter((s) => s.unlockedOn && !already.has(s.achievement.id)).map((s) => s.achievement)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: achievement evaluation with distinct counting and unlock dates"
```

---

### Task 6: Datas e relatório

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/report.ts`
- Test: `src/lib/report.test.ts`

**Interfaces:**
- Consumes: `ancestors` (Task 3), `AchievementStatus` (Task 5), tipos.
- Produces (`dates.ts`): `toISO(y, m, d): string`, `todayISO(now?: Date): string`, `formatDate(iso): string` (`dd/mm/aaaa`), `daysInMonth(y, m): number`.
- Produces (`report.ts`): `type PeriodKind = 'month'|'last3'|'year'`, `interface Period { kind; year; month; start; end; label }`, `monthPeriod(year, month)`, `yearPeriod(year)`, `last3Period(todayIso)`, `shiftPeriod(period, delta)`, `interface TimelineItem { completion; quest; category; path; ratings: Review[]; average: number | null }`, `interface Report { total; byCategory: { category: Category; count: number }[]; byDifficulty: Record<Difficulty, number>; unlocked: AchievementStatus[]; best: TimelineItem[]; photos: Photo[]; timeline: TimelineItem[] }`, `buildReport(period, data: Pick<AppData,'quests'|'categories'|'completions'|'reviews'|'photos'>, statuses): Report`.

- [ ] **Step 1: Escrever o teste que falha**

`src/lib/report.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { PARTNER, achievement, category, completion, photo, quest, review } from '../test/fixtures'
import { formatDate, todayISO } from './dates'
import { buildReport, last3Period, monthPeriod, shiftPeriod, yearPeriod } from './report'

describe('dates', () => {
  it('formats and reads today', () => {
    expect(formatDate('2026-10-06')).toBe('06/10/2026')
    expect(todayISO(new Date(2026, 9, 6, 23, 59))).toBe('2026-10-06')
  })
})

describe('periods', () => {
  it('month period with pt-BR label', () => {
    expect(monthPeriod(2026, 10)).toMatchObject({ start: '2026-10-01', end: '2026-10-31', label: 'outubro de 2026' })
  })
  it('february of a leap year', () => expect(monthPeriod(2028, 2).end).toBe('2028-02-29'))
  it('year period', () => expect(yearPeriod(2026)).toMatchObject({ start: '2026-01-01', end: '2026-12-31', label: '2026' }))
  it('last 3 months = current month and the two before', () => {
    expect(last3Period('2026-10-06')).toMatchObject({ start: '2026-08-01', end: '2026-10-31', label: 'Últimos 3 meses' })
  })
  it('last 3 months in January reaches into the previous year', () => {
    expect(last3Period('2026-01-15')).toMatchObject({ start: '2025-11-01', end: '2026-01-31' })
  })
  it('shifts months and years', () => {
    expect(shiftPeriod(monthPeriod(2026, 12), 1)).toMatchObject({ start: '2027-01-01' })
    expect(shiftPeriod(monthPeriod(2026, 1), -1)).toMatchObject({ start: '2025-12-01' })
    expect(shiftPeriod(yearPeriod(2026), -1)).toMatchObject({ start: '2025-01-01' })
  })
})

describe('buildReport', () => {
  const rest = category({ id: 'rest', name: 'Restaurante' })
  const filme = category({ id: 'filme', name: 'Filme' })
  const outro = category({ id: 'outro', name: 'Outro' })
  const japao = quest({ id: 'japao', title: 'Japão', category_id: 'outro' })
  const ichiran = quest({ id: 'ichiran', parent_id: 'japao', title: 'Ichiran', category_id: 'rest', difficulty: 'medium' })
  const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: 'filme' })
  const c1 = completion({ id: 'c1', quest_id: 'ichiran', done_on: '2026-10-01' })
  const c2 = completion({ id: 'c2', quest_id: 'ichiran', done_on: '2026-10-31' })
  const c3 = completion({ id: 'c3', quest_id: 'matrix', done_on: '2026-10-15' })
  const c4 = completion({ id: 'c4', quest_id: 'matrix', done_on: '2026-09-30', created_at: '2026-10-02T00:00:00Z' })
  const data = {
    quests: [japao, ichiran, matrix],
    categories: [rest, filme, outro],
    completions: [c1, c2, c3, c4],
    reviews: [
      review({ id: 'r1', completion_id: 'c1', rating: 5 }),
      review({ id: 'r2', completion_id: 'c1', user_id: PARTNER, rating: 4 }),
      review({ id: 'r3', completion_id: 'c3', rating: 3 }),
      review({ id: 'r4', completion_id: 'c4', rating: 5 }),
    ],
    photos: [photo({ id: 'p1', review_id: 'r1' }), photo({ id: 'p4', review_id: 'r4' }), photo({ id: 'pref', quest_id: 'matrix' })],
  }
  const oct = monthPeriod(2026, 10)

  it('counts every completion in range by done_on, inclusive', () => {
    const r = buildReport(oct, data, [])
    expect(r.total).toBe(3)
    expect(r.byCategory.map((x) => [x.category.name, x.count])).toEqual([['Restaurante', 2], ['Filme', 1]])
    expect(r.byDifficulty).toEqual({ easy: 1, medium: 2, hard: 0, epic: 0 })
  })

  it('timeline is newest first with the parent path', () => {
    const r = buildReport(oct, data, [])
    expect(r.timeline.map((i) => i.completion.id)).toEqual(['c2', 'c3', 'c1'])
    expect(r.timeline[0].path).toBe('Japão')
  })

  it('best moments by average rating', () => {
    expect(buildReport(oct, data, []).best.map((i) => [i.completion.id, i.average])).toEqual([['c1', 4.5], ['c3', 3]])
  })

  it('album only has review photos from the period', () => {
    expect(buildReport(oct, data, []).photos.map((p) => p.id)).toEqual(['p1'])
  })

  it('lists achievements unlocked in the period', () => {
    const inside = achievement({ id: 'inside' })
    const statuses = [
      { achievement: inside, unlockedOn: '2026-10-10', current: 1, target: 1 },
      { achievement: achievement(), unlockedOn: '2026-09-10', current: 1, target: 1 },
      { achievement: achievement(), unlockedOn: null, current: 0, target: 1 },
    ]
    expect(buildReport(oct, data, statuses).unlocked.map((s) => s.achievement.id)).toEqual(['inside'])
  })

  it('a September memory registered in October counts in September', () => {
    expect(buildReport(monthPeriod(2026, 9), data, []).timeline.map((i) => i.completion.id)).toEqual(['c4'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/report.test.ts`
Expected: FAIL — não resolve `./dates` / `./report`.

- [ ] **Step 3: Implementar**

`src/lib/dates.ts`:
```ts
const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

export const todayISO = (now = new Date()) => toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
```

`src/lib/report.ts`:
```ts
import type { AchievementStatus } from './achievements'
import { daysInMonth, toISO } from './dates'
import { pathLabel } from './tree'
import type { AppData, Category, Completion, Difficulty, Photo, Quest, Review } from './types'

export type PeriodKind = 'month' | 'last3' | 'year'

export interface Period {
  kind: PeriodKind
  year: number
  month: number
  start: string
  end: string
  label: string
}

const MONTH_LABEL = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function monthPeriod(year: number, month: number): Period {
  return {
    kind: 'month', year, month,
    start: toISO(year, month, 1),
    end: toISO(year, month, daysInMonth(year, month)),
    label: MONTH_LABEL.format(Date.UTC(year, month - 1, 1)),
  }
}

export function yearPeriod(year: number): Period {
  return { kind: 'year', year, month: 1, start: toISO(year, 1, 1), end: toISO(year, 12, 31), label: String(year) }
}

export function last3Period(today: string): Period {
  const [y, m] = today.split('-').map(Number)
  const wraps = m <= 2
  return {
    kind: 'last3', year: y, month: m,
    start: toISO(wraps ? y - 1 : y, wraps ? m + 10 : m - 2, 1),
    end: toISO(y, m, daysInMonth(y, m)),
    label: 'Últimos 3 meses',
  }
}

export function shiftPeriod(p: Period, delta: number): Period {
  if (p.kind === 'year') return yearPeriod(p.year + delta)
  if (p.kind === 'month') {
    const index = p.year * 12 + (p.month - 1) + delta
    return monthPeriod(Math.floor(index / 12), (index % 12) + 1)
  }
  return p
}

export interface TimelineItem {
  completion: Completion
  quest: Quest
  category: Category | undefined
  path: string
  ratings: Review[]
  average: number | null
}

export interface Report {
  total: number
  byCategory: { category: Category; count: number }[]
  byDifficulty: Record<Difficulty, number>
  unlocked: AchievementStatus[]
  best: TimelineItem[]
  photos: Photo[]
  timeline: TimelineItem[]
}

type ReportData = Pick<AppData, 'quests' | 'categories' | 'completions' | 'reviews' | 'photos'>

export function buildReport(period: Period, data: ReportData, statuses: AchievementStatus[]): Report {
  const inRange = (d: string | null) => d !== null && d >= period.start && d <= period.end
  const questById = new Map(data.quests.map((q) => [q.id, q]))
  const categoryById = new Map(data.categories.map((c) => [c.id, c]))

  const timeline: TimelineItem[] = data.completions
    .filter((c) => inRange(c.done_on) && questById.has(c.quest_id))
    .map((c) => {
      const quest = questById.get(c.quest_id)!
      const ratings = data.reviews.filter((r) => r.completion_id === c.id)
      const average = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null
      return { completion: c, quest, category: categoryById.get(quest.category_id), path: pathLabel(data.quests, quest.id), ratings, average }
    })
    .sort((a, b) => b.completion.done_on.localeCompare(a.completion.done_on) || b.completion.created_at.localeCompare(a.completion.created_at))

  const counts = new Map<string, number>()
  const byDifficulty: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, epic: 0 }
  for (const item of timeline) {
    counts.set(item.quest.category_id, (counts.get(item.quest.category_id) ?? 0) + 1)
    byDifficulty[item.quest.difficulty]++
  }
  const byCategory = [...counts]
    .flatMap(([id, count]) => {
      const category = categoryById.get(id)
      return category ? [{ category, count }] : []
    })
    .sort((a, b) => b.count - a.count)

  const best = timeline
    .filter((i) => i.average !== null)
    .sort((a, b) => b.average! - a.average! || b.completion.done_on.localeCompare(a.completion.done_on))
    .slice(0, 3)

  const reviewDate = new Map<string, string>()
  for (const item of timeline) for (const r of item.ratings) reviewDate.set(r.id, item.completion.done_on)
  const photos = data.photos
    .filter((p) => p.review_id !== null && reviewDate.has(p.review_id))
    .sort((a, b) => reviewDate.get(a.review_id!)!.localeCompare(reviewDate.get(b.review_id!)!))

  return {
    total: timeline.length,
    byCategory,
    byDifficulty,
    unlocked: statuses.filter((s) => inRange(s.unlockedOn)),
    best,
    photos,
    timeline,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: report periods and report builder"
```

---

### Task 7: Banco de dados (migrações, RLS, storage, seed) + teste de fumaça

**Pré-requisito do usuário (parar e pedir se não estiver feito):**
1. Projeto Supabase `bubslist` criado; Auth → Providers/Settings → "Allow new users to sign up" **desligado**; as 2 contas criadas em Auth → Users (e-mail + senha, "auto confirm").
2. `.env.local` na raiz preenchido pelo usuário (copiar de `.env.example`): URL do projeto, chave publicável/anon, e e-mail/senha de uma das contas.
3. O usuário roda no prompt: `! npx supabase login` e, depois do Step 2 abaixo, `! npx supabase link --project-ref <ref>` (pede a senha do banco).

**Files:**
- Create: `supabase/config.toml` (via CLI), `supabase/migrations/20261006000001_init.sql`, `supabase/migrations/20261006000002_seed.sql`, `scripts/rls-smoke.mjs`

**Interfaces:**
- Produces: tabelas `profiles`, `categories`, `media`, `quests`, `completions`, `reviews`, `photos`, `achievements` com colunas exatamente como em `src/lib/types.ts`; `created_by`/`user_id` com default `auth.uid()` (o app não envia); bucket privado `photos`; 7 categorias base; 31 conquistas automáticas + 5 manuais.

- [ ] **Step 1: Escrever o teste de fumaça (o "teste que falha")**

`scripts/rls-smoke.mjs`:
```js
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const tables = ['profiles', 'categories', 'media', 'quests', 'completions', 'reviews', 'photos', 'achievements']
let failed = false
const fail = (msg) => {
  console.error('FAIL', msg)
  failed = true
}

const anon = createClient(url, key, { auth: { persistSession: false } })
for (const t of tables) {
  const { data, error } = await anon.from(t).select('*').limit(1)
  if (error && error.code !== '42501') fail(`${t}: ${error.code} ${error.message}`)
  else if (data && data.length > 0) fail(`${t}: anon read ${data.length} row(s)`)
  else console.log('ok   anon blocked:', t)
}
const { data: files } = await anon.storage.from('photos').list('', { limit: 1 })
if (files && files.length > 0) fail('storage: anon listed photos')

const authed = createClient(url, key, { auth: { persistSession: false } })
const { error: loginError } = await authed.auth.signInWithPassword({ email: process.env.BUBS_EMAIL, password: process.env.BUBS_PASSWORD })
if (loginError) fail(`login: ${loginError.message}`)
else {
  const { data: cats, error } = await authed.from('categories').select('name').eq('builtin', true)
  if (error || cats.length !== 7) fail(`categories: expected 7 builtin, got ${cats?.length} ${error?.message ?? ''}`)
  else console.log('ok   authed reads 7 builtin categories')
  const { count } = await authed.from('achievements').select('*', { count: 'exact', head: true })
  console.log('info achievements:', count)
  const { data: profiles } = await authed.from('profiles').select('display_name')
  console.log('info profiles:', profiles?.map((p) => p.display_name).join(', '))
}
process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Inicializar o Supabase CLI e ver o teste falhar**

```bash
npm install -D supabase@^2
npx supabase init
npm run smoke
```

Se `supabase init` perguntar sobre VS Code/IntelliJ settings, responder `N`.
Expected: `npm run smoke` FAIL em todas as tabelas (`PGRST205 … Could not find the table`), exit 1.
Agora pedir ao usuário: `! npx supabase link --project-ref <ref>`.

- [ ] **Step 3: Escrever a migração de schema**

`supabase/migrations/20261006000001_init.sql`:
```sql
-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- the two accounts already exist when this migration runs
insert into public.profiles (id, display_name)
  select id, split_part(email, '@', 1) from auth.users
  on conflict (id) do nothing;

-- Domain -----------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  kind text not null check (kind in ('general', 'movie', 'series', 'anime')),
  builtin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('tmdb_movie', 'tmdb_tv', 'anilist')),
  external_id text not null,
  title text not null,
  poster_url text,
  synopsis text,
  year int,
  genres text[] not null default '{}',
  runtime_minutes int,
  seasons jsonb not null default '[]',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.quests on delete cascade,
  category_id uuid not null references public.categories on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'epic')),
  media_id uuid references public.media on delete set null,
  progress_season int,
  progress_episode int,
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quests_parent_id_idx on public.quests (parent_id);

create table public.completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests on delete cascade,
  done_on date not null,
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz not null default now()
);
create index completions_quest_id_idx on public.completions (quest_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.completions on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles,
  rating smallint not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (completion_id, user_id)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references public.quests on delete cascade,
  review_id uuid references public.reviews on delete cascade,
  storage_path text not null,
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz not null default now(),
  check (num_nonnulls(quest_id, review_id) = 1)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  icon text not null,
  rarity text not null check (rarity in ('bronze', 'silver', 'gold', 'platinum')),
  kind text not null check (kind in ('auto', 'manual')),
  rule_category_id uuid references public.categories on delete restrict,
  rule_min_difficulty text check (rule_min_difficulty in ('easy', 'medium', 'hard', 'epic')),
  rule_count int check (rule_count >= 1),
  manual_unlocked_on date,
  created_at timestamptz not null default now(),
  check (
    (kind = 'auto' and rule_count is not null and manual_unlocked_on is null)
    or (kind = 'manual' and rule_category_id is null and rule_min_difficulty is null and rule_count is null)
  )
);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger quests_touch before update on public.quests for each row execute function public.touch_updated_at();
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();

-- Row level security -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.media enable row level security;
alter table public.quests enable row level security;
alter table public.completions enable row level security;
alter table public.reviews enable row level security;
alter table public.photos enable row level security;
alter table public.achievements enable row level security;

grant select, insert, update, delete on all tables in schema public to authenticated;

create policy "couple reads profiles" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "couple reads categories" on public.categories for select to authenticated using (true);
create policy "couple adds categories" on public.categories for insert to authenticated with check (not builtin);
-- ponytail: builtin flag is not protected on update; the UI never sends it. Add a trigger if that ever matters.
create policy "couple edits categories" on public.categories for update to authenticated using (true) with check (true);
create policy "couple deletes custom categories" on public.categories for delete to authenticated using (not builtin);

create policy "couple manages media" on public.media for all to authenticated using (true) with check (true);
create policy "couple manages quests" on public.quests for all to authenticated using (true) with check (true);
create policy "couple manages completions" on public.completions for all to authenticated using (true) with check (true);
create policy "couple manages photos" on public.photos for all to authenticated using (true) with check (true);
create policy "couple manages achievements" on public.achievements for all to authenticated using (true) with check (true);

create policy "couple reads reviews" on public.reviews for select to authenticated using (true);
create policy "own review insert" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "own review update" on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own review delete" on public.reviews for delete to authenticated using (user_id = auth.uid());

-- Storage ----------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;

create policy "couple manages photo files" on storage.objects for all to authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');
```

- [ ] **Step 4: Escrever a migração de seed**

`supabase/migrations/20261006000002_seed.sql`:
```sql
insert into public.categories (name, icon, color, kind, builtin) values
  ('Viagem', '✈️', '#0ea5e9', 'general', true),
  ('Restaurante', '🍽️', '#f97316', 'general', true),
  ('Atividade', '🎯', '#22c55e', 'general', true),
  ('Filme', '🎬', '#ef4444', 'movie', true),
  ('Série', '📺', '#8b5cf6', 'series', true),
  ('Anime', '🍥', '#ec4899', 'anime', true),
  ('Outro', '✨', '#64748b', 'general', true);

insert into public.achievements (name, description, icon, rarity, kind, rule_category_id, rule_min_difficulty, rule_count)
select a.name, a.description, a.icon, a.rarity, 'auto', c.id, a.min_difficulty, a.qty
from (values
  ('Primeira quest', 'Completar a primeira quest', '⭐', 'bronze', null::text, null::text, 1),
  ('Em ritmo', 'Completar 10 quests diferentes', '🔥', 'bronze', null, null, 10),
  ('Aventureiros', 'Completar 50 quests diferentes', '🧭', 'silver', null, null, 50),
  ('Veteranos', 'Completar 100 quests diferentes', '🏅', 'gold', null, null, 100),
  ('Lenda do casal', 'Completar 250 quests diferentes', '👑', 'platinum', null, null, 250),
  ('Pé na estrada', 'Fazer a primeira viagem', '✈️', 'bronze', 'Viagem', null, 1),
  ('Mochileiros', 'Fazer 5 viagens diferentes', '🎒', 'silver', 'Viagem', null, 5),
  ('Nômades', 'Fazer 15 viagens diferentes', '🌍', 'gold', 'Viagem', null, 15),
  ('Primeira garfada', 'Visitar o primeiro restaurante', '🍽️', 'bronze', 'Restaurante', null, 1),
  ('Bons de garfo', 'Visitar 10 restaurantes diferentes', '🍝', 'silver', 'Restaurante', null, 10),
  ('Críticos gastronômicos', 'Visitar 25 restaurantes diferentes', '🧑‍🍳', 'gold', 'Restaurante', null, 25),
  ('Guia Michelin do casal', 'Visitar 50 restaurantes diferentes', '🌟', 'platinum', 'Restaurante', null, 50),
  ('Mãos à obra', 'Completar a primeira atividade', '🎯', 'bronze', 'Atividade', null, 1),
  ('Agenda cheia', 'Completar 10 atividades diferentes', '📅', 'silver', 'Atividade', null, 10),
  ('Inquietos', 'Completar 30 atividades diferentes', '⚡', 'gold', 'Atividade', null, 30),
  ('Pipoca pronta', 'Assistir ao primeiro filme', '🍿', 'bronze', 'Filme', null, 1),
  ('Cinéfilos', 'Assistir a 10 filmes diferentes', '🎬', 'silver', 'Filme', null, 10),
  ('Maratona de cinema', 'Assistir a 50 filmes diferentes', '🎞️', 'gold', 'Filme', null, 50),
  ('Cinemateca', 'Assistir a 100 filmes diferentes', '🏛️', 'platinum', 'Filme', null, 100),
  ('Próximo episódio', 'Terminar a primeira série', '📺', 'bronze', 'Série', null, 1),
  ('Viciados em séries', 'Terminar 5 séries diferentes', '🛋️', 'silver', 'Série', null, 5),
  ('Só mais um episódio', 'Terminar 15 séries diferentes', '🌙', 'gold', 'Série', null, 15),
  ('Primeiro anime', 'Terminar o primeiro anime', '🍥', 'bronze', 'Anime', null, 1),
  ('Otakus', 'Terminar 5 animes diferentes', '🎌', 'silver', 'Anime', null, 5),
  ('Nakama', 'Terminar 20 animes diferentes', '🏴‍☠️', 'gold', 'Anime', null, 20),
  ('Desafio aceito', 'Completar uma quest Difícil ou Épica', '💪', 'silver', null, 'hard', 1),
  ('Sem medo de desafio', 'Completar 10 quests Difíceis ou Épicas', '🧗', 'gold', null, 'hard', 10),
  ('Lendários', 'Completar uma quest Épica', '🐉', 'gold', null, 'epic', 1),
  ('Épicos', 'Completar 5 quests Épicas', '🏆', 'platinum', null, 'epic', 5),
  ('Maratonistas', 'Terminar uma série Épica', '🏃', 'platinum', 'Série', 'epic', 1),
  ('Rei dos piratas', 'Terminar um anime Épico', '☠️', 'platinum', 'Anime', 'epic', 1)
) as a(name, description, icon, rarity, category, min_difficulty, qty)
left join public.categories c on c.name = a.category;

insert into public.achievements (name, description, icon, rarity, kind) values
  ('Nascer do sol juntos', 'Ver o nascer do sol juntos', '🌅', 'silver', 'manual'),
  ('Chefs do mundo', 'Cozinhar juntos um prato de outro país', '👩‍🍳', 'bronze', 'manual'),
  ('Acampamento', 'Acampar juntos', '⛺', 'silver', 'manual'),
  ('Na grade', 'Ir ao show do artista favorito', '🎤', 'gold', 'manual'),
  ('Aurora boreal', 'Ver uma aurora boreal juntos', '🌌', 'platinum', 'manual');
```

- [ ] **Step 5: Aplicar as migrações**

Run: `npx supabase db push`
Se pedir a senha do banco de forma interativa, pedir ao usuário: `! npx supabase db push`.
Expected: aplica `20261006000001_init.sql` e `20261006000002_seed.sql` sem erro.

- [ ] **Step 6: Rodar o teste de fumaça e ver passar**

Run: `npm run smoke`
Expected: 8 linhas `ok   anon blocked`, `ok   authed reads 7 builtin categories`, `info achievements: 36`, `info profiles:` com os dois nomes; exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(db): schema, RLS, storage bucket, seeds and RLS smoke test"
```

---

### Task 8: Edge Function `tmdb` e cliente de catálogo

**Pré-requisito do usuário:** token "API Read Access Token" do TMDB gravado com `! npx supabase secrets set TMDB_TOKEN=<token>`.

**Files:**
- Create: `supabase/functions/tmdb/index.ts`, `src/lib/supabase.ts`, `src/lib/catalog.ts`
- Test: `src/lib/catalog.test.ts`

**Interfaces:**
- Consumes: normalizadores de `supabase/functions/_shared/catalog.ts` (Task 2).
- Produces (`src/lib/supabase.ts`): `supabase` (cliente).
- Produces (`src/lib/catalog.ts`): `searchCatalog(kind: 'movie'|'series'|'anime', query): Promise<CatalogHit[]>`, `fetchCatalogDetails(source: MediaSource, externalId: string): Promise<NormalizedMedia>`, `KIND_SOURCE: Record<'movie'|'series'|'anime', MediaSource>`.
- Produces (Edge Function): `POST /functions/v1/tmdb` com `{action:'search', type:'movie'|'tv', query}` → `CatalogHit[]`; `{action:'details', type, id}` → `NormalizedMedia`; sem login → 401; entrada inválida → 400.

- [ ] **Step 1: Escrever o teste que falha**

`src/lib/catalog.test.ts`:
```ts
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }))

import { fetchCatalogDetails, searchCatalog } from './catalog'
import { supabase } from './supabase'

const invoke = vi.mocked(supabase.functions.invoke)
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  invoke.mockReset()
})

const anilistReplies = (data: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }))

it('searches anime on AniList', async () => {
  anilistReplies({ Page: { media: [{ id: 21, title: { romaji: 'ONE PIECE', english: null }, coverImage: { large: 'u' }, seasonYear: 1999 }] } })
  expect(await searchCatalog('anime', 'one piece')).toEqual([{ source: 'anilist', external_id: '21', title: 'ONE PIECE', year: 1999, poster_url: 'u' }])
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('https://graphql.anilist.co')
  expect(JSON.parse(init.body).variables).toEqual({ q: 'one piece' })
})

it('fetches anime details by numeric id', async () => {
  anilistReplies({ Media: { id: 21, title: { english: 'ONE PIECE' }, episodes: null, nextAiringEpisode: { episode: 1141 }, duration: 24, genres: [] } })
  expect((await fetchCatalogDetails('anilist', '21')).seasons).toEqual([{ season: 1, episodes: 1140 }])
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ id: 21 })
})

it('throws when AniList fails', async () => {
  fetchMock.mockResolvedValue(new Response('', { status: 500 }))
  await expect(searchCatalog('anime', 'x')).rejects.toThrow('AniList 500')
})

it('searches movies through the tmdb function', async () => {
  invoke.mockResolvedValue({ data: [], error: null } as never)
  await searchCatalog('movie', 'matrix')
  expect(invoke).toHaveBeenCalledWith('tmdb', { body: { action: 'search', type: 'movie', query: 'matrix' } })
})

it('series details use type tv', async () => {
  invoke.mockResolvedValue({ data: { title: 'Dark' }, error: null } as never)
  await fetchCatalogDetails('tmdb_tv', '70523')
  expect(invoke).toHaveBeenCalledWith('tmdb', { body: { action: 'details', type: 'tv', id: '70523' } })
})

it('propagates function errors', async () => {
  invoke.mockResolvedValue({ data: null, error: new Error('boom') } as never)
  await expect(searchCatalog('series', 'dark')).rejects.toThrow('boom')
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/catalog.test.ts`
Expected: FAIL — não resolve `./catalog`.

- [ ] **Step 3: Implementar o cliente**

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
```

`src/lib/catalog.ts`:
```ts
import { normalizeAniList, normalizeAniListHit } from '../../supabase/functions/_shared/catalog'
import { supabase } from './supabase'
import type { CatalogHit, CategoryKind, MediaSource, NormalizedMedia } from './types'

type CatalogKind = Exclude<CategoryKind, 'general'>

export const KIND_SOURCE: Record<CatalogKind, MediaSource> = { movie: 'tmdb_movie', series: 'tmdb_tv', anime: 'anilist' }

const ANILIST = 'https://graphql.anilist.co'
const SEARCH = `query ($q: String) { Page(perPage: 10) { media(search: $q, type: ANIME, sort: SEARCH_MATCH) {
  id title { romaji english } coverImage { large } seasonYear } } }`
const DETAILS = `query ($id: Int) { Media(id: $id, type: ANIME) {
  id title { romaji english } coverImage { large } description episodes duration genres seasonYear nextAiringEpisode { episode } } }`

async function anilist(query: string, variables: Record<string, unknown>) {
  const res = await fetch(ANILIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`AniList ${res.status}`)
  return (await res.json()).data
}

async function tmdb<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tmdb', { body })
  if (error) throw error
  return data as T
}

export async function searchCatalog(kind: CatalogKind, query: string): Promise<CatalogHit[]> {
  if (kind === 'anime') return (await anilist(SEARCH, { q: query })).Page.media.map(normalizeAniListHit)
  return tmdb<CatalogHit[]>({ action: 'search', type: kind === 'movie' ? 'movie' : 'tv', query })
}

export async function fetchCatalogDetails(source: MediaSource, externalId: string): Promise<NormalizedMedia> {
  if (source === 'anilist') return normalizeAniList((await anilist(DETAILS, { id: Number(externalId) })).Media)
  return tmdb<NormalizedMedia>({ action: 'details', type: source === 'tmdb_movie' ? 'movie' : 'tv', id: externalId })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Implementar a Edge Function**

`supabase/functions/tmdb/index.ts`:
```ts
import { createClient } from 'npm:@supabase/supabase-js@2'
import { normalizeTmdbHit, normalizeTmdbMovie, normalizeTmdbTv } from '../_shared/catalog.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function tmdb(path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  url.searchParams.set('language', 'pt-BR')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${Deno.env.get('TMDB_TOKEN')}` } })
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data } = await supabase.auth.getUser(token)
  if (!data.user) return json({ error: 'unauthorized' }, 401)

  let input: { action?: unknown; type?: unknown; query?: unknown; id?: unknown }
  try {
    input = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const { action, type, query, id } = input
  if (type !== 'movie' && type !== 'tv') return json({ error: 'invalid type' }, 400)

  try {
    if (action === 'search' && typeof query === 'string' && query.trim().length >= 2) {
      const result = await tmdb(`/search/${type}`, { query: query.trim() })
      return json(result.results.slice(0, 10).map((r: unknown) => normalizeTmdbHit(type, r)))
    }
    if (action === 'details' && /^\d+$/.test(String(id))) {
      const result = await tmdb(`/${type}/${id}`)
      return json(type === 'movie' ? normalizeTmdbMovie(result) : normalizeTmdbTv(result))
    }
    return json({ error: 'invalid action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 502)
  }
})
```

- [ ] **Step 6: Publicar e verificar o bloqueio sem login**

```bash
npx supabase functions deploy tmdb --no-verify-jwt --use-api
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$(grep VITE_SUPABASE_URL .env.local | cut -d= -f2)/functions/v1/tmdb" -H "Content-Type: application/json" -d '{"action":"search","type":"movie","query":"matrix"}'
```

Expected: deploy OK; o `curl` imprime `401`. (O caminho com login é verificado na Task 11, rodando o app.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: tmdb edge function and catalog client (TMDB + AniList)"
```

---

### Task 9: Shell do app — sessão, login, camada de dados, layout

**Files:**
- Create: `src/data/api.ts`, `src/data/hooks.ts`, `src/data/session.tsx`, `src/components/Status.tsx`, `src/components/Layout.tsx`, `src/pages/LoginPage.tsx`, `src/pages/NewPasswordPage.tsx`, `src/test/render.tsx`
- Modify: `src/App.tsx` (substituir inteiro), `src/main.tsx` (substituir inteiro)
- Delete: `src/App.test.tsx`
- Test: `src/data/api.test.ts`, `src/pages/LoginPage.test.tsx`, `src/components/Layout.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 8), `subtreePhotos`, `completionPhotos` (Task 3), `Progress` (Task 4), tipos.
- Produces (`src/data/api.ts`): `loadAll(): Promise<AppData>`; `type QuestInput = Pick<Quest,'parent_id'|'category_id'|'title'|'notes'|'difficulty'|'media_id'>`; `createQuest(input): Promise<Quest>`; `updateQuest(id, patch: Partial<QuestInput & Pick<Quest,'progress_season'|'progress_episode'>>): Promise<void>`; `deleteQuest(id, data: AppData)`; `setProgress(id, p: Progress | null)`; `upsertMedia(m: NormalizedMedia): Promise<Media>`; `createCompletion(questId, doneOn): Promise<Completion>`; `updateCompletion(id, doneOn)`; `deleteCompletion(id, data)`; `saveReview({ id?, completion_id, rating, body }): Promise<Review>`; `deleteReview(id, data)`; `uploadPhoto(target: {quest_id}|{review_id}, blob): Promise<Photo>`; `deletePhoto(photo)`; `signedUrls(paths): Promise<Record<string,string>>`; `type CategoryInput = Pick<Category,'name'|'icon'|'color'>`; `saveCategory(c: CategoryInput & { id?: string })`; `deleteCategory(id)`; `type AchievementInput = Omit<Achievement,'id'|'created_at'>`; `saveAchievement(a: AchievementInput & { id?: string })`; `deleteAchievement(id)`; `setManualUnlock(id, date: string | null)`; `updateProfile(id, patch)`; `uploadAvatar(userId, blob)`; `signOut()`.
- Produces (`src/data/hooks.ts`): `useAppData()`, `useRefresh(): () => Promise<void>`, `useSignedUrls(paths)`.
- Produces (`src/data/session.tsx`): `AuthGate`, `useUserId(): string`, `SessionIdProvider`.
- Produces (`src/components/Status.tsx`): `Loading`, `LoadError({ retry })`.
- Produces (`src/test/render.tsx`): `renderRoute(routes, url): Router` (QueryClient + usuário `ME` + memory router).
- Produces (`src/App.tsx`): router com `Layout` e array `children` onde as próximas tasks adicionam rotas.

- [ ] **Step 1: Escrever os testes que falham**

`src/data/api.test.ts`:
```ts
import { expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase'
import { loadAll } from './api'

it('pages through tables with more than 1000 rows', async () => {
  const rows = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }))
  const builder = (table: string) => {
    const b = {
      select: () => b,
      order: () => b,
      range: (from: number) =>
        Promise.resolve({ data: table === 'quests' ? (from === 0 ? rows(1000, 'a') : rows(5, 'b')) : [], error: null }),
    }
    return b
  }
  vi.mocked(supabase.from).mockImplementation(builder as never)
  const data = await loadAll()
  expect(data.quests).toHaveLength(1005)
  expect(data.categories).toEqual([])
})
```

`src/pages/LoginPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), resetPasswordForEmail: vi.fn() } },
}))

import { supabase } from '../lib/supabase'
import LoginPage from './LoginPage'

it('shows an error for wrong credentials', async () => {
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: { status: 400 } } as never)
  const user = userEvent.setup()
  render(<LoginPage />)
  await user.type(screen.getByLabelText('E-mail'), 'luis@x.com')
  await user.type(screen.getByLabelText('Senha'), 'errada')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
  expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'luis@x.com', password: 'errada' })
})

it('asks for the e-mail before sending the reset link', async () => {
  const user = userEvent.setup()
  render(<LoginPage />)
  await user.click(screen.getByRole('button', { name: 'Esqueci a senha' }))
  expect(screen.getByText('Digite seu e-mail primeiro.')).toBeInTheDocument()
  expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled()
})

it('sends the reset link back to this site', async () => {
  vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null } as never)
  const user = userEvent.setup()
  render(<LoginPage />)
  await user.type(screen.getByLabelText('E-mail'), 'luis@x.com')
  await user.click(screen.getByRole('button', { name: 'Esqueci a senha' }))
  expect(await screen.findByText('Enviamos um link para redefinir a senha.')).toBeInTheDocument()
  expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('luis@x.com', { redirectTo: window.location.origin })
})
```

`src/components/Layout.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it } from 'vitest'
import Layout from './Layout'

const renderLayout = () =>
  render(<RouterProvider router={createMemoryRouter([{ element: <Layout />, children: [{ path: '/', element: <p>conteúdo</p> }] }])} />)

afterEach(() => Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }))

it('shows the four sections and the page content', () => {
  renderLayout()
  for (const name of ['Quests', 'Conquistas', 'Relatório', 'Perfil']) expect(screen.getByRole('link', { name })).toBeInTheDocument()
  expect(screen.getByText('conteúdo')).toBeInTheDocument()
})

it('warns when offline', () => {
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
  renderLayout()
  expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão')
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `git rm src/App.test.tsx && npm test`
Expected: FAIL — não resolve `./api`, `./LoginPage`, `./Layout`.

- [ ] **Step 3: Implementar a camada de dados**

`src/data/api.ts`:
```ts
import type { NormalizedMedia } from '../../supabase/functions/_shared/catalog'
import type { Progress } from '../lib/progress'
import { supabase } from '../lib/supabase'
import { completionPhotos, subtreePhotos } from '../lib/tree'
import type { Achievement, AppData, Category, Completion, Media, Photo, Profile, Quest, Review } from '../lib/types'

const PAGE = 1000

function check<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) throw res.error
  return res.data as T
}

async function all<T>(table: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const page = check<T[]>(await supabase.from(table).select('*').order('created_at').order('id').range(from, from + PAGE - 1))
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

export async function loadAll(): Promise<AppData> {
  const [profiles, categories, media, quests, completions, reviews, photos, achievements] = await Promise.all([
    all<Profile>('profiles'),
    all<Category>('categories'),
    all<Media>('media'),
    all<Quest>('quests'),
    all<Completion>('completions'),
    all<Review>('reviews'),
    all<Photo>('photos'),
    all<Achievement>('achievements'),
  ])
  return { profiles, categories, media, quests, completions, reviews, photos, achievements }
}

// Quests -----------------------------------------------------------------
export type QuestInput = Pick<Quest, 'parent_id' | 'category_id' | 'title' | 'notes' | 'difficulty' | 'media_id'>

export const createQuest = async (input: QuestInput) =>
  check<Quest>(await supabase.from('quests').insert(input).select().single())

export async function updateQuest(id: string, patch: Partial<QuestInput & Pick<Quest, 'progress_season' | 'progress_episode'>>) {
  check(await supabase.from('quests').update(patch).eq('id', id))
}

export async function deleteQuest(id: string, data: AppData) {
  await removePhotoFiles(subtreePhotos(data, id))
  check(await supabase.from('quests').delete().eq('id', id))
}

export const setProgress = (id: string, p: Progress | null) =>
  updateQuest(id, { progress_season: p?.season ?? null, progress_episode: p?.episode ?? null })

export const upsertMedia = async (m: NormalizedMedia) =>
  check<Media>(
    await supabase
      .from('media')
      .upsert({ ...m, fetched_at: new Date().toISOString() }, { onConflict: 'source,external_id' })
      .select()
      .single(),
  )

// Completions & reviews --------------------------------------------------
export const createCompletion = async (quest_id: string, done_on: string) =>
  check<Completion>(await supabase.from('completions').insert({ quest_id, done_on }).select().single())

export async function updateCompletion(id: string, done_on: string) {
  check(await supabase.from('completions').update({ done_on }).eq('id', id))
}

export async function deleteCompletion(id: string, data: AppData) {
  await removePhotoFiles(completionPhotos(data, id))
  check(await supabase.from('completions').delete().eq('id', id))
}

export async function saveReview(r: { id?: string; completion_id: string; rating: number; body: string | null }): Promise<Review> {
  const row = { rating: r.rating, body: r.body }
  return check<Review>(
    r.id
      ? await supabase.from('reviews').update(row).eq('id', r.id).select().single()
      : await supabase.from('reviews').insert({ ...row, completion_id: r.completion_id }).select().single(),
  )
}

export async function deleteReview(id: string, data: AppData) {
  await removePhotoFiles(data.photos.filter((p) => p.review_id === id))
  check(await supabase.from('reviews').delete().eq('id', id))
}

// Photos -----------------------------------------------------------------
async function removePhotoFiles(photos: Photo[]) {
  if (photos.length === 0) return
  check(await supabase.storage.from('photos').remove(photos.map((p) => p.storage_path)))
}

export async function uploadPhoto(target: { quest_id: string } | { review_id: string }, blob: Blob): Promise<Photo> {
  const folder = 'quest_id' in target ? `quests/${target.quest_id}` : `reviews/${target.review_id}`
  const storage_path = `${folder}/${crypto.randomUUID()}.jpg`
  check(await supabase.storage.from('photos').upload(storage_path, blob, { contentType: 'image/jpeg' }))
  return check<Photo>(await supabase.from('photos').insert({ ...target, storage_path }).select().single())
}

export async function deletePhoto(photo: Photo) {
  await removePhotoFiles([photo])
  check(await supabase.from('photos').delete().eq('id', photo.id))
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const rows = check<{ path: string | null; signedUrl: string }[]>(await supabase.storage.from('photos').createSignedUrls(paths, 3600))
  return Object.fromEntries(rows.filter((r) => r.path).map((r) => [r.path!, r.signedUrl]))
}

// Categories, achievements, profile ---------------------------------------
export type CategoryInput = Pick<Category, 'name' | 'icon' | 'color'>

export async function saveCategory({ id, ...row }: CategoryInput & { id?: string }) {
  check(id ? await supabase.from('categories').update(row).eq('id', id) : await supabase.from('categories').insert({ ...row, kind: 'general' }))
}

export async function deleteCategory(id: string) {
  check(await supabase.from('categories').delete().eq('id', id))
}

export type AchievementInput = Omit<Achievement, 'id' | 'created_at'>

export async function saveAchievement({ id, ...row }: AchievementInput & { id?: string }) {
  check(id ? await supabase.from('achievements').update(row).eq('id', id) : await supabase.from('achievements').insert(row))
}

export async function deleteAchievement(id: string) {
  check(await supabase.from('achievements').delete().eq('id', id))
}

export async function setManualUnlock(id: string, date: string | null) {
  check(await supabase.from('achievements').update({ manual_unlocked_on: date }).eq('id', id))
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'display_name' | 'avatar_path'>>) {
  check(await supabase.from('profiles').update(patch).eq('id', id))
}

export async function uploadAvatar(userId: string, blob: Blob) {
  const path = `avatars/${userId}.jpg`
  check(await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true }))
  await updateProfile(userId, { avatar_path: path })
}

export const signOut = () => supabase.auth.signOut()
```

`src/data/hooks.ts`:
```ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { loadAll, signedUrls } from './api'

const ALL = ['all']

export const useAppData = () => useQuery({ queryKey: ALL, queryFn: loadAll })

export function useRefresh() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ALL })
}

export const useSignedUrls = (paths: string[]) =>
  useQuery({
    queryKey: ['signed', ...paths],
    queryFn: () => signedUrls(paths),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  })
```

`src/components/Status.tsx`:
```tsx
export function Loading() {
  return <p className="p-6 text-center text-gray-500">Carregando…</p>
}

export function LoadError({ retry }: { retry: () => void }) {
  return (
    <div className="space-y-3 p-6 text-center">
      <p>Não foi possível carregar. Verifique a conexão.</p>
      <button type="button" className="btn" onClick={retry}>
        Tentar de novo
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Implementar login, sessão e layout**

`src/pages/LoginPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function login(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setMessage(error.status === 400 ? 'E-mail ou senha incorretos.' : 'Sem conexão ou erro no servidor. Tente de novo.')
  }

  async function forgot() {
    if (!email.trim()) return setMessage('Digite seu e-mail primeiro.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setMessage(error ? 'Não foi possível enviar o e-mail.' : 'Enviamos um link para redefinir a senha.')
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={login} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-center text-3xl font-bold text-brand">BubsList</h1>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">E-mail</span>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Senha</span>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <button type="button" className="w-full text-sm text-gray-500 underline" onClick={forgot}>
          Esqueci a senha
        </button>
      </form>
    </main>
  )
}
```

`src/pages/NewPasswordPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function NewPasswordPage({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) return setMessage('A senha precisa ter pelo menos 6 caracteres.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMessage('Não foi possível trocar a senha.')
    else onDone()
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={save} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-bold">Nova senha</h1>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Nova senha</span>
          <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
        <button className="btn btn-primary w-full">Salvar senha</button>
      </form>
    </main>
  )
}
```

`src/data/session.tsx`:
```tsx
import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Loading } from '../components/Status'
import { supabase } from '../lib/supabase'
import LoginPage from '../pages/LoginPage'
import NewPasswordPage from '../pages/NewPasswordPage'

const UserIdContext = createContext<string | null>(null)

export const SessionIdProvider = UserIdContext.Provider

export function useUserId(): string {
  const id = useContext(UserIdContext)
  if (!id) throw new Error('useUserId must be used inside AuthGate')
  return id
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Loading />
  if (recovering) return <NewPasswordPage onDone={() => setRecovering(false)} />
  if (!session) return <LoginPage />
  return <UserIdContext.Provider value={session.user.id}>{children}</UserIdContext.Provider>
}
```

`src/components/Layout.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/', label: 'Quests', icon: '🗺️' },
  { to: '/conquistas', label: 'Conquistas', icon: '🏆' },
  { to: '/relatorio', label: 'Relatório', icon: '📊' },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
]

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

export default function Layout() {
  const online = useOnline()
  return (
    <div className="min-h-dvh md:flex">
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-56 md:flex-col md:border-r md:border-t-0 md:pb-0"
      >
        <span className="hidden p-4 text-xl font-bold text-brand md:block">BubsList</span>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs md:min-h-11 md:flex-none md:flex-row md:justify-start md:gap-3 md:px-4 md:text-base ${
                isActive ? 'font-semibold text-brand' : 'text-gray-500'
              }`
            }
          >
            <span aria-hidden className="text-xl">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 pb-24 md:pb-8">
        <div className="mx-auto max-w-5xl p-4">
          {!online && (
            <p role="alert" className="mb-4 rounded-xl bg-yellow-100 p-3 text-sm text-yellow-900">
              Sem conexão. O que você digitar continua aqui — tente salvar quando a internet voltar.
            </p>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

`src/App.tsx` (substituir inteiro):
```tsx
import { createBrowserRouter, RouterProvider } from 'react-router'
import Layout from './components/Layout'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <p className="text-gray-500">Em construção…</p> },
      { path: '*', element: <p>Página não encontrada.</p> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

`src/main.tsx` (substituir inteiro):
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthGate } from './data/session'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <App />
      </AuthGate>
    </QueryClientProvider>
  </StrictMode>,
)
```

`src/test/render.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { SessionIdProvider } from '../data/session'
import { ME } from './fixtures'

export function renderRoute(routes: RouteObject[], url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={client}>
      <SessionIdProvider value={ME}>
        <RouterProvider router={router} />
      </SessionIdProvider>
    </QueryClientProvider>,
  )
  return router
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test && npm run build`
Expected: todos PASS; build OK.

- [ ] **Step 6: Verificar no navegador (precisa da Task 7 feita)**

Run: `npm run dev` e abrir `http://localhost:5173`.
Expected: tela de login; e-mail/senha errados → "E-mail ou senha incorretos."; login certo → layout com 4 abas e "Em construção…". Encerrar o servidor.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: app shell with auth gate, data layer and responsive layout"
```

---

### Task 10: Lista de quests (início)

**Files:**
- Create: `src/components/DifficultyBadge.tsx`, `src/components/QuestCard.tsx`, `src/pages/QuestsPage.tsx`
- Modify: `src/App.tsx` (rota `/`)
- Test: `src/pages/QuestsPage.test.tsx`

**Interfaces:**
- Consumes: `useAppData`, `useSignedUrls` (Task 9), `useUserId` (Task 9), `filterQuests`, `pendingReviews`, `QuestFilter` (Task 3), `doneQuestIds`, `subquestProgress`, `pathLabel` (Task 3), `formatProgress`, `progressOf` (Task 4), `formatDate` (Task 6), `DIFFICULTIES`, `DIFFICULTY_LABEL` (Task 2).
- Produces: `DifficultyBadge({ difficulty })`; `QuestCard({ quest, data, done, photoUrl?, showPath? })` — usado também na página da quest (Task 12).

- [ ] **Step 1: Escrever o teste que falha**

`src/pages/QuestsPage.test.tsx`:
```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { CATS, ME, allCats, appData, completion, quest, review } from '../test/fixtures'
import { renderRoute } from '../test/render'
import QuestsPage from './QuestsPage'

vi.mock('../data/api')

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id, difficulty: 'epic' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', category_id: CATS.atividade.id })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', category_id: CATS.viagem.id })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id })
const data = appData({
  categories: allCats(),
  quests: [japao, fuji, toquio, matrix],
  completions: [completion({ id: 'cm', quest_id: 'matrix' }), completion({ id: 'cf', quest_id: 'fuji' })],
  reviews: [review({ completion_id: 'cf', user_id: ME })],
})

beforeEach(() => vi.mocked(api.loadAll).mockResolvedValue(data))
const open = () => renderRoute([{ path: '/', element: <QuestsPage /> }], '/')

it('shows pending top-level quests with subquest progress', async () => {
  open()
  expect(await screen.findByText('Japão')).toBeInTheDocument()
  expect(screen.getByText('☑ 1/2')).toBeInTheDocument()
  expect(screen.queryByText('Matrix')).not.toBeInTheDocument()
  expect(screen.queryByText('Monte Fuji')).not.toBeInTheDocument()
})

it('switches to the done tab', async () => {
  const user = userEvent.setup()
  open()
  await user.click(await screen.findByRole('tab', { name: 'Feitas' }))
  expect(screen.getByText('Matrix')).toBeInTheDocument()
  expect(screen.queryByText('Japão')).not.toBeInTheDocument()
})

it('search ignores accents and finds subquests with their path', async () => {
  const user = userEvent.setup()
  open()
  await user.type(await screen.findByLabelText('Buscar quests'), 'toquio')
  expect(screen.getByText('Tóquio')).toBeInTheDocument()
  expect(screen.getByText('Japão ›')).toBeInTheDocument()
})

it('warns about my pending reviews', async () => {
  open()
  expect(await screen.findByText('Você tem 1 resenha pendente')).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/pages/QuestsPage.test.tsx`
Expected: FAIL — não resolve `./QuestsPage`.

- [ ] **Step 3: Implementar**

`src/components/DifficultyBadge.tsx`:
```tsx
import { DIFFICULTY_LABEL } from '../lib/difficulty'
import type { Difficulty } from '../lib/types'

const STYLE: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-orange-100 text-orange-800',
  epic: 'bg-purple-100 text-purple-800',
}

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[difficulty]}`}>{DIFFICULTY_LABEL[difficulty]}</span>
}
```

`src/components/QuestCard.tsx`:
```tsx
import { Link } from 'react-router'
import { formatProgress, progressOf } from '../lib/progress'
import { pathLabel, subquestProgress } from '../lib/tree'
import type { AppData, Quest } from '../lib/types'
import DifficultyBadge from './DifficultyBadge'

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
  return (
    <Link to={`/quests/${quest.id}`} className="card flex gap-3 p-3" style={{ borderLeft: `4px solid ${category?.color ?? '#e5e7eb'}` }}>
      {image && <img src={image} alt="" loading="lazy" className="h-20 w-14 shrink-0 rounded-lg bg-gray-100 object-cover" />}
      <div className="min-w-0 flex-1">
        {path && <p className="truncate text-xs text-gray-500">{path} ›</p>}
        <p className="font-semibold">
          <span aria-hidden>{category?.icon}</span> {quest.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <DifficultyBadge difficulty={quest.difficulty} />
          {sub.total > 0 && <span>☑ {sub.done}/{sub.total}</span>}
          {media && media.source !== 'tmdb_movie' && <span>▶ {formatProgress(media.source, media.seasons, progressOf(quest))}</span>}
          {done.has(quest.id) && <span className="text-green-700">✔ Feita</span>}
        </div>
      </div>
    </Link>
  )
}
```

`src/pages/QuestsPage.tsx`:
```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import QuestCard from '../components/QuestCard'
import { LoadError, Loading } from '../components/Status'
import { useAppData, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { formatDate } from '../lib/dates'
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
  if (!data) return <Loading />

  const pending = pendingReviews(data.completions, data.reviews, me)
  const set = (patch: Partial<QuestFilter>) => setFilter((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quests</h1>

      {pending.length > 0 && (
        <details className="card p-3">
          <summary className="cursor-pointer font-medium">
            <span aria-hidden>✍️</span> Você tem {pending.length} {pending.length === 1 ? 'resenha pendente' : 'resenhas pendentes'}
          </summary>
          <ul className="mt-2 space-y-1">
            {pending.map((c) => (
              <li key={c.id}>
                <Link to={`/quests/${c.quest_id}/concluir?completion=${c.id}`} className="underline">
                  {data.quests.find((x) => x.id === c.quest_id)?.title} — {formatDate(c.done_on)}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div role="tablist" aria-label="Situação" className="grid grid-cols-2 gap-2">
        {(['pending', 'done'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={filter.tab === t} onClick={() => set({ tab: t })} className={`btn ${filter.tab === t ? 'btn-primary' : ''}`}>
            {t === 'pending' ? 'Pendentes' : 'Feitas'}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="search"
          aria-label="Buscar quests"
          placeholder="Buscar…"
          className="input flex-1"
          value={filter.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        <select
          aria-label="Dificuldade"
          className="input w-36"
          value={filter.difficulty ?? ''}
          onChange={(e) => set({ difficulty: (e.target.value || null) as Difficulty | null })}
        >
          <option value="">Todas</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {data.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filter.categoryId === c.id}
            onClick={() => set({ categoryId: filter.categoryId === c.id ? null : c.id })}
            className={`btn shrink-0 ${filter.categoryId === c.id ? 'btn-primary' : ''}`}
          >
            <span aria-hidden>{c.icon}</span> {c.name}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-gray-500">
          {filter.tab === 'pending' ? 'Nenhuma quest pendente por aqui. Que tal criar uma?' : 'Nenhuma quest feita ainda.'}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((x) => (
            <QuestCard key={x.id} quest={x} data={data} done={done} showPath photoUrl={urls[coverOf(x.id) ?? '']} />
          ))}
        </div>
      )}

      <Link
        to="/quests/nova"
        aria-label="Nova quest"
        className="fixed bottom-20 right-4 z-20 grid size-14 place-items-center rounded-full bg-brand text-3xl text-white shadow-lg md:bottom-8 md:right-8"
      >
        +
      </Link>
    </div>
  )
}
```

`src/App.tsx` — adicionar `import QuestsPage from './pages/QuestsPage'` e trocar a linha da rota `/` por:
```tsx
      { path: '/', element: <QuestsPage /> },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: quests home with tabs, filters, accent-insensitive search and pending reviews"
```

---

### Task 11: Criar/editar quest (catálogo, dificuldade sugerida, fotos de referência)

**Files:**
- Create: `src/lib/image.ts`, `src/components/PhotoGrid.tsx`, `src/components/PhotoPicker.tsx`, `src/components/CatalogSearch.tsx`, `src/pages/QuestFormPage.tsx`
- Modify: `src/App.tsx` (rotas `/quests/nova` e `/quests/:id/editar`)
- Test: `src/lib/image.test.ts`, `src/components/PhotoPicker.test.tsx`, `src/pages/QuestFormPage.test.tsx`

**Interfaces:**
- Consumes: `createQuest`, `updateQuest`, `upsertMedia`, `uploadPhoto`, `deletePhoto`, `QuestInput` (Task 9), `useAppData`, `useRefresh`, `useSignedUrls` (Task 9), `searchCatalog`, `fetchCatalogDetails`, `KIND_SOURCE` (Task 8), `suggestDifficulty`, `DIFFICULTIES`, `DIFFICULTY_LABEL` (Task 2).
- Produces (`image.ts`): `MAX_PHOTOS = 15`, `class UnsupportedImageError`, `fitWithin(w, h, max = 1600)`, `compressImage(file: Blob): Promise<Blob>`.
- Produces: `PhotoGrid({ photos, onDelete? })`; `PhotoPicker({ existing, pending, onChange, onDeleteExisting? })` e `uploadPending(target, blobs): Promise<Blob[]>` (devolve as que falharam); `CatalogSearch({ kind, onPick })`.

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/image.test.ts`:
```ts
import { afterEach, expect, it, vi } from 'vitest'
import { UnsupportedImageError, compressImage, fitWithin } from './image'

afterEach(() => vi.unstubAllGlobals())

it('keeps small images as they are', () => expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 }))

it('scales the longest side down to 1600', () => {
  expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
  expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 })
})

it('rejects images the browser cannot decode (e.g. HEIC on desktop Chrome)', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
  await expect(compressImage(new Blob(['x']))).rejects.toBeInstanceOf(UnsupportedImageError)
})
```

`src/components/PhotoPicker.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { photo } from '../test/fixtures'
import PhotoPicker from './PhotoPicker'

vi.mock('../data/api')
afterEach(() => vi.unstubAllGlobals())

const renderPicker = (existing = [] as ReturnType<typeof photo>[], onChange = vi.fn()) => {
  vi.mocked(api.signedUrls).mockResolvedValue({})
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PhotoPicker existing={existing} pending={[]} onChange={onChange} />
    </QueryClientProvider>,
  )
  return onChange
}

it('shows a friendly error for images the browser cannot read', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
  const onChange = renderPicker()
  await userEvent.upload(screen.getByLabelText(/Adicionar fotos/), new File(['x'], 'foto.heic', { type: 'image/heic' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Formato de imagem não suportado')
  expect(onChange).not.toHaveBeenCalled()
})

it('refuses to go over 15 photos', async () => {
  const onChange = renderPicker(Array.from({ length: 15 }, () => photo()))
  await userEvent.upload(screen.getByLabelText(/Adicionar fotos/), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Máximo de 15 fotos.')
  expect(onChange).not.toHaveBeenCalled()
})
```

`src/pages/QuestFormPage.test.tsx`:
```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { normalizeAniList } from '../../supabase/functions/_shared/catalog'
import * as api from '../data/api'
import * as catalog from '../lib/catalog'
import { CATS, allCats, appData, media, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import QuestFormPage from './QuestFormPage'

vi.mock('../data/api')
vi.mock('../lib/catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/catalog')>()),
  searchCatalog: vi.fn(),
  fetchCatalogDetails: vi.fn(),
}))

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id })
const routes = [
  { path: '/quests/nova', element: <QuestFormPage /> },
  { path: '/quests/:id', element: <p>página da quest</p> },
]

beforeEach(() => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [japao] }))
  vi.mocked(api.createQuest).mockResolvedValue(quest({ id: 'new-q' }))
})

it('creates a top-level quest', async () => {
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText('Título'), 'Batata do Marechal')
  await user.click(screen.getByRole('button', { name: 'Média' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/new-q'))
  expect(api.createQuest).toHaveBeenCalledWith({
    parent_id: null, category_id: CATS.restaurante.id, title: 'Batata do Marechal', notes: null, difficulty: 'medium', media_id: null,
  })
})

it('requires a difficulty', async () => {
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Restaurante' }))
  await user.type(screen.getByLabelText('Título'), 'Batata do Marechal')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Escolha a dificuldade.')
  expect(api.createQuest).not.toHaveBeenCalled()
})

it('a new subquest starts as Atividade under its parent', async () => {
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova?parent=japao')
  expect(await screen.findByRole('heading', { name: 'Nova subquest de Japão' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Atividade' })).toHaveAttribute('aria-pressed', 'true')
  await user.type(screen.getByLabelText('Título'), 'Monte Fuji')
  await user.click(screen.getByRole('button', { name: 'Difícil' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ parent_id: 'japao', category_id: CATS.atividade.id })))
})

it('picking One Piece fills the title and suggests Épica', async () => {
  const onePiece = normalizeAniList({ id: 21, title: { english: 'ONE PIECE' }, episodes: null, nextAiringEpisode: { episode: 1141 }, duration: 24, seasonYear: 1999 })
  vi.mocked(catalog.searchCatalog).mockResolvedValue([{ source: 'anilist', external_id: '21', title: 'ONE PIECE', year: 1999, poster_url: null }])
  vi.mocked(catalog.fetchCatalogDetails).mockResolvedValue(onePiece)
  vi.mocked(api.upsertMedia).mockResolvedValue(media({ id: 'm-op', source: 'anilist', title: 'ONE PIECE' }))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/nova')
  await user.click(await screen.findByRole('button', { name: 'Anime' }))
  await user.type(screen.getByLabelText('Buscar no catálogo'), 'one piece')
  await user.click(await screen.findByRole('button', { name: 'ONE PIECE (1999)' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Épica' })).toHaveAttribute('aria-pressed', 'true'))
  expect(screen.getByLabelText('Título')).toHaveValue('ONE PIECE')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.createQuest).toHaveBeenCalledWith(expect.objectContaining({ media_id: 'm-op', difficulty: 'epic', category_id: CATS.anime.id })))
  expect(api.upsertMedia).toHaveBeenCalledWith(onePiece)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — não resolve `./image`, `./PhotoPicker`, `./QuestFormPage`.

- [ ] **Step 3: Implementar imagem e fotos**

`src/lib/image.ts`:
```ts
export const MAX_PHOTOS = 15

export class UnsupportedImageError extends Error {
  constructor() {
    super('Formato de imagem não suportado')
  }
}

export function fitWithin(width: number, height: number, max = 1600) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export async function compressImage(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new UnsupportedImageError()
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir'))), 'image/jpeg', 0.8),
  )
}
```

`src/components/PhotoGrid.tsx`:
```tsx
import { useSignedUrls } from '../data/hooks'
import type { Photo } from '../lib/types'

export default function PhotoGrid({ photos, onDelete }: { photos: Photo[]; onDelete?: (p: Photo) => void }) {
  const urls = useSignedUrls(photos.map((p) => p.storage_path)).data ?? {}
  if (photos.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((p) => (
        <div key={p.id} className="relative">
          <a href={urls[p.storage_path]} target="_blank" rel="noreferrer">
            <img src={urls[p.storage_path]} alt="" loading="lazy" className="aspect-square w-full rounded-lg bg-gray-100 object-cover" />
          </a>
          {onDelete && (
            <button type="button" aria-label="Remover foto" onClick={() => onDelete(p)} className="absolute right-1 top-1 size-8 rounded-full bg-black/60 text-white">
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

`src/components/PhotoPicker.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'react'
import { uploadPhoto } from '../data/api'
import { MAX_PHOTOS, UnsupportedImageError, compressImage } from '../lib/image'
import type { Photo } from '../lib/types'
import PhotoGrid from './PhotoGrid'

interface Props {
  existing: Photo[]
  pending: Blob[]
  onChange: (pending: Blob[]) => void
  onDeleteExisting?: (p: Photo) => void
}

export default function PhotoPicker({ existing, pending, onChange, onDeleteExisting }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const previews = useMemo(() => pending.map((b) => URL.createObjectURL(b)), [pending])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  async function add(files: File[]) {
    if (files.length === 0) return
    setError(null)
    if (existing.length + pending.length + files.length > MAX_PHOTOS) return setError(`Máximo de ${MAX_PHOTOS} fotos.`)
    setBusy(true)
    const blobs: Blob[] = []
    for (const file of files) {
      try {
        blobs.push(await compressImage(file))
      } catch (e) {
        setError(e instanceof UnsupportedImageError ? e.message : 'Não foi possível ler a imagem.')
      }
    }
    setBusy(false)
    if (blobs.length) onChange([...pending, ...blobs])
  }

  return (
    <div className="space-y-2">
      <PhotoGrid photos={existing} onDelete={onDeleteExisting} />
      {pending.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => onChange(pending.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 size-8 rounded-full bg-black/60 text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="btn cursor-pointer">
        <span aria-hidden>📷</span> {busy ? 'Processando…' : 'Adicionar fotos'}
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            add(files)
          }}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

export async function uploadPending(target: { quest_id: string } | { review_id: string }, blobs: Blob[]): Promise<Blob[]> {
  const failed: Blob[] = []
  for (const blob of blobs) {
    try {
      await uploadPhoto(target, blob)
    } catch {
      failed.push(blob)
    }
  }
  return failed
}
```

- [ ] **Step 4: Implementar busca no catálogo e o formulário**

`src/components/CatalogSearch.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { fetchCatalogDetails, searchCatalog } from '../lib/catalog'
import type { CatalogHit, CategoryKind, NormalizedMedia } from '../lib/types'

type Status = 'idle' | 'loading' | 'empty' | 'error'

export default function CatalogSearch({ kind, onPick }: { kind: Exclude<CategoryKind, 'general'>; onPick: (m: NormalizedMedia) => void }) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CatalogHit[]>([])
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setHits([])
      setStatus('idle')
      return
    }
    let alive = true
    setStatus('loading')
    const timer = setTimeout(() => {
      searchCatalog(kind, term)
        .then((found) => {
          if (!alive) return
          setHits(found)
          setStatus(found.length ? 'idle' : 'empty')
        })
        .catch(() => alive && setStatus('error'))
    }, 400)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query, kind])

  async function pick(hit: CatalogHit) {
    setStatus('loading')
    try {
      onPick(await fetchCatalogDetails(hit.source, hit.external_id))
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block font-medium">Buscar no catálogo</span>
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: Frieren" />
      </label>
      {status === 'loading' && <p className="text-sm text-gray-500">Buscando…</p>}
      {status === 'empty' && <p className="text-sm text-gray-500">Nada encontrado. Você pode salvar só com o título.</p>}
      {status === 'error' && <p className="text-sm text-red-600">Não foi possível buscar. Você pode salvar só com o título.</p>}
      <ul className="space-y-1">
        {hits.map((h) => (
          <li key={h.external_id}>
            <button type="button" onClick={() => pick(h)} className="card flex w-full items-center gap-3 p-2 text-left">
              {h.poster_url && <img src={h.poster_url} alt="" className="h-14 w-10 rounded object-cover" />}
              <span>{h.title}{h.year ? ` (${h.year})` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

`src/pages/QuestFormPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import CatalogSearch from '../components/CatalogSearch'
import PhotoPicker, { uploadPending } from '../components/PhotoPicker'
import { LoadError, Loading } from '../components/Status'
import { createQuest, deletePhoto, updateQuest, upsertMedia, type QuestInput } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { KIND_SOURCE } from '../lib/catalog'
import { DIFFICULTIES, DIFFICULTY_LABEL, suggestDifficulty } from '../lib/difficulty'
import type { AppData, Difficulty, Media, NormalizedMedia, Quest } from '../lib/types'

export default function QuestFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const q = useAppData()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const existing = id ? q.data.quests.find((x) => x.id === id) : undefined
  if (id && !existing) return <p>Quest não encontrada.</p>
  return <QuestForm key={id ?? 'new'} data={q.data} existing={existing} parentId={existing ? existing.parent_id : params.get('parent')} />
}

function QuestForm({ data, existing, parentId }: { data: AppData; existing?: Quest; parentId: string | null }) {
  const navigate = useNavigate()
  const refresh = useRefresh()
  const parent = parentId ? data.quests.find((x) => x.id === parentId) : undefined
  const atividade = data.categories.find((c) => c.builtin && c.name === 'Atividade')
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? (parentId ? atividade?.id ?? '' : ''))
  const [title, setTitle] = useState(existing?.title ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(existing?.difficulty ?? null)
  const [media, setMedia] = useState<Media | NormalizedMedia | null>(
    existing?.media_id ? data.media.find((m) => m.id === existing.media_id) ?? null : null,
  )
  const [pending, setPending] = useState<Blob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const category = data.categories.find((c) => c.id === categoryId)
  const kind = category?.kind ?? 'general'
  const mediaFits = media !== null && kind !== 'general' && KIND_SOURCE[kind] === media.source
  const existingPhotos = existing ? data.photos.filter((p) => p.quest_id === existing.id) : []

  function pickMedia(m: NormalizedMedia) {
    setMedia(m)
    setTitle(m.title)
    if (!existing) {
      const suggestion = suggestDifficulty(m)
      if (suggestion) setDifficulty(suggestion)
    }
  }

  async function finish(questId: string, blobs: Blob[]) {
    const failed = await uploadPending({ quest_id: questId }, blobs)
    await refresh()
    if (failed.length) {
      setSavedId(questId)
      setPending(failed)
      setError(`${failed.length} foto(s) não subiram.`)
    } else navigate(`/quests/${questId}`, { replace: true })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!category) return setError('Escolha uma categoria.')
    if (!title.trim()) return setError('Dê um título à quest.')
    if (!difficulty) return setError('Escolha a dificuldade.')
    setSaving(true)
    setError(null)
    try {
      const mediaId = mediaFits && media ? ('id' in media ? media.id : (await upsertMedia(media)).id) : null
      const input: QuestInput = {
        parent_id: parentId, category_id: category.id, title: title.trim(), notes: notes.trim() || null, difficulty, media_id: mediaId,
      }
      let questId: string
      if (existing) {
        const resetProgress = existing.media_id !== mediaId ? { progress_season: null, progress_episode: null } : {}
        await updateQuest(existing.id, { ...input, ...resetProgress })
        questId = existing.id
      } else {
        questId = (await createQuest(input)).id
      }
      await finish(questId, pending)
    } catch {
      setError('Não foi possível salvar. Verifique a conexão e tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  async function retryUploads(questId: string) {
    setSaving(true)
    await finish(questId, pending)
    setSaving(false)
  }

  async function removeExisting(p: Parameters<typeof deletePhoto>[0]) {
    if (!window.confirm('Remover esta foto?')) return
    await deletePhoto(p)
    await refresh()
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">{existing ? 'Editar quest' : parent ? `Nova subquest de ${parent.title}` : 'Nova quest'}</h1>

      <fieldset>
        <legend className="mb-2 font-medium">Categoria</legend>
        <div className="flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <button key={c.id} type="button" aria-pressed={c.id === categoryId} onClick={() => setCategoryId(c.id)} className={`btn ${c.id === categoryId ? 'btn-primary' : ''}`}>
              <span aria-hidden>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      {kind !== 'general' &&
        (mediaFits && media ? (
          <div className="card flex items-center gap-3 p-3">
            {media.poster_url && <img src={media.poster_url} alt="" className="h-16 w-11 rounded object-cover" />}
            <span className="flex-1">{media.title}{media.year ? ` (${media.year})` : ''}</span>
            <button type="button" className="btn" onClick={() => setMedia(null)}>Trocar</button>
          </div>
        ) : (
          <CatalogSearch kind={kind} onPick={pickMedia} />
        ))}

      <label className="block">
        <span className="mb-1 block font-medium">Título</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </label>

      <fieldset>
        <legend className="mb-2 font-medium">Dificuldade</legend>
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" aria-pressed={d === difficulty} onClick={() => setDifficulty(d)} className={`btn px-1 ${d === difficulty ? 'btn-primary' : ''}`}>
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block font-medium">Notas</span>
        <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <div>
        <p className="mb-2 font-medium">Fotos de referência</p>
        <PhotoPicker existing={existingPhotos} pending={pending} onChange={setPending} onDeleteExisting={removeExisting} />
      </div>

      {error && <p role="alert" className="text-red-600">{error}</p>}

      {savedId ? (
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={() => retryUploads(savedId)}>Tentar de novo</button>
          <button type="button" className="btn flex-1" onClick={() => navigate(`/quests/${savedId}`, { replace: true })}>Continuar sem elas</button>
        </div>
      ) : (
        <button className="btn btn-primary w-full" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
      )}
    </form>
  )
}
```

`src/App.tsx` — adicionar `import QuestFormPage from './pages/QuestFormPage'` e, depois da rota `/`:
```tsx
      { path: '/quests/nova', element: <QuestFormPage /> },
      { path: '/quests/:id/editar', element: <QuestFormPage /> },
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 6: Verificar no navegador (precisa das Tasks 7 e 8)**

Run: `npm run dev`. Logado, criar uma quest "Série" buscando "Dark" (TMDB via função) e uma "Anime" buscando "Frieren" (AniList). Expected: resultados aparecem, pôster e dificuldade sugerida preenchidos, salvar leva a uma rota `/quests/<id>` (página ainda não existe → "Página não encontrada." até a Task 12). Anexar uma foto de referência num quest comum e conferir no painel do Supabase (Storage → photos) que o arquivo existe. **Não** usar o MCP.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: create/edit quest with catalog search, suggested difficulty and reference photos"
```

---

### Task 12: Página da quest

**Files:**
- Create: `src/components/Stars.tsx`, `src/pages/QuestPage.tsx`
- Modify: `src/data/hooks.ts` (acrescentar `useMediaRefresh`), `src/App.tsx` (rota `/quests/:id`)
- Test: `src/pages/QuestPage.test.tsx`

**Interfaces:**
- Consumes: `QuestCard`, `DifficultyBadge` (Task 10), `PhotoGrid` (Task 11), `deleteQuest`, `deleteCompletion`, `setProgress`, `upsertMedia` (Task 9), `fetchCatalogDetails` (Task 8), `ancestors`, `childrenOf`, `descendantIds`, `doneQuestIds` (Task 3), `nextEpisode`, `formatProgress`, `progressOf` (Task 4), `formatDate` (Task 6), `useUserId`.
- Produces: `Stars({ value, onChange? })` — exibição (`aria-label="N de 5 estrelas"`) ou entrada (radiogroup com `role="radio"` e nomes "1 estrela" … "5 estrelas"); `useMediaRefresh(media?: Media)`.

- [ ] **Step 1: Escrever o teste que falha**

`src/pages/QuestPage.test.tsx`:
```tsx
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import * as api from '../data/api'
import * as catalog from '../lib/catalog'
import { CATS, PARTNER, allCats, appData, completion, media, quest, review } from '../test/fixtures'
import { renderRoute } from '../test/render'
import QuestPage from './QuestPage'

vi.mock('../data/api')
vi.mock('../lib/catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/catalog')>()),
  fetchCatalogDetails: vi.fn(),
}))

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', category_id: CATS.viagem.id })
const ichiran = quest({ id: 'ichiran', parent_id: 'toquio', title: 'Ichiran', category_id: CATS.restaurante.id })
const tonkotsu = quest({ id: 'tonkotsu', parent_id: 'ichiran', title: 'Comer o tonkotsu', category_id: CATS.atividade.id })
const routes = [
  { path: '/quests/:id', element: <QuestPage /> },
  { path: '/quests/:id/concluir', element: <p>concluir</p> },
  { path: '/', element: <p>home</p> },
]
const load = (o: Parameters<typeof appData>[0]) => vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), ...o }))

it('shows the path, subquests and both reviews', async () => {
  load({
    quests: [japao, toquio, ichiran, tonkotsu],
    completions: [completion({ id: 'c1', quest_id: 'ichiran', done_on: '2026-10-05' })],
    reviews: [review({ completion_id: 'c1', user_id: PARTNER, rating: 4, body: 'Muito bom' })],
  })
  renderRoute(routes, '/quests/ichiran')
  const nav = await screen.findByRole('navigation', { name: 'Caminho' })
  expect(within(nav).getByRole('link', { name: 'Japão' })).toHaveAttribute('href', '/quests/japao')
  expect(within(nav).getByRole('link', { name: 'Tóquio' })).toHaveAttribute('href', '/quests/toquio')
  expect(screen.getByText('Comer o tonkotsu')).toBeInTheDocument()
  expect(screen.getByLabelText('4 de 5 estrelas')).toBeInTheDocument()
  expect(screen.getByText('Muito bom')).toBeInTheDocument()
  expect(screen.getByText(/05\/10\/2026/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Escrever minha resenha' })).toHaveAttribute('href', '/quests/ichiran/concluir?completion=c1')
  expect(screen.getByRole('link', { name: 'Fazer de novo' })).toBeInTheDocument()
})

const dark = (progress_season: number, progress_episode: number) =>
  quest({ id: 'dark', title: 'Dark', category_id: CATS.serie.id, media_id: 'm1', progress_season, progress_episode })
const darkMedia = media({ id: 'm1', source: 'tmdb_tv', seasons: [{ season: 1, episodes: 10 }, { season: 2, episodes: 8 }] })

it('+1 episódio jumps to the next season', async () => {
  load({ quests: [dark(1, 10)], media: [darkMedia] })
  const user = userEvent.setup()
  renderRoute(routes, '/quests/dark')
  expect(await screen.findByText('T1 E10')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '+1 episódio' }))
  expect(api.setProgress).toHaveBeenCalledWith('dark', { season: 2, episode: 1 })
})

it('+1 at the last episode offers to complete', async () => {
  load({ quests: [dark(2, 8)], media: [darkMedia] })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/dark')
  await user.click(await screen.findByRole('button', { name: '+1 episódio' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/dark/concluir'))
  expect(api.setProgress).not.toHaveBeenCalled()
})

it('deleting warns about every subquest and sends all data for photo cleanup', async () => {
  load({ quests: [japao, toquio, ichiran, tonkotsu] })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao')
  await user.click(await screen.findByRole('button', { name: 'Excluir' }))
  expect(confirm).toHaveBeenCalledWith('Excluir "Japão" e 3 subquest(s)?')
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(api.deleteQuest).toHaveBeenCalledWith('japao', expect.objectContaining({ quests: expect.arrayContaining([tonkotsu]) }))
})

it('refreshes catalog data older than 7 days', async () => {
  const stale = media({ id: 'm1', external_id: '70523', fetched_at: new Date(Date.now() - 10 * 864e5).toISOString() })
  load({ quests: [dark(1, 1)], media: [stale] })
  vi.mocked(catalog.fetchCatalogDetails).mockResolvedValue({ ...stale, runtime_minutes: 45 })
  renderRoute(routes, '/quests/dark')
  await waitFor(() => expect(catalog.fetchCatalogDetails).toHaveBeenCalledWith('tmdb_tv', '70523'))
})

it('does not refresh fresh catalog data', async () => {
  load({ quests: [dark(1, 1)], media: [darkMedia] })
  renderRoute(routes, '/quests/dark')
  await screen.findByText('T1 E1')
  expect(catalog.fetchCatalogDetails).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/pages/QuestPage.test.tsx`
Expected: FAIL — não resolve `./QuestPage`.

- [ ] **Step 3: Implementar**

`src/components/Stars.tsx`:
```tsx
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
```

`src/data/hooks.ts` — acrescentar ao final (e os imports no topo):
```ts
import { useEffect } from 'react'
import { fetchCatalogDetails } from '../lib/catalog'
import type { Media } from '../lib/types'
import { upsertMedia } from './api'

const WEEK = 7 * 24 * 60 * 60 * 1000

export function useMediaRefresh(media: Media | undefined) {
  const refresh = useRefresh()
  const stale = !!media && media.source !== 'tmdb_movie' && Date.now() - Date.parse(media.fetched_at) > WEEK
  useEffect(() => {
    if (!stale || !media) return
    fetchCatalogDetails(media.source, media.external_id)
      .then(upsertMedia)
      .then(() => refresh())
      .catch(() => {})
  }, [stale, media])
}
```

(Juntar `upsertMedia` ao import existente de `./api`: `import { loadAll, signedUrls, upsertMedia } from './api'`.)

`src/pages/QuestPage.tsx`:
```tsx
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import DifficultyBadge from '../components/DifficultyBadge'
import PhotoGrid from '../components/PhotoGrid'
import QuestCard from '../components/QuestCard'
import Stars from '../components/Stars'
import { LoadError, Loading } from '../components/Status'
import { deleteCompletion, deleteQuest, setProgress } from '../data/api'
import { useAppData, useMediaRefresh, useRefresh } from '../data/hooks'
import { useUserId } from '../data/session'
import { formatDate } from '../lib/dates'
import { formatProgress, nextEpisode, progressOf } from '../lib/progress'
import { ancestors, childrenOf, descendantIds, doneQuestIds } from '../lib/tree'
import type { AppData, Completion, Quest } from '../lib/types'

export default function QuestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useUserId()
  const refresh = useRefresh()
  const q = useAppData()
  const data = q.data
  const quest = data?.quests.find((x) => x.id === id)
  const media = quest?.media_id ? data?.media.find((m) => m.id === quest.media_id) : undefined
  useMediaRefresh(media)

  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!data) return <Loading />
  if (!quest) {
    return (
      <div className="space-y-3">
        <p>Quest não encontrada.</p>
        <Link to="/" className="btn">Voltar</Link>
      </div>
    )
  }

  const category = data.categories.find((c) => c.id === quest.category_id)
  const path = ancestors(data.quests, quest.id)
  const done = doneQuestIds(data.completions)
  const children = childrenOf(data.quests, quest.id)
  const history = data.completions.filter((c) => c.quest_id === quest.id).sort((a, b) => b.done_on.localeCompare(a.done_on))
  const progress = progressOf(quest)

  async function plusOne() {
    if (!media) return
    const next = nextEpisode(media.seasons, progress)
    if (!next) {
      if (window.confirm('Vocês chegaram ao último episódio! Concluir agora?')) navigate(`/quests/${quest!.id}/concluir`)
      return
    }
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
    <article className="space-y-6">
      {path.length > 0 && (
        <nav aria-label="Caminho" className="flex flex-wrap gap-1 text-sm text-gray-500">
          {path.map((a) => (
            <span key={a.id}>
              <Link to={`/quests/${a.id}`} className="underline">{a.title}</Link> ›
            </span>
          ))}
        </nav>
      )}

      <header className="flex gap-4">
        {media?.poster_url && <img src={media.poster_url} alt="" className="h-36 w-24 shrink-0 rounded-xl object-cover" />}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{quest.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span style={{ color: category?.color }}>
              <span aria-hidden>{category?.icon}</span> {category?.name}
            </span>
            <DifficultyBadge difficulty={quest.difficulty} />
            {done.has(quest.id) && <span className="text-green-700">✔ Feita</span>}
          </div>
          {media?.synopsis && <p className="text-sm text-gray-600">{media.synopsis}</p>}
          {quest.notes && <p className="whitespace-pre-wrap">{quest.notes}</p>}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link to={`/quests/${quest.id}/concluir`} className="btn btn-primary">{done.has(quest.id) ? 'Fazer de novo' : 'Concluir'}</Link>
        <Link to={`/quests/nova?parent=${quest.id}`} className="btn">+ Subquest</Link>
        <Link to={`/quests/${quest.id}/editar`} className="btn">Editar</Link>
        <button type="button" className="btn btn-danger" onClick={remove}>Excluir</button>
      </div>

      {media && media.source !== 'tmdb_movie' && (
        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Progresso</h2>
          <div className="flex items-center gap-3">
            <span className="text-lg">{formatProgress(media.source, media.seasons, progress)}</span>
            <button type="button" className="btn btn-primary" onClick={plusOne}>+1 episódio</button>
          </div>
          <ProgressEditor quest={quest} onSaved={refresh} />
        </section>
      )}

      <PhotoGrid photos={data.photos.filter((p) => p.quest_id === quest.id)} />

      <section className="space-y-2">
        <h2 className="font-semibold">Subquests ({children.length})</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {children.map((c) => <QuestCard key={c.id} quest={c} data={data} done={done} />)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Histórico</h2>
        {history.length === 0 && <p className="text-gray-500">Ainda não fizeram essa.</p>}
        {history.map((c) => (
          <CompletionEntry key={c.id} completion={c} data={data} me={me} questId={quest.id} onDelete={() => removeCompletion(c)} />
        ))}
      </section>
    </article>
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
      <summary className="cursor-pointer text-sm text-gray-600">Editar progresso</summary>
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
      <p className="mt-1 text-xs text-gray-500">Episódio 0 = não começou.</p>
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
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium"><span aria-hidden>📅</span> {formatDate(completion.done_on)}</span>
        <div className="flex gap-2">
          <Link to={`/quests/${questId}/concluir?completion=${completion.id}`} className="btn">{mine ? 'Editar' : 'Escrever minha resenha'}</Link>
          <button type="button" className="btn btn-danger" aria-label="Excluir conclusão" onClick={onDelete}>🗑</button>
        </div>
      </div>
      {data.profiles.map((p) => {
        const r = reviews.find((x) => x.user_id === p.id)
        return (
          <div key={p.id} className="space-y-1">
            <p className="text-sm font-medium">{p.display_name}</p>
            {r ? (
              <>
                <Stars value={r.rating} />
                {r.body && <p className="whitespace-pre-wrap text-sm">{r.body}</p>}
                <PhotoGrid photos={data.photos.filter((ph) => ph.review_id === r.id)} />
              </>
            ) : (
              <p className="text-sm text-gray-500">Aguardando resenha</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

`src/App.tsx` — adicionar `import QuestPage from './pages/QuestPage'` e, depois de `/quests/:id/editar`:
```tsx
      { path: '/quests/:id', element: <QuestPage /> },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: quest page with path, subquests, episode progress, history and deletion"
```

---

### Task 13: Concluir e resenhar (com comemoração)

**Files:**
- Create: `src/components/RarityBadge.tsx`, `src/components/Celebration.tsx`, `src/pages/CompletePage.tsx`
- Modify: `src/App.tsx` (rota `/quests/:id/concluir`)
- Test: `src/pages/CompletePage.test.tsx`

**Interfaces:**
- Consumes: `createCompletion`, `updateCompletion`, `saveReview`, `deleteReview`, `deletePhoto` (Task 9), `PhotoPicker`, `uploadPending` (Task 11), `Stars` (Task 12), `evaluateAchievements`, `newlyUnlocked`, `RARITY_LABEL` (Task 5), `todayISO` (Task 6).
- Produces: `RarityBadge({ rarity })`, `Celebration({ achievements, onClose })` (`role="dialog"`, título "Conquista desbloqueada!").

- [ ] **Step 1: Escrever o teste que falha**

`src/pages/CompletePage.test.tsx`:
```tsx
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { todayISO } from '../lib/dates'
import { CATS, ME, achievement, allCats, appData, completion, quest, review } from '../test/fixtures'
import { renderRoute } from '../test/render'
import CompletePage from './CompletePage'

vi.mock('../data/api')

const japao = quest({ id: 'japao', title: 'Japão', category_id: CATS.viagem.id })
const routes = [
  { path: '/quests/:id/concluir', element: <CompletePage /> },
  { path: '/quests/:id', element: <p>página da quest</p> },
]
const load = (o: Parameters<typeof appData>[0] = {}) =>
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), quests: [japao], ...o }))

beforeEach(() => {
  vi.mocked(api.createCompletion).mockResolvedValue(completion({ id: 'c-new', quest_id: 'japao', done_on: todayISO() }))
  vi.mocked(api.saveReview).mockResolvedValue(review({ id: 'r-new', completion_id: 'c-new' }))
})

it('creates the completion and my review', async () => {
  load()
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao/concluir')
  await user.click(await screen.findByRole('radio', { name: '4 estrelas' }))
  await user.type(screen.getByLabelText(/O que achou/), 'Inesquecível')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/japao'))
  expect(api.createCompletion).toHaveBeenCalledWith('japao', todayISO())
  expect(api.saveReview).toHaveBeenCalledWith({ id: undefined, completion_id: 'c-new', rating: 4, body: 'Inesquecível' })
})

it('rejects a future date', async () => {
  load()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/japao/concluir')
  fireEvent.change(await screen.findByLabelText('Quando vocês fizeram?'), { target: { value: '2999-01-01' } })
  await user.click(screen.getByRole('button', { name: 'Pular resenha' }))
  expect(screen.getByRole('alert')).toHaveTextContent('A data não pode ser no futuro.')
  expect(api.createCompletion).not.toHaveBeenCalled()
})

it('skipping the review only saves the completion', async () => {
  load()
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao/concluir')
  await user.click(await screen.findByRole('button', { name: 'Pular resenha' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/quests/japao'))
  expect(api.saveReview).not.toHaveBeenCalled()
})

it('asks for a rating when there is text', async () => {
  load()
  const user = userEvent.setup()
  renderRoute(routes, '/quests/japao/concluir')
  await user.type(await screen.findByLabelText(/O que achou/), 'Legal')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dê uma nota para salvar a resenha.')
  expect(api.createCompletion).not.toHaveBeenCalled()
})

it('celebrates newly unlocked achievements', async () => {
  load({ achievements: [achievement({ name: 'Primeira quest', icon: '⭐', rule_count: 1 })] })
  const user = userEvent.setup()
  const router = renderRoute(routes, '/quests/japao/concluir')
  await user.click(await screen.findByRole('button', { name: 'Pular resenha' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Primeira quest')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Continuar' }))
  expect(router.state.location.pathname).toBe('/quests/japao')
})

it('edits the date and my existing review', async () => {
  load({
    completions: [completion({ id: 'c1', quest_id: 'japao', done_on: '2026-01-10' })],
    reviews: [review({ id: 'r1', completion_id: 'c1', user_id: ME, rating: 3 })],
  })
  vi.mocked(api.saveReview).mockResolvedValue(review({ id: 'r1', completion_id: 'c1' }))
  const user = userEvent.setup()
  renderRoute(routes, '/quests/japao/concluir?completion=c1')
  expect(await screen.findByRole('radio', { name: '3 estrelas' })).toHaveAttribute('aria-checked', 'true')
  fireEvent.change(screen.getByLabelText('Quando vocês fizeram?'), { target: { value: '2026-01-11' } })
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(api.updateCompletion).toHaveBeenCalledWith('c1', '2026-01-11'))
  expect(api.saveReview).toHaveBeenCalledWith({ id: 'r1', completion_id: 'c1', rating: 3, body: null })
  expect(api.createCompletion).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/pages/CompletePage.test.tsx`
Expected: FAIL — não resolve `./CompletePage`.

- [ ] **Step 3: Implementar**

`src/components/RarityBadge.tsx`:
```tsx
import { RARITY_LABEL } from '../lib/achievements'
import type { Rarity } from '../lib/types'

const STYLE: Record<Rarity, string> = {
  bronze: 'bg-bronze/15 text-bronze',
  silver: 'bg-silver/20 text-gray-600',
  gold: 'bg-gold/20 text-yellow-700',
  platinum: 'bg-platinum/20 text-cyan-700',
}

export default function RarityBadge({ rarity }: { rarity: Rarity }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STYLE[rarity]}`}>{RARITY_LABEL[rarity]}</span>
}
```

`src/components/Celebration.tsx`:
```tsx
import type { Achievement } from '../lib/types'
import RarityBadge from './RarityBadge'

export default function Celebration({ achievements, onClose }: { achievements: Achievement[]; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="celebration-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="card w-full max-w-sm space-y-4 p-6 text-center">
        <h2 id="celebration-title" className="text-xl font-bold">Conquista desbloqueada!</h2>
        <ul className="space-y-4">
          {achievements.map((a) => (
            <li key={a.id} className="space-y-1">
              <span aria-hidden className="block text-5xl">{a.icon}</span>
              <p className="font-semibold">{a.name}</p>
              <RarityBadge rarity={a.rarity} />
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary w-full" onClick={onClose} autoFocus>Continuar</button>
      </div>
    </div>
  )
}
```

`src/pages/CompletePage.tsx`:
```tsx
import { useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import Celebration from '../components/Celebration'
import PhotoPicker, { uploadPending } from '../components/PhotoPicker'
import Stars from '../components/Stars'
import { LoadError, Loading } from '../components/Status'
import { createCompletion, deletePhoto, deleteReview, saveReview, updateCompletion } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { useUserId } from '../data/session'
import { evaluateAchievements, newlyUnlocked } from '../lib/achievements'
import { todayISO } from '../lib/dates'
import type { Achievement, AppData, Completion, Photo, Quest } from '../lib/types'

export default function CompletePage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const q = useAppData()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const quest = q.data.quests.find((x) => x.id === id)
  if (!quest) return <p>Quest não encontrada.</p>
  const completionId = params.get('completion')
  const existing = completionId ? q.data.completions.find((c) => c.id === completionId) : undefined
  if (completionId && !existing) return <p>Conclusão não encontrada.</p>
  return <CompleteForm key={completionId ?? 'new'} data={q.data} quest={quest} existing={existing} />
}

function CompleteForm({ data, quest, existing }: { data: AppData; quest: Quest; existing?: Completion }) {
  const me = useUserId()
  const navigate = useNavigate()
  const refresh = useRefresh()
  const mine = existing ? data.reviews.find((r) => r.completion_id === existing.id && r.user_id === me) : undefined
  const [doneOn, setDoneOn] = useState(existing?.done_on ?? todayISO())
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [body, setBody] = useState(mine?.body ?? '')
  const [pending, setPending] = useState<Blob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [failedReviewId, setFailedReviewId] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState<Achievement[] | null>(null)
  const unlocked = useRef<Achievement[]>([])

  const back = () => navigate(`/quests/${quest.id}`, { replace: true })
  const afterSave = () => (unlocked.current.length ? setCelebrate(unlocked.current) : back())

  async function submit(withReview: boolean) {
    if (!doneOn) return setError('Escolha a data.')
    if (doneOn > todayISO()) return setError('A data não pode ser no futuro.')
    if (withReview && rating === 0) return setError('Dê uma nota para salvar a resenha.')
    setSaving(true)
    setError(null)
    try {
      const before = evaluateAchievements(data.achievements, data.quests, data.completions)
      let completion: Completion
      if (existing) {
        if (existing.done_on !== doneOn) await updateCompletion(existing.id, doneOn)
        completion = { ...existing, done_on: doneOn }
      } else {
        completion = await createCompletion(quest.id, doneOn)
      }
      let failed: Blob[] = []
      let reviewId: string | null = null
      if (withReview) {
        const saved = await saveReview({ id: mine?.id, completion_id: completion.id, rating, body: body.trim() || null })
        reviewId = saved.id
        failed = await uploadPending({ review_id: saved.id }, pending)
      }
      const completions = existing ? data.completions.map((c) => (c.id === completion.id ? completion : c)) : [...data.completions, completion]
      unlocked.current = newlyUnlocked(before, evaluateAchievements(data.achievements, data.quests, completions))
      await refresh()
      if (failed.length) {
        setPending(failed)
        setFailedReviewId(reviewId)
        setError(`${failed.length} foto(s) não subiram.`)
      } else afterSave()
    } catch {
      setError('Não foi possível salvar. Verifique a conexão e tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  async function retryUploads(reviewId: string) {
    setSaving(true)
    const still = await uploadPending({ review_id: reviewId }, pending)
    await refresh()
    setSaving(false)
    if (still.length) {
      setPending(still)
      setError(`${still.length} foto(s) não subiram.`)
    } else afterSave()
  }

  async function removeMine() {
    if (!mine || !window.confirm('Apagar sua resenha?')) return
    await deleteReview(mine.id, data)
    await refresh()
    back()
  }

  async function removePhoto(p: Photo) {
    if (!window.confirm('Remover esta foto?')) return
    await deletePhoto(p)
    await refresh()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(rating > 0 || body.trim() !== '' || pending.length > 0)
      }}
      className="mx-auto max-w-xl space-y-5"
    >
      <h1 className="text-2xl font-bold">{existing ? 'Editar conclusão' : 'Concluir'}: {quest.title}</h1>

      <label className="block">
        <span className="mb-1 block font-medium">Quando vocês fizeram?</span>
        <input type="date" className="input" value={doneOn} max={todayISO()} onChange={(e) => setDoneOn(e.target.value)} />
      </label>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">Sua resenha</h2>
        <Stars value={rating} onChange={setRating} />
        <label className="block">
          <span className="mb-1 block text-sm">O que achou? (opcional)</span>
          <textarea className="input min-h-28" value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <PhotoPicker
          existing={mine ? data.photos.filter((p) => p.review_id === mine.id) : []}
          pending={pending}
          onChange={setPending}
          onDeleteExisting={removePhoto}
        />
      </section>

      {error && <p role="alert" className="text-red-600">{error}</p>}

      {failedReviewId ? (
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={() => retryUploads(failedReviewId)}>Tentar de novo</button>
          <button type="button" className="btn flex-1" onClick={afterSave}>Continuar sem elas</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn btn-primary flex-1" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
          {!existing && <button type="button" className="btn flex-1" disabled={saving} onClick={() => submit(false)}>Pular resenha</button>}
          {mine && <button type="button" className="btn btn-danger flex-1" onClick={removeMine}>Apagar minha resenha</button>}
        </div>
      )}

      {celebrate && <Celebration achievements={celebrate} onClose={back} />}
    </form>
  )
}
```

`src/App.tsx` — adicionar `import CompletePage from './pages/CompletePage'` e, depois de `/quests/:id`:
```tsx
      { path: '/quests/:id/concluir', element: <CompletePage /> },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete/redo quests with reviews, photos and achievement celebration"
```

---

### Task 14: Conquistas (lista, criar/editar, desbloqueio manual)

**Files:**
- Create: `src/pages/AchievementsPage.tsx`, `src/pages/AchievementFormPage.tsx`
- Modify: `src/lib/achievements.ts` (acrescentar `describeRule`), `src/lib/achievements.test.ts` (acrescentar teste), `src/App.tsx` (3 rotas)
- Test: `src/pages/AchievementsPage.test.tsx`

**Interfaces:**
- Consumes: `evaluateAchievements`, `RARITIES` (Task 5), `RarityBadge` (Task 13), `saveAchievement`, `deleteAchievement`, `setManualUnlock`, `AchievementInput` (Task 9), `formatDate`, `todayISO` (Task 6), `DIFFICULTIES`, `DIFFICULTY_LABEL` (Task 2).
- Produces: `describeRule(a: Achievement, categories: Category[]): string` (ex.: `"Restaurante · Difícil+ · 10"`).

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `src/lib/achievements.test.ts` (e `describeRule` + `category` aos imports):
```ts
it('describes a rule', () => {
  const rest = category({ id: 'rest', name: 'Restaurante' })
  expect(describeRule(achievement({ rule_category_id: 'rest', rule_min_difficulty: 'hard', rule_count: 10 }), [rest])).toBe('Restaurante · Difícil+ · 10')
  expect(describeRule(achievement({ rule_min_difficulty: 'epic', rule_count: 5 }), [])).toBe('Qualquer categoria · Épica · 5')
})
```

`src/pages/AchievementsPage.test.tsx`:
```tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { todayISO } from '../lib/dates'
import { CATS, achievement, allCats, appData, completion, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import AchievementFormPage from './AchievementFormPage'
import AchievementsPage from './AchievementsPage'

vi.mock('../data/api')

const routes = [
  { path: '/conquistas', element: <AchievementsPage /> },
  { path: '/conquistas/nova', element: <AchievementFormPage /> },
]
const sevenRestaurants = Array.from({ length: 7 }, (_, i) => quest({ id: `r${i}`, category_id: CATS.restaurante.id }))

it('groups by rarity, shows progress and unlock dates', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({
      categories: allCats(),
      quests: sevenRestaurants,
      completions: sevenRestaurants.map((q, i) => completion({ quest_id: q.id, done_on: `2026-10-0${i + 1}` })),
      achievements: [
        achievement({ name: 'Bons de garfo', rarity: 'silver', rule_category_id: CATS.restaurante.id, rule_count: 10 }),
        achievement({ name: 'Primeira garfada', rarity: 'bronze', rule_category_id: CATS.restaurante.id, rule_count: 1 }),
        achievement({ name: 'Aurora boreal', rarity: 'platinum', kind: 'manual', rule_count: null }),
      ],
    }),
  )
  renderRoute(routes, '/conquistas')
  const headings = await screen.findAllByRole('heading', { level: 2 })
  expect(headings.map((h) => h.textContent)).toEqual(['Platina 0/1', 'Prata 0/1', 'Bronze 1/1'])
  expect(screen.getByText('7/10')).toBeInTheDocument()
  expect(screen.getByText('Desbloqueada em 01/10/2026')).toBeInTheDocument()
})

it('unlocks a manual achievement on a chosen date', async () => {
  const aurora = achievement({ id: 'aurora', name: 'Aurora boreal', kind: 'manual', rule_count: null })
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats(), achievements: [aurora] }))
  const user = userEvent.setup()
  renderRoute(routes, '/conquistas')
  await user.click(await screen.findByRole('button', { name: 'Desbloquear' }))
  expect(screen.getByLabelText('Data do desbloqueio')).toHaveValue(todayISO())
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(api.setManualUnlock).toHaveBeenCalledWith('aurora', todayISO())
})

it('creates an automatic achievement', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats() }))
  const user = userEvent.setup()
  const router = renderRoute(routes, '/conquistas/nova')
  await user.type(await screen.findByLabelText('Nome'), 'Rodízio')
  await user.selectOptions(screen.getByLabelText('Raridade'), 'gold')
  await user.selectOptions(screen.getByLabelText('Categoria'), CATS.restaurante.id)
  await user.clear(screen.getByLabelText('Quantidade'))
  await user.type(screen.getByLabelText('Quantidade'), '10')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/conquistas'))
  expect(api.saveAchievement).toHaveBeenCalledWith({
    id: undefined, name: 'Rodízio', description: '', icon: '🏆', rarity: 'gold', kind: 'auto',
    rule_category_id: CATS.restaurante.id, rule_min_difficulty: null, rule_count: 10, manual_unlocked_on: null,
  })
})

it('a manual achievement has no rule', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats() }))
  const user = userEvent.setup()
  renderRoute(routes, '/conquistas/nova')
  await user.type(await screen.findByLabelText('Nome'), 'Acampar')
  await user.click(screen.getByRole('button', { name: 'Manual' }))
  expect(screen.queryByLabelText('Quantidade')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() =>
    expect(api.saveAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'manual', rule_category_id: null, rule_min_difficulty: null, rule_count: null })),
  )
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `describeRule` não exportado; páginas não existem.

- [ ] **Step 3: Implementar**

Acrescentar a `src/lib/achievements.ts` (e `import { DIFFICULTY_LABEL, difficultyRank } from './difficulty'`, `Category` ao import de tipos):
```ts
export function describeRule(a: Achievement, categories: Category[]): string {
  const category = categories.find((c) => c.id === a.rule_category_id)?.name ?? 'Qualquer categoria'
  const min = a.rule_min_difficulty
    ? ` · ${DIFFICULTY_LABEL[a.rule_min_difficulty]}${a.rule_min_difficulty === 'epic' ? '' : '+'}`
    : ''
  return `${category}${min} · ${a.rule_count ?? 1}`
}
```

`src/pages/AchievementsPage.tsx`:
```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import RarityBadge from '../components/RarityBadge'
import { LoadError, Loading } from '../components/Status'
import { setManualUnlock } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { RARITIES, describeRule, evaluateAchievements, type AchievementStatus } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import type { Category } from '../lib/types'

export default function AchievementsPage() {
  const q = useAppData()
  const refresh = useRefresh()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const data = q.data
  const statuses = evaluateAchievements(data.achievements, data.quests, data.completions)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conquistas</h1>
        <Link to="/conquistas/nova" className="btn btn-primary">+ Nova</Link>
      </div>
      <p className="text-gray-600">{statuses.filter((s) => s.unlockedOn).length} de {statuses.length} desbloqueadas</p>
      {RARITIES.map((rarity) => {
        const group = statuses.filter((s) => s.achievement.rarity === rarity)
        if (group.length === 0) return null
        return (
          <section key={rarity} className="space-y-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <RarityBadge rarity={rarity} /> {group.filter((s) => s.unlockedOn).length}/{group.length}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((s) => <AchievementCard key={s.achievement.id} status={s} categories={data.categories} onChange={refresh} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function AchievementCard({ status, categories, onChange }: { status: AchievementStatus; categories: Category[]; onChange: () => void }) {
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
    <div className={`card flex gap-3 p-3 ${unlockedOn ? '' : 'opacity-75'}`}>
      <span aria-hidden className={`text-4xl ${unlockedOn ? '' : 'grayscale'}`}>{a.icon}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{a.name}</p>
          <Link to={`/conquistas/${a.id}/editar`} aria-label={`Editar ${a.name}`} className="px-2 text-gray-400">✎</Link>
        </div>
        {a.description && <p className="text-sm text-gray-600">{a.description}</p>}
        {a.kind === 'auto' && <p className="text-xs text-gray-500">{describeRule(a, categories)}</p>}
        {unlockedOn ? (
          <p className="text-sm text-green-700">Desbloqueada em {formatDate(unlockedOn)}</p>
        ) : a.kind === 'auto' ? (
          <div>
            <div className="h-2 rounded bg-gray-200">
              <div className="h-2 rounded bg-brand" style={{ width: `${(current / target) * 100}%` }} />
            </div>
            <p className="text-xs">{current}/{target}</p>
          </div>
        ) : unlocking ? (
          <div className="flex gap-2">
            <input type="date" aria-label="Data do desbloqueio" className="input" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            <button type="button" className="btn btn-primary" onClick={unlock}>Confirmar</button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setUnlocking(true)}>Desbloquear</button>
        )}
        {a.kind === 'manual' && unlockedOn && (
          <button type="button" className="text-xs text-gray-500 underline" onClick={relock}>Bloquear de novo</button>
        )}
      </div>
    </div>
  )
}
```

`src/pages/AchievementFormPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { LoadError, Loading } from '../components/Status'
import { deleteAchievement, saveAchievement, type AchievementInput } from '../data/api'
import { useAppData, useRefresh } from '../data/hooks'
import { RARITIES, RARITY_LABEL } from '../lib/achievements'
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../lib/difficulty'
import type { Achievement, AppData, Difficulty, Rarity } from '../lib/types'

export default function AchievementFormPage() {
  const { id } = useParams()
  const q = useAppData()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const existing = id ? q.data.achievements.find((a) => a.id === id) : undefined
  if (id && !existing) return <p>Conquista não encontrada.</p>
  return <AchievementForm key={id ?? 'new'} data={q.data} existing={existing} />
}

function AchievementForm({ data, existing }: { data: AppData; existing?: Achievement }) {
  const navigate = useNavigate()
  const refresh = useRefresh()
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? '🏆')
  const [rarity, setRarity] = useState<Rarity>(existing?.rarity ?? 'bronze')
  const [kind, setKind] = useState<'auto' | 'manual'>(existing?.kind ?? 'auto')
  const [categoryId, setCategoryId] = useState(existing?.rule_category_id ?? '')
  const [minDifficulty, setMinDifficulty] = useState<Difficulty | ''>(existing?.rule_min_difficulty ?? '')
  const [count, setCount] = useState(String(existing?.rule_count ?? 1))
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    const n = Number(count)
    if (!name.trim()) return setError('Dê um nome à conquista.')
    if (!icon.trim()) return setError('Escolha um ícone.')
    if (kind === 'auto' && (!Number.isInteger(n) || n < 1)) return setError('A quantidade precisa ser um número inteiro maior que zero.')
    const base = { name: name.trim(), description: description.trim(), icon: icon.trim(), rarity, kind }
    const row: AchievementInput =
      kind === 'auto'
        ? { ...base, rule_category_id: categoryId || null, rule_min_difficulty: minDifficulty || null, rule_count: n, manual_unlocked_on: null }
        : { ...base, rule_category_id: null, rule_min_difficulty: null, rule_count: null, manual_unlocked_on: existing?.kind === 'manual' ? existing.manual_unlocked_on : null }
    try {
      await saveAchievement({ id: existing?.id, ...row })
      await refresh()
      navigate('/conquistas', { replace: true })
    } catch {
      setError('Não foi possível salvar. Verifique a conexão e tente de novo.')
    }
  }

  async function remove() {
    if (!existing || !window.confirm(`Excluir a conquista "${existing.name}"?`)) return
    await deleteAchievement(existing.id)
    await refresh()
    navigate('/conquistas', { replace: true })
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{existing ? 'Editar conquista' : 'Nova conquista'}</h1>
      <div className="flex gap-2">
        <label className="w-20">
          <span className="mb-1 block font-medium">Ícone</span>
          <input className="input text-center text-2xl" value={icon} maxLength={8} onChange={(e) => setIcon(e.target.value)} />
        </label>
        <label className="flex-1">
          <span className="mb-1 block font-medium">Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block font-medium">Descrição</span>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">Raridade</span>
        <select className="input" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)}>
          {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
        </select>
      </label>
      <fieldset>
        <legend className="mb-2 font-medium">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['auto', 'manual'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`btn ${kind === k ? 'btn-primary' : ''}`}>
              {k === 'auto' ? 'Automática' : 'Manual'}
            </button>
          ))}
        </div>
      </fieldset>
      {kind === 'auto' && (
        <>
          <label className="block">
            <span className="mb-1 block font-medium">Categoria</span>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Qualquer categoria</option>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Dificuldade mínima</span>
            <select className="input" value={minDifficulty} onChange={(e) => setMinDifficulty(e.target.value as Difficulty | '')}>
              <option value="">Qualquer</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Quantidade</span>
            <input className="input" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
          </label>
        </>
      )}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button className="btn btn-primary w-full">Salvar</button>
      {existing && <button type="button" className="btn btn-danger w-full" onClick={remove}>Excluir conquista</button>}
    </form>
  )
}
```

`src/App.tsx` — adicionar `import AchievementsPage from './pages/AchievementsPage'` e `import AchievementFormPage from './pages/AchievementFormPage'` e, depois de `/quests/:id/concluir`:
```tsx
      { path: '/conquistas', element: <AchievementsPage /> },
      { path: '/conquistas/nova', element: <AchievementFormPage /> },
      { path: '/conquistas/:id/editar', element: <AchievementFormPage /> },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: achievements page, achievement editor and manual unlocks"
```

---

### Task 15: Relatório

**Files:**
- Create: `src/pages/ReportPage.tsx`
- Modify: `src/App.tsx` (rota `/relatorio`)
- Test: `src/pages/ReportPage.test.tsx`

**Interfaces:**
- Consumes: `buildReport`, `monthPeriod`, `last3Period`, `yearPeriod`, `shiftPeriod`, `Period` (Task 6), `evaluateAchievements` (Task 5), `todayISO`, `formatDate` (Task 6), `DifficultyBadge` (Task 10), `RarityBadge` (Task 13), `PhotoGrid` (Task 11), `DIFFICULTIES` (Task 2).

- [ ] **Step 1: Escrever o teste que falha**

`src/pages/ReportPage.test.tsx`:
```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { CATS, allCats, appData, completion, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import ReportPage from './ReportPage'

vi.mock('../data/api')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 12))
})
afterEach(() => vi.useRealTimers())

const batata = quest({ id: 'batata', title: 'Batata do Marechal', category_id: CATS.restaurante.id, difficulty: 'hard' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: CATS.filme.id, difficulty: 'medium' })
const open = () => renderRoute([{ path: '/relatorio', element: <ReportPage /> }], '/relatorio')

it('shows the current month with counts per category', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(
    appData({
      categories: allCats(),
      quests: [batata, matrix],
      completions: [
        completion({ quest_id: 'batata', done_on: '2026-10-02' }),
        completion({ quest_id: 'batata', done_on: '2026-10-20' }),
        completion({ quest_id: 'matrix', done_on: '2026-10-10' }),
        completion({ quest_id: 'matrix', done_on: '2026-09-05' }),
      ],
    }),
  )
  const user = userEvent.setup()
  open()
  expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument()
  expect(screen.getByText('3')).toBeInTheDocument()
  expect(screen.getByText('Restaurante: 2')).toBeInTheDocument()
  expect(screen.getByText('Filme: 1')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Período anterior' }))
  expect(screen.getByRole('heading', { name: 'setembro de 2026' })).toBeInTheDocument()
  expect(screen.getByText('Filme: 1')).toBeInTheDocument()
  expect(screen.queryByText(/Restaurante:/)).not.toBeInTheDocument()

  await user.click(screen.getByRole('tab', { name: 'Últimos 3 meses' }))
  expect(screen.getByText('Filme: 2')).toBeInTheDocument()
})

it('shows the empty message', async () => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: allCats() }))
  open()
  expect(await screen.findByText('Nada por aqui ainda. Bora completar uma quest?')).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/pages/ReportPage.test.tsx`
Expected: FAIL — não resolve `./ReportPage`.

- [ ] **Step 3: Implementar**

`src/pages/ReportPage.tsx`:
```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import DifficultyBadge from '../components/DifficultyBadge'
import PhotoGrid from '../components/PhotoGrid'
import RarityBadge from '../components/RarityBadge'
import { LoadError, Loading } from '../components/Status'
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
  if (!q.data) return <Loading />
  const data = q.data
  const report = buildReport(period, data, evaluateAchievements(data.achievements, data.quests, data.completions))
  const nameOf = (userId: string) => data.profiles.find((p) => p.id === userId)?.display_name ?? '?'
  const empty = report.total === 0 && report.unlocked.length === 0
  const tabs: [PeriodKind, string, () => Period][] = [
    ['month', 'Mês', () => monthPeriod(y, m)],
    ['last3', 'Últimos 3 meses', () => last3Period(today)],
    ['year', 'Ano', () => yearPeriod(y)],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatório</h1>

      <div role="tablist" aria-label="Período" className="grid grid-cols-3 gap-2">
        {tabs.map(([kind, label, make]) => (
          <button key={kind} role="tab" aria-selected={period.kind === kind} onClick={() => setPeriod(make())} className={`btn px-2 ${period.kind === kind ? 'btn-primary' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        {period.kind !== 'last3' ? <button type="button" className="btn" aria-label="Período anterior" onClick={() => setPeriod(shiftPeriod(period, -1))}>‹</button> : <span />}
        <h2 className="text-lg font-semibold capitalize">{period.label}</h2>
        {period.kind !== 'last3' ? <button type="button" className="btn" aria-label="Próximo período" onClick={() => setPeriod(shiftPeriod(period, 1))}>›</button> : <span />}
      </div>

      {empty ? (
        <p className="py-10 text-center text-gray-500">Nada por aqui ainda. Bora completar uma quest?</p>
      ) : (
        <>
          <section className="card p-4">
            <p className="text-4xl font-bold text-brand">{report.total}</p>
            <p className="text-gray-600">{report.total === 1 ? 'quest concluída' : 'quests concluídas'}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {report.byCategory.map(({ category, count }) => (
                <li key={category.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                  <span aria-hidden>{category.icon}</span> {category.name}: {count}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <h3 className="mb-2 font-semibold">Por dificuldade</h3>
            <ul className="grid grid-cols-4 gap-2 text-center">
              {DIFFICULTIES.map((d) => (
                <li key={d} className="space-y-1">
                  <p className="text-2xl font-bold">{report.byDifficulty[d]}</p>
                  <DifficultyBadge difficulty={d} />
                </li>
              ))}
            </ul>
          </section>

          {report.unlocked.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Conquistas desbloqueadas</h3>
              <ul className="space-y-2">
                {report.unlocked.map((s) => (
                  <li key={s.achievement.id} className="card flex items-center gap-3 p-3">
                    <span aria-hidden className="text-3xl">{s.achievement.icon}</span>
                    <span className="flex-1">{s.achievement.name}</span>
                    <RarityBadge rarity={s.achievement.rarity} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.best.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Melhores momentos</h3>
              <div className="grid gap-2 md:grid-cols-3">
                {report.best.map((i) => (
                  <Link key={i.completion.id} to={`/quests/${i.quest.id}`} className="card block p-3">
                    <p className="font-medium">{i.quest.title}</p>
                    <p className="text-sm text-yellow-600">★ {i.average!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {report.photos.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Álbum</h3>
              <PhotoGrid photos={report.photos} />
            </section>
          )}

          <section className="space-y-2">
            <h3 className="font-semibold">Linha do tempo</h3>
            <ol className="space-y-2">
              {report.timeline.map((i) => (
                <li key={i.completion.id} className="card p-3">
                  <p className="text-xs text-gray-500">{formatDate(i.completion.done_on)}{i.path ? ` · ${i.path}` : ''}</p>
                  <Link to={`/quests/${i.quest.id}`} className="font-medium">
                    <span aria-hidden>{i.category?.icon}</span> {i.quest.title}
                  </Link>
                  {i.ratings.length > 0 && (
                    <p className="text-sm text-gray-600">{i.ratings.map((r) => `${nameOf(r.user_id)}: ${'★'.repeat(r.rating)}`).join(' · ')}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  )
}
```

`src/App.tsx` — adicionar `import ReportPage from './pages/ReportPage'` e:
```tsx
      { path: '/relatorio', element: <ReportPage /> },
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: report page with month, last-3-months and year views"
```

---

### Task 16: Perfil e categorias

**Files:**
- Create: `src/pages/ProfilePage.tsx`, `public/tmdb.svg`
- Modify: `src/App.tsx` (rota `/perfil`)
- Test: `src/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes: `updateProfile`, `uploadAvatar`, `saveCategory`, `deleteCategory`, `signOut`, `CategoryInput` (Task 9), `compressImage`, `UnsupportedImageError` (Task 11), `useSignedUrls`, `useUserId`.

- [ ] **Step 1: Escrever o teste que falha**

`src/pages/ProfilePage.test.tsx`:
```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import * as api from '../data/api'
import { ME, achievement, allCats, appData, category, quest } from '../test/fixtures'
import { renderRoute } from '../test/render'
import ProfilePage from './ProfilePage'

vi.mock('../data/api')

const shows = category({ id: 'cat-shows', name: 'Shows', icon: '🎤', builtin: false })
const open = (o: Parameters<typeof appData>[0] = {}) => {
  vi.mocked(api.loadAll).mockResolvedValue(appData({ categories: [...allCats(), shows], ...o }))
  return renderRoute([{ path: '/perfil', element: <ProfilePage /> }], '/perfil')
}

it('base categories cannot be deleted', async () => {
  open()
  expect(await screen.findByRole('button', { name: 'Excluir Shows' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Excluir Viagem' })).not.toBeInTheDocument()
})

it('refuses to delete a category in use', async () => {
  open({ quests: [quest({ category_id: 'cat-shows' })], achievements: [achievement({ rule_category_id: 'cat-shows' })] })
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Excluir Shows' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Categoria em uso por 1 quest(s) e 1 conquista(s).')
  expect(api.deleteCategory).not.toHaveBeenCalled()
})

it('deletes an unused custom category after confirming', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  open()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Excluir Shows' }))
  await waitFor(() => expect(api.deleteCategory).toHaveBeenCalledWith('cat-shows'))
})

it('adds a category', async () => {
  open()
  const user = userEvent.setup()
  fireEvent.change(await screen.findByLabelText('Ícone'), { target: { value: '📚' } })
  await user.type(screen.getByLabelText('Nome da categoria'), 'Livros')
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(api.saveCategory).toHaveBeenCalledWith({ name: 'Livros', icon: '📚', color: '#64748b' })
})

it('explains a duplicated category name', async () => {
  vi.mocked(api.saveCategory).mockRejectedValue({ code: '23505' })
  open()
  const user = userEvent.setup()
  fireEvent.change(await screen.findByLabelText('Ícone'), { target: { value: '✈️' } })
  await user.type(screen.getByLabelText('Nome da categoria'), 'Viagem')
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma categoria com esse nome.')
})

it('saves my display name', async () => {
  open()
  const user = userEvent.setup()
  const input = await screen.findByLabelText('Seu nome')
  await user.clear(input)
  await user.type(input, 'Luís')
  await user.click(screen.getByRole('button', { name: 'Salvar nome' }))
  expect(api.updateProfile).toHaveBeenCalledWith(ME, { display_name: 'Luís' })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/pages/ProfilePage.test.tsx`
Expected: FAIL — não resolve `./ProfilePage`.

- [ ] **Step 3: Baixar o logo do TMDB (exigido pelos termos de uso da API)**

```bash
curl -L -o public/tmdb.svg "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
head -c 120 public/tmdb.svg
```

Expected: o arquivo começa com `<svg` (ou `<?xml`). Se o link tiver mudado, abrir https://www.themoviedb.org/about/logos-attribution, pegar o link do logo "blue_short" em SVG e repetir.

- [ ] **Step 4: Implementar**

`src/pages/ProfilePage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { LoadError, Loading } from '../components/Status'
import { deleteCategory, saveCategory, signOut, updateProfile, uploadAvatar, type CategoryInput } from '../data/api'
import { useAppData, useRefresh, useSignedUrls } from '../data/hooks'
import { useUserId } from '../data/session'
import { UnsupportedImageError, compressImage } from '../lib/image'
import type { AppData, Category, Profile } from '../lib/types'

export default function ProfilePage() {
  const q = useAppData()
  const me = useUserId()
  const refresh = useRefresh()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <Loading />
  const profile = q.data.profiles.find((p) => p.id === me)

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">Perfil</h1>
      {profile && <ProfileForm profile={profile} onSaved={refresh} />}
      <Categories data={q.data} onChange={refresh} />
      <section className="space-y-2 text-sm text-gray-600">
        <h2 className="font-semibold text-gray-900">Créditos</h2>
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          <img src="/tmdb.svg" alt="TMDB" className="h-4" />
        </a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        <p>
          Dados de anime: <a className="underline" href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>.
        </p>
      </section>
      <button type="button" className="btn btn-danger w-full" onClick={() => signOut()}>Sair</button>
    </div>
  )
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [name, setName] = useState(profile.display_name)
  const [message, setMessage] = useState<string | null>(null)
  const avatarUrl = useSignedUrls(profile.avatar_path ? [profile.avatar_path] : []).data?.[profile.avatar_path ?? '']

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setMessage('O nome não pode ficar vazio.')
    try {
      await updateProfile(profile.id, { display_name: name.trim() })
      onSaved()
      setMessage('Salvo!')
    } catch {
      setMessage('Não foi possível salvar.')
    }
  }

  async function changeAvatar(file: File | undefined) {
    if (!file) return
    try {
      await uploadAvatar(profile.id, await compressImage(file))
      onSaved()
    } catch (e) {
      setMessage(e instanceof UnsupportedImageError ? e.message : 'Não foi possível trocar a foto.')
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="grid size-16 place-items-center rounded-full bg-brand text-2xl text-white">
            {profile.display_name[0]?.toUpperCase()}
          </span>
        )}
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
      </div>
      <form onSubmit={saveName} className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Seu nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn btn-primary" aria-label="Salvar nome">Salvar</button>
      </form>
      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
  )
}

function Categories({ data, onChange }: { data: AppData; onChange: () => void }) {
  const [message, setMessage] = useState<string | null>(null)

  async function save(input: CategoryInput & { id?: string }): Promise<boolean> {
    if (!input.name.trim() || !input.icon.trim()) {
      setMessage('Preencha nome e ícone.')
      return false
    }
    try {
      await saveCategory({ ...input, name: input.name.trim(), icon: input.icon.trim() })
      setMessage(null)
      onChange()
      return true
    } catch (e) {
      setMessage((e as { code?: string }).code === '23505' ? 'Já existe uma categoria com esse nome.' : 'Não foi possível salvar.')
      return false
    }
  }

  async function remove(c: Category) {
    const quests = data.quests.filter((q) => q.category_id === c.id).length
    const achievements = data.achievements.filter((a) => a.rule_category_id === c.id).length
    if (quests || achievements) return setMessage(`Categoria em uso por ${quests} quest(s) e ${achievements} conquista(s).`)
    if (!window.confirm(`Excluir a categoria "${c.name}"?`)) return
    try {
      await deleteCategory(c.id)
      onChange()
    } catch {
      setMessage('Não foi possível excluir.')
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Categorias</h2>
      <ul className="space-y-2">
        {data.categories.map((c) => <CategoryRow key={c.id} category={c} onSave={save} onDelete={remove} />)}
      </ul>
      <CategoryFields initial={{ name: '', icon: '', color: '#64748b' }} submitLabel="Adicionar" onSubmit={save} />
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
    </section>
  )
}

interface RowProps {
  category: Category
  onSave: (c: CategoryInput & { id?: string }) => Promise<boolean>
  onDelete: (c: Category) => void
}

function CategoryRow({ category: c, onSave, onDelete }: RowProps) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <li>
        <CategoryFields
          initial={{ name: c.name, icon: c.icon, color: c.color }}
          submitLabel="Salvar"
          onSubmit={async (v) => {
            const ok = await onSave({ ...v, id: c.id })
            if (ok) setEditing(false)
            return ok
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }
  return (
    <li className="card flex items-center gap-3 p-3">
      <span className="size-3 rounded-full" style={{ background: c.color }} />
      <span aria-hidden>{c.icon}</span>
      <span className="flex-1">{c.name}</span>
      {c.builtin ? (
        <span className="text-xs text-gray-500">padrão</span>
      ) : (
        <>
          <button type="button" className="btn" onClick={() => setEditing(true)}>Editar</button>
          <button type="button" className="btn btn-danger" aria-label={`Excluir ${c.name}`} onClick={() => onDelete(c)}>🗑</button>
        </>
      )}
    </li>
  )
}

interface FieldsProps {
  initial: CategoryInput
  submitLabel: string
  onSubmit: (c: CategoryInput) => Promise<boolean>
  onCancel?: () => void
}

function CategoryFields({ initial, submitLabel, onSubmit, onCancel }: FieldsProps) {
  const [c, setC] = useState(initial)
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if ((await onSubmit(c)) && !onCancel) setC(initial)
      }}
    >
      <input aria-label="Ícone" className="input w-16 text-center" value={c.icon} maxLength={8} onChange={(e) => setC({ ...c, icon: e.target.value })} />
      <input aria-label="Nome da categoria" className="input min-w-0 flex-1" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
      <input aria-label="Cor" type="color" className="h-11 w-14 rounded" value={c.color} onChange={(e) => setC({ ...c, color: e.target.value })} />
      <button className="btn btn-primary">{submitLabel}</button>
      {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancelar</button>}
    </form>
  )
}
```

`src/App.tsx` — adicionar `import ProfilePage from './pages/ProfilePage'` e:
```tsx
      { path: '/perfil', element: <ProfilePage /> },
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test && npm run typecheck`
Expected: todos PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: profile page with avatar, display name, categories and credits"
```

---

### Task 17: PWA, deploy e checklist final

**Files:**
- Create: `public/logo.svg`, `pwa-assets.config.ts`, `vercel.json`, `README.md`, ícones gerados em `public/`
- Modify: `vite.config.ts`, `index.html`

**Interfaces:**
- Produces: app instalável (manifest + service worker que guarda só o app, não os dados); rewrite de SPA na Vercel.

- [ ] **Step 1: Escrever a verificação que falha**

Run: `npm run build && ls dist/manifest.webmanifest dist/sw.js`
Expected: FAIL — `ls: cannot access 'dist/manifest.webmanifest'`.

- [ ] **Step 2: Instalar e gerar ícones**

```bash
npm install -D vite-plugin-pwa@^1 @vite-pwa/assets-generator@^1
```

`public/logo.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#7c3aed"/>
  <path d="M256 404s-150-88-150-196a82 82 0 0 1 150-46 82 82 0 0 1 150 46c0 108-150 196-150 196z" fill="#fff"/>
</svg>
```

`pwa-assets.config.ts`:
```ts
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({ preset, images: ['public/logo.svg'] })
```

Run: `npx pwa-assets-generator`
Expected: cria em `public/` `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`.

- [ ] **Step 3: Configurar o PWA**

`vite.config.ts` (substituir inteiro):
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg', 'tmdb.svg'],
      manifest: {
        name: 'BubsList',
        short_name: 'BubsList',
        description: 'Nossa lista de quests',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#faf7ff',
        theme_color: '#7c3aed',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
  },
})
```

`index.html` — dentro de `<head>`, depois do `<meta name="theme-color">`:
```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/logo.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

`vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

`README.md`:
```markdown
# BubsList

Wishlist de quests do casal. Spec: `docs/superpowers/specs/2026-10-06-bubslist-design.md`.

## Rodar

    npm install
    cp .env.example .env.local   # preencher
    npm run dev                  # http://localhost:5173
    npm test                     # testes
    npm run smoke                # RLS: anônimo não lê nada

## Backend (Supabase CLI — nunca o MCP desta máquina)

    npx supabase login
    npx supabase link --project-ref <ref>
    npx supabase db push
    npx supabase secrets set TMDB_TOKEN=<token>
    npx supabase functions deploy tmdb --no-verify-jwt --use-api

## Checklist de implantação

1. Supabase: cadastro público desligado; 2 contas criadas; Auth → URL Configuration: Site URL = URL da Vercel, Redirect URLs += http://localhost:5173.
2. Vercel: importar o repositório do GitHub (framework Vite), variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Antes de usar de verdade: apagar pelo app as quests de teste.
```

- [ ] **Step 4: Verificar**

Run: `npm test && npm run build && ls dist/manifest.webmanifest dist/sw.js`
Expected: todos os testes PASS; build OK; os dois arquivos listados.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: installable PWA, Vercel SPA rewrite and README"
```

- [ ] **Step 6: Publicar (precisa de autorização explícita do usuário — é ação externa)**

Perguntar ao usuário antes. Com o "ok":
1. `gh repo create bubslist --private --source . --push` (ou o usuário cria o repositório e passa a URL; então `git remote add origin <url> && git push -u origin main`).
2. Usuário importa o repositório na Vercel e define as duas variáveis de ambiente.
3. Usuário configura a Site URL do Supabase com o endereço da Vercel.

- [ ] **Step 7: Verificação de ponta a ponta no celular (com o usuário)**

No celular, no endereço da Vercel:
1. Login; "Adicionar à tela inicial"; abrir pelo ícone (tela cheia).
2. Criar "Japão" (Viagem, Épica) com foto de referência → subquest "Tóquio" → sub-subquest "Ichiran" (Restaurante).
3. Criar "Frieren" (Anime) pelo catálogo → "+1 episódio" duas vezes → "E2 / 28".
4. Concluir "Ichiran" com 5 estrelas, texto e foto → pop-up "Conquista desbloqueada!" (Primeira quest / Primeira garfada).
5. No outro celular (outra conta): aviso "Você tem 1 resenha pendente" → escrever a resenha.
6. Relatório do mês mostra a conclusão, as conquistas e a foto no álbum.
7. Excluir "Japão" → a confirmação diz "2 subquest(s)" → conferir no painel do Supabase (Storage → photos) que as fotos sumiram.
8. Apagar dados de teste restantes.
```
