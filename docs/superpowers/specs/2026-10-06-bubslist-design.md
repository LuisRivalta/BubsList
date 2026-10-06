# BubsList — Design

**Data:** 2026-10-06
**Status:** design aprovado em conversa; aguardando revisão desta spec escrita.

## 1. Objetivo

BubsList é uma wishlist privada de um casal (Luis e a namorada) para organizar tudo que querem fazer juntos — viagens, restaurantes, atividades, filmes, séries, animes e o que mais quiserem — tratando cada item como uma **quest** a ser completada. Ao completar, cada um escreve sua resenha. Conquistas com raridade e um relatório periódico registram o que viveram juntos.

**Sucesso:** os dois usam no dia a dia pelo celular para anotar ideias e marcar o que fizeram; no fim do mês abrem o relatório e veem o que viveram.

## 2. Fases

| Fase | Conteúdo |
|---|---|
| **Fase 1 (este plano)** | Tudo desta spec **exceto** localização: quests e subquests, categorias, catálogo TMDB/AniList com progresso, conclusões, resenhas, fotos, conquistas (sem regras geográficas), relatório (sem "por onde andaram"), PWA, deploy. |
| **Fase 2 (plano futuro)** | Google Maps Platform: busca de lugar, marcação manual no mapa, casa do casal, mapa na página da quest, aba Mapa, alcance, conquistas geográficas, seção "por onde andaram" do relatório. Ver §13. |

Na Fase 1 não existe nenhum campo, tabela ou tela de localização. A Fase 2 adiciona via migração.

## 3. Usuários e acesso

- Exatamente duas contas, criadas manualmente no painel do Supabase. Cadastro público **desligado**.
- Login por e-mail + senha; recuperação de senha por e-mail (fluxo padrão do Supabase Auth).
- Os dois veem e editam **tudo** (quests, conquistas, categorias). Exceção: cada um só cria/edita/apaga **a própria resenha** e o próprio perfil.
- Interface somente em **português (pt-BR)**.

## 4. Conceitos

- **Quest:** algo a fazer. Tem título, notas, categoria, dificuldade, fotos de referência, e opcionalmente mídia do catálogo e progresso de episódios.
- **Subquest:** uma quest com pai. **Profundidade ilimitada** (Japão › Tóquio › Ichiran › comer o tonkotsu).
- **Categoria:** lista base + criadas pelo casal. Tipo: `general`, `movie`, `series`, `anime`.
- **Dificuldade:** Fácil, Média, Difícil, Épica. Sem pontos/XP — é etiqueta e entra nas regras de conquista.
- **Conclusão:** "fizemos isso em tal data". Uma quest pode ter várias ("fazer de novo").
- **Resenha:** de uma pessoa sobre uma conclusão: nota 1–5 (obrigatória), texto (opcional), fotos (opcionais).
- **Conquista:** automática (regra) ou manual (desbloqueada à mão), com raridade Bronze, Prata, Ouro ou Platina.

## 5. Arquitetura e stack

```
Navegador (React PWA) ──► Supabase: Auth · Postgres (RLS) · Storage · Edge Function "tmdb"
          │                                                        │
          └──► AniList GraphQL (público, sem chave)                └──► TMDB API (token secreto)
```

- **Frontend:** React 19 + Vite + TypeScript (strict), React Router, TanStack Query, Tailwind CSS v4, `vite-plugin-pwa`, `@supabase/supabase-js` v2.
- **Backend:** só Supabase (um único projeto, `bubslist`). Sem servidor próprio.
- **Lógica de conquistas e relatório:** funções puras em TypeScript no cliente, sobre os dados carregados do banco. O volume de duas pessoas (anos de uso < 1 MB) permite carregar quests, conclusões, resenhas, categorias e conquistas inteiras de uma vez.
- **Hospedagem:** Vercel (estático, com rewrite de SPA para `index.html`), deploy automático a partir do GitHub.
- **Testes:** Vitest + Testing Library.

