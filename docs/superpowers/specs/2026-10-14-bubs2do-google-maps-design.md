# Bubs2Do — Google Maps: busca, mapa, nota e fotos (design)

**Data:** 2026-10-14 · **Base:** `2026-10-08-bubs2do-local-design.md` (lugar em níveis) e `2026-10-08-bubs2do-agenda-mapa-design.md` (aba Mapa).
**Situação:** desenho combinado na conversa (Parte 1 aprovada; Parte 2 apresentada e aceita com "blz então"). Próximo passo: revisar este spec, depois escrever o plano e executar.
**Configuração da conta Google:** `docs/google-maps-setup.md` (feita pelo usuário, fora da rede do trabalho).

## 1. Objetivo e decisões

O casal quer as quatro coisas:
1. **Busca enquanto digita:** "Brabus" mostra "Brabus Burguer · Ribeirão Preto, SP" na hora. O OpenStreetMap acha mal estabelecimentos e, pela política dele, só busca com o botão.
2. **Mapa do Google na aba Mapa**, com satélite.
3. **Nota e fotos do lugar**, só na página da quest.
4. **Abrir no Google Maps:** rota, horário e fotos no app do Google.

**Decisões do usuário:**
- **Nota e fotos:** só na página da quest, não nos cartões da lista.
- **OpenStreetMap:** fica **de reserva**. Se o Google falhar (sem chave, sem internet, cota ou teto atingido), a busca volta ao "Buscar" do OpenStreetMap e o mapa volta ao Leaflet atual.
- **Abordagem 1:** Google no navegador, com a chave travada no domínio. O app guarda o **identificador do lugar** para sempre e **renova** coordenadas e endereço a cada 30 dias, como pedem os termos do Google.

**Termos do Google** (Service Specific Terms, Places API):
- o `place_id` pode ser guardado indefinidamente;
- latitude e longitude só podem ficar guardadas por até 30 dias seguidos e depois têm que ser apagadas ou renovadas;
- o restante (nome, endereço) segue a mesma ideia de cache temporário.

Por isso existe a renovação (§7). Lugares vindos do OpenStreetMap (sem `google_place_id`) não têm essa regra e ficam como estão.

**Custo:** o Google Maps Platform tem cota grátis mensal por SKU:
- Essentials: 10 mil;
- Pro: 5 mil;
- Enterprise: mil (a nota e as fotos são Enterprise).

A sessão de busca enquanto digita é grátis quando termina num Place Details. Para duas pessoas, o uso fica muito abaixo dessas cotas, e os tetos diários do setup impedem qualquer cobrança.

**Sucesso:**
- **Busca:** digitar "Brabus" no Local de uma quest de Restaurante mostra o lugar; escolher preenche cidade, estado, país e posição.
- **Mapa:** a aba Mapa abre no mapa do Google, com os mesmos alfinetes.
- **Página da quest:** mostra "★ 4,6 · 1.234 avaliações", o endereço e fotos, e "Abrir no Google Maps" leva ao lugar no app.
- **Sem a chave**, tudo funciona como hoje, pelo OpenStreetMap.

## 2. Configuração e ambiente

- **Variáveis:** `VITE_GOOGLE_MAPS_KEY` e `VITE_GOOGLE_MAP_ID`, no `.env.local` e na Vercel. Também entram em `.env.example`, vazias. Sem a chave, o app nunca carrega o Google, como acontece nos testes e no dev sem chave.
- **Carregamento:** `src/lib/google.ts` carrega o Maps JavaScript API pelo **bootstrap oficial de import dinâmico** (o snippet inline `importLibrary`), sem dependência de runtime nova.
  - Bibliotecas usadas: `maps`, `marker` e `places`.
  - Tipos: `@types/google.maps` (dev).
- **`loadGoogle(): Promise<boolean>`** responde se o Google está disponível:
  - falso sem chave, com erro de script ou passados 10 s;
  - o resultado vale para a sessão inteira, então carrega uma vez só.
  - O hook `useGoogle()` expõe `'loading' | 'ready' | 'unavailable'`.
