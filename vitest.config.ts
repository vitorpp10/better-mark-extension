import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		/*
		 * Só o motor puro e a camada de IA são testados por vitest, porque
		 * eles não importam `vscode`. Os testes que precisam do VS Code de
		 * verdade vivem em `src/test/` e rodam com `npm run test:integration`
		 * (baixam um VS Code e executam dentro dele).
		 */
		include: ['src/{core,ai}/**/__tests__/**/*.test.ts'],
		environment: 'node',
	},
});
