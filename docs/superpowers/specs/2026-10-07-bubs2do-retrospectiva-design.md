# Bubs2Do — Retrospectiva do ano (design)

**Data:** 2026-10-07 · **Base:** `2026-10-06-bubslist-design.md` (funcional) e `2026-10-07-bubslist-redesign-design.md` (visual).

## 1. Objetivo

Uma retrospectiva do ano no estilo Spotify Wrapped, para o casal ver junto no app e compartilhar nos stories. Cada tela é animada no app e pode virar uma imagem 1080×1920 (9:16).

**Sucesso:** abrir a retrospectiva de qualquer ano com conclusões, passar as telas como stories, e compartilhar qualquer tela como PNG pelo menu nativo do celular (ou baixar no PC).

## 2. Entrada

- No Relatório, com o período em **Ano**, o hero ganha o botão **"Retrospectiva {ano}"** (ícone Sparkles). Ele leva a `/retrospectiva/{ano}`.
- O botão só aparece se o ano tiver pelo menos uma conclusão (`report.total > 0`).
- A retrospectiva funciona o ano todo (mostra o ano até hoje) e para anos anteriores.
- `/retrospectiva/{ano}` com ano inválido ou sem conclusões redireciona para `/relatorio`.

## 3. Telas

Todas usam `buildReport(yearPeriod(ano), …)` e os dados que o app já carrega. **Uma tela sem dados é pulada.**

| # | Tela | Conteúdo | Pulada quando |
|---|------|----------|---------------|
| 1 | Abertura | "{ano} de {eu} & {parceiro(a)}" (nomes dos perfis, o meu primeiro; sem o segundo perfil, só o meu) | nunca |
| 2 | Total | Número de conclusões do ano (conta repetições) + "{Mês} foi o mês mais movimentado ({n})" | nunca (o ano tem ≥ 1 conclusão) |
| 3 | Categorias | Top 3 categorias por conclusões, com barras nas cores delas | nunca |
| 4 | A mais difícil | A conclusão do ano com a quest de maior dificuldade (gemas, título, data) | nunca |
| 5 | Melhor momento | `report.best[0]`: maior nota média, com foto | nenhuma conclusão do ano tem nota |
| 6 | Discordância | A conclusão avaliada pelos dois com a maior diferença de nota: "{A} deu {x}, {B} deu {y}" | nenhuma conclusão tem nota dos dois, ou a maior diferença é 0 |
| 7 | Conquistas | Medalhas desbloqueadas no ano (`report.unlocked`) | nenhuma |
| 8 | Álbum | Mosaico com até 9 fotos do ano + "N fotos" | nenhuma foto |
| 9 | Encerramento | "Bora pra {ano+1}" + quests pendentes (mesma contagem do hero de Quests: topo, não feitas) | nunca |

**Regras de desempate:**
- **Mês mais movimentado:** o mais cedo no ano.
- **A mais difícil:** a conclusão mais recente.
- **Discordância:** a mais recente.
- **Melhor momento:** a regra que `buildReport` já usa.

**Imagem de cada tela** (usada no app e no story):
- As telas 4, 5 e 6 usam, nesta ordem, uma foto da conclusão, uma foto da quest ou o pôster do catálogo.
- A tela 8 usa a primeira foto.

## 4. Tela da retrospectiva

- **Rota:** `/retrospectiva/:year`, irmã da rota do `Layout` (tela cheia, sem menu). Por isso pode ter o próprio céu: o `SkyScene` completo, lazy, sem passar de um contexto WebGL. Com "reduzir movimento", usa o céu estático.
- **Navegação de stories:**
  - Segmentos de progresso no topo.
  - Toque no terço esquerdo volta; nos dois terços da direita avança. São botões acessíveis, "Anterior" e "Próxima".
  - Teclado: ←/→ navegam e Esc fecha.
  - Botão **"Fechar"** (X) volta para `/relatorio`.
- **Avanço automático:** a cada 6 s. Pausa enquanto o compartilhar está aberto. A última tela não fecha sozinha. Com "reduzir movimento" não há avanço automático nem animações.
- **Animações** (anime.js, revertidas no fim):
  - números sobem (CountUp);
  - barras crescem;
  - medalhas giram;
  - fotos entram em cascata (Stagger);
  - o título de cada tela entra de baixo.
- **Botão "Compartilhar"** em todas as telas.

## 5. Compartilhar (molde único em canvas)

- **Dados do card:** cada tela produz um `StoryCard { eyebrow: string; big: string; caption: string; image?: string | null }`.
- **`drawStory(card, year): Promise<Blob>`** desenha um PNG 1080×1920:
  - gradiente do céu noturno, estrelas em posições fixas (semente) e a onda clara embaixo;
  - eyebrow em Nunito 800;
  - `big` em Fredoka 700, quebrando linhas;
  - caption em Nunito;
  - imagem opcional com cantos arredondados;
  - rodapé "Bubs2Do · {ano}".
  - Antes de desenhar, espera `document.fonts.load(...)` das duas famílias.
- **`wrapLines(text, maxWidth, measure)`:** função pura de quebra de linha, testada.
- **Imagem:**
  - carregada com `crossOrigin = 'anonymous'` e timeout de 5 s;
  - fotos usam a URL assinada do Storage;
  - se falhar (CORS, URL expirada, sem rede), o story sai sem imagem.
- **`shareOrDownload(blob, filename)`:**
  - Se `navigator.canShare?.({ files })`, chama `navigator.share({ files })`.
  - `AbortError` (o usuário cancelou) é ignorado.
  - Qualquer outro erro, ou a falta de suporte, baixa o arquivo via `<a download>`.
- **Nome do arquivo:** `bubs2do-{ano}-{tela}.png`.

## 6. Arquivos

- `src/lib/wrapped.ts`: `buildWrapped(year, data, me) → Slide[]` (união discriminada por `kind`) e `storyCard(slide) → StoryCard`. Pura.
- `src/lib/story.ts`: `wrapLines`, `drawStory`, `shareOrDownload`.
- `src/pages/WrappedPage.tsx`: a tela de stories e a renderização de cada `kind`.
- `src/routes.tsx`: nova rota irmã do `Layout`.
- `src/pages/ReportPage.tsx`: o botão de entrada.

## 7. Testes

- **`wrapped.test.ts`:**
  - ordem das telas;
  - telas puladas (sem notas, sem discordância, sem medalhas, sem fotos);
  - mês mais movimentado e desempate;
  - a mais difícil;
  - discordância (diferença 0 é pulada);
  - contagem de pendentes;
  - o `storyCard` de cada tela.
- **`story.test.ts`:**
  - `wrapLines` (palavra longa, várias linhas);
  - `shareOrDownload`: compartilha quando pode, ignora `AbortError`, baixa quando não pode.
- **`WrappedPage.test.tsx`:**
  - abre na Abertura;
  - "Próxima" e "Anterior" mudam de tela;
  - Esc e "Fechar" voltam ao Relatório;
  - ano sem conclusões redireciona.
- **`ReportPage.test.tsx`:** o botão aparece só no período Ano com conclusões.
- **Visual:** prints em 390 px e 1280 px de cada tela, e o PNG gerado no Chrome.

## 8. Fora do escopo

Música; exportar vídeo; telas sobre episódios assistidos (o progresso não tem data, então não dá para atribuir ao ano); retrospectiva por pessoa.
