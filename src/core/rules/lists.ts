/**
 * nivel 1 — listas.
 *
 * o user escreve lista quase markdown e a gente padroniza:
 *
 *   `* item`   -> `- item`
 *   `+ item`   -> `- item`
 *   `1) item`  -> `1. item`
 *   `1- item`  -> `1. item`
 *
 * cuidados:
 *  - a indentacao fica intacta;
 *  - sobra 1 espaco entre marcador e texto (commonmark);
 *  - cada nivel tem contador proprio, entao sublista numerada nao quebra;
 *  - o que nao e item de lista fica quieto.
 */

const BULLET_RE = /^([ \t]*)([*+])([ \t]+)(\S.*)$/;
/**
 * marcador ordenado aceito: `1.`, `1)`, `1-`, `1]`, `1}`.
 *
 * `.` e `)` sao os normais. `-`, `]` e `}` aparecem quando o user digita
 * enumeracao informal (`1- item`, `1] item`). sem isso o `1] item` nao era
 * reconhecido como lista e virava titulo.
 */
const ORDERED_RE = /^([ \t]*)(\d{1,9})[.)\]\-}]([ \t]+)(\S.*)$/;
/** `-   item` com espaco sobrando (marcador ja ta canonico). */
const CANONICAL_RE = /^([ \t]*)(-|\d{1,9}\.)[ \t]{2,}([^\s].*)$/;

/** marcadores ordenados que o isListItem/listMarker reconhece. */
export const ORDERED_MARKER_RE = /^([ \t]*)(\d{1,9})[.)\]\-}][ \t]+\S/;

export const listsRule = {
	id: 'lists',

	apply(line: string, _index: number, _doc: string[], _ctx: unknown): string {
		// `* item` / `+ item` -> `- item`
		const bullet = line.match(BULLET_RE);
		if (bullet) {
			const [, indent, , , content] = bullet;
			return `${indent}- ${content}`;
		}

		// `1) item` / `1- item` -> `1. item`
		const ordered = line.match(ORDERED_RE);
		if (ordered) {
			const [, indent, number, , content] = ordered;
			return `${indent}${number}. ${content}`;
		}

		// ja ta canonico mas com espaco sobrando: `-   item` -> `- item`.
		const canonical = line.match(CANONICAL_RE);
		if (canonical) {
			const [, indent, marker, content] = canonical;
			return `${indent}${marker} ${content}`;
		}

		return line;
	},
};

/** true quando a lista ja ta canonica (`-` ou `N.`). */
export function isCanonicalListItem(line: string): boolean {
	return CANONICAL_RE.test(line);
}

/**
 * pega a chave de indentacao do item (pra contar por nivel).
 * devolve null quando a linha nao e item de lista.
 */
export function listIndentKey(line: string): string | null {
	const match = line.match(/^([ \t]*)(?:[-*+]|\d{1,9}[.)])[ \t]/);
	return match ? match[1] : null;
}
