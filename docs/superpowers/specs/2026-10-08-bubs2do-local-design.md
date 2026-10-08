# Bubs2Do — Local em níveis e categorias com lugar físico (design)

**Data:** 2026-10-08 · **Base:** `2026-10-07-bubs2do-sorteio-design.md` (tipos, cidade e sorteio).

## 1. Problema e objetivo

**Defeito atual:** o filtro de cidade do sorteio vale para todas as categorias. Marcando Anime + Restaurante + Ribeirão Preto, todos os animes somem, porque anime não tem cidade.

**Objetivo:**
- O local só filtra categorias com **lugar físico**, e cada categoria diz se tem lugar físico (interruptor no Perfil).
- O local tem **níveis**: país → estado → cidade. "Brasil" pega o Brasil inteiro, "São Paulo" o estado inteiro, "Ribeirão Preto" só a cidade.
- O lugar é informado por **busca** (OpenStreetMap), que preenche cidade, estado e país sozinha.

**Sucesso:**
- Anime + Restaurante + Ribeirão Preto sorteia todos os animes e só os restaurantes de Ribeirão.
- Viagem + "Brasil" sorteia todas as viagens no Brasil.
- Cadastrar um lugar é digitar "Ribeirão" e tocar na sugestão.

## 2. Dados

Migração para rodar no SQL Editor **antes do deploy**: `supabase/migrations/20261008000001_places.sql`.

- **`categories`:**
  - nova coluna `has_place boolean not null default false`;
  - `update` para `true` nas padrão "Viagem", "Restaurante" e "Atividade" (`builtin`). Filme, Série, Anime e Outro ficam `false`. Categorias criadas depois começam `false`;
  - a política de edição de categorias atual já permite atualizar as padrão.
- **`quests`**, além da `city` existente:
  - `state text` e `country text` (1–80 caracteres sem espaços nas pontas, ou nulo);
  - `place_label text` (1–200, ou nulo), o rótulo da sugestão escolhida, ex.: "Ribeirão Preto, São Paulo, Brasil";
  - `lat double precision` (−90..90) e `lng double precision` (−180..180), ou nulos. São guardados para o mapa da Fase 2 e não são usados agora.
- **Código:**
  - `Category.has_place: boolean`;
  - `Quest` ganha `state`, `country`, `place_label`, `lat` e `lng`, todos `| null`;
  - `QuestInput` inclui os cinco;
  - a API ganha `setCategoryPlace(id, hasPlace)`.

## 3. Busca de lugar (OpenStreetMap Nominatim)

- **Requisição:** `GET https://nominatim.openstreetmap.org/search`, direto do navegador, com:
  - `q` (o texto digitado);
  - `format=jsonv2`, `addressdetails=1`, `limit=5`;
  - `accept-language=pt-BR`.
- **Política de uso:**
  - no máximo 1 busca por segundo: busca só com 3 caracteres ou mais e 500 ms depois da última tecla;
  - uma busca em andamento é descartada quando outra começa;
  - o navegador já se identifica pelo `Referer`.
- **`normalizePlace(result) → Place`** (função pura em `src/lib/place.ts`):
  - `city` = `address.city ?? town ?? village ?? municipality ?? null`;
  - `state` = `address.state ?? null`;
  - `country` = `address.country ?? null`;
  - `lat` e `lng` = `Number(result.lat)` e `Number(result.lon)`;
  - `label` = as partes distintas de `[result.name, city, state, country]`, unidas por ", ". Ex.: "Japão"; "São Paulo, Brasil"; "Brabus Burguer, Ribeirão Preto, São Paulo, Brasil".
- **Nível do lugar:** escolher um país guarda só `country`; um estado guarda `state` e `country`; uma cidade (ou um lugar dentro dela) guarda os três.
- **Atribuição:** "Lugares © OpenStreetMap" com link, embaixo do campo e em Créditos no Perfil.

## 4. Formulário da quest

- O campo **Local** aparece **só** quando a categoria escolhida tem `has_place`. Ele substitui o campo "Cidade" atual.
- **Busca:**
  - digitando, aparece uma lista com até 5 sugestões (`label`);
  - tocar numa sugestão preenche `city`, `state`, `country`, `place_label`, `lat` e `lng`, e o campo mostra o `label`;
  - um "×" limpa o lugar.
