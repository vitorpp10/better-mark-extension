import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * utilitario de dev: grava a api key no secretstorage do vs code.
 *
 * roda com a chave na variavel de ambiente — ela nao fica no codigo nem no
 * settings.json:
 *
 *   BETTER_MARK_API_KEY=rv_... npm run set-api-key
 *
 * a chave fica no armazenamento criptografado pelo so, o mesmo lugar que o
 * comando "markdownify: set api key" usa.
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

		// nao usamos o comando aqui de proposito: ele abre um input box, que
		// travaria a execucao automatizada.
		const stored = await extension.exports?.getApiKey?.();
		assert.strictEqual(stored, apiKey, 'a chave não foi gravada corretamente');

		const masked = `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
		console.log(`API key gravada no SecretStorage: ${masked} (${apiKey.length} caracteres)`);
	});
});
