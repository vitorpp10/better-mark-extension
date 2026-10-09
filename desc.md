# Ideia:

Fazer uma extensão que aplica automaticamente semânticas do markdown para facilitar a vida do dev. Mesmo a IA ja fazendo isso o fluxo pode ser maior ja que tem que ter a IA, tokens, as vezes a pessoa nem tem conta, então uma extensão que o dev ja clica e arruma tudo ou a maioria do markdown ja ajuda muito. Criação inspirada justamente para ajudar meu próprio fluxo.

# Estrutura:

```tree
better_mark
    src/
        extension.ts
    package.json
    tsconfig.json
    readme.md
``` 

# Stack: 

typescript
vscode extension api
node.js
npm
git/github
eslint
vitest  

---

# Vscode your first extension

Comando usado para instalar `yo code` e começar a manipulação de extensões via VSCode:

Baixar: `npm install --global yo generator-code`
Executar: `yo code`

Sequência de comandos para debbugar o código da sua extensão:

1. Dentro do `package.json`, verificar se o `engine:` e o `devDependencies:` estão com a versão atual do vscode do ambiente.
2. Entrar em `src/extension.ts` e iniciar a depuração (`F5`/`Ctrl + Shift + P/Debbunging: Start...`).
3. Ver se código da extensão está funcionando com `Ctrl + Shift + P/Hello World!`.

# Feature 1

Fazer o botão do *menu bar* aparecer somente em arquivos `.md`.

REDIJIR OQUE APRENDI DE COMO ADICIONAR UM BOTAO NA MENU BAR AQUI QUANDO VOLTAR

---

Continuar daqui:

Parei nessa etapa

# 6\. Etapa 3 — fazer o botão aparecer somente em Markdown

  

Essa é uma excelente primeira pequena feature.

  

Você quer chegar a:

  

```

arquivo.md

  

┌─────────────────────────────────────────────┐

│ README.md [✨] [...]│

├─────────────────────────────────────────────┤

│ │

│ texto │

│ │

└─────────────────────────────────────────────┘

```

  

Mas:

  

```

arquivo.ts

  

┌─────────────────────────────────────────────┐

│ extension.ts [...] │

├─────────────────────────────────────────────┤

```

  

Sem o botão.

  

Aqui você vai aprender um conceito importantíssimo do VS Code:

  

**when clauses / context keys**.

  

Pesquise:

  

[When clause contexts — VS Code](<https://code.visualstudio.com/api/references/when-clause-contexts?utm_source=chatgpt.com>)

  

Você vai descobrir como fazer algo conceitualmente como:

  

```

quando:

editorLangId == markdown

```

  

Isso vai te ensinar uma coisa que será útil durante toda a extensão:

  

> A UI da extensão é declarativa; a lógica é TypeScript.

  