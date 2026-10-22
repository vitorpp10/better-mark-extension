/**
 * pipeline de formatacao.
 *
 *   texto
 *     ↓
 *   scanProtected   (marca codigo, front matter, tabelas, citacoes, HTML)
 *     ↓
 *   pra cada linha:
 *       rule: lists          -> padroniza `*`/`+`/`1)` pra `-`/`1.`
 *       rule: headings       -> decide oq E titulo de verdade
 *       rule: inline-code    -> `Termo:` -> `` `Termo`: `` (nivel 2A)
 *     ↓
 *   join + preserva EOL
 *
 * o motor e PURO: nao importa `vscode` e nao toca em arquivo nenhum.
 * e isso que deixa testar as regras por CLI sem abrir o VS Code.
 */

import type { DocumentLines, FormatOptions, FormatResult, FormatState, Rule } from './types';
import { joinLines, splitLines } from './text';
import { scanProtected } from './scanner';
import { headingsRule } from './rules/headings';
import { listsRule } from './rules/lists';
import { inlineCodeRule } from './rules/inline-code';
import { indentRule } from './rules/indent';

/** ordem importa: listas antes de titulos, titulos antes de crase. */
export const DEFAULT_RULES: readonly Rule[] = [
	indentRule,
	listsRule,
	headingsRule,
	inlineCodeRule,
];

/** opcoes padrao ja resolvidas (evita `undefined` espalhado nas regras). */
export const DEFAULT_OPTIONS: Required<FormatOptions> = {
	headingLevel: 0,
	inlineCodeTerms: false,
	inlineCodeMentions: false,
	protectBlocks: true,
};

export interface FormatMarkdownResult extends FormatResult {
	/** linhas que NAO foram tocadas por serem bloco protegido. */
	preservedLines: number;
}

/**
 * formata um trecho de markdown.
 *
 * @param text    texto original (selecao do user)
 * @param options opcoes; as ausentes caem em `DEFAULT_OPTIONS`
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

		// exposto pras regras: algumas (tipo a de recuo) precisam saber que tao
		// dentro de um bloco fragil e nao devem mexer em nada.
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
 * formata so as linhas que o user selecionou de verdade.
 *
 * o VS Code pode entregar uma selecao aparada: `formatMarkdown` roda no nucleo
 * e as bordas em branco voltam intactas, pra nao introduzir diferenca de
 * espacamento que o user nao pediu.
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