- **Idioma e região:** `language=pt-BR`, `region=BR`.

## 3. Dados

Migração `supabase/migrations/2026101400000X_google_place.sql`, rodada pelo usuário no SQL Editor **antes do deploy**:

```sql
alter table public.quests
  add column google_place_id text check (google_place_id is null or length(google_place_id) between 1 and 300),
  add column place_refreshed_on date;
```

- `Quest` e `QuestInput` ganham `google_place_id: string | null` e `place_refreshed_on: string | null`.
- **Escolher um lugar pelo Google** grava:
  - `google_place_id` e `place_refreshed_on = hoje`;
  - `city`, `state`, `country`, `place_label`, `lat` e `lng`, como hoje.
- **Escolher pelo OpenStreetMap ou só digitar** grava `google_place_id = null` e `place_refreshed_on = null`.

## 4. Busca no campo Local

- **Com o Google disponível:**
  - **Sugestões:** com 3 ou mais caracteres e 300 ms sem digitar, o campo chama `AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, sessionToken, language: 'pt-BR', region: 'br' })`.
    - Mostra até 5 sugestões, cada uma com `mainText` em destaque e `secondaryText` embaixo.
    - O botão "Buscar" some.
  - **Escolha:** `placePrediction.toPlace().fetchFields({ fields: ['displayName', 'addressComponents', 'location', 'types'] })`, na mesma sessão. Depois da escolha começa um token de sessão novo.
  - **Atribuição:** abaixo das sugestões aparece "Google Maps", a atribuição exigida quando as sugestões aparecem sem um mapa do Google.
- **Conversão** (`googlePlaceFields(place)`, função pura em `src/lib/google.ts`):
  - `country` = componente `country` (`longText`);
  - `state` = `administrative_area_level_1` (`longText`);
  - `city` = `locality` ou, na falta, `administrative_area_level_2`;
  - um país escolhido (`types` inclui `country`) grava só `country`; um estado grava `state` e `country`;
  - `place_label` = o nome (`displayName`) mais as partes, sem repetir. Ex.: "Brabus Burguer, Ribeirão Preto, São Paulo, Brasil";
  - os limites são os do banco (80 e 200), reaproveitando o `cut` de `place.ts`.
- **Reserva:** o Google indisponível, um erro na busca ou uma cota estourada (`OVER_QUERY_LIMIT` e afins) levam ao modo de hoje, com o **Buscar do OpenStreetMap**, mais a linha "Busca do Google indisponível agora." O resto da sessão fica nesse modo. Sem internet, o texto digitado continua virando cidade.
- **Acessibilidade e foco:** iguais aos de hoje. Região `role="status"` com "N lugares encontrados"; o foco vai ao "×" ao escolher e volta ao campo ao limpar.

## 5. Mapa

- **Componente:** `src/components/GoogleQuestMap.tsx` tem a **mesma interface** do `QuestMap` atual: `{ pins, frame, onPick }`.
  - **Alfinetes:** `AdvancedMarkerElement`, com o mesmo conteúdo HTML (`span.map-pin`, rosa ou dourado e o número).
  - **Map ID:** `mapId = VITE_GOOGLE_MAP_ID`.
  - **Controles:** botão Mapa/Satélite (`mapTypeControl`); sem Street View nem tela cheia.
  - **Enquadramento e cartão:** iguais a hoje. Enquadra ao abrir e ao trocar o filtro (`frame`); mudanças do outro celular só redesenham. O cartão "Neste ponto" continua em React (MapPage).
- **`MapPage`:** usa `useGoogle()`.
  - `'ready'` mostra o `GoogleQuestMap`;
  - `'unavailable'` mostra o `QuestMap` (Leaflet + OSM), que vira reserva;
  - `'loading'` mostra "Carregando o mapa…".
  - O carregamento dos dois mapas continua sob demanda (`lazy`).

## 6. Página da quest