## 6. Modelo de dados (Fase 1)

Identificadores no código e no banco em inglês; textos da interface em pt-BR. Todas as tabelas têm `id uuid primary key default gen_random_uuid()` e `created_at timestamptz not null default now()` salvo indicação.

**`profiles`** — `id uuid pk references auth.users on delete cascade`, `display_name text not null`, `avatar_path text null`. Criado por trigger ao inserir em `auth.users` (`display_name` = parte do e-mail antes do `@`).

**`categories`** — `name text not null unique`, `icon text not null` (emoji), `color text not null` (hex `#rrggbb`), `kind text not null check (kind in ('general','movie','series','anime'))`, `builtin boolean not null default false`.

Lista base (`builtin = true`), semeada na migração:

| name | icon | kind |
|---|---|---|
| Viagem | ✈️ | general |
| Restaurante | 🍽️ | general |
| Atividade | 🎯 | general |
| Filme | 🎬 | movie |
| Série | 📺 | series |
| Anime | 🍥 | anime |
| Outro | ✨ | general |

Categorias criadas pelo casal têm sempre `kind = 'general'`.

**`media`** — `source text not null check (source in ('tmdb_movie','tmdb_tv','anilist'))`, `external_id text not null`, `title text not null`, `poster_url text null`, `synopsis text null`, `year int null`, `genres text[] not null default '{}'`, `runtime_minutes int null` (duração do filme, ou duração média do episódio), `seasons jsonb not null default '[]'` (lista `[{"season":1,"episodes":24}, …]`; filmes `[]`; animes sempre uma entrada `season: 1`, ou `[]` se o total de episódios é desconhecido), `fetched_at timestamptz not null default now()`. `unique (source, external_id)`.

**`quests`** — `parent_id uuid null references quests on delete cascade`, `category_id uuid not null references categories on delete restrict`, `title text not null check (char_length(title) between 1 and 200)`, `notes text null`, `difficulty text not null check (difficulty in ('easy','medium','hard','epic'))`, `media_id uuid null references media on delete set null`, `progress_season int null`, `progress_episode int null`, `created_by uuid not null references profiles`, `updated_at timestamptz not null default now()`.

**`completions`** — `quest_id uuid not null references quests on delete cascade`, `done_on date not null`, `created_by uuid not null references profiles`.

**`reviews`** — `completion_id uuid not null references completions on delete cascade`, `user_id uuid not null references profiles`, `rating smallint not null check (rating between 1 and 5)`, `body text null`, `updated_at timestamptz not null default now()`. `unique (completion_id, user_id)`.

**`photos`** — `quest_id uuid null references quests on delete cascade`, `review_id uuid null references reviews on delete cascade`, `storage_path text not null`, `created_by uuid not null references profiles`. `check (num_nonnulls(quest_id, review_id) = 1)`. Foto com `quest_id` = referência (antes); com `review_id` = da resenha (depois).

**`achievements`** — `name text not null`, `description text not null`, `icon text not null` (emoji), `rarity text not null check (rarity in ('bronze','silver','gold','platinum'))`, `kind text not null check (kind in ('auto','manual'))`, `rule_category_id uuid null references categories on delete restrict`, `rule_min_difficulty text null` (mesmos valores de `quests.difficulty`), `rule_count int null check (rule_count >= 1)`, `manual_unlocked_on date null`. Restrições: `kind = 'auto'` ⇒ `rule_count is not null and manual_unlocked_on is null`; `kind = 'manual'` ⇒ `rule_category_id`, `rule_min_difficulty` e `rule_count` nulos.

**Storage:** bucket privado `photos`. Caminhos: `quests/{quest_id}/{uuid}.jpg` (referência), `reviews/{review_id}/{uuid}.jpg` (resenha), `avatars/{user_id}.jpg`. Exibição por URL assinada (validade 1 h).

## 7. Regras de negócio

