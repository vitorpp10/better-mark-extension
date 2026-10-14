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

# Feature 1: Criar e visualizar botão no menu

Passo a passo para fazer o botão do *menu bar* aparecer somente em arquivos `.md`.

*package.json*: 

Adicionar comando para criar botão, nome, ícone, depois vamos adicionar ele na área `editor/title` que seria o *menu bar*. Vamos criar nome do comado, a qual grupo pertence e condição para ele funcionar, nesse caso `editorLangId == markdown` quer dizer que ele so deve aparecer quando o arquivo que estiver aberto na IDE for do tipo `.md`.

```json
/* ... */
"commands": [
    {
        "command": "better-mark.button",
        "title": "Button",
        "icon": "$(wand)"
    }
],
"menus": [
    {
        "command": "better-mark.button",
        "group": "navigation",
        "when": "editorLangId == markdown"
    }
]
/* ... */
``` 

*extension.ts*: 

Aqui basicamente, criamos uma variável que registra o comando do botão e se associa a ele por meio de um *lambda*. Quando o botão é clicado, esse *lambda* é executado e exibe a mensagem de sucesso na tela. Por fim, colocamos esse registro dentro do `context.subscriptions`para que o VS Code saiba que deve limpar esse comando da memória e liberar os recursos quando a extensão for desativada ou fechada.

```ts
// Importações aqui...

export function activate(context: vscode.ExtesionContext) {
    // Outros comandos/iniciais aqui...

    const command_button = vscode.commands.registerCommand('better-mark.button', () => {
        vscode.window.showInformationMessage('SUCCESS TO USE BUTTON');
    });

    context.subscriptions.push(command_button);

    // ...
}
``` 

# Feature 2: Seleção de texto

Nessa feature vamos fazer a lógica de seleção de texto do usuário sobre o editor/arquivo, dessa forma conseguimos capturar exatamente oque o usuário quer selecionar para aplicar as mudanças em seu arquivo. 

Primeira coisa que temos que fazer é criar variáveis para guardar a janela de edição aberta atualmente (`editor`), outra para guardar a seleção que ele fizer sobre essa janela de edição, ou seja, o `range` (*área*) do texto selecionado (`user_selection`) e a última variável seria para pegar o texto que está nessa área que o usuário demarcou e transformar em `string` para manipulação (`text_selected`).

Também vamos usar estruturas de condições para caso não tenha nenhum janela de edição (*arquivo*) aberto no momento ou quando o tamanho da área demarcada pelo usuário for igual a 0.

```ts
// Importações aqui...

export function activate(context: vscode.ExtesionContext) {
    // Outros comandos/iniciais aqui...

    const command_button = vscode.commands.registerCommand('better-mark.button', () => {
        // Guarda janela de edição atual
        const editor = vscode.window.activeTextEditor;
        // Se não tiver nenhum arquivo aberto...
        if(!editor) {
            // Retornamos erro e encerramos
            vscode.window.showInformationMessage('No active text editor found.');
            return;
        }
        // Variáveis de seleção de texto e texto em si
        const user_selection = editor.selection;
        const text_selected = editor.document.getText(user_selection);
        // Se o usuário não selecionou nada então apenas retornamos uma mensagem de erro avisando e encerramos
        if(text_selected.length === 0) {
            vscode.window.showInformationMessage('No text selected.');
            return;
        }
    });

    context.subscriptions.push(command_button);

    // ...
}
``` 

# Feature 3: Substituição de Texto Selecionado

O objetivo desta etapa é substituir o texto selecionado por meio da Feature 2. Inicialmente, capturaremos o fragmento de texto destacado pelo usuário no momento da execução e o converteremos para caixa alta (TUDO MAIÚSCULO) para fins de teste de validação.

O primeiro passo consiste em utilizar o método `editor.edit`, atribuindo-o a uma variável correspondente. Este comando permite manipular o texto selecionado de diversas formas, tais como `replace` (substituir), `insert` (inserir) e `delete` (excluir). Neste cenário específico, aplicaremos o `replace` para sobrescrever o conteúdo atual pelo equivalente em maiúsculas, confirmando a eficácia da lógica. Posteriormente, manipularemos os resultados com base nos dados retornados pelo comando.

