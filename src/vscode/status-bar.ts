/**
 * Item na barra de status.
 *
 * POR QUE SÓ UM EMOJI: o usuário pediu "tire o texto e no lugar um texto um
 * emoji que combine para ser mais prático". Texto longo na barra de status
 * ocupa espaço, compete com os itens nativos do VS Code e enche a tela de
 * ruído. Um símbolo basta, porque o tooltip explica o resto.
 *
 * O item só aparece em arquivos Markdown — em um arquivo de código ele seria
 * ruído puro, já que a extensão não faz nada ali.
 *
 * O clique abre o mesmo menu do botão da barra do editor, para que o usuário
 * tenha um caminho só.
 */

import * as vscode from 'vscode';

/**
 * Emoji do item. `✒️` (caneta) remete a "escrever/reformatar texto" e tem
 * boa legibilidade em temas claro e escuro — diferente de emojis coloridos,
 * que somem em alguns temas.
 */
const ICON = '✒️';

export function registerStatusBarItem(context: vscode.ExtensionContext): void {
	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	item.command = 'better-mark.menu';
	item.text = ICON;
	item.tooltip = new vscode.MarkdownString(
		[
			'**Paste as Markdown**',
			'',
			'Click to fix the Markdown formatting of this file.',
			'',
			'- Offline: headings, lists, indent, bold labels, inline code',
			'- Optional AI polish on top',
		].join('\n'),
	);

	/** Mostra o item apenas em Markdown. */
	const update = (editor: vscode.TextEditor | undefined): void => {
		if (editor?.document.languageId === 'markdown') {
			item.show();
		} else {
			item.hide();
		}
	};

	update(vscode.window.activeTextEditor);

	context.subscriptions.push(
		item,
		vscode.window.onDidChangeActiveTextEditor(update),
		vscode.workspace.onDidOpenTextDocument(() => update(vscode.window.activeTextEditor)),
	);
}
