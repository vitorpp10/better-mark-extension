/**
 * regra de recuo: texto colado de pdf, site ou chat vem com recuo uniforme de
 * 4 espacos (ou 1 tab) e em markdown isso significa bloco de codigo. nao era a
 * intencao do autor, era so a formatacao da origem.
 *
 *   ANTES:      Sistema operacional: Linux (testado).
 *   DEPOIS:  - Sistema operacional: Linux (testado).
 *
 * porque olha o bloco inteiro e nao so a linha anterior:
 *
 * a primeira versao exigia que a linha anterior ja fosse item de lista. isso
 * convertia a 2a e a 3a linhas de um grupo, mas deixava a 1a intacta. o
 * resultado ficava pior que o original, com lista comecando no meio do bloco:
 *
 *      Sistema operacional: Linux.
 *   - Dependências: SFML.
 *   - Fonts e assets: a pasta assets/.
 *
 * o certo e decidir por grupo: 3 ou mais linhas seguidas com o mesmo recuo
 * acidental sao bloco colado, e todas viram item de lista.
 *
 * oq nunca e tocado: linha dentro de bloco de codigo, tabela, front matter ou
 * citacao. o motor marca como protegida antes de chegar aqui.
 */

import type { FormatState } from '../types';
import { isListItem } from '../scanner';

/** recuo acidental de origem: 4 espacos ou 1 tab. */
const ACCIDENTAL_INDENT_RE = /^(?: {4}|\t)(\S.*)$/;

/**
 * recuo de qualquer tamanho multiplo de 4, ou tab.
 *
 * `4` espacos e o nivel 1 do bloco colado, `8` e o nivel 2 (sub-item). texto
 * de pdf costuma usar 4 por nivel, entao converte cada nivel pra indentacao
 * de lista markdown (4 espacos por nivel).
 */
const DEEP_INDENT_RE = /^((?: {4})+|\t+)(\S.*)$/;

/**
 * profundidade do recuo: quantos niveis de 4 espacos (ou tabs) tem.
 * devolve `null` quando a linha nao tem recuo aproveitavel.
 */
function indentDepth(line: string): { depth: number; content: string } | null {
	const match = line.match(DEEP_INDENT_RE);
	if (!match) {
		return null;
	}
	const raw = match[1];
	const levels = raw.includes('\t') ? raw.split('\t').length - 1 : raw.length / 4;
	return { depth: levels, content: match[2] };
}

/** minimo de linhas seguidas com o mesmo recuo pra tratar como bloco. */
const MIN_BLOCK_LINES = 2;

/** e uma linha que nao deve virar item de lista? */
function looksLikeContinuation(content: string): boolean {
	if (isListItem(content)) {
		return true;
	}
	// fecha bloco de codigo, regua, titulo, tabela: deixa quieto.
	if (/^(```|~~~|---|\+\+\+|#{1,6}\s|\|)/.test(content)) {
		return true;
	}
	// diagrama de arvore ou tabela alinhada por espacos: `src/core/    motor`.
	// um recuo de 4 espacos aqui e intencional, o user desenhou uma estrutura
	// visual. converter em lista destroi o alinhamento das colunas. o sinal e
	// o espacamento interno largo entre dois trechos de conteudo.
	if (/\S {2,}\S/.test(content)) {
		return true;
	}
	return false;
}

/** recuo acidental de uma linha; `null` se nao tem. */
function accidentalIndent(line: string): string | null {
	const parsed = indentDepth(line);
	if (parsed === null) {
		return null;
	}
	return looksLikeContinuation(parsed.content) ? null : parsed.content;
}

/**
 * mede o bloco indentado que contem a linha `index` e devolve o tamanho total,
 * contando pra cima e pra baixo.
 *
 * contar so pra baixo tava errado: a ultima linha de um grupo de 3 enxergava
 * um bloco de tamanho 1 e nao era convertida, deixando a lista incompleta —
 * pior que nao mexer.
 */
function blockSize(doc: string[], index: number): number {
	let count = 0;

	// pra baixo.
	for (let i = index; i < doc.length; i++) {
		if (doc[i].trim().length === 0) {
			if (i + 1 < doc.length && doc[i + 1].trim().length === 0) {
				break;
			}
			continue;
		}
		if (accidentalIndent(doc[i]) === null) {
			break;
		}
		count++;
	}

	// pra cima (sem contar a propria linha de novo).
	for (let i = index - 1; i >= 0; i--) {
		if (doc[i].trim().length === 0) {
			if (i - 1 >= 0 && doc[i - 1].trim().length === 0) {
				break;
			}
			continue;
		}
		if (accidentalIndent(doc[i]) === null) {
			break;
		}
		count++;
	}

	return count;
}

export const indentRule = {
	id: 'indent',

	apply(line: string, index: number, doc: string[], ctx: unknown, options: unknown): string {
		const opts = options as { indentToList?: boolean } | undefined;
		if (opts?.indentToList === false) {
			return line;
		}

		const { state } = ctx as { state: FormatState };
		if (state.insideProtected) {
			return line;
		}

		const parsed = indentDepth(line);
		if (parsed === null || looksLikeContinuation(parsed.content)) {
			return line;
		}

		// so age quando a linha faz parte de um bloco indentado. linha
		// indentada isolada fica quieta: pode ser recuo intencional.
		if (blockSize(doc, index) < MIN_BLOCK_LINES) {
			return line;
		}

		// cada nivel de 4 espacos do texto colado vira um nivel de lista
		// (4 espacos por nivel), mantendo a hierarquia que o autor via no
		// original.
		const indent = '    '.repeat(Math.max(0, parsed.depth - 1));
		return `${indent}- ${parsed.content}`;
	},
};

export { ACCIDENTAL_INDENT_RE, accidentalIndent, blockSize };
