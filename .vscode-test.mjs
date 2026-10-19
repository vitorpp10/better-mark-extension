import { defineConfig } from '@vscode/test-cli';

/**
 * Config do runner de integração: roda dentro de um VS Code de verdade.
 *
 * `scripts/set-api-key.mjs` usa um arquivo separado
 * (`.vscode-test.setkey.mjs`) para gravar a API key sem executar o resto.
 */
export default defineConfig({
	files: 'out/test/**/*.test.js',
});