### 7.1 Quests e subquests
- Uma quest está **feita** se tem ≥ 1 conclusão; senão **pendente**. Pai e filhas são **independentes**: concluir o pai não exige nem conclui as filhas, e vice-versa.
- O pai mostra o progresso das filhas diretas: "feitas / total" (ex.: "3/5").
- Nova subquest começa com categoria **Atividade** e dificuldade em branco (o usuário escolhe); ambas editáveis.
- Excluir uma quest exclui toda a subárvore (conclusões, resenhas e fotos junto). A confirmação informa quantas subquests serão excluídas.
- **Limpeza do Storage:** sempre que o app exclui uma quest, conclusão, resenha ou foto, primeiro busca as linhas de `photos` afetadas (incluindo as da subárvore/cascata), apaga esses arquivos do Storage e só então apaga as linhas.
- Dificuldade é obrigatória. Para quests sem mídia, o formulário começa sem dificuldade selecionada.

### 7.2 Conclusões ("fazer de novo")
- Concluir pede a **data em que fizeram** (padrão: hoje, data local do aparelho; não pode ser futura). Depois abre o formulário de resenha de quem concluiu, que pode ser pulado.
- Quest feita mostra o botão **"Fazer de novo"**, que cria uma nova conclusão da mesma forma.
- Qualquer um dos dois pode editar a data ou excluir uma conclusão (com confirmação; resenhas e fotos vão junto).
- Criar uma quest nova para algo já feito é permitido; não há detecção de duplicata na Fase 1.

### 7.3 Resenhas
- Uma por pessoa por conclusão. Nota 1–5 obrigatória; texto e fotos opcionais.
- **Resenha pendente:** qualquer conclusão sem resenha do usuário atual, sem prazo — só sai da lista quando a resenha é escrita. A tela inicial mostra "Você tem N resenhas pendentes" com link para cada uma.

### 7.4 Fotos
- Antes do upload: redimensionar no aparelho para no máximo **1600 px** no maior lado e codificar em **JPEG qualidade 0,8**.
- Máximo de **15 fotos** de referência por quest e **15 por resenha**.
- Arquivo que o navegador não consegue decodificar (ex.: HEIC no Chrome do PC) → mensagem "Formato de imagem não suportado" e nada é enviado.
- Falha no upload não perde a resenha: a resenha é salva e a foto mostra "tentar de novo".

### 7.5 Catálogo (filmes, séries, animes)
- Categoria `movie` ou `series` → busca no TMDB (via Edge Function). Categoria `anime` → busca no AniList. Resultados em pt-BR quando disponível.
- Escolher um resultado cria (ou reaproveita, por `source + external_id`) a linha em `media` e preenche título e dificuldade sugerida.
- TMDB séries: temporadas = `seasons` do TMDB **excluindo a temporada 0** (especiais) e temporadas sem episódios; `runtime_minutes` = média de `episode_run_time`; se vazio, `last_episode_to_air.runtime`; se também vazio, 45.
- TMDB filmes: `runtime_minutes` = `runtime` (nulo → 120).
- AniList: total de episódios = `episodes`; se nulo (anime em exibição, ex.: One Piece), `nextAiringEpisode.episode − 1`. `seasons = [{"season":1,"episodes":total}]` se o total é conhecido, senão `[]`; `runtime_minutes` = `duration` (nulo → 24).
- **Atualização:** ao abrir a página de uma quest com mídia `tmdb_tv` ou `anilist` cujo `fetched_at` tem mais de 7 dias, o app busca de novo e atualiza `media` (episódios novos). A dificuldade nunca muda sozinha.
- Busca falhou ou não achou → a quest pode ser salva só com o título, sem mídia; a mídia pode ser vinculada depois pela edição.
- Trocar a categoria de uma quest para um tipo incompatível com a mídia (`movie` ↔ `tmdb_movie`, `series` ↔ `tmdb_tv`, `anime` ↔ `anilist`) remove o vínculo: `media_id`, `progress_season` e `progress_episode` viram nulos.

