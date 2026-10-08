# Bubs2Do — Atualização do app, acertos no Local, sorteio em "Todas", agenda e mapa (design)

**Data:** 2026-10-08 · **Base:** `2026-10-08-bubs2do-local-design.md` (lugar em níveis com `lat`/`lng`).

## 1. Objetivo

Cinco melhorias pedidas juntas ("faça as rápidas e médias"):

1. **Atualização:** o app avisa que tem versão nova e atualiza com um toque. Acaba o "fecha e abre de novo".
2. **Campo Local:**
   - a busca desiste se travar;
   - o leitor de tela anuncia os estados da busca;
   - o foco não se perde;
   - um nome enorme não trava o salvamento.
3. **Sorteio:** sempre abre em "Todas".
4. **Agenda:**
   - a quest ganha data e horário opcional;
   - a tela Quests ganha a seção "Próximas";
   - a página da quest ganha "Adicionar ao calendário" (os dois usam iPhone).
5. **Mapa:** nova aba com as quests em alfinetes.

**Sucesso:**
- **Atualização:** depois de um deploy, ao voltar para o app aparece "Nova versão do Bubs2Do · Atualizar", e um toque carrega a versão nova.
- **Agenda:** agendar o Brabus Burguer para sábado 20h faz ele aparecer em Próximas como "sáb, 10/10 · 20h". "Adicionar ao calendário" no iPhone abre a tela de adicionar evento já preenchida.
- **Mapa:** a aba Mapa mostra os alfinetes das quests. Duas quests no mesmo ponto viram um alfinete com "2".

## 2. Atualização do app

- **Modo:**
  - `vite.config.ts` passa de `registerType: 'autoUpdate'` para `'prompt'`;
  - `workbox.navigateFallbackDenylist: [/^\/api\//]` faz o service worker nunca responder `/api/*` com o `index.html`.
- **Registro:** `useRegisterSW` de `virtual:pwa-register/react`, dentro do `Layout`.
  - `onRegisteredSW(url, registration)` chama `registration.update()` sempre que a página volta a ficar visível (`visibilitychange` → `visible`). No iPhone o app fica aberto em segundo plano por dias, então checar só na abertura não basta.
- **Aviso:**
  - quando `needRefresh` é verdadeiro, o contêiner fixo do topo (o mesmo de "Sem internet" e "Não deu para salvar") mostra "Nova versão do Bubs2Do" com o botão **Atualizar**, que chama `updateServiceWorker(true)`;
  - o app nunca recarrega sozinho;
  - o aviso é `role="status"`.
- **Tipos:** `/// <reference types="vite-plugin-pwa/react" />` em `src/vite-env.d.ts`.

## 3. Campo Local (acertos)

- **Busca travada:**
  - a busca é abortada depois de **10 s** e mostra o mesmo alerta de erro ("Não deu para buscar agora. O que você digitou fica salvo como cidade.");
  - o abort por tempo e o abort por nova digitação são distinguidos: só o primeiro mostra o erro.
- **Anúncios:**
  - "Buscando…", "Nenhum lugar encontrado." e "N lugares encontrados" (este só para o leitor de tela) ficam numa região `role="status"`, sempre presente no DOM;
  - o alerta de erro continua `role="alert"`.
- **Foco:**
  - escolher uma sugestão leva o foco para o botão "Limpar local";
  - "Limpar local" devolve o foco ao campo de texto;
  - nada recebe foco na montagem do formulário.
- **Nome enorme:** `normalizePlace` corta `city`, `state` e `country` em 80 caracteres e `label` em 200, sem espaço nas pontas. São os mesmos limites do banco.

## 4. Sorteio em "Todas"

- **Filtro inicial:** o `DrawDialog` sempre abre sem categoria marcada, e a prop `categoryId` dele sai.
- **Página da categoria:** o `QuestActions` continua recebendo `categoryId`, mas só para o link "Nova quest".

## 5. Agenda

### Dados

Migração `supabase/migrations/20261008000002_schedule.sql`, para rodar no SQL Editor **antes do deploy**:

```sql
alter table public.quests
  add column scheduled_on date,
  add column scheduled_time time,
  add constraint quests_schedule_time_needs_date check (scheduled_time is null or scheduled_on is not null);
```

- **`Quest`** ganha `scheduled_on: string | null` (`YYYY-MM-DD`) e `scheduled_time: string | null`. O banco devolve `HH:MM:SS`; o app usa só `HH:MM`.
- **`QuestInput`** inclui os dois.
- **Realtime e RLS:** já cobrem `quests`.

