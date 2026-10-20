# better-mark

Extensão de VS Code que aplica **semântica de Markdown** no texto que você já escreveu:
títulos, listas, código inline — e, opcionalmente, uma camada de **IA** para reestruturar
parágrafos que nenhuma regra determinística resolve.

A ideia: você seleciona o texto, clica no botão ✨ e o Markdown fica arrumado.
Sem abrir o ChatGPT, sem gastar tokens, sem colar nada em outro lugar.

---

## Status atual

| Nível | O que é | Estado |
| --- | --- | --- |
| **Nível 1** | Títulos e listas, 100% offline | ✅ completo |
| **Nível 2A** | Código inline determinístico (`` `Termo`: ``, `` `npm install` ``) | ✅ completo |
| **Nível 2B** | Formatação por IA (DeepSeek, Gemini, GLM, Nemotron, OpenAI) | ✅ implementado |
| Fase 4 | Testes, erros, cancelamento, documentação | 🟡 parcial |
| Fase 5 | Publicação no Marketplace | ⬜ não iniciado |

**Vitest:** 172 testes passando · **tsc:** limpo · **eslint:** limpo · **integração:** 4 passando

---

## Como rodar

```bash
npm install          # dependências
npm run compile      # build da extensão (tsc → out/)
npm test             # 172 testes unitários do motor (não precisa abrir o VS Code)
npm run lint         # eslint
npm run check        # typecheck + lint
```

Para testar dentro do VS Code: abra o projeto e pressione **F5**
(abre o *Extension Development Host*). Depois, em um arquivo `.md`:

- clique no ícone **✨** na barra do editor, ou
- `Ctrl+Alt+M`, ou
- `Ctrl+Shift+P` → **Better Mark: Formatar seleção**.

### Testar sem abrir o VS Code

```bash
node ./scripts/format-sample.mjs README.md          # mostra o diff
node ./scripts/format-sample.mjs README.md --write  # grava
node ./scripts/format-sample.mjs README.md --inline # liga as menções a código
```

---

## Comandos

Há **um botão na barra do editor** e **um ✒️ na barra de status**. Os dois
abrem o mesmo menu. A barra de status mostra só o símbolo (o tooltip explica),
para não competir com os itens nativos do VS Code.

| Comando | O que faz |
| --- | --- |
| `better-mark.menu` | **Abre o menu de modos.** É o botão que aparece no editor. |
| `better-mark.format` | Corrige a formatação **sem IA** (Níveis 1 + 2A). Offline. |
| `better-mark.formatWithAi` | Melhora com IA **preservando suas palavras**. |
| `better-mark.restructure` | Reconstrói **texto solto** em Markdown (IA reestrutura). |
| `better-mark.configureApiKey` | Guarda a API key no **SecretStorage** do VS Code. |
| `better-mark.showStats` | Abre um resumo da configuração atual (útil para diagnosticar). |

> **Idioma da interface:** tudo o que o usuário final vê (notificações, erros,
> menu) está em **inglês**, porque a extensão é publicada para uso global.
> Comentários, testes e esta documentação seguem em português.

### Os modos, lado a lado

O menu pergunta primeiro **se seu texto já é Markdown**:

| | Fix formatting (offline) | + AI polish | Rebuild loose text |
| --- | --- | --- | --- |
| **Para que serve** | Qualquer markdown | Qualquer markdown | Texto **sem formato** (PDF, site, chat) |
| **Títulos e listas** | ✅ | ✅ | ✅ |
| **Recuo de PDF** | ✅ | ✅ | ✅ |
| **Rótulos em negrito** | ✅ | ✅ | ✅ |
| **Código inline** | ✅ | ✅ + dedução | ✅ + dedução |
| **Suas palavras** | Nunca mudam | Nunca mudam — **validado** | Podem ser reescritas |
| **Garantia** | Determinística | `compareWords` rejeita se 1 palavra mudar | `validateContentPreserved` |
| **Rede** | Não usa | Usa | Usa |

O modo reestruturante pede **confirmação em popup**, porque é o único que pode
reescrever seu texto.

### O offline resolve quase tudo

Esta é a parte que mais evoluiu. O motor offline começou fraco — só sabia
trocar `* item` por `- item` — e por isso o modo "com IA" parecia
indispensável. Depois de reforçado, ele entrega praticamente o mesmo resultado
de um README real, **de graça e sem risco**:

```
ANTES (texto colado de um PDF):
    Sistema operacional: Linux (testado).
    Dependências: SFML. Instale via (por exemplo, sudo apt install libsfml-dev).
    Fonts e assets: a pasta assets/ contém fontes.
    app/jogo.cpp: lógica principal.

DEPOIS:
- **Sistema operacional:** Linux (testado).
- **Dependências:** SFML. Instale via (por exemplo, `sudo apt install` libsfml-dev).
- **Fonts e assets:** a pasta `assets/` contém fontes.
- `app/jogo.cpp`: lógica principal.
```

