# Change Log

Todas as mudanças relevantes da extensão "better-mark".

Formato baseado em [Keep a Changelog](http://keepachangelog.com/).

## [0.6.0] — Funciona sem configurar nada

### Adicionado

- **Provedor `proxy`, agora o padrão.** A extensão fala com um servidor do
  Better Mark, e a chave da API vive lá. O usuário instala, abre um Markdown e
  clica — sem criar conta, sem gerar chave, sem colar nada.
- **`installId` anônimo** — identificador aleatório de instalação, guardado no
  `globalState`, usado só para o limite diário no servidor. Não identifica o
  usuário e não é segredo.
- Projeto irmão **`better-mark-server`**: proxy Node puro (sem framework) com
  limite diário por instalação, validação de payload, anti-injeção de prompt e
  cache de prompt.

### Alterado

- O provedor padrão deixou de ser `river` e passou a ser `proxy`.
- O provedor `proxy` **não exige API key**: a checagem de chave passou a valer
  só para os provedores diretos.

### Por que um servidor

O `.vsix` é um arquivo que qualquer um abre. Uma chave embutida nele vazaria
em dias, com o custo caindo na conta do autor. O servidor é a única forma de
entregar "instale e use" sem expor a chave — e permite limite de uso, que
protege a conta de abuso.

## [0.5.0] — Offline forte e dois modos

### Adicionado

- **Regra de recuo (`src/core/rules/indent.ts`)** — texto colado de PDF ou
  site vem com recuo uniforme de 4 espaços, que em Markdown significa "bloco
  de código". Agora vira lista, preservando a hierarquia (8 espaços = sub-item).
  Recuos de 2 e 3 espaços e linhas isoladas são preservados.
- **Rótulos em negrito** — `Chave: valor` vira `**Chave:** valor`, inclusive
  dentro de itens de lista (o caso mais comum num README). Frases que só têm
  dois-pontos (`Veja o exemplo abaixo:`, `Como isso funciona:`) são vetadas.
- **Código inline muito mais abrangente** — extensões de C/C++ (`cpp`, `hpp`,
  `cc`, `h`), assets (`ttf`, `ogg`, `png`, `jpg`), extensão sozinha (`.cpp`),
  caminhos relativos (`../assets/`), diretórios (`assets/`), constantes
  (`TAM_CELULA`), identificadores (`timeout_ms`), funções
  (`preencher_tabuleiro()`) e comandos com `sudo` (`sudo apt install`).
- **Item na barra de status** com o símbolo ✒️, visível só em Markdown. O
  clique abre o mesmo menu do botão da barra do editor.

### Alterado

- **Dois modos em vez de três.** "Sem IA" e "IA preservando" davam quase o
  mesmo resultado — porque o motor offline era fraco. Agora que ele resolve
  títulos, listas, recuo, rótulos e código, a IA é um refinamento opcional.
  O menu pergunta primeiro se o texto já é Markdown, e só então oferece
  "manter minhas palavras" ou "reconstruir texto solto".
- **`better-mark.format` funciona sem seleção** (formata o arquivo inteiro).

### Corrigido

- **Linha indentada virava título.** A regra de títulos fazia `trim()` antes de
  decidir, então `    so uma linha aqui` virava `# so uma linha aqui`.
- **Bloco indentado convertia pela metade.** A primeira linha de cada grupo
  ficava de fora (a regra olhava só a linha anterior), produzindo uma lista que
  começava no meio — pior que o original.
- **`isHeadingLike` ignorava o recuo**, promovendo trechos de texto colado.

## [0.4.0] — Três modos e menu central

### Adicionado

- **Menu central (`better-mark.menu`)** — um único botão na barra do editor
  abre a escolha entre os três modos, com a descrição do risco de cada um. O
  modo reestruturante pede confirmação em popup.
- **Modo `restructure`** — converte texto solto (copiado de PDF, site ou chat,
  sem formatação nenhuma) em Markdown completo. Reconstrói títulos, listas,
  parágrafos e blocos de código a partir do conteúdo.
- **`validateContentPreserved`** — rede de proteção do modo reestruturante:
  reprova a resposta se termos técnicos (caminhos, comandos, constantes)
  desaparecerem ou se o texto encolher demais (sinal de resumo).
- **Blindagem contra injeção de prompt** — instruções escondidas dentro do
  texto do usuário ("ignore as instruções acima") passam a ser tratadas como
  conteúdo, nunca como comando. Vale nos dois modos de IA.
- **Delimitadores `<texto>`** na mensagem do usuário, no lugar de comentários
  Markdown, que o modelo podia confundir com conteúdo.
- **`ERRO_SEM_TEXTO`** — o modelo sinaliza texto vazio ou ilegível em vez de
  devolver uma resposta inútil.

### Alterado

- **Interface traduzida para inglês** (notificações, erros, menu, tooltips),
  já que a extensão é publicada para uso global. Comentários e documentação
  seguem em português.
- A barra do editor passa a mostrar **um** botão em vez de vários.
- `better-mark.format` agora funciona também **sem seleção** (formata o
  arquivo inteiro), igual aos modos com IA.
- Mensagens de rejeição traduzidas; o motivo técnico fica no console, não na
  tela do usuário.

## [0.3.0] — Dedução de ênfase

### Adicionado

- **Dedução de formatação inline pela IA** — o modelo agora infere negrito,
  itálico e código a partir das pistas do texto (avisos, comandos, caminhos,
  identificadores), como o Claude faria. Antes o prompt o proibia de tocar no
  texto, e ele não marcava nem `npm install`.
- Setting **`betterMark.ai.emphasis`** com três níveis: `deduce` (padrão),
  `safe` e `off`.
- **`compareWords`** — quarta barreira de validação: remove toda a formatação
  dos dois lados e compara palavra por palavra. Se a IA trocar, apagar ou
  acrescentar qualquer palavra (inclusive "corrigir" acento), a resposta é
  descartada e o arquivo não é alterado.
- Detecção de front matter no **meio** do documento (`---`/`+++`), não só na
  primeira linha.
- Sentinelas com tipo e ID (`<!-- BM-PROTECTED 0 | CODE | ... -->`) para que
  blocos protegidos consecutivos não sejam colapsados pelo modelo.

### Corrigido

- **Prosa com formatação inline virava título**: `Vamos usar o **negrito**
  aqui` virava `# Vamos usar o negrito aqui`. A linha crua agora é inspecionada
  antes de remover a formatação.
- Código inline em menções (`.ts`, comandos, caminhos) agora vem **ligado** por
  padrão.
- Comparação de palavras usava lados de unidades diferentes (sentinelas vs.
  conteúdo real), reprovando toda resposta.

## [0.2.0] — Blindagem da IA

### Adicionado

- **`src/ai/shield.ts`** — extrai blocos de código, tabelas, citações e front
  matter antes da IA e os devolve intactos depois. Se o modelo apagar, duplicar
  ou corromper um marcador, a resposta é descartada e o arquivo não é alterado.
- **`src/ai/prompt.ts`** — prompt do sistema reescrito (~5100 caracteres), com
  definição explícita do que é título, regras de lista, regras de preservação
  de quebras de linha e 12 proibições nomeadas (uma por erro já observado).
- **Pré-formatação offline antes da IA** — o motor determinístico roda primeiro,
  de graça, e resolve os casos em que o modelo errava.
- **Validação estrutural** (`compareProtectedStructure`) — segunda barreira
  independente, compara os blocos frágeis antes e depois.
- Suporte ao provedor **River AI** (`api.river.ai/v1`), agora o padrão.
- `scripts/test-ai.mjs` — testa a IA pelo terminal, sem abrir o VS Code.
- `npm run set-api-key` — grava a chave no SecretStorage via automação.

### Corrigido

- A IA transformava `timeout_ms: 30000` em `# \`timeout_ms\`: 30000`.
- A IA destruía blocos de código, tabelas e front matter.
- A IA fundia linhas de parágrafo separadas.
- A IA deixava `2- item` sem normalizar (pior que a regra offline).
- `3] item` e `4} item` não eram reconhecidos como lista e viravam título.
- `16:9 proporcao` e `10:30 reuniao` viravam título.

## [0.1.0] — Níveis 1 e 2

### Adicionado

- **Nível 1 — títulos:** detecção de título com heurísticas de "não é título"
  (continuação de parágrafo, pontuação final, `rótulo: valor`, conectivos de
  frase, excesso de palavras). Nível inferido do documento.
- **Nível 1 — listas:** padronização de `*`, `+`, `1)`, `1-` para `-`/`1.`,
  preservando indentação e normalizando o espaçamento do marcador.
- **Nível 1 — blocos protegidos:** código, front matter, tabelas, HTML e
  citações nunca são alterados.
- **Nível 2A — código inline:** `timeout_ms:` vira `` `timeout_ms`: ``,
  com lista de veto para palavras de prosa (`Baixar:`, `Resultado:`).
- **Nível 2B — IA:** camada `AiProvider` com DeepSeek, Gemini, GLM, Nemotron
  e OpenAI. Inclui timeout, cancelamento, tradução de erros HTTP e validação
  da resposta antes de escrever no documento.
- Comandos `format`, `formatWithAi`, `configureApiKey` e `showStats`.
- Botões na barra do editor, menu de contexto e atalho `Ctrl+Alt+M`.
- API key no SecretStorage do VS Code (criptografado pelo SO).
- `scripts/format-sample.mjs`: roda o motor em um arquivo real sem abrir o VS Code.

### Corrigido

- Nível do título não era inferido (`0` era tratado como valor explícito).
- `-   item` (espaçamento irregular) não era normalizado.
- Regex de menção a arquivo capturava palavras de comando (`run`, `commit`).
- Palavras de prosa em português eram tratadas como identificadores de código.
- Artefatos de build caíam dentro de `src/`, fazendo o vitest executar
  código antigo.

### Alterado

- `src/` reorganizado em `core/` (puro), `ai/` e `vscode/` (cola com o editor).
- Testes migrados para vitest; testes de integração separados em `src/test/`.
- `package.json`: nome de exibição, categoria `Formatters`, settings documentados.

## [0.0.1] — inicial

- Extensão gerada com `yo code`, comando de exemplo e leitura/substituição
  de seleção (features 1–6 do `desc.md`).
