import { defineConfig } from '@vscode/test-cli';

/**
 * Config separada, usada APENAS para gravar a API key no SecretStorage.
 *
 *   BETTER_MARK_API_KEY=rv_... npm run set-api-key
 *
 * Só o arquivo de configuração de chave é executado — os demais testes de
 * integração não rodam aqui.
 */
export default defineConfig({
	files: 'out/test/set-api-key.test.js',
});
