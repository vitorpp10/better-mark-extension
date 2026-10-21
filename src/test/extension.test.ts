import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * Testes de INTEGRAÇÃO: rodam dentro de um VS Code de verdade.
 *
 *   npm run test:integration
 *
 * Aqui testamos o que o vitest não alcança: registro de comandos e a
 * escrita real no documento do editor.
 */
suite('Markdownify — integração', () => {
	test('a extensão está ativa e registrou os comandos', async () => {
		const extension = vscode.extensions.getExtension('vitor.markdownify');
		assert.ok(extension, 'extensão não encontrada');

		await extension.activate();

		const commands = await vscode.commands.getCommands(true);
		for (const id of [
			'better-mark.menu',
			'better-mark.format',
			'better-mark.formatWithAi',
			'better-mark.restructure',
			'better-mark.configureApiKey',
			'better-mark.showStats',
		]) {
			assert.ok(commands.includes(id), `comando ausente: ${id}`);
		}
	});

	test('formata a seleção de um documento Markdown', async () => {
		const document = await vscode.workspace.openTextDocument({
			content: ['* item um', '+ item dois', '1) item três'].join('\n'),
			language: 'markdown',
		});
		const editor = await vscode.window.showTextDocument(document);

		// Seleciona tudo para que o comando tenha alvo.
		const fullRange = new vscode.Range(
			document.positionAt(0),
			document.positionAt(document.getText().length),
		);
		editor.selection = new vscode.Selection(fullRange.start, fullRange.end);

		await vscode.commands.executeCommand('better-mark.format');

		assert.strictEqual(document.getText(), ['- item um', '- item dois', '1. item três'].join('\n'));
	});

	test('não estraga bloco de código', async () => {
		const original = ['```ts', '+ nao sou lista', '```'].join('\n');
		const document = await vscode.workspace.openTextDocument({ content: original, language: 'markdown' });
		const editor = await vscode.window.showTextDocument(document);

		const fullRange = new vscode.Range(
			document.positionAt(0),
			document.positionAt(document.getText().length),
		);
		editor.selection = new vscode.Selection(fullRange.start, fullRange.end);

		await vscode.commands.executeCommand('better-mark.format');

		assert.strictEqual(document.getText(), original);
	});
});