### 7.6 Dificuldade sugerida pelo tamanho
`total_minutos` = filme: `runtime_minutes`; série/anime: `soma dos episódios × runtime_minutes`.

| total | sugestão |
|---|---|
| ≤ 900 min (15 h) | Fácil |
| ≤ 2400 min (40 h) | Média |
| ≤ 6000 min (100 h) | Difícil |
| > 6000 min | Épica |

Se o total de episódios é desconhecido (`seasons = []` em série/anime), não há sugestão. A sugestão é aplicada só na criação.

### 7.7 Progresso de episódios
- Só para quests com mídia `tmdb_tv` ou `anilist`. Estado = último episódio assistido (`progress_season`, `progress_episode`); nulos = não começou.
- **"+1 episódio":** se nulo → T1 E1. Senão, se o episódio atual < episódios da temporada → episódio + 1. Senão, se existe a próxima temporada → próxima temporada, E1. Senão (último episódio da última temporada) → não muda e o app sugere "Concluir".
- Temporadas desconhecidas (`seasons = []`) → só incrementa o episódio.
- Exibição: série "T2 E5"; anime "E5 / 24" (ou "E5" se total desconhecido). Também editável manualmente (temporada e episódio). Progresso é **um só para o casal**.

### 7.8 Conquistas
- **Regra automática:** conta as conclusões cujas quests satisfazem: categoria = `rule_category_id` (se definida) **e** dificuldade ≥ `rule_min_difficulty` (se definida; ordem easy < medium < hard < epic).
- **Conta itens diferentes:** a identidade de uma conclusão é `media_id` da quest se houver, senão o `id` da quest. Refazer a mesma quest ou rever o mesmo filme não conta de novo.
- **Desbloqueio:** ordenar as conclusões elegíveis por `done_on` (desempate por `created_at`); a conquista desbloqueia na conclusão em que o número de identidades diferentes atinge `rule_count`; **data de desbloqueio = `done_on` dessa conclusão**.
- **Progresso:** `min(identidades diferentes, rule_count) / rule_count` — exibido como "7/10".
- Tudo é recalculado ao vivo: editar categoria/dificuldade ou excluir conclusões pode bloquear de novo.
- **Manual:** botão "Desbloquear" pede a data (padrão hoje) e grava `manual_unlocked_on`; "Bloquear de novo" limpa.
- **Comemoração:** após salvar uma conclusão, o app compara as conquistas desbloqueadas antes e depois; para cada nova, mostra um pop-up com ícone, nome e raridade.
- Conquistas da lista inicial são editáveis e excluíveis como qualquer outra.

### 7.9 Relatório
- **Períodos:** *Mês* (navegável por setas, padrão = mês atual), *Últimos 3 meses* (mês atual + os dois anteriores, fixo em relação a hoje), *Ano* (navegável por setas). Intervalos de datas inclusivos sobre `done_on`.
- **Conteúdo, nesta ordem:**
  1. Total de conclusões no período e contagem por categoria (categorias com zero ficam ocultas). Cada conclusão conta (refazer conta de novo).
  2. Contagem por dificuldade.
  3. Conquistas desbloqueadas no período (automáticas pela data de desbloqueio; manuais por `manual_unlocked_on`).
  4. Melhores momentos: até 3 conclusões do período com resenha, por média de notas decrescente (empate: `done_on` mais recente).
  5. Álbum: fotos de resenhas de conclusões do período, por `done_on`.
  6. Linha do tempo: todas as conclusões do período, `done_on` decrescente, com ícone da categoria, título, caminho do pai ("Japão › Tóquio") e a nota de cada um.
- Período vazio: "Nada por aqui ainda. Bora completar uma quest?"

