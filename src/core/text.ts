/**
 * utilidades de texto puras (sem `vscode`).
 *
 * toda a normalizacao de linha mora aqui pra deixar as regras do formatter
 * legiveis e pra dar pra testar o comportamento em CRLF.
 */

import type { DocumentLines } from './types';

/** detecta o terminador de linha dominante do texto. */
export function detectEol(text: string): string {
	if (text.includes('\r\n')) {
		return '\r\n';
	}
	if (text.includes('\n')) {
		return '\n';
	}
	if (text.includes('\r')) {
		return '\r';
	}
	return '\n';
}

/**
 * quebra o texto em linhas usando o terminador detectado.
 *
 * inclui a ultima linha mesmo quando o texto termina em quebra de linha, pra
 * que a reconstrucao com `join(eol)` saia byte a byte igual a entrada.
 */
export function splitLines(text: string): DocumentLines {
	const eol = detectEol(text);
	// texto vazio nao tem linha. texto que termina em \n tem uma linha vazia
	// final que o join precisa recriar.
	const lines = text.length === 0 ? [] : text.split(/\r\n|\r|\n/);
	return { lines, eol, fenced: new Array(lines.length).fill(false) };
}

/** junta as linhas de volta num texto so. */
export function joinLines(lines: string[], eol: string): string {
	return lines.join(eol);
}

/** conta espacos/tabs a esquerda (largura em colunas, tab = 1). */
export function leadingWhitespace(line: string): string {
	return line.match(/^[ \t]*/)?.[0] ?? '';
}

/** remove a indentacao inicial. */
export function stripIndent(line: string): string {
	return line.replace(/^[ \t]*/, '');
}

/** true quando a linha nao tem nada alem de espaco. */
export function isBlank(line: string): boolean {
	return line.trim().length === 0;
}

/** quantidade de caracteres crus da linha, sem indentacao. */
export function contentLength(line: string): number {
	return stripIndent(line).length;
}

/**
 * envolve o texto em crases, escolhendo uma quantidade que nao colida com o
 * conteudo (`` ``a`b`` `` em vez de `` `a`b` ``).
 */
export function wrapInlineCode(text: string): string {
	const runs = text.match(/`+/g) ?? [];
	const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
	const ticks = '`'.repeat(Math.max(1, longest + 1));
	const needsPadding = text.startsWith('`') || text.endsWith('`') || /^\s|\s$/.test(text);
	return needsPadding ? `${ticks} ${text} ${ticks}` : `${ticks}${text}${ticks}`;
}

/** true quando o texto ja e trecho de codigo inline cercado por crases. */
export function isInlineCode(text: string): boolean {
	return /^`+[^`].*`+$/.test(text) || /^`+$/.test(text);
}

/** remove formatacao inline (`**`, `_`, `` ` ``, links) pra inspecao. */
export function stripInlineFormatting(text: string): string {
	return text
		.replace(/`[^`]*`/g, '')
		.replace(/\*\*|__|~~/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

/** true quando a linha so tem um rotulo curto terminando em `:`. */
export function isLabelLine(line: string): boolean {
	return /^[^:]{1,40}:\s*$/.test(line.trim());
}
