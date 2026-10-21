# Dev diary — how I built this extension

> This is my personal build log, written while I was learning. I kept the original
> Portuguese version in [`desc.pt-br.md`](desc.pt-br.md) exactly as I wrote it — this
> is the English translation of the same text.
>
> It is not documentation. It's the record of the process: what I tried, what broke,
> and what I learned by breaking it.

---

# Idea:

Build an extension that automatically applies Markdown semantics, to make a dev's
life easier. Even though AI already does this, the flow can be longer since you
need AI, tokens, and sometimes the person doesn't even have an account. So an
extension where the dev just clicks and fixes all — or most — of the Markdown
already helps a lot. Created precisely to help my own workflow.

# Structure:

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

# VS Code your first extension

Command used to install `yo code` and start working with extensions in VS Code:

Download: `npm install --global yo generator-code`
Run: `yo code`

Command sequence to debug your extension code:

1. Inside `package.json`, check that `engine:` and `devDependencies:` match the
   current VS Code version in your environment.
2. Open `src/extension.ts` and start debugging (`F5` / `Ctrl + Shift + P` /
   `Debugging: Start...`).
3. Check the extension code is working with `Ctrl + Shift + P` / `Hello World!`.

# Feature 1: Create and show a button in the menu

Step by step to make the *menu bar* button appear only in `.md` files.

*package.json*:

Add a command to create the button, its name, icon, then add it to the
`editor/title` area, which is the *menu bar*. We create the command name, which
group it belongs to, and the condition for it to work — in this case
`editorLangId == markdown`, meaning it should only appear when the open file in
the IDE is a `.md`.

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

Here we basically create a variable that registers the button command and
associates it through a *lambda*. When the button is clicked, that *lambda* runs
and shows a success message on screen. Finally, we push that registration into
`context.subscriptions` so VS Code knows it should clear that command from memory
and free the resources when the extension is deactivated or closed.

```ts
// Imports here...

export function activate(context: vscode.ExtesionContext) {
    // Other commands/initials here...

    const command_button = vscode.commands.registerCommand('better-mark.button', () => {
        vscode.window.showInformationMessage('SUCCESS TO USE BUTTON');
    });

    context.subscriptions.push(command_button);

    // ...
}
```

# Feature 2: Text selection

In this feature we build the user's text selection logic over the editor/file, so
we can capture exactly what the user wants to select and apply the changes to
their file.

The first thing is to create variables to hold the currently open edit window
(`editor`), another to hold the selection the user makes over that edit window —
that is, the `range` (*area*) of the selected text (`user_selection`) — and the
last variable to grab the text inside the area the user marked and turn it into a
`string` for manipulation (`text_selected`).

We also use conditionals in case there is no edit window (*file*) open at the
moment, or when the size of the area marked by the user is 0.

```ts
// Imports here...

export function activate(context: vscode.ExtesionContext) {
    // Other commands/initials here...

    const command_button = vscode.commands.registerCommand('better-mark.button', () => {
        // Holds the current edit window
        const editor = vscode.window.activeTextEditor;
        // If no file is open...
        if(!editor) {
            // We return an error and stop
            vscode.window.showInformationMessage('No active text editor found.');
            return;
        }
        // Selection variables and the text itself
        const user_selection = editor.selection;
        const text_selected = editor.document.getText(user_selection);
        // If the user selected nothing, we just return an error message and stop
        if(text_selected.length === 0) {
            vscode.window.showInformationMessage('No text selected.');
            return;
        }
    });

    context.subscriptions.push(command_button);

    // ...
}
```

# Feature 3: Replacing the selected text

The goal of this step is to replace the selected text through Feature 2. First we
capture the text fragment highlighted by the user at run time and convert it to
uppercase (ALL CAPS) as a validation test.

The first step is to use the `editor.edit` method, assigning it to a matching
variable. This command lets you manipulate the selected text in several ways, such
as `replace`, `insert` and `delete`. In this specific case we apply `replace` to
overwrite the current content with its uppercase equivalent, confirming the logic
works. After that we handle the results based on the data the command returns.