```ts
// Importações aqui...

export function activate(context: vscode.ExtesionContext) {
    // Outros comandos/iniciais aqui...

        const command_button = vscode.commands.registerCommand('better-mark.button', () => {
		const editor = vscode.window.activeTextEditor;
		if(!editor) {
			vscode.window.showErrorMessage('No active text editor found.');
			return;
		}
		const user_selection = editor.selection;
		const text_selected = editor.document.getText(user_selection);
		if(text_selected.length === 0) {
			vscode.window.showErrorMessage('No text selected.');
			return;
		} 

        // /=====/ PARTE NOVA AQUI /======/ 
        
        editor.edit((editBuilder) => {
            const new_text_selected: string = text_selected.toUpperCase();
            editBuilder.replace(user_selection, new_text_selected);
        }).then(success => {
            if(success) {
                vscode.window.showInformationMessage('Modified changes.');
            } else {
                vscode.window.showErrorMessage('Error modifying changes.');
            }
        });

        // /=====/ FIM DA PARTE NOVA AQUI /======/

	});
	context.subscriptions.push(command_button);

    // ...
}
``` 

# Feature 4: Formatar Texto

Nessa *feature* vamos colocar regras iniciais reais que um título tem que ter para receber um `#` em markdown. Então, basicamente vamos criar uma função que recebe o texto selecionado pelo *user* e retorna ele formatado para título caso seja necessário.

Nossa função vai receber uma `string` referente ao texto selecionado pelo `user`e depois vai criar 3 variáveis que vão ser as "regras" que aquele texto tem que ter para virar um título. São elas:

1. Tamanho menor que 80
2. Não possuir quebra de linha
3. Não terminar com ponto final (afinal um título não tem ponto final)
4. Não ser uma linha vazia (`length === 0`)

Se passar pelas condições ele vira um título (`# ${result}`).

```ts
function formatToTitle(text: string): string { 
    let result = text.trim();
    const is_short = result.length < 80;
    const has_no_line_breaks = !result.includes('\n');
    const does_not_end_with_period = !result.endsWith('.');
    const nothing = result.length !== 0;
    if(is_short && has_no_line_breaks && does_not_end_with_period && nothing) {
        result = `# ${result}`;
    }
    return result;
} 
```

# Feature 5: Pipeline de Múltiplas Linhas

Agora vamos "melhorar" oque fizemos na *feature 4*, ou seja, vamos fazer a inserção de títulos para quando o *user* selecionar várias linhas, assim a formatação de título vai funcionr para mais de uma linha.

Dentro dessa função nova (`formatMarkdown`) vamos dividir o texto selecionado pelo *user* e separar os índices com base em quebra de linha (`\n`). Assim, quando tiver quebras de linhas ele separa por índice e conseguimos analisar mais de um bloco de texto ao mesmo tempo. Além disso essa função nova será a função principal que vai chamar todas.

```ts
function formatToMarkdown(text: string): string {
    const lines = text.split('\n');
    const new_lines = [];
    for(let i = 0; i < lines.length; i++) {
        let current_line = lines[i];
        current_line = formatTitle(current_line);
        new_lines.push(current_line);
    }
    return new_lines.join('\n');
}
``` 

# Feature 6: Listas Não-Ordenadas e Ordenadas

Transformar listas não-ordernadas e ordenadas em formato *markdown*, pois desse modo quando o *user* digitar linhas seguidas que possuem caracteres especiais ou números de forma sequencial ou separada e seguida de texto, quer dizer provalvemente que ele planeja uma lista ali.

Vamos criar a função `formatToList`. Nessa função vamos checar se o inicio do texto começa com `*, +, 1), 1.` e depois transformar em formato de lista de acordo com *markdown*.

Além disso caso o *user* faça uma lista com tabulação, para nõa quebrar sua tabulação vamos reserva uma variável que vai guardar esse espaçamento e depois da mudança realocá-lo novamente.

```ts
function formatToList(text: string): string {
    let result = text.trim();
    const default_regex = /^(\d+)[.)]\s+/;
	const match = text.match(/^\s*/);
	const leading_spaces = match ? match[0] : "";
    if(result.startsWith("* ") || result.startsWith("+ ")) {
		const new_text = result.replace(/^[*+]/, "-");
		return leading_spaces + new_text;
	}
	if(default_regex.test(result)) {
		const new_text = result.replace(default_regex, "$1. ");
		return leading_spaces + new_text;
	}
	return text;
}
``` 

`default_regex`: Guarda expressão para formatos de lista ordenada, assim se o inicio do texto seguir o padrão de uma lista ele entra na substituição da ordenada;

`^` = início da linha e `\s*` = ero ou mais espaços/tabs. O método `.match()` retorna um array com o que encontrou. `leading_spaces` guarda as tabulações contando a partir do que o `.match()` encontrou.
