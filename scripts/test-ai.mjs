#!/usr/bin/env node
/**
 * Testa a IA (Nível 2B) pelo terminal, sem abrir o VS Code.
 *
 *   export RIVER_API_KEY=rv_...
 *   node ./scripts/test-ai.mjs                 # texto de exemplo
 *   node ./scripts/test-ai.mjs teste-manual.md # arquivo
 *
 * A chave vem de variável de ambiente, nunca do código.
 */

import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const PROVIDER = process.env.BETTER_MARK_PROVIDER ?? 'river';
const MODEL = process.env.BETTER_MARK_MODEL ?? '';
const BASE_URL = process.env.BETTER_MARK_BASE_URL ?? '';

const KEY_ENV = {
	river: 'RIVER_API_KEY', deepseek: 'DEEPSEEK_API_KEY', gemini: 'GEMINI_API_KEY',
	glm: 'GLM_API_KEY', nemotron: 'NVIDIA_API_KEY', openai: 'OPENAI_API_KEY',
};

const apiKey = process.env[KEY_ENV[PROVIDER] ?? 'RIVER_API_KEY'] ?? '';
if (!apiKey) {
	console.error(`defina ${KEY_ENV[PROVIDER] ?? 'RIVER_API_KEY'} antes de rodar.`);
	process.exit(1);
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { AiFormatter } = await server.ssrLoadModule('/src/ai/formatter.ts');
const { getProvider } = await server.ssrLoadModule('/src/ai/registry.ts');

const provider = getProvider(PROVIDER);
const model = MODEL || provider.defaultModel;

const SAMPLE = [
	'## Como usar', '',
	'Primeiro instale as dependencias e depois rode o projeto local.', '',
	'Configuracao da API', '',
	'timeout_ms: 30000', 'MAX_RETRIES: 3', '',
	'* clonar o repositorio', '+ instalar as dependencias', '1) rodar o build', '2- abrir o navegador',
].join('\n');

const args = process.argv.slice(2);
const text = args.length > 0 ? await readFile(args[0], 'utf8') : SAMPLE;

console.log(`provedor: ${provider.id} | modelo: ${model} | modo: ${process.env.BM_MODE || 'preserve'}`);
console.log(`entrada:  ${text.length} caracteres\n`);

const ai = new AiFormatter((m) => console.log(`  [log] ${m}`));

const started = Date.now();
let report;
try {
	const mode = process.env.BM_MODE === 'restructure' ? 'restructure' : 'preserve';
	report = await ai.format(text, {
		providerId: PROVIDER,
		model,
		apiKey,
		timeoutMs: 90000,
		mode,
		emphasis: process.env.BM_EMPHASIS || 'deduce',
	});
} catch (error) {
	console.error(`\nFALHOU: [${error.kind ?? 'erro'}] ${error.message}`);
	await server.close();
	process.exit(1);
}

console.log(`\nresposta em ${Date.now() - started}ms — modelo: ${report.model}`);
if (report.usage) console.log(`tokens: entrada=${report.usage.inputTokens ?? '?'} saída=${report.usage.outputTokens ?? '?'}`);
console.log(`blocos blindados: ${report.shieldedBlocks} | linhas corrigidas offline: ${report.deterministicChanges}`);

// Verificação independente: a estrutura frágil sobreviveu?
const { compareProtectedStructure } = await server.ssrLoadModule('/src/ai/shield.ts');
const check = compareProtectedStructure(text, report.markdown);
console.log(`estrutura protegida: ${check.ok ? 'INTACTA' : `QUEBRADA (${check.reason})`}\n`);
console.log('--- markdown final ---');
console.log(report.markdown);

await server.close();
