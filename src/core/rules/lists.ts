/**
 * Nível 1 — Listas.
 *
 * O usuário escreve listas "quase markdown" e a extensão padroniza:
 *
 *   `* item`   → `- item`
 *   `+ item`   → `- item`
 *   `1) item`  → `1. item`
 *   `1- item`  → `1. item`
 *
 * Regras de segurança:
 *  - a indentação (tabulação) é preservada exatamente;
 *  - o separador entre marcador e texto vira UM espaço (CommonMark);
 *  - cada nível de indentação mantém seu próprio contador, então
 *    sublistas numeradas continuam corretas;
 *  - linhas que não são item de lista não são tocadas.
 */

const BULLET_RE = /^([ \t]*)([*+])([ \t]+)(\S.*)$/;
/**
 * Marcadores ordenados aceitos: `1.`, `1)`, `1-`, `1]`, `1}`.
 *
 * `)` e `.` são os usuais; `-`, `]` e `}` aparecem quando a pessoa digita
 * uma enumeração informal (`1- item`, `1] item`). Sem isso, `1] item` não
 * era reconhecido como lista e acabava virando título.
 */
const ORDERED_RE = /^([ \t]*)(\d{1,9})[.)\]\-}]([ \t]+)(\S.*)$/;
/** `-   item` com espaçamento irregular (já canônico no marcador). */
const CANONICAL_RE = /^([ \t]*)(-|\d{1,9}\.)[ \t]{2,}([^\s].*)$/;

/** Marcadores ordenados reconhecidos por `isListItem`/`listMarker`. */
export const ORDERED_MARKER_RE = /^([ \t]*)(\d{1,9})[.)\]\-}][ \t]+\S/;

export const listsRule = {
	id: 'lists',

	apply(line: string, _index: number, _doc: string[], _ctx: unknown): string {
		// `* item` / `+ item` → `- item`
		const bullet = line.match(BULLET_RE);
		if (bullet) {
			const [, indent, , , content] = bullet;
			return `${indent}- ${content}`;
		}

		// `1) item` / `1- item` → `1. item`
		const ordered = line.match(ORDERED_RE);
		if (ordered) {
			const [, indent, number, , content] = ordered;
			return `${indent}${number}. ${content}`;
		}

		// Já é canônico, mas com espaçamento irregular: `-   item` → `- item`.
		const canonical = line.match(CANONICAL_RE);
		if (canonical) {
			const [, indent, marker, content] = canonical;
			return `${indent}${marker} ${content}`;
		}

		return line;
	},
};

/** True quando a lista já está no formato canônico (`-` ou `N.`). */
export function isCanonicalListItem(line: string): boolean {
	return CANONICAL_RE.test(line);
}

/**
 * Extrai a chave de indentação de um item (para contadores por nível).
 * Retorna null quando a linha não é item de lista.
 */
export function listIndentKey(line: string): string | null {
	const match = line.match(/^([ \t]*)(?:[-*+]|\d{1,9}[.)])[ \t]/);
	return match ? match[1] : null;
}