### Formulário

- **Campo "Quando (opcional)":** `<input type="date">` e `<input type="time">` nativos, lado a lado.
- **Horário:** fica desabilitado sem data. Apagar a data apaga o horário.
- **Subquests:** qualquer quest pode ser agendada, inclusive subquest.

### Lógica pura (`src/lib/schedule.ts`)

- **`scheduleLabel(on, time, today)`** monta o rótulo da data:
  - `"Hoje"`, `"Amanhã"` ou `"sáb, 10/10"`, com os dias abreviados fixos `dom seg ter qua qui sex sáb`;
  - com horário, acrescenta `" · 20h"` ou `" · 20h30"`;
  - data no passado vira `"Atrasada · 03/10"`.
- **`upcoming(quests, done, today)`** devolve as quests **pendentes** com `scheduled_on`.
  - Ordena por data, depois horário; sem horário vem antes de com horário no mesmo dia.
  - Atrasadas entram, no topo, porque a data delas é menor.

### Telas

- **Quests (`/`):**
  - seção **Próximas** logo abaixo do topo, só quando há alguma;
  - cada item mostra a bolha da categoria, o título e o rótulo da data, e leva à quest;
  - atrasadas destacadas com `text-red-600`;
  - a seção continua visível durante a busca.
- **Página da quest:**
  - se pendente e agendada, mostra "Agendada · sáb, 10/10 · 20h" e o link **Adicionar ao calendário**;
  - depois de feita, a linha some, porque concluir já tira a quest de Próximas.

### Calendário (iPhone)

- **Link:** "Adicionar ao calendário" é um `<a target="_blank">` para `/api/calendario?t=<título>&d=<YYYY-MM-DD>&h=<HH:MM>&l=<lugar>&id=<quest id>`, com `h` e `l` opcionais. O lugar é o `placeLabel` do lugar efetivo.
- **Por que um link do site:**
  - um link real devolvendo `text/calendar` faz o iPhone mostrar "Adicionar ao Calendário";
  - gerar o arquivo no próprio app (blob/data) costuma falhar no iPhone com o app instalado na tela inicial;
  - o `target="_blank"` abre fora do modo app.
- **Função na Vercel:** `api/calendario.ts`, assinatura web `export function GET(request: Request): Response`, sem dependência nova, publicada junto com o push.
  - Valida `d` (`YYYY-MM-DD`, data real) e `h` (`HH:MM`, se vier). Inválido → `400`.
  - Corta `t` em 200 caracteres e `l` em 200.
  - Responde `200` com `Content-Type: text/calendar; charset=utf-8` e `Content-Disposition: inline; filename="quest.ics"`.
- **`vercel.json`:** o rewrite do SPA passa a excluir `/api/`: `"source": "/((?!api/).*)"`.
- **`buildIcs({ title, date, time, location, uid, now })`** (pura, em `src/lib/ics.ts`, usada pela função):
  - `VCALENDAR` (`VERSION:2.0`, `PRODID:-//Bubs2Do//PT-BR`, `METHOD:PUBLISH`) com um `VEVENT`;
  - `UID:<id>-<date>@bubs2do` e `DTSTAMP` em UTC;
  - **sem horário:** `DTSTART;VALUE=DATE:YYYYMMDD` e `DTEND;VALUE=DATE` no dia seguinte;
  - **com horário:** `DTSTART:YYYYMMDDTHHMM00` em hora local flutuante (sem fuso: o iPhone usa o fuso dele, e os dois estão no Brasil) e `DTEND` 2 h depois, virando o dia quando passa da meia-noite;
  - `SUMMARY` e `LOCATION` com escape de `\`, `;`, `,` e quebras de linha; sem lugar, não há `LOCATION`;
  - linhas terminadas em CRLF e dobradas em 75 bytes UTF-8 sem partir um caractere.
- **Teste no iPhone:** o simulador não reproduz o iPhone, então este fluxo é confirmado no celular deles depois do deploy.

## 6. Mapa

- **Navegação:**
  - rota `/mapa` e aba **Mapa** no menu, entre Quests e Conquistas, com o ícone `Map`;
  - a aba Quests passa a usar `ScrollText`;
  - os 5 rótulos precisam caber em 360 px.
- **Biblioteca:**
  - `leaflet` (dependência nova) e `@types/leaflet` (dev);
  - o componente do mapa (`src/components/QuestMap.tsx`) é carregado com `lazy`, junto com `leaflet/dist/leaflet.css`, e só baixa quando a aba é aberta;
  - fundo: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` com o crédito "© OpenStreetMap" (link para `/copyright`), `maxZoom` 19.