Quatro regras fazem isso:

| Regra | O que resolve |
| --- | --- |
| **Recuo** | 4 espaços de PDF viram lista, respeitando sub-níveis (8 espaços) |
| **Títulos** | Linha curta e independente vira `#`, com heurísticas de prosa |
| **Rótulos** | `Chave: valor` → `**Chave:** valor`, dentro de listas também |
| **Código inline** | Comandos, caminhos, extensões, constantes e assets ganham crase |

A IA virou um **refinamento opcional**, não a peça central.

---

## Nível 1 — regras

A parte mais importante do projeto não é a regex: é decidir **o que não deve mudar**.

### Títulos

Vira título:

```
Processo de build     →     # Processo de build
```

**Não** vira título:

```
Este é um parâmetro normal e comprido que explica porque o serviço falhou.
Health check failed because the database is unavailable
Primeira linha do parágrafo
segunda linha do mesmo parágrafo
* item de lista curto
```

As regras aplicadas, em ordem:

1. nunca reescrever linha que já é título (`#`, `##`…);
2. nunca transformar item de lista em título;
3. só a **primeira** linha de um bloco pode virar título (continuação de
   parágrafo não conta);
4. a linha não pode terminar em `. ! ? , ; :`;
5. `rotulo: valor` é prosa, não título;
6. conectivos de frase (*because*, *que*, *porque*, *and*…) desqualificam;
7. mais de 10 palavras desqualifica;
8. proporção e horário (`16:9`, `10:30`) não são título.

O nível do título é **inferido** do documento: se já existe `## Seção`, o novo
título também vira `##`. Dá para forçar com `betterMark.format.headingLevel`.

### Listas

```
* item      →  - item
+ item      →  - item
1) item     →  1. item
1- item     →  1. item
1] item     →  1. item
1} item     →  1. item
-   item    →  - item     (espaçamento irregular)
  * item    →    - item   (indentação preservada)
```

### Blocos protegidos

Estas regiões **nunca** são tocadas: blocos ```` ``` ````, front matter (`---`),
tabelas, HTML e citações (`>`). Reescrever citação é trabalho da IA, não de regex.

---

## Nível 2A — código inline (offline)

Rótulos que parecem código ganham crase:

```
timeout_ms: 30000   →   `timeout_ms`: 30000
GET /users: rota    →   `GET /users`: rota
index.ts: arquivo   →   `index.ts`: arquivo
npm run build: cmd  →   `npm run build`: cmd
```

E palavras de prosa **não** ganham:

```
Baixar: npm install     →   Baixar: npm install      (intacto)
Resultado: markdown     →   Resultado: markdown      (intacto)
```

> Este foi um falso positivo real: a primeira versão marcava `Baixar:` e
> `Conceito:` como código. A lista de palavras de prosa existe por causa disso.

Menções a código no meio da frase (desligado por padrão, por ser mais agressivo):

```
Antes de rodar o projeto você precisa executar npm install.
→ Antes de rodar o projeto você precisa executar `npm install`.
```

Ligue com `betterMark.level2.inlineCodeMentions`.

---

## Nível 2B — IA

### Arquitetura

O provedor fica atrás de uma interface única, para a extensão não virar
"a extensão da River":

```
seleção
   ↓
[1] shieldProtectedBlocks   → tira código/tabela/front matter da vista da IA
   ↓                          e põe sentinelas no lugar
[2] formatMarkdown          → roda Nível 1+2A na prosa (grátis e confiável)
   ↓
[3] AiProvider              → a IA reestrutura só a prosa
   ↓
[4] restoreProtectedBlocks  → devolve os blocos originais intactos
   ↓
[5] validação               → tamanho, recusa, estrutura protegida
   ↓
markdown final (ou NADA, se alguma validação reprovar)
```

Adicionar um provedor novo = implementar `AiProvider` e registrar em
`src/ai/registry.ts`. Nada mais no código precisa saber que ele existe.

### Por que a blindagem existe (e por que o prompt não basta)

No primeiro teste real, o modelo **destruiu** um documento: um bloco ```` ```ts ````
virou `# ts`, uma tabela perdeu os pipes, `2- item` ficou sem normalizar e dois
parágrafos foram fundidos em um. Tudo isso com um prompt que dizia
"preserve blocos de código e tabelas exatamente como estão".