- **Estados da busca:** "Buscando…"; "Nenhum lugar encontrado"; e, em erro de rede, "Não deu para buscar agora".
- **Fallback:** se a pessoa digitar e salvar sem escolher uma sugestão, o texto vira `city` (como hoje), sem estado nem país.
- **Herança:** uma subquest nova não preenche nada. Ela usa o lugar efetivo da mãe nos filtros, e o campo mostra o lugar herdado como dica ("Herdado: Tóquio, Japão").
- **Trocar para uma categoria sem lugar físico** não apaga o lugar já guardado; ele só é ignorado nos filtros.

## 5. Lugar efetivo e filtro

- **`effectivePlace(quests, id) → { city, state, country } | null`:** os campos da própria quest, se alguma tiver `city`, `state` ou `country`; senão, os do ancestral mais próximo que tiver. Substitui `effectiveCity`.
- **Opções de local** (`placeOptions(quests, among)`), a partir dos lugares efetivos das quests candidatas:
  - **países:** `country`;
  - **estados:** `country + state`;
  - **cidades:** `country + state + city`. Uma quest antiga, só com `city`, vira uma opção de cidade sem estado nem país;
  - cada opção tem uma **chave** normalizada (`sameText`) e um **rótulo**. Cidades com o mesmo nome em estados diferentes mostram "Cidade · Estado";
  - ordem alfabética dentro de cada nível.
- **Dentro de** (`placeWithin(place, key)`):
  - país: `country` igual;
  - estado: `country` e `state` iguais;
  - cidade: `city` igual, e também `state` e `country` quando a opção os tiver.
- **`drawPool`:**
  - `DrawFilter.cities` vira `places: string[]` (chaves);
  - recebe também as categorias;
  - **uma quest de categoria sem `has_place` ignora o filtro de local**;
  - uma quest de categoria com `has_place` passa se nenhum local estiver marcado, ou se o seu lugar efetivo estiver dentro de algum dos marcados.
- **No sorteio:** o grupo "Cidade" vira **"Local"**, com até três linhas (Países, Estados, Cidades) e chips de seleção múltipla.
  - As opções vêm só das quests das categorias marcadas que têm `has_place`. Com "Todas", vêm de todas as categorias com `has_place`.
  - Seleções que não estão na tela continuam sendo ignoradas, como já é hoje.
- **Linha do card e do topo da quest** (`questMeta`): tipo · lugar mais específico (`city ?? state ?? country`).

## 6. Perfil

- Cada linha de categoria ganha o interruptor **"Lugar físico"** (`role="switch"`, `aria-checked`, rótulo "Lugar físico em {nome}"). Tocar chama `setCategoryPlace` e atualiza.
- Em Créditos, entra "Lugares: © OpenStreetMap contributors" com link.

## 7. Testes

- **`place.test.ts`:**
  - `normalizePlace`: cidade, estado e país, com town/village; o label sem repetições;
  - `effectivePlace` (próprio, herdado, nenhum);
  - `placeOptions` (níveis, duplicata de cidade, legado só com cidade);
  - `placeWithin` (país, estado, cidade, legado).
- **`draw.test.ts`:**
  - Anime + Restaurante + uma cidade: os animes ficam;
  - país e estado incluem as cidades de dentro;
  - uma categoria com `has_place` e quest sem lugar fica de fora quando há local marcado.
- **`QuestFormPage.test.tsx`:**
  - o campo só aparece em categoria física;
  - escolher uma sugestão (busca simulada) salva os 5 campos;
  - "×" limpa;
  - texto sem escolher vira `city`;
  - a subquest mostra o herdado;
  - erro de rede mostra a mensagem.
- **`ProfilePage.test.tsx`:** o interruptor chama `setCategoryPlace`.
- **`DrawDialog.test.tsx`:**
  - o grupo "Local" com países, estados e cidades;
  - Anime + Restaurante + cidade mantém os animes na contagem.
- **Visual:** prints do formulário com as sugestões e do sorteio com o grupo "Local".

## 8. Fora do escopo

Mapa e pins (Fase 2); CEP; converter automaticamente as quests antigas que só têm cidade; garantir que a busca encontre todos os restaurantes (o OpenStreetMap nem sempre tem cada estabelecimento, e aí basta escolher a cidade).
