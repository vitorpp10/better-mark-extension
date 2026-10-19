/**
 * Utilidades de texto puras (sem `vscode`).
 *
 * Toda a normalização de linha vive aqui para que as regras do formatter
 * fiquem legíveis e para que o comportamento em CRLF seja testável.
 */

import type { DocumentLines } from './types';

/** Detecta o terminador de linha dominante do texto. */
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
 * Quebra o texto em linhas preservando o terminador detectado.
 *
 * Inclui a última linha mesmo quando o texto termina em quebra de linha, para
 * que a reconstrução com `join(eol)` seja byte a byte idêntica à entrada.
 */
export function splitLines(text: string): DocumentLines {
	const eol = detectEol(text);
	// Um texto vazio não tem linhas; um texto que termina em \n tem uma linha
	// vazia final que o join precisa recriar.
	const lines = text.length === 0 ? [] : text.split(/\r\n|\r|\n/);
	return { lines, eol, fenced: new Array(lines.length).fill(false) };
}

/** Junta as linhas de volta em um texto único. */
export function joinLines(lines: string[], eol: string): string {
	return lines.join(eol);
}

/** Conta espaços/tabs à esquerda (largura em colunas, tab = 1). */
export function leadingWhitespace(line: string): string {
	return line.match(/^[ \t]*/)?.[0] ?? '';
}

/** Remove a indentação inicial. */
export function stripIndent(line: string): string {
	return line.replace(/^[ \t]*/, '');
}

/** True quando a linha não tem nenhum conteúdo além de espaços. */
export function isBlank(line: string): boolean {
	return line.trim().length === 0;
}

/** Quantidade de caracteres "crus" da linha, sem indentação. */
export function contentLength(line: string): number {
	return stripIndent(line).length;
}

/**
 * Envolve o texto em crases, escolhendo um número de crases que não colida
 * com o conteúdo (`` ``a`b`` `` em vez de `` `a`b` ``).
 */
export function wrapInlineCode(text: string): string {
	const runs = text.match(/`+/g) ?? [];
	const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
	const ticks = '`'.repeat(Math.max(1, longest + 1));
	const needsPadding = text.startsWith('`') || text.endsWith('`') || /^\s|\s$/.test(text);
	return needsPadding ? `${ticks} ${text} ${ticks}` : `${ticks}${text}${ticks}`;
}

/** True quando o texto já é um trecho de código inline cercado por crases. */
export function isInlineCode(text: string): boolean {
	return /^`+[^`].*`+$/.test(text) || /^`+$/.test(text);
}

/** Remove formatação inline (`**`, `_`, `` ` ``, links) para inspeção. */
export function stripInlineFormatting(text: string): string {
	return text
		.replace(/`[^`]*`/g, '')
		.replace(/\*\*|__|~~/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

/** True quando a linha contém apenas um rótulo curto terminando em `:`. */
export function isLabelLine(line: string): boolean {
	return /^[^:]{1,40}:\s*$/.test(line.trim());
}
