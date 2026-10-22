# Markdownify

**Turn messy text into clean Markdown in one click.**

You already wrote the text. It just doesn't look like Markdown yet — headings that
aren't headings, lists without markers, `timeout_ms` without backticks.

Select it, click ✨, done. No ChatGPT tab, no account, no API key.

Built for people who write a lot of READMEs, notes and docs — and lose minutes
every time fixing formatting by hand.

---

## Before / After

| You paste this | You get this |
| --- | --- |
| `Processo de build` on its own line | `# Processo de build` |
| `* item` / `1) item` | `- item` / `1. item` |
| 4 spaces of PDF indent | A proper nested list |
| `Dependências: SFML` | `**Dependências:** SFML` |
| `O timeout_ms é 30000` | O `` `timeout_ms` `` é 30000 |

Real example, text copied from a PDF:

```
ANTES
    Sistema operacional: Linux (testado).
    Dependências: SFML. Instale via (por exemplo, sudo apt install libsfml-dev).
    app/jogo.cpp: lógica principal.
```

```
DEPOIS
- **Sistema operacional:** Linux (testado).
- **Dependências:** SFML. Instale via (por exemplo, `sudo apt install` libsfml-dev).
- `app/jogo.cpp`: lógica principal.
```

---

## How it works

Click the **✨** button in the editor title bar (or `Ctrl+Alt+M`) and pick a mode:

| Mode | For | Your words |
| --- | --- | --- |
| **Fix formatting** (offline) | Quick cleanup. Instant, no network | Never touched |
| **Format with AI** ⭐ | Anything, including broken Markdown | Can be reworded (asks first) |

**The offline engine runs first, always.** Headings, lists, indentation, bold
labels and inline code are handled by rules — free, instant, offline. AI is a
refinement on top, not the core.

**Nothing to configure.** The default provider is a built-in proxy: the API key
lives on our server, never in the `.vsix`. Install, click, done.

> Want your own key? Set `betterMark.ai.provider` to `deepseek`, `gemini`,
> `openai`, `glm` or `nemotron` and run **Markdownify: Set API key**.
> It goes to VS Code's SecretStorage, encrypted by your OS.

---

## Why you can trust it with your README

The AI **never sees** your code blocks, tables, front matter or blockquotes.
They're replaced by markers before the request and restored after. If the model
mangles a single marker, the whole answer is thrown away.

On top of that, four independent barriers run before anything is written:

| # | Barrier | Guarantees |
| --- | --- | --- |
| 1 | Shield | The AI never sees fragile content |
| 2 | Restore | A missing marker discards the whole answer |
| 3 | `compareWords` | Not a single word may change |
| 4 | `compareProtectedStructure` | Code and tables survived, checked separately |

> **The worst case is "the AI did nothing". Never "the AI wrecked your README".**

This isn't theoretical. On the first real test, a model turned a ```` ```ts ````
block into `# ts` and dropped the pipes from a table — with a prompt that
explicitly said not to. Models disobey. So the defense isn't the prompt: it's
the AI never receiving what's fragile.

Try it: ask the AI to "fix" `O texto está normal` into `O texto está alterado`.
It gets rejected, and nothing changes.

---

## What gets cleaned up

**Headings** — a short standalone line becomes a heading. Prose doesn't:

```
Processo de build                                    →  # Processo de build
Este é um parâmetro que explica porque falhou.       →  (unchanged)
```

**Lists** — `*`, `+`, `1)`, `1-`, `1]`, irregular spacing, PDF indent.

**Bold labels** — `Chave: valor` → `**Chave:** valor`, inside lists too.

**Inline code** — commands, paths, extensions and constants get backticks.
Prose words don't (`Baixar:` stays `Baixar:`).

**Left alone, always** — code blocks, tables, front matter, HTML, blockquotes.

---

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `betterMark.format.headingLevel` | `0` | Heading level. `0` = infer from the document. |
| `betterMark.format.protectBlocks` | `true` | Preserve code, tables, front matter. |
| `betterMark.level2.inlineCodeTerms` | `true` | Backticks on `` `Termo`: `` labels. |
| `betterMark.level2.inlineCodeMentions` | `true` | Backticks on files, paths and commands. |
| `betterMark.ai.provider` | `proxy` | AI provider. Works out of the box. |
| `betterMark.ai.emphasis` | `deduce` | `deduce` / `safe` / `off`. |
| `betterMark.ai.timeoutMs` | `30000` | Request timeout. |

---

## Requirements

VS Code 1.90.0 or later. No account, no API key, no configuration.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

The one rule that matters: `src/core/` **never** imports `vscode`, so the whole
formatting engine is testable without opening the editor.

---

## License

[MIT](LICENSE)