**Modelos desobedecem.** Por isso a defesa principal não é o prompt: é a IA
**nunca ver** o que é frágil. Os blocos viram `<!-- BM-PROTECTED-0 -->`, e se o
modelo apagar, duplicar ou corromper um marcador, **a resposta inteira é
descartada** e o arquivo não é tocado.

Somado a isso, o motor determinístico roda **antes** da IA — então os casos que
o modelo errava (`2- item`) já chegam resolvidos.

O prompt (`src/ai/prompt.ts`, ~7000 caracteres) é a segunda linha de defesa:
define o que é título, o que é lista, quando deduzir ênfase, e traz uma lista
de proibições nomeadas — cada uma correspondendo a um erro já observado.

São **quatro barreiras** independentes:

| # | Barreira | Garante |
| --- | --- | --- |
| 1 | `shieldProtectedBlocks` | A IA não vê código, tabela, front matter ou citação |
| 2 | `restoreProtectedBlocks` | Se um marcador sumir, a resposta é descartada |
| 3 | `compareWords` | A IA não pode mudar nenhuma palavra |
| 4 | `compareProtectedStructure` | O conteúdo frágil sobreviveu, verificado de forma independente |

O pior caso é "a IA não fez nada". Nunca "a IA estragou seu README".

### Dedução de formatação inline

A IA não corrige só estrutura: ela **deduz** formatação a partir das pistas do
texto, como o Claude faria.

```
ANTES:  Primeiro instale as dependencias. Atencao: nunca faca isso em producao.
        O arquivo fica em src/core/formatter.ts e o timeout_ms e 30000.

DEPOIS: Primeiro instale as dependencias. **Atencao**: nunca faca isso em producao.
        O arquivo fica em `src/core/formatter.ts` e o `timeout_ms` e 30000.
```

Três níveis de intensidade em `betterMark.ai.emphasis`:

| Valor | Comportamento |
| --- | --- |
| `deduce` | Deduz negrito, itálico e código a partir das pistas (padrão) |
| `safe` | Só padrões inequívocos |
| `off` | Não acrescenta ênfase; apenas corrige estrutura |

**A garantia que torna isso seguro:** em nenhum modo a IA pode mudar as
palavras. Depois que ela responde, `compareWords` remove toda a formatação dos
dois lados e compara palavra por palavra. Se algo mudou — mesmo uma correção de
acento — **a resposta inteira é descartada** e o arquivo não é tocado.

```
ANTES:  O texto está normal
DEPOIS: O texto está alterado
        → REJEITADO: palavra 3: "normal" → "alterado"

ANTES:  Atencao: algo
DEPOIS: **Atenção**: algo
        → REJEITADO: a IA não pode "corrigir" ortografia
```

Você pode deixar a IA deduzir sem medo de ela reescrever seu texto.

### Funciona sem configurar nada

O provedor padrão é o **`proxy`**: a extensão fala com um servidor do Better
Mark, e a chave da API vive lá. Você instala, abre um Markdown, clica — sem
criar conta, sem gerar chave, sem colar nada.

```
extensão ──► servidor do Better Mark ──► River AI
   ↑                 ↑
sem chave      chave só aqui
```

Por que um servidor: o `.vsix` é um arquivo que qualquer um abre. Uma chave
embutida nele vazaria em dias, e o custo cairia na conta do autor. O servidor
é a única forma de dar "instale e use" sem expor a chave.

