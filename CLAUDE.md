# Bubs2Do: regras do projeto

Lista de quests do casal (Luis e "Bubs"). React 19 + Vite 7 + TS strict + TanStack Query + Tailwind 4 + Supabase (Postgres/RLS/Storage/Realtime) + Vercel. No ar em https://bubs2do.vercel.app.

## Conversa
- **Idioma:** sempre em português do Brasil (pt-BR).
- **Fluxo:** os skills do superpowers. Para algo novo: brainstorming → spec em `docs/superpowers/specs/` → plano em `docs/superpowers/plans/` → execução com TDD → revisão final. Bugs passam pelo systematic-debugging.

## Git
- **Branch:** tudo direto na `main`, sem branches.
- **Commits:** **sem** `Co-Authored-By` e sem atribuição ao Claude.
- **Push:** só quando o usuário pedir explicitamente.

## Supabase e segredos
- **MCP:** **nunca** usar as ferramentas `mcp__supabase__*`. O projeto tem o próprio Supabase (ref `xuenokwkxebptxnmigxq`).
- **Migrações:** ficam em `supabase/migrations/`. O usuário roda no SQL Editor **antes** do push do código que depende delas.
- **Segredos:** nunca escrever a chave secreta do Supabase, o token do TMDB ou outros segredos em arquivos ou no chat.
  - O `.env.local` tem só a URL e a chave anon do Supabase, mais as chaves públicas do Google, que são travadas por domínio.
  - Segredos de Edge Function ficam no painel do Supabase (Edge Functions → Secrets).
- **TLS:** nunca desligar a verificação, nem para contornar erro de rede.
- **No PC do trabalho:** o CLI do Supabase não conecta. Edge Functions são publicadas pelo painel (Deploy new function → Via Editor), com o código juntado num arquivo só via `npx esbuild supabase/functions/<fn>/index.ts --bundle --format=esm --platform=neutral --external:npm:*`.

## Código
- **Testes:** `npx vitest run` (Vitest + Testing Library + jsdom). Typecheck: `npm run typecheck`. Build: `npm run build`.
- **Visual:** `scripts/shot.mjs` tira screenshots com o Chrome sem tela, a partir de `http://localhost:5173/preview.html?url=<rota>` (dados de exemplo, sem login).
- **Textos:** em pt-BR, sem emoji (`src/no-emoji.test.ts`), com `text-ink` em opacidade ≥ 60 (`src/design.test.ts`).