```ts
// Imports here...

export function activate(context: vscode.ExtesionContext) {
    // Other commands/initials here...

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

        // /=====/ NEW PART HERE /======/

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

        // /=====/ END OF NEW PART HERE /======/

	});
	context.subscriptions.push(command_button);

    // ...
}
```

# Feature 4: Formatting text

In this *feature* we add the first real rules that a title must have to receive a
`#` in Markdown. So we basically create a function that receives the text selected
by the *user* and returns it formatted as a title if needed.

Our function receives a `string` referring to the text selected by the *user* and
then creates 3 variables that will be the "rules" that text must have to become a
title. They are:

1. Length shorter than 80
2. No line breaks
3. Does not end with a period (a title has no period, after all)
4. Not an empty line (`length === 0`)

If it passes the conditions it becomes a title (`# ${result}`).

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

# Feature 5: Multi-line pipeline

Now we "improve" what we did in *feature 4* — that is, we add title insertion for
when the *user* selects multiple lines, so title formatting works for more than
one line.

Inside this new function (`formatMarkdown`) we split the text selected by the
*user* and separate the indexes based on line breaks (`\n`). So when there are
line breaks it splits by index and we can analyze more than one block of text at
the same time. Besides that, this new function will be the main function that
calls all the others.

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

# Feature 6: Unordered and ordered lists

Turning unordered and ordered lists into *markdown* format, because when the
*user* types consecutive lines that have special characters or numbers
sequentially or separately followed by text, it probably means they plan a list
there.

We create the `formatToList` function. In it we check whether the start of the
text begins with `*, +, 1), 1.` and then turn it into a list format according to
*markdown*.

Also, if the *user* makes an indented list, to avoid breaking their indentation we
reserve a variable that holds that spacing and restore it after the actual change.

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

`default_regex`: holds the expression for ordered list formats, so if the start of
the text follows the pattern of a list it goes into the ordered substitution;

`^` = start of line and `\s*` = zero or more spaces/tabs. The `.match()` method
returns an array with what it found. `leading_spaces` holds the indentation
counting from what `.match()` found.

---

# Implementation status

> Section added after the reorganization. The text above is still the record of
> the learning process (features 1–6) and was not rewritten.

## What's done

| Level | Scope | Status |
| --- | --- | --- |
| Level 1 | headings + lists, offline | complete |
| Level 2A | deterministic inline code | complete |
| Level 2B | AI (DeepSeek, Gemini, GLM, Nemotron, OpenAI) | implemented |
| Phase 4 | tests, errors, cancellation | partial |
| Phase 5 | publishing to the Marketplace | not started |

## Architecture change compared to the original plan

`desc.md` planned everything inside `src/extension.ts`. Once Level 2 came in, that
became too large a file to test and to explain. The current separation:

    src/core/    pure engine — does NOT import `vscode`, runs on vitest
    src/ai/      providers behind the `AiProvider` interface
    src/vscode/  glue with the editor (commands, settings, errors)

The concrete gain: 86 tests run in under 1 second, without opening VS Code.

## Rules that changed compared to features 4–6

The `formatToTitle`/`formatToList` functions from the plan had real false
positives, discovered by running the engine against `desc.md` and `README.md`
themselves:

| Input | Old behavior | Current behavior |
| --- | --- | --- |
| `Health check failed because the database is unavailable` | became `#` | untouched (connective + word count) |
| `Este é um parâmetro normal e comprido...` | became `#` | untouched (prose) |
| `Baixar: npm install` | would become `` `Baixar`: `` | untouched (prose word) |
| `segunda linha do parágrafo` | could become `#` | untouched (continuation) |
| ```` ``` ```` code block | was formatted | protected |
| table, front matter, quote | were formatted | protected |
| existing `## Seção` | new title became `#` | becomes `##` (infers the level) |

The rule that ended up mattering most isn't the regex: it's the list of **what
must not change**. A formatter that wrecks the user's README is worse than one
that does nothing.

## Suggested next steps

1. Run `npm test` and `npm run test:integration` (the latter needs a display).
2. Test the ✨ button with F5 on a real README and look at the diff calmly.
3. Configure the API key through the command and test Level 2B on messy text.
4. Record a short GIF of the extension working (Phase 4).
5. Only then study `.vsix` and publishing (Phase 5).