### 7.10 Categorias
- Criar/editar: nome (único), ícone (emoji), cor.
- Categorias base não podem ser excluídas (RLS impede) nem editadas (a interface não oferece edição — o padrão "Atividade" das subquests depende do nome). Categoria criada só pode ser excluída se nenhuma quest e nenhuma conquista a usam; senão: "Categoria em uso por N quests/conquistas".

## 8. Telas

Navegação: celular (< 768 px) → barra inferior; PC (≥ 768 px) → menu lateral. Itens: **Quests · Conquistas · Relatório · Perfil** (a Fase 2 adiciona **Mapa**). Alvos de toque ≥ 44 px; foco visível; campos com rótulo.

1. **Login** — e-mail, senha, "esqueci a senha".
2. **Quests (início)** — aviso de resenhas pendentes; abas **Pendentes / Feitas**; filtros por categoria (chips) e dificuldade; busca por título (sem diferenciar maiúsculas/acentos). Lista só quests de nível superior; **com busca preenchida, encontra quests de qualquer nível** e o card mostra o caminho do pai ("Japão ›"). Card: ícone/cor da categoria, título, dificuldade, pôster ou 1ª foto de referência, progresso de subquests, progresso de episódios. Botão flutuante **+**. No PC, cards em grade.
3. **Criar/editar quest** — categoria primeiro; se `movie`/`series`/`anime`, busca no catálogo (preenche título, pôster, dificuldade sugerida). Campos: título, dificuldade, notas, fotos de referência. Ao criar subquest, o pai vem fixado.
4. **Página da quest** — caminho clicável (Japão › Tóquio › Ichiran); cabeçalho (título, categoria, dificuldade, pôster, sinopse); fotos de referência; progresso de episódios com "+1 episódio"; lista de subquests diretas (status, nº de filhas); histórico de conclusões com as resenhas dos dois; ações: **Concluir** / **Fazer de novo**, **+ Subquest**, editar, excluir.
5. **Concluir / resenha** — data → resenha (estrelas, texto, fotos) com "Pular". Editar resenha reabre o mesmo formulário.
6. **Conquistas** — grade agrupada por raridade (Platina → Bronze). Desbloqueadas: coloridas com data. Bloqueadas: cinza com progresso (automáticas) ou botão "Desbloquear" (manuais). Criar/editar: nome, descrição, ícone, raridade, tipo; se automática: categoria (ou qualquer), dificuldade mínima (ou qualquer), quantidade.
7. **Relatório** — §7.9.
8. **Perfil** — nome e foto do usuário; gerenciar categorias; atribuição do TMDB (logo + "This product uses the TMDB API but is not endorsed or certified by TMDB."); sair.

## 9. Integrações

- **Edge Function `tmdb`** (Deno, JWT obrigatório — só usuários logados): recebe `{ action: 'search', type: 'movie'|'tv', query }` ou `{ action: 'details', type: 'movie'|'tv', id }`, chama a API v3 do TMDB com `language=pt-BR` e o segredo `TMDB_TOKEN`, e devolve o JSON normalizado no formato de `media`. Qualquer outra entrada → 400.
- **AniList:** GraphQL `https://graphql.anilist.co`, chamado direto do navegador, sem chave; campos `id, title{romaji english}, coverImage{large}, description, episodes, duration, genres, seasonYear`; título exibido = `english` ou, se nulo, `romaji`.
- Requisições de busca disparam com debounce de 400 ms e mínimo de 2 caracteres.

## 10. Segurança

- RLS ligado em todas as tabelas. Usuário anônimo não lê nem escreve nada.
- `authenticated`: select/insert/update/delete em `quests`, `completions`, `media`, `photos`, `achievements`, `categories` (delete de `categories` só onde `builtin = false`).
- `reviews`: select para `authenticated`; insert/update/delete só onde `user_id = auth.uid()`.
- `profiles`: select para `authenticated`; update só onde `id = auth.uid()`.
- Storage `photos`: select/insert/update/delete para `authenticated`.
- Segredos: `TMDB_TOKEN` só como segredo da Edge Function. O frontend só conhece a URL do projeto e a chave publicável (anon).
- **O Supabase conectado via MCP nesta máquina não é usado em nenhuma hipótese.** Todo acesso ao banco é pelo Supabase CLI ligado ao projeto `bubslist`.