- **Lógica pura (`src/lib/map.ts`):** `mapPins(data, show)` com `show` sendo `'all' | 'pending' | 'done'`, devolve `{ pins, unplaced }`.
  - **Quem vira alfinete:** só quests com `lat` e `lng` **próprios**. Uma subquest que só herda o lugar não ganha alfinete.
  - **Filtro:** uma quest é feita quando tem conclusão, e pendente quando não tem.
  - **Agrupamento:** quests com as mesmas coordenadas arredondadas a 4 casas viram um `Pin { key, lat, lng, quests, pending }`, onde `pending` é verdadeiro se alguma quest do grupo é pendente. Os pins vêm ordenados pela chave e as quests de cada um pelo título.
  - **`unplaced`:** quests filtradas que têm `city`, `state` ou `country` próprios mas não têm `lat`/`lng`, como as antigas digitadas ou as salvas sem internet.
- **Tela (`src/pages/MapPage.tsx`):**
  - **Topo:** título "Mapa" e controle segmentado Todas / Pendentes / Feitas (o `SegmentedControl` existente), começando em Todas.
  - **Tamanho:** o mapa ocupa o resto da tela acima da barra do menu.
  - **Alfinetes:** `divIcon` redondo, rosa (pendente) ou dourado (todas feitas), com o número quando há mais de uma quest.
  - **Cartão:**
    - tocar no alfinete abre um cartão React sobre a parte de baixo do mapa, com cada quest (bolha da categoria, título, lugar) linkada para `/quests/:id` e um botão "Fechar";
    - mudar o filtro fecha o cartão.
  - **Enquadramento:**
    - ao abrir e ao trocar o filtro, o mapa enquadra todos os alfinetes, com zoom máximo 13 para um só;
    - sem alfinetes, fica no Brasil com "Nenhuma quest no mapa ainda. Escolham o lugar pela busca no formulário.".
  - **Fora do mapa:** quando `unplaced` não está vazio, aparece abaixo "N quests com lugar fora do mapa:" e os títulos, linkados para `/quests/:id/editar`.
  - **Rolagem:** o contêiner do mapa leva `data-lenis-prevent`, para a rolagem suave não roubar o zoom da roda do mouse.
  - **Fundo da página:** a tela chama `useHideSky()`; o mapa cobre o fundo e isso poupa bateria.
  - **Sem internet:** o fundo fica cinza e os alfinetes aparecem do mesmo jeito.
- **Sem WebGL:** o Leaflet usa só DOM, então não disputa o contexto WebGL com o céu.

## 7. Testes

- **Atualização:** o `Layout` com `needRefresh` mostra "Nova versão do Bubs2Do", e "Atualizar" chama `updateServiceWorker(true)`. O módulo virtual é mockado no setup.
- **Local:**
  - a busca que não responde mostra o erro depois de 10 s (timers falsos);
  - digitar durante a busca não mostra erro;
  - o status anuncia "2 lugares encontrados";
  - o foco vai para "Limpar local" e volta ao campo;
  - `normalizePlace` corta nome e rótulo enormes.
- **Sorteio:** aberto a partir da página de uma categoria, abre com "Todas" marcada.
- **Agenda:**
  - `scheduleLabel`: hoje, amanhã, dia da semana, horário com e sem minutos, atrasada;
  - `upcoming`: ordem, exclui feitas, sem horário antes;
  - formulário: salva data e horário, horário desabilitado sem data, apagar a data apaga o horário;
  - Quests mostra Próximas;
  - a página da quest mostra a linha e o `href` do calendário, e esconde quando feita.
- **Calendário:**
  - `buildIcs`: dia inteiro; com horário; virada da meia-noite; escape; dobra de linha longa com acento; CRLF;
  - função `GET`: `400` para data inválida, `text/calendar` para válida.
- **Mapa:**
  - `mapPins`: agrupa coordenadas iguais, filtro feitas/pendentes, herdada não vira alfinete, `unplaced`;
  - `MapPage`, com `QuestMap` mockado: filtro, lista "fora do mapa", vazio;
  - o `Layout` tem a aba Mapa.
- **Visual:** screenshots a 360 px de Mapa, Próximas, formulário com "Quando" e menu com 5 abas.

## 8. Fora do escopo

- Lembretes por notificação.
- Calendário do Android.
- Cache dos mapas para uso sem internet.
- Achar a posição das quests antigas automaticamente: elas mostram o aviso "fora do mapa" e vocês reescolhem o lugar pela busca.
- Repetir agendamento.