- **Abrir no Google Maps:** um link em toda quest com lugar efetivo, próprio ou herdado. Monta a URL a função pura `mapsUrl(label, placeId, lat, lng)`:
  - com `google_place_id`: `https://www.google.com/maps/search/?api=1&query=<rótulo>&query_place_id=<id>`;
  - sem ele: `...&query=<rótulo>`, ou `<lat>,<lng>` quando não há rótulo;
  - abre com `target="_blank"`. No iPhone abre o app do Google Maps, se instalado.
- **Cartão "No Google":** só aparece quando a quest tem `google_place_id` próprio.
  - Busca via `useQuery(['google-place', id])` com `staleTime` de 1 h: `new Place({ id }).fetchFields({ fields: ['rating', 'userRatingCount', 'formattedAddress', 'photos'] })`.
  - Mostra "★ 4,6 · 1.234 avaliações" (se houver nota), o endereço e **até 4 fotos** (`photo.getURI({ maxWidth: 480 })`), cada uma com o crédito do autor (`authorAttributions`, com link), como o Google exige.
  - Tem a atribuição "Google Maps".
  - Se a busca falhar ou o Google estiver indisponível, o cartão simplesmente não aparece.

## 7. Renovação a cada 30 dias

- **Função pura** `staleGooglePlaces(quests, today)`: devolve as quests com `google_place_id` e `place_refreshed_on` nulo ou com mais de 30 dias, **no máximo 10**.
- **Hook** `useGoogleRefresh()`: chamado no `Layout` depois que os dados carregam e o Google está pronto. Roda uma vez por abertura do app, uma quest de cada vez.
  - Faz `new Place({ id }).fetchFields({ fields: ['displayName', 'addressComponents', 'location', 'types'] })`.
  - Em seguida chama `updateQuest` com os campos de `googlePlaceFields` e `place_refreshed_on = hoje`.
- **Respostas do Google:**
  - **Lugar não existe mais** (`NOT_FOUND`): `updateQuest` com `google_place_id`, `lat`, `lng` e `place_refreshed_on` nulos. O texto do lugar fica.
  - **Outra falha** (sem internet, cota): pula a quest, que é tentada na próxima abertura.
- **Os dois celulares** podem renovar a mesma quest ao mesmo tempo. Não tem problema: os valores são iguais.

## 8. Testes

- **Lógica pura:**
  - `googlePlaceFields`: cidade, estado ou país escolhidos; sem `locality`; nomes longos cortados; rótulo sem repetição;
  - `staleGooglePlaces`: limite de 10, nulo conta como vencido, 30 dias exatos;
  - `mapsUrl`: com identificador, sem ele, só coordenadas.
- **Telas**, com `src/lib/google.ts` mockado:
  - a busca do Google preenche os campos e grava o identificador;
  - o Google indisponível ou em erro cai no "Buscar" do OpenStreetMap, com o aviso;
  - a página da quest mostra a nota e as fotos com crédito, e "Abrir no Google Maps" com o href certo;
  - a MapPage escolhe o mapa certo pelo status do Google;
  - a renovação atualiza ou limpa a quest.
- **No fim:** screenshots a 360 px com a chave real no `.env.local` (Local com sugestões, mapa do Google, cartão "No Google").

## 9. Fora do escopo

- Nota e fotos nos cartões da lista e no cartão do alfinete.
- Avaliações em texto do Google.
- Rotas dentro do app ("Abrir no Google Maps" resolve).
- Migrar quests antigas do OpenStreetMap para o Google automaticamente: vocês reescolhem o lugar pela busca quando quiserem a nota e as fotos.

## 10. Como continuar (em outro PC)

1. `git pull` e `npm install`.
2. `.env.local` com as variáveis do Supabase (do painel do Supabase) e as duas do Google (`docs/google-maps-setup.md`).
3. No Claude Code, na pasta do projeto: "Leia o spec `docs/superpowers/specs/2026-10-14-bubs2do-google-maps-design.md`, escreva o plano e execute nesta sessão". As regras do projeto estão no `CLAUDE.md`.
