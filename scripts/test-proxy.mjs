/**
 * Testa o fluxo "sem configuração": a extensão fala com o proxy local e o
 * usuário não tem chave nenhuma configurada.
 */
import { createServer } from 'vite';

const server = await createServer({
	server: { middlewareMode: true },
	appType: 'custom',
	logLevel: 'error',
});

const { AiFormatter } = await server.ssrLoadModule('/src/ai/formatter.ts');
const { readFile } = await import('node:fs/promises');

const file = process.argv[2] ?? '/tmp/sudoku-real.md';
const text = await readFile(file, 'utf8');

const ai = new AiFormatter((m) => console.log(`  [log] ${m}`));

console.log('provedor: proxy (nenhuma API key configurada)');
console.log(`entrada:  ${text.length} caracteres\n`);

const started = Date.now();
try {
	const report = await ai.format(text, {
		providerId: 'proxy',
		model: 'default',
		apiKey: '',                 // <-- de propósito: sem chave nenhuma
		timeoutMs: 90000,
		mode: 'preserve',
		emphasis: 'deduce',
		baseUrl: 'http://localhost:8787',
		installId: 'teste-local-123',
	});

	console.log(`\nresposta em ${Date.now() - started}ms — modelo: ${report.model}`);
	console.log(`tokens: entrada=${report.usage?.inputTokens} saída=${report.usage?.outputTokens}`);
	console.log(`blocos blindados: ${report.shieldedBlocks}`);
	console.log('\n--- markdown final (primeiras 25 linhas) ---');
	console.log(report.markdown.split('\n').slice(0, 25).join('\n'));
} catch (error) {
	console.error(`\nFALHOU: [${error.kind ?? 'erro'}] ${error.message}`);
	process.exitCode = 1;
}

await server.close();