O servidor fica em [`better-mark-server`](https://github.com/) — proxy Node
puro, com limite diário por instalação e o prompt montado do lado do servidor
(para que um cliente modificado não possa mandar um prompt caro).

**Quer usar sua própria chave?** Dá também: troque `betterMark.ai.provider`
para `river`, `deepseek`, `openai`, `gemini`, `glm` ou `nemotron` e rode
*Better Mark: Set API key*. O proxy é o padrão, não uma obrigação.

### Configurar a API key (opcional)

**Recomendado** — o comando guarda no SecretStorage do VS Code, que é
criptografado pelo sistema operacional:

```
Ctrl+Shift+P → Better Mark: Configurar API key
```

Alternativa (menos segura, fica em texto puro no `settings.json`):

```jsonc
{
  "betterMark.ai.provider": "deepseek",
  "betterMark.ai.model": "deepseek-chat",
  "betterMark.ai.apiKey": "sua-chave"
}
```

A chave **nunca** fica no código-fonte.

### Provedores suportados

| `betterMark.ai.provider` | Endpoint | Modelo padrão |
| --- | --- | --- |
| `river` | `api.river.ai/v1` | `deepseek-ai/DeepSeek-V4.1-Flash` |
| `deepseek` | `api.deepseek.com/v1` | `deepseek-chat` |
| `gemini` | `generativelanguage.googleapis.com` | `gemini-2.0-flash` |
| `glm` | `open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| `nemotron` | `integrate.api.nvidia.com/v1` | `nvidia/llama-3.3-nemotron-super-49b-v1` |
| `openai` | `api.openai.com/v1` | `gpt-4o-mini` |

`betterMark.ai.baseUrl` permite apontar para um proxy ou gateway próprio.

### Segurança da resposta

Antes de escrever no documento, a resposta passa por `validateAiResult`:

- resposta vazia → rejeitada;
- menos de 50% do tamanho original → rejeitada (*a IA apagou conteúdo*);
- mais de 250% → rejeitada (*a IA inventou conteúdo*);
- começa com "Desculpe, não posso…" → rejeitada.

Se a validação reprovar, **o arquivo não é alterado** e você vê o motivo.
Um formatador que destrói o README é pior do que um que falha.

---

## Configuração

| Setting | Padrão | Descrição |
| --- | --- | --- |
| `betterMark.format.headingLevel` | `0` | Nível do título. `0` = inferir do documento. |
| `betterMark.format.protectBlocks` | `true` | Preservar código, tabelas, front matter, HTML, citações. |
| `betterMark.level2.inlineCodeTerms` | `true` | `` `Termo`: `` nos rótulos de código. |
| `betterMark.level2.inlineCodeMentions` | `true` | Crase em arquivos, caminhos e comandos citados. |
| `betterMark.ai.provider` | `deepseek` | Provedor de IA. |
| `betterMark.ai.model` | `""` | Modelo. Vazio = padrão do provedor. |
| `betterMark.ai.apiKey` | `""` | Prefira o comando de configuração. |
| `betterMark.ai.baseUrl` | `""` | Endpoint alternativo. |
| `betterMark.ai.timeoutMs` | `30000` | Timeout da chamada (5 s–120 s). |
| `betterMark.ai.emphasis` | `deduce` | `deduce` / `safe` / `off` — quanta ênfase a IA pode inferir. |
| `betterMark.ai.instructions` | `""` | Instruções extras para a IA. |

---

## Estrutura do projeto

```
src/
├── extension.ts              ponto de entrada: só registra comandos
├── core/                     MOTOR PURO — não importa `vscode`, testável por CLI
│   ├── formatter.ts          pipeline (scan → rules → join)
│   ├── scanner.ts            marca blocos protegidos
│   ├── text.ts               utilidades de texto
│   ├── types.ts              tipos compartilhados
│   ├── rules/
│   │   ├── headings.ts       Nível 1 — o que é título de verdade
│   │   ├── lists.ts          Nível 1 — padronização de listas
│   │   └── inline-code.ts    Nível 2A — código inline
│   └── __tests__/
├── ai/                       Nível 2B — provedores atrás de uma interface
│   ├── provider.ts           interface, erros, stripCodeFence
│   ├── prompt.ts             prompt do sistema (longo, com proibições)
│   ├── shield.ts             blindagem de blocos frágeis + validação
│   ├── formatter.ts          orquestra: blindar → offline → IA → validar
│   ├── registry.ts           ponto único de resolução de provedor
│   ├── openai-compatible.ts  DeepSeek, GLM, Nemotron, OpenAI
│   ├── gemini.ts             dialeto próprio do Gemini
│   └── __tests__/
├── vscode/                   cola com o editor
│   ├── commands.ts           comandos e mensagens de erro
│   └── config.ts             leitura de settings + SecretStorage
└── test/                     testes de integração (rodam dentro do VS Code)
```

A separação `core` (puro) / `vscode` (impuro) é o que permite testar as regras
com `npm test` sem abrir o VS Code.

---

## Testes

```bash
npm test                  # unitários (vitest) — motor + camada de IA
npm run test:integration  # integração (baixa um VS Code e roda dentro dele)
```

Os testes de integração precisam de display. Em servidor/CI sem tela, use `xvfb-run`.

---

## Roadmap

- [x] Fase 0 — extensão mínima, comando, botão no `editor/title`
- [x] Fase 1 — Nível 1: título, listas, testes, README real
- [x] Fase 2 — Nível 2A: código inline determinístico
- [x] Fase 3 — IA: provider, configuração de chave, timeout, validação
- [ ] Fase 4 — GIF de demonstração, cobertura, mensagens de erro afinadas
- [ ] Fase 5 — `.vsix` e publicação no Marketplace

## Não-objetivos (por enquanto)

Nível 3, backend, pagamento, licenciamento, analytics e otimização para o
Marketplace. O problema agora não é monetização: é provar que a ferramenta
funciona e que alguém quer usá-la.

## Licença

MIT
