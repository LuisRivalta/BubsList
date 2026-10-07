# Bubs2Do — Tipos, cidade e o novo sorteio (design)

**Data:** 2026-10-07 · **Base:** `2026-10-06-bubslist-design.md` (funcional), `2026-10-07-bubslist-redesign-design.md` (visual).

## 1. Objetivo

O casal quer sortear com critério: "hoje é filme", "só restaurante em Ribeirão Preto", "só fáceis ou médias". Para isso cada quest ganha um **tipo** (Brabus Burguer → hamburgueria; Interstellar → sci-fi) e uma **cidade**. O sorteio ganha filtros e uma animação de constelação no céu.

**Sucesso:**
- Cadastrar tipos antes (no Perfil) ou na hora (no formulário).
- Marcar a cidade de uma quest.
- Abrir o sorteio, escolher categoria, tipos, dificuldades e cidades, ver quantas quests entram e sortear com a animação.
- Abrir a quest sorteada.

## 2. Dados

Uma migração para rodar no SQL Editor: `supabase/migrations/20261007000002_types_city.sql`.

- **Tabela `quest_types`:**
  - `id uuid` pk (`gen_random_uuid()`);
  - `category_id uuid not null references categories on delete cascade`;
  - `name text not null`, com `check (length(trim(name)) between 1 and 40)`;
  - `created_at timestamptz default now()`;
  - índice único em `(category_id, lower(name))`.
- **Colunas novas em `quests`:**
  - `type_id uuid references quest_types on delete set null`;
  - `city text`, com `check (city is null or length(trim(city)) between 1 and 80)`.
- **RLS:** a mesma regra das outras tabelas, ou seja, quem estiver autenticado pode ler, inserir, atualizar e apagar. O cadastro de contas está fechado, então são só os dois.
- **Ao vivo:** `alter publication supabase_realtime add table public.quest_types`.
- **Código:**
  - `AppData` ganha `questTypes: QuestType[]`, carregado no `loadAll` como as outras tabelas;
  - `Quest` ganha `type_id: string | null` e `city: string | null`;
  - `QuestInput` inclui os dois campos.
- **API:**
  - `saveQuestType({ id?, category_id, name })`;
  - `deleteQuestType(id)`.
- **Script de segurança do banco (`rls-smoke.mjs`):** inclui `quest_types` na verificação de que um usuário não logado não acessa nada.

## 3. Tipos

### No Perfil

- Na seção Categorias, cada categoria mostra os seus tipos como etiquetas (chips), mais um "+ Tipo".
- **Adicionar:** "+ Tipo" abre um campo ali mesmo; Enter ou "Salvar" cria o tipo.
- **Renomear ou apagar:** tocar num tipo abre a edição, com o campo e os botões "Salvar" e "Excluir".
- **Excluir** pede confirmação:
  - quando há quests usando o tipo: "N quest(s) usam esse tipo; elas ficam sem tipo";
  - sem quests: "Excluir o tipo X?".
- **Nome repetido** na mesma categoria (ignorando maiúsculas e acentos): mostra "Esse tipo já existe." e não salva.

### No formulário da quest

- Logo depois da categoria vem **Tipo**, com ladrilhos "Nenhum", os tipos daquela categoria (em ordem alfabética) e "+ Novo tipo".
- **"+ Novo tipo":**
  - abre um campo; confirmar cria o tipo na categoria e o deixa selecionado;
  - se o nome já existir, seleciona o existente.
- **Trocar a categoria** volta o tipo para "Nenhum".
- **Catálogo** (filme, série, anime): ao escolher a obra, se algum gênero dela for igual a um tipo da categoria (ignorando maiúsculas e acentos), esse tipo é selecionado. Se não houver, aparece o atalho "+ {primeiro gênero}", que cria o tipo e o seleciona.

## 4. Cidade

- O formulário ganha o campo **Cidade** (`<input list>` com um `<datalist>` das cidades já usadas, sem repetir).
- O valor é salvo sem espaços nas pontas; vazio vira `null`.
- **Subquest nova:** a cidade vem preenchida com a **cidade efetiva** da quest-mãe.
- **Cidade efetiva** = `city` da própria quest ou, se vazia, a do ancestral mais próximo que tiver uma (`effectiveCity(quests, id)`).
- **Comparação:** `normalizeText` (sem acento, minúscula, sem espaços nas pontas). Assim "ribeirao preto" = "Ribeirão Preto".
- **Lista de cidades** (para filtros e sugestões): agrupa pela forma normalizada e mostra a primeira grafia encontrada, em ordem alfabética.

## 5. Onde aparece

- **QuestCard** e **hero da quest:** uma linha discreta com `tipo · cidade efetiva`, mostrando só o que existir. No card e no hero fica ao lado das gemas (o eyebrow do hero já mostra o caminho).

## 6. Sorteio

### Quem entra (`drawPool`)

Uma quest entra se:
- está pendente;
- não tem subquests pendentes (regra atual);
- passa nos filtros:
  - `categoryId` (um ou nenhum);
  - `typeIds` (conjunto; vazio = qualquer);
  - `difficulties` (conjunto; vazio = qualquer);
  - `cities` (conjunto de formas normalizadas; vazio = qualquer; usa a cidade efetiva).

