import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * Utilitário de desenvolvimento: grava a API key no SecretStorage do VS Code.
 *
 * Rode com a chave na variável de ambiente — ela NÃO fica no código nem no
 * settings.json:
 *
 *   BETTER_MARK_API_KEY=rv_... npm run set-api-key
 *
 * A chave fica no armazenamento criptografado pelo sistema operacional, que é
 * o mesmo lugar usado pelo comando "Markdownify: Configurar API key".
 */
suite('Markdownify — configurar API key', () => {
	test('grava a chave vinda do ambiente', async function () {
		this.timeout(30000);

		const apiKey = process.env.BETTER_MARK_API_KEY ?? '';
		if (apiKey.length === 0) {
			console.log('BETTER_MARK_API_KEY não definida — nada a fazer.');
			return;
		}

		const extension = vscode.extensions.getExtension('vitor.markdownify');
		assert.ok(extension, 'extensão não encontrada');
		await extension.activate();

		await extension.exports?.setApiKey?.(apiKey);

		// Não usamos o comando aqui de propósito: ele abre um input box, que
		// travaria a execução automatizada.
		const stored = await extension.exports?.getApiKey?.();
		assert.strictEqual(stored, apiKey, 'a chave não foi gravada corretamente');

		const masked = `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
		console.log(`API key gravada no SecretStorage: ${masked} (${apiKey.length} caracteres)`);
	});
});
