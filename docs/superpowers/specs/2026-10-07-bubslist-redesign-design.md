# BubsList — Redesign visual

**Data:** 2026-10-07
**Status:** aprovado em conversa; aguardando revisão desta spec escrita.
**Base:** `docs/superpowers/specs/2026-10-06-bubslist-design.md` (funcionalidade não muda).

## 1. Objetivo

As páginas do app logado estão "cruas". Dar vida a elas ligando-as ao mundo do login (céu noturno, brilhos, lua), sem perder a leitura fácil no celular. **Nenhuma funcionalidade muda** — só aparência e movimento.

## 2. Decisões

- **Direção:** híbrida — cada página abre com uma **faixa de céu noturno** (three.js) com título, números e ações; o conteúdo fica abaixo, em fundo claro, com cartões em relevo.
- **Tipografia:** **Fredoka** nos títulos (600/700) e **Nunito** no texto (400/600/700/800), hospedadas no próprio site via `@fontsource` (funciona offline no PWA).
- **Técnica:** **um único céu three.js compartilhado**, montado no layout; não reinicia ao trocar de página.
- **anime.js** para entradas e micro-interações; **Lenis** continua na rolagem.
- Regra mantida: **sem emojis** — ícones Lucide.

## 3. Sistema visual

**Cores novas (tokens):** `night #1a1115`, `dusk #2c1b25` (já usadas no login). Restante da paleta "agejo 2" inalterado.

**Gemas de dificuldade:** 4 losangos, os primeiros N preenchidos, mais o nome escrito:
| Nível | Gemas | Cor |
|---|---|---|
| Fácil | 1 | `#22c55e` |
| Média | 2 | `#f59e0b` |
| Difícil | 3 | `#f97316` |
| Épica | 4 | `#d946ef` |

**Raridade metálica** (borda em degradê + brilho passando nas desbloqueadas):
bronze `#b0743c→#e2a46c`; prata `#9ca3af→#f3f4f6`; ouro `#eab308→#fde68a`; platina iridescente `#22d3ee→#e3b4cf→#a78bfa`.

**Cartões:** branco, cantos `1.25rem`, borda `blush/50`, sombra `0 1px 2px rgb(26 17 21/.06), 0 8px 24px -12px rgb(85 53 72/.25)`; hover sobe 2px com sombra maior; toque `scale(.98)`.

**Botões:** primário = degradê ameixa→rosa (o mesmo do "Nova quest", sem o brilho contínuo — esse fica só no Nova quest); secundário branco com borda blush; perigo vermelho suave.

**Ícones de categoria:** dentro de uma "bolha" redonda com a cor da categoria a ~15% e o ícone na cor cheia.

## 4. Casca do app

- **`PageHero`** (todas as páginas): faixa de céu com título em Fredoka branco, linha de números/subtítulo e ações. Altura mínima 200px (celular) / 240px (≥768px). Borda inferior curva (horizonte); o conteúdo seguinte sobe 24px sobre a curva.
- **`Sky`**: céu three.js único (refatorado da cena do login): brilhos rosa, estrelas piscando, lua crescente, parallax pelo mouse; raios raros e discretos no app (no login continuam como hoje). Fica atrás da área do hero. Pausa quando o hero sai da tela (IntersectionObserver) e quando a aba fica oculta.
- **Menu no celular (<768px):** barra de vidro **flutuante** (12px das bordas + safe-area, desfoque, totalmente arredondada) com uma pílula ameixa que desliza até a aba ativa.
- **Menu no computador (≥768px):** barra lateral escura (`night`) com logo em Fredoka e a mesma pílula deslizante.
- **Troca de página:** o novo conteúdo entra subindo (opacidade 0→1, 16px→0, 350ms) com cartões em cascata.

## 5. Páginas

- **Quests:** hero com "N pendentes · N feitas este mês · N conquistas" e o botão Nova quest; abas Pendentes/Feitas como controle com pílula deslizante; chips de categoria com bolha; cartão com capa maior (pôster/foto), título em Fredoka, gemas e **barra de progresso** fina (subquests e/ou episódios) mantendo o texto "1/2"/"T2 E5"; lista vazia com uma lua desenhada e uma frase; aviso de resenhas pendentes como cartão rosado.
- **Página da quest:** hero com a capa desfocada ao fundo (se houver), caminho, título e gemas; cartão de progresso com barra grande e "+1 episódio" com pulso; subquests com linhas de árvore; histórico como linha do tempo (pontos + linha), resenhas dos dois lado a lado com avatar e estrelas.
- **Formulários (nova/editar quest, concluir, conquista):** hero compacto com o título da ação; categoria em ladrilhos com ícone grande; dificuldade em 4 ladrilhos com gemas; estrelas grandes que "pulam" ao escolher.
- **Conquistas:** hero com anel de progresso ("8 de 36") e contagem por raridade; cartões-medalha com moldura metálica e ícone num medalhão; bloqueadas acinzentadas com cadeado e barra; comemoração com explosão de brilhos e a medalha virando como moeda.
- **Relatório:** seletor de período no hero; números que contam do zero; categorias em barras horizontais coloridas; dificuldade em colunas de gemas; melhores momentos; álbum em mosaico; linha do tempo com pontos.
- **Perfil:** hero com os avatares dos dois lado a lado e um coração entre eles; categorias como lista de bolhas.

## 6. Movimento, desempenho, acessibilidade

- **anime.js:** cascata de entrada, contagem de números, pílula deslizante (menu e abas), pulo das estrelas, explosão + virada da medalha, pulso do "+1 episódio".
- **Desempenho:** um só contexto WebGL; three.js carregado sob demanda (lazy) depois da primeira pintura; resolução limitada no celular (DPR ≤ 1.5); fontes só nos pesos usados, subset latin.
- **"Reduzir movimento":** o céu vira degradê com estrelas paradas em CSS; números aparecem já no valor final; sem cascata, sem pílula animada (troca instantânea), sem explosão.
- **Contraste:** texto branco só sobre o céu escuro; sobre o fundo claro, texto `ink`.

## 7. Ferramenta de prévia (só desenvolvimento)

`preview.html` + `src/dev/preview.tsx`: monta qualquer página com dados de exemplo e sessão falsa (cache do TanStack Query pré-preenchido), sem Supabase. Só existe no `npm run dev`; não entra no build (o build só usa `index.html`). Usada para conferir cada página com prints em 390px e 1280px.

## 8. Testes

- Os testes atuais continuam válidos: textos e rótulos acessíveis são preservados ("Você tem 1 resenha pendente", "1/2", "Nova quest", nomes de botões e campos). Onde um teste depende de estrutura que muda (ex.: cabeçalhos das raridades), ele é ajustado sem mudar o que verifica.
- Novos testes: `Gems` (nome + N gemas preenchidas por nível), `CountUp` (com movimento reduzido mostra o valor final), `SegmentedControl` (abas com `aria-selected`), `PageHero` (título como `h1` e ações).
- Verificação visual de cada página em 390px e 1280px pela prévia.

## 9. Fora do escopo

Modo escuro completo; sons; mudanças de funcionalidade; mapa (Fase 2).
