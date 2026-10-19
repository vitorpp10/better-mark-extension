/**
 * Pipeline de formatação.
 *
 *   texto
 *     ↓
 *   scanProtected   (marca código, front matter, tabelas, citações, HTML)
 *     ↓
 *   para cada linha:
 *       rule: lists          → padroniza `*`/`+`/`1)` para `-`/`1.`
 *       rule: headings       → decide o que É título de verdade
 *       rule: inline-code    → `Termo:` → `` `Termo`: `` (Nível 2A)
 *     ↓
 *   join + preserva EOL
 *
 * O motor é PURO: não importa `vscode` e não toca em arquivo nenhum.
 * Isso é o que permite testar as regras por CLI sem abrir o VS Code.
 */

import type { DocumentLines, FormatOptions, FormatResult, FormatState, Rule } from './types';
import { joinLines, splitLines } from './text';
import { scanProtected } from './scanner';
import { headingsRule } from './rules/headings';
import { listsRule } from './rules/lists';
import { inlineCodeRule } from './rules/inline-code';
import { indentRule } from './rules/indent';

/** Ordem importa: listas antes de títulos, títulos antes de crase. */
export const DEFAULT_RULES: readonly Rule[] = [
	indentRule,
	listsRule,
	headingsRule,
	inlineCodeRule,
];

/** Opções padrão, já resolvidas (evita `undefined` espalhado nas regras). */
export const DEFAULT_OPTIONS: Required<FormatOptions> = {
	headingLevel: 0,
	inlineCodeTerms: false,
	inlineCodeMentions: false,
	protectBlocks: true,
};

export interface FormatMarkdownResult extends FormatResult {
	/** Linhas que NÃO foram tocadas por serem bloco protegido. */
	preservedLines: number;
}

/**
 * Formata um trecho de markdown.
 *
 * @param text    texto original (seleção do usuário)
 * @param options opções; as ausentes caem em `DEFAULT_OPTIONS`
 */
export function formatMarkdown(text: string, options: FormatOptions = {}): FormatMarkdownResult {
	const opts: Required<FormatOptions> = { ...DEFAULT_OPTIONS, ...options };

	if (text.length === 0) {
		return { text, appliedRules: [], changedLines: 0, preservedLines: 0 };
	}

	const doc: DocumentLines = splitLines(text);
	const scan = scanProtected(text);
	const ctx = { state: newState() };

	const output: string[] = [];
	const applied = new Set<string>();
	let changedLines = 0;
	let preservedLines = 0;

	for (let i = 0; i < doc.lines.length; i++) {
		const original = doc.lines[i];
		const kind = opts.protectBlocks ? scan.protectedKind[i] : null;

		// Exposto às regras: algumas (como a de recuo) precisam saber que estão
		// dentro de um bloco frágil e não devem mexer em nada.
		ctx.state.insideProtected = kind !== null;

		if (kind !== null) {
			preservedLines++;
			output.push(original);
			continue;
		}

		let current = original;
		for (const rule of DEFAULT_RULES) {
			const next = rule.apply(current, i, doc.lines, ctx, opts as never);
			if (next !== current) {
				applied.add(rule.id);
				current = next;
			}
		}

		if (current !== original) {
			changedLines++;
		}
		output.push(current);
	}

	return {
		text: joinLines(output, doc.eol),
		appliedRules: [...applied],
		changedLines,
		preservedLines,
	};
}

function newState(): FormatState {
	return {
		headingEmitted: false,
		headingCandidateFound: false,
		existingLevels: [],
		insideProtected: false,
	};
}

/**
 * Formata apenas linhas que o usuário selecionou de verdade.
 *
 * O VS Code pode entregar uma seleção "aparada": `formatMarkdown` é aplicado
 * ao núcleo e as bordas em branco voltam intactas, para não introduzir
 * diferenças de espaçamento que o usuário não pediu.
 */
export function formatSelection(text: string, options: FormatOptions = {}): FormatMarkdownResult {
	const leading = text.match(/^\s*/)?.[0] ?? '';
	const trailing = text.match(/\s*$/)?.[0] ?? '';
	const core = text.slice(leading.length, text.length - trailing.length);

	if (core.length === 0) {
		return { text, appliedRules: [], changedLines: 0, preservedLines: 0 };
	}

	const result = formatMarkdown(core, options);
	return { ...result, text: `${leading}${result.text}${trailing}` };
}