## 11. Erros e casos de borda

- Sem internet: aviso "Sem conexão"; formulários mantêm o que foi digitado para tentar de novo. Sem edição offline (o service worker só guarda o app, não os dados).
- Edição simultânea pelos dois: vale o último a salvar.
- Datas são só dia/mês/ano (`date`), exibidas em `dd/mm/aaaa`; "hoje" = data local do aparelho.
- Busca de catálogo com erro ou sem resultados → salvar só com título.
- Exclusões sempre pedem confirmação.

## 12. Testes

- **Vitest (lógica pura):** regras de conquista (filtros, dificuldade mínima, itens diferentes, data de desbloqueio, rebloqueio), períodos e contagens do relatório, dificuldade por tamanho (limites exatos 900/2400/6000), avanço de episódio/temporada, normalização TMDB/AniList, resenhas pendentes (sem prazo).
- **Testing Library:** criar quest; concluir com resenha; "+1 episódio".
- **Fumaça de segurança:** script que, com a chave anon e sem login, tenta ler `quests` e falha se vier alguma linha.

## 13. Fase 2 — Google Maps (resumo para o plano futuro)

- **Google Maps Platform:** Maps JavaScript API (mapa) + Places API (New) (busca). Chave restrita ao domínio do site; Map ID. **Limites diários obrigatórios** no Cloud Console para que a cobrança seja impossível: mapas 300/dia; Autocomplete 300/dia; Place Details 150/dia.
- **`places`:** um por lugar (id do Google único; marcação manual tem id próprio): nome, endereço, lat/lng, cidade, estado, país (código), continente (de tabela estática país → continente).
- **Marcação manual:** segurar o dedo no mapa cria um lugar; cidade/estado/país vêm de geocodificação reversa.
- `quests.place_id` opcional em qualquer categoria; aviso "vocês já estiveram aqui (N visitas)" ao reusar um lugar.
- **Casa do casal** (configuração). **Alcance** de um lugar em relação à casa: mesma cidade < mesmo estado < outro estado < outro país < outro continente; recalculado se a casa mudar.
- **Identidade para contagem** passa a ser: lugar efetivo (próprio ou do ancestral mais próximo) → mídia → quest.
- Conquistas ganham `rule_min_reach` e `rule_count_unit` (`item`, `city`, `state`, `country`, `continent`); sem casa configurada, conquistas de alcance ficam bloqueadas com "Configure a casa".
- Mapa na página da quest (ela + descendentes com local; toque abre a quest), aba **Mapa** (todos os lugares, cor por status, filtro por categoria), seção "Por onde andaram" no relatório.

## 14. Lista inicial de conquistas

