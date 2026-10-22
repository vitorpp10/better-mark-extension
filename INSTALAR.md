# Markdownify — como instalar no PC da faculdade ou no laptop

Guia para instalar a extensão em qualquer máquina, sem precisar do código-fonte
e sem configurar nada.

Versão: **0.6.0** · Arquivo: **`markdownify-0.6.0.vsix`** (77 KB)

---

## Opção 1 — Instalar pelo terminal (mais rápido, 30 segundos)

**Pré-requisito:** ter o VS Code instalado **e** o comando `code` disponível no
terminal.

```bash
code --install-extension markdownify-0.6.0.vsix --force
```

Saída esperada:

```
Installing extensions...
Extension 'markdownify-0.6.0.vsix' was successfully installed.
```

**Depois:** feche e abra o VS Code (ou `Ctrl+Shift+P` → `Reload Window`).

---

## Opção 2 — Instalar pela interface (sem terminal)

1. Abra o VS Code
2. `Ctrl+Shift+X` (painel de extensões)
3. Clique nos **`...`** no canto superior direito do painel
4. **Install from VSIX...**
5. Selecione o arquivo `markdownify-0.6.0.vsix`
6. Recarregue a janela: `Ctrl+Shift+P` → `Reload Window`

---

## Como confirmar que instalou

`Ctrl+Shift+P` → digite `Markdownify`

Devem aparecer os comandos:

```
Markdownify: Fix formatting (no AI, instant)
Markdownify: Format with AI (rebuilds everything)
Markdownify: Set API key
Markdownify: Show current configuration
```

---

## Como usar

1. Abra **qualquer arquivo `.md`** (precisa ser Markdown — em `.txt` não aparece)
2. **Selecione o texto** que quer arrumar
3. Clique no **✒️** na barra de status (canto inferior) — ou use o botão
   **"Format… (choose a mode)"** na barra de título do editor
4. Escolha um dos dois modos:

| Modo | Quando usar | Suas palavras |
| --- | --- | --- |
| **Fix formatting** | Limpeza rápida, instantânea, sem internet | Nunca mudam |
| **Format with AI** ⭐ | Qualquer texto — inclusive Markdown quebrado | Podem ser reescritas (pede confirmação) |

**Não precisa criar conta. Não precisa de API key.** A chave fica no servidor.

---

## Teste rápido — cole isto e veja a mágica

Crie um arquivo `teste.md` e cole exatamente assim (com os espaços no começo):

```
    Sistema operacional: Linux (testado).
    Dependencias: SFML. Instale via (por exemplo, sudo apt install libsfml-dev).
    Fonts e assets: a pasta assets/ contem fontes.
    app/jogo.cpp: logica principal.
```

Selecione tudo (`Ctrl+A`), clique no **✒️**, escolha **Format with AI** →
**Continue**.

**Resultado esperado:**

```
- **Sistema operacional:** Linux (testado).
- **Dependencias:** SFML. Instale via (por exemplo, `sudo apt install libsfml-dev`).
- **Fonts e assets:** a pasta `assets/` contem fontes.
- `app/jogo.cpp`: logica principal.
```

---

## Problemas comuns

| Sintoma | Causa | Solução |
| --- | --- | --- |
| **✒️ não aparece** | Arquivo não é `.md`, ou a janela não recarregou | Abra um `.md` e rode `Reload Window` |
| **Pediu API key** | Versão antiga em memória | `Reload Window` — a 0.6.0 não pede |
| **Demora ~50s na primeira vez** | O servidor gratuito hiberna após 15 min | Espere; as próximas são instantâneas |
| **"No text selected"** | Nada estava selecionado | Selecione o texto antes de clicar |
| **"no changes needed"** | O texto já estava formatado | Nada a fazer — está correto |
| **Erro de rede** | Sem internet, ou servidor acordando | Tente de novo em alguns segundos |

---

## O que a extensão faz (e o que não faz)

**Faz:**
- Transforma títulos soltos em `# Título`
- Padroniza listas (`*`, `+`, `1)`, `1-` → `-` e `1.`)
- Desfaz o recuo de 4 espaços que vem de PDF
- Põe `**negrito**` em rótulos `Chave: valor`
- Põe crase em comandos, caminhos, extensões e constantes

**Não toca, nunca:**
- Blocos de código
- Tabelas
- Front matter (`---`)
- HTML
- Citações (`>`)

**Modo com IA — a garantia:** o modelo **nunca vê** os blocos acima (são
substituídos por marcadores e recolocados depois). E antes de escrever no seu
arquivo, a resposta passa por 4 verificações. **Se qualquer uma falhar, nada é
alterado.**

> O pior caso é "a IA não fez nada". Nunca "a IA estragou seu README".

---

## Desinstalar

```bash
code --uninstall-extension vitor.markdownify
```

Ou: `Ctrl+Shift+X` → procure **Markdownify** → **Uninstall**.

---

## Arquivo para levar

Só um arquivo é necessário: **`markdownify-0.6.0.vsix`** (77 KB).

Dá para passar por **pen drive**, **e-mail**, **Google Drive**, **Discord** ou
**WhatsApp** — é pequeno o suficiente para qualquer um deles.

**No PC da faculdade:** copie o `.vsix`, rode o comando da Opção 1 (ou use a
Opção 2), e pronto. **Não precisa de Node, npm, nem do código-fonte.**
