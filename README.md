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
