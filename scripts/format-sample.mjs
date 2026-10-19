#!/usr/bin/env node
/**
 * CLI de desenvolvimento: roda o motor nos arquivos que você passar.
 *
 *   node ./scripts/format-sample.mjs README.md            → mostra o diff
 *   node ./scripts/format-sample.mjs README.md --write    → grava no arquivo
 *   node ./scripts/format-sample.mjs README.md --inline   → liga o Nível 2A completo
 *
 * Serve para você validar regras contra um Markdown real (o seu README, por
 * exemplo) sem abrir o VS Code — que é justamente o "testar com README real"
 * do roadmap.
 */

import { readFile, writeFile } from 'node:fs/promises';

// O motor é TypeScript; usamos o transform do vitest via vite-node para
// rodar direto, sem build intermediário.
const { createServer } = await import('vite');
const server = await createServer({
	server: { middlewareMode: true },
	appType: 'custom',
	logLevel: 'error',
});

const { formatMarkdown } = await server.ssrLoadModule('/src/core/formatter.ts');

const args = process.argv.slice(2);
const files = args.filter((arg) => !arg.startsWith('--'));
const shouldWrite = args.includes('--write');
const inlineMentions = args.includes('--inline');

if (files.length === 0) {
	console.error('uso: node ./scripts/format-sample.mjs <arquivo.md> [--write] [--inline]');
	process.exit(1);
}

for (const file of files) {
	const original = await readFile(file, 'utf8');
	const result = formatMarkdown(original, {
		inlineCodeTerms: true,
		inlineCodeMentions: inlineMentions,
	});

	console.log(`\n=== ${file} ===`);
	console.log(
		`linhas alteradas: ${result.changedLines} | blocos preservados: ${result.preservedLines} | ` +
			`regras: ${result.appliedRules.join(', ') || 'nenhuma'}`,
	);

	if (result.text === original) {
		console.log('nenhuma mudança.');
		continue;
	}

	const before = original.split('\n');
	const after = result.text.split('\n');
	const max = Math.max(before.length, after.length);
	let shown = 0;

	for (let i = 0; i < max && shown < 60; i++) {
		if (before[i] !== after[i]) {
			console.log(`  L${i + 1}`);
			console.log(`  - ${before[i] ?? ''}`);
			console.log(`  + ${after[i] ?? ''}`);
			shown++;
		}
	}
	if (shown >= 60) {
		console.log('  ... (diff truncado)');
	}

	if (shouldWrite) {
		await writeFile(file, result.text, 'utf8');
		console.log('  → arquivo gravado.');
	}
}

await server.close();