### Janela, passo 1: filtros

- Tela cheia sobre a noite (`bg-night`). Os filtros ficam numa coluna central (`max-w-md`).
- **Categoria:**
  - chips "Todas" + categorias, com um selecionado;
  - aberto de uma página de categoria, vem marcada essa; da tela inicial, "Todas".
- **Tipo:**
  - aparece quando a categoria escolhida tem tipos;
  - chips com seleção múltipla;
  - trocar a categoria limpa os tipos.
- **Dificuldade:** chips Fácil, Média, Difícil e Épica, com seleção múltipla e as gemas.
- **Cidade:**
  - chips das cidades efetivas das quests que passam na categoria escolhida, com seleção múltipla;
  - escondido quando não há nenhuma.
- **Contagem ao vivo:** "N quests no sorteio" (com singular e plural).
- **Botão "Sortear":** desativado com 0; nesse caso aparece também "Nenhuma quest com esses filtros".
- **"Fechar"** (X) no canto.

### Passo 2: a constelação (cerca de 3 s)

1. **Cena:**
   - um componente three.js novo, `DrawConstellation`, carregado sob demanda (lazy);
   - uma estrela por quest candidata, até **40**. Com mais, entram 40 escolhidas ao acaso, sempre incluindo a vencedora;
   - as estrelas ficam espalhadas num disco, giram devagar e cintilam.
2. **Pulos:**
   - o brilho pula de estrela em estrela (12 pulos, cerca de 2 s no total), cada vez mais devagar;
   - cada pulo desenha uma linha fina da estrela anterior até a nova (a constelação);
   - embaixo, o título da quest da estrela acesa troca a cada pulo.
3. **Final:**
   - o último pulo cai na vencedora, que pulsa enquanto as outras se apagam;
   - ela avança para a câmera e termina num clarão.
4. **Revelação:** o cartão da quest aparece (DOM, sobre a cena) com:
   - pôster ou bolha, título, linha `tipo · cidade`, gemas;
   - explosão de faíscas (reaproveita `.spark`).

### Passo 3: o resultado

- **"Bora!":** abre a quest.
- **"Sortear outra":**
  - repete os passos 2 e 3 com os mesmos filtros;
  - a vencedora anterior fica de fora quando houver outra opção.
- **"Filtros":** volta ao passo 1 mantendo as escolhas.

### Regras gerais

- **Pular:** tocar em qualquer lugar durante o passo 2 vai direto para o resultado.
- **Um contexto WebGL por vez:** enquanto a janela está aberta, o céu do `Layout` desmonta. O `Layout` fornece um contexto `HideSky`, e a janela o ativa ao montar e desativa ao desmontar.
- **Reduzir movimento, WebGL indisponível, ou erro ao criar a cena:** sem passo 2. O resultado aparece direto sobre o céu estático (`.sky-static`).
- **Desempenho:**
  - DPR (densidade de pixels) limitada a 1.5;
  - uma geometria `Points` para as estrelas;
  - `Sprite` só para o brilho;
  - `dispose` de tudo ao desmontar.
- **Onde fica a janela:** `DrawDialog` é reescrito com os passos e continua sendo aberto pelo botão "Sortear" de `QuestActions`, que passa a categoria da página.

## 7. Testes

- **`filters.test.ts`:**
  - `drawPool` com cada filtro, combinações e conjuntos vazios;
  - cidade herdada.
- **`tree.test.ts` / `filters.test.ts`:**
  - `effectiveCity` (própria, herdada, nenhuma);
  - `cityOptions` (agrupa grafias, ordena).
- **`QuestFormPage.test.tsx`:**
  - os tipos mudam com a categoria;
  - "+ Novo tipo" cria e seleciona (e reaproveita um existente);
  - gênero do catálogo seleciona ou sugere o tipo;
  - a cidade vem herdada numa subquest nova;
  - o payload salvo inclui `type_id` e `city`.
- **`ProfilePage.test.tsx`:**
  - adicionar, renomear e excluir um tipo (com a mensagem de quantas quests usam);
  - nome repetido.
- **`DrawDialog.test.tsx`** (o `DrawConstellation` é simulado; o jsdom roda com movimento reduzido):
  - categoria pré-marcada;
  - contagem ao vivo e singular/plural;
  - botão desativado com 0;
  - trocar a categoria limpa os tipos;
  - "Filtros" volta mantendo as escolhas;
  - "Sortear outra" não repete a vencedora;
  - "Pular" (com movimento ligado e cena simulada) vai ao resultado.
- **`Layout.test.tsx`:** o céu some enquanto um componente pede `HideSky`.
- **`api.test.ts`:** `loadAll` inclui `quest_types`.
- **Visual:**
  - prints do passo 1 a 390 px e 1280 px;
  - prints do passo 2 em 0,5 s, 1,5 s e 2,8 s;
  - print do resultado.
  - Verificar também `QuestCard` e o formulário.

## 8. Fora do escopo

Mapa e geocodificação (Fase 2, que depois preenche a `city`); filtros de tipo e cidade nas listas das páginas de categoria; mais de um tipo por quest; histórico de sorteios.
