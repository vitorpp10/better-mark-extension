# Contribuindo com o Markdownify

Obrigado pelo interesse. Este documento é curto de propósito: ele diz como
rodar o projeto e quais são as regras que mantêm o motor confiável.

## Rodando o projeto

```bash
npm install
npm run compile      # build (tsc → out/)
npm test             # 172 testes unitários (não abre o VS Code)
npm run lint         # eslint
npm run check        # typecheck + lint + testes
```

Para testar dentro do editor: abra o projeto no VS Code e pressione **F5**.
Isso abre o *Extension Development Host*, onde você testa a extensão de
verdade, com o código local.

## A regra que sustenta o projeto

```
src/core/  → NÃO importa `vscode`. Nunca.
```

O motor determinístico é **puro**: entra texto, sai texto. É isso que permite
testar 110 dos 172 testes em milissegundos, sem abrir editor nenhum.

Se você precisa de algo do VS Code dentro de `src/core/`, a resposta quase
sempre é passar o valor como parâmetro, não importar a API. Se realmente
precisar da API, o código pertence a `src/vscode/`.

## Onde fica cada coisa

| Pasta | Responsabilidade |
| --- | --- |
| `src/core/` | Motor de formatação. Puro, sem `vscode`, testado por vitest. |
| `src/ai/` | Provedores de IA, blindagem e as barreiras de validação. |
| `src/vscode/` | A cola com o editor: comandos, configuração, barra de status. |
| `scripts/` | Utilitários de linha de comando (não vão para o `.vsix`). |

## A doutrina de segurança

Se você for mexer em `src/ai/`, leia isto antes:

> **O pior caso é "a IA não fez nada". Nunca "a IA estragou seu README".**

Quando houver dúvida, **rejeite a resposta da IA** e devolva o texto
original. Um usuário que clica e não vê mudança fica confuso por dez
segundos. Um usuário que clica e perde o documento fica com raiva permanente.

A assimetria justifica o conservadorismo. Não relaxe uma barreira para fazer
um teste passar — se uma barreira está reprovando, ou a IA errou, ou a
barreira tem um falso positivo que merece ser investigado.

## Escrevendo código

**Comentários e testes em português. Interface em inglês.** A interface é
para audiência global (a extensão é publicada no Marketplace); o resto é para
quem mantém o código.

Comente o **porquê**, não o **quê**. O código já diz o que faz. O que se
perde com o tempo é a razão de uma decisão — especialmente quando ela parece
estranha (um veto em uma regra, um `if` que parece redundante).

```typescript
// RUIM: incrementa o contador
contador++;

// BOM: conta também para cima porque um bloco indentado pode começar
// no meio: contar só para baixo produzia uma lista começando na 2a linha.
contador++;
```

## Testes

Todo bug corrigido ganha um teste com **o texto exato que o motivou**. Isso
não é formalidade: quase toda regra do motor tem um veto que só existe porque
um caso real quebrou, e o teste é o que impede a regressão.

```bash
npm test                                  # tudo
npx vitest run src/core/__tests__/        # só o motor
npx vitest run -t "diagrama"              # só um caso
```

Testes de IA **não chamam a API real** (o `fetch` é injetado), então rodar a
suíte completa não custa dinheiro. Mantenha assim.

## Commits

Mensagens em português, no imperativo, explicando o **motivo** da mudança.
Este projeto tem um histórico que valoriza o "porquê":

```
niveis 1 e 2: motor offline, IA blindada e proxy

Motor deterministico (Nivel 1 + 2A) que ficou forte o bastante para
resolver quase tudo sozinho:
- recuo de 4 espacos de PDF/site vira lista, com sub-niveis
...
```

## Licença

Ao contribuir, você concorda que sua contribuição é licenciada sob a MIT,
igual ao resto do projeto.
