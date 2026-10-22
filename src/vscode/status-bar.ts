/**
 * item na barra de status.
 *
 * porque so emoji: texto longo na barra ocupa espaco, briga com os itens
 * nativos do vs code e enche a tela de ruido. um simbolo basta, o tooltip
 * explica o resto.
 *
 * so aparece em arquivo markdown — em arquivo de codigo seria ruido puro,
 * ja que a extensao nao faz nada ali.
 *
 * o clique abre o mesmo menu do botao da barra do editor, pra ter um
 * caminho so.
 */

import * as vscode from 'vscode';

/**
 * emoji do item. `✒️` (caneta) lembra "escrever/reformatar texto" e le bem
 * em tema claro e escuro — diferente de emoji colorido, que some em alguns
 * temas.
 */
const ICON = '✒️';

export function registerStatusBarItem(context: vscode.ExtensionContext): void {
	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	item.command = 'better-mark.menu';
	item.text = ICON;
	item.tooltip = new vscode.MarkdownString(
		[
			'**Markdownify**',
			'',
			'Click to fix the Markdown formatting of this file.',
			'',
			'- Offline: headings, lists, indent, bold labels, inline code',
			'- Optional AI polish on top',
		].join('\n'),
	);

	/** so mostra o item em markdown. */
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