### Fase 1 (automáticas)
| Ícone | Nome | Regra | Raridade |
|---|---|---|---|
| ⭐ | Primeira quest | qualquer · 1 | Bronze |
| 🔥 | Em ritmo | qualquer · 10 | Bronze |
| 🧭 | Aventureiros | qualquer · 50 | Prata |
| 🏅 | Veteranos | qualquer · 100 | Ouro |
| 👑 | Lenda do casal | qualquer · 250 | Platina |
| ✈️ | Pé na estrada | Viagem · 1 | Bronze |
| 🎒 | Mochileiros | Viagem · 5 | Prata |
| 🌍 | Nômades | Viagem · 15 | Ouro |
| 🍽️ | Primeira garfada | Restaurante · 1 | Bronze |
| 🍝 | Bons de garfo | Restaurante · 10 | Prata |
| 🧑‍🍳 | Críticos gastronômicos | Restaurante · 25 | Ouro |
| 🌟 | Guia Michelin do casal | Restaurante · 50 | Platina |
| 🎯 | Mãos à obra | Atividade · 1 | Bronze |
| 📅 | Agenda cheia | Atividade · 10 | Prata |
| ⚡ | Inquietos | Atividade · 30 | Ouro |
| 🍿 | Pipoca pronta | Filme · 1 | Bronze |
| 🎬 | Cinéfilos | Filme · 10 | Prata |
| 🎞️ | Maratona de cinema | Filme · 50 | Ouro |
| 🏛️ | Cinemateca | Filme · 100 | Platina |
| 📺 | Próximo episódio | Série · 1 | Bronze |
| 🛋️ | Viciados em séries | Série · 5 | Prata |
| 🌙 | Só mais um episódio | Série · 15 | Ouro |
| 🍥 | Primeiro anime | Anime · 1 | Bronze |
| 🎌 | Otakus | Anime · 5 | Prata |
| 🏴‍☠️ | Nakama | Anime · 20 | Ouro |
| 💪 | Desafio aceito | qualquer · Difícil+ · 1 | Prata |
| 🧗 | Sem medo de desafio | qualquer · Difícil+ · 10 | Ouro |
| 🐉 | Lendários | qualquer · Épica · 1 | Ouro |
| 🏆 | Épicos | qualquer · Épica · 5 | Platina |
| 🏃 | Maratonistas | Série · Épica · 1 | Platina |
| ☠️ | Rei dos piratas | Anime · Épica · 1 | Platina |

### Fase 1 (manuais, para inspirar)
| Ícone | Nome | Raridade |
|---|---|---|
| 🌅 | Nascer do sol juntos | Prata |
| 👩‍🍳 | Chefs do mundo — cozinhar um prato de outro país | Bronze |
| ⛺ | Acampamento — acampar juntos | Prata |
| 🎤 | Na grade — show do artista favorito | Ouro |
| 🌌 | Aurora boreal | Platina |

### Fase 2 (geográficas)
| Ícone | Nome | Regra | Raridade |
|---|---|---|---|
| 🛣️ | Fronteira estadual | Viagem · alcance ≥ outro estado · 1 | Prata |
| 🛂 | Passaporte carimbado | Viagem · alcance ≥ outro país · 1 | Ouro |
| 🌊 | Além-mar | Viagem · alcance ≥ outro continente · 1 | Platina |
| 🍜 | Sabor internacional | Restaurante · alcance ≥ outro país · 1 | Ouro |
| 🏙️ | Turistas | qualquer · 10 cidades | Prata |
| 🗺️ | Desbravadores | qualquer · 5 estados | Ouro |
| 🌐 | Cidadãos do mundo | qualquer · 5 países | Ouro |
| 🧳 | Globetrotters | qualquer · 10 países | Platina |
| 🌏 | Três continentes | qualquer · 3 continentes | Platina |

## 15. Implantação e checklist do usuário

**Fase 1 — só o Luis pode fazer:**
1. Criar o projeto Supabase `bubslist`; em Auth → desligar "Allow new users to sign up"; criar as 2 contas (e-mail + senha).
2. Rodar `npx supabase login` no terminal (abre o navegador) e informar o *project ref* e a senha do banco para o `supabase link`.
3. Criar conta no TMDB, gerar o *API Read Access Token* e gravá-lo com `npx supabase secrets set TMDB_TOKEN=<token>`.
4. Criar o repositório no GitHub e a conta na Vercel; importar o repositório e definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. No Supabase, em Auth → URL Configuration: *Site URL* = endereço do site na Vercel; *Redirect URLs* += `http://localhost:5173` (para o e-mail de recuperação de senha voltar ao site).

**Fase 2:** conta Google Cloud com cobrança ativa, APIs ativadas, chave restrita, Map ID e os limites diários de §13.

## 16. Fora do escopo

Edição offline; notificações push; modo escuro; comparação com período anterior; histórico de episódios assistidos por data; compartilhamento público; mais de um casal; app nativo; outros idiomas.
