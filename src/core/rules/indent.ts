/**
 * Regra de recuo: texto colado de PDF, site ou chat vem com um recuo
 * uniforme de 4 espaços (ou um tab) que, em Markdown, significa "bloco de
 * código". Não era a intenção do autor — era só a formatação da origem.
 *
 *   ANTES:      Sistema operacional: Linux (testado).
 *   DEPOIS:  - Sistema operacional: Linux (testado).
 *
 * POR QUE OLHA O BLOCO INTEIRO, E NÃO SÓ A LINHA ANTERIOR:
 *
 * A primeira versão exigia que a linha anterior já fosse item de lista. Isso
 * convertia a 2ª e a 3ª linhas de um grupo, mas deixava a 1ª intacta — o
 * resultado ficava PIOR que o original, com uma lista começando no meio do
 * bloco:
 *
 *      Sistema operacional: Linux.
 *   - Dependências: SFML.
 *   - Fonts e assets: a pasta assets/.
 *
 * A decisão certa é por GRUPO: se três ou mais linhas seguidas compartilham o
 * mesmo recuo acidental, é um bloco colado, e todas viram itens de lista.
 *
 * O que NUNCA é tocado: linhas dentro de bloco de código, tabela, front
 * matter ou citação — o motor as marca como protegidas antes de chegar aqui.
 */

import type { FormatState } from '../types';
import { isListItem } from '../scanner';

/** Recuo acidental de origem: 4 espaços ou 1 tab. */
const ACCIDENTAL_INDENT_RE = /^(?: {4}|\t)(\S.*)$/;

/**
 * Recuo de QUALQUER tamanho múltiplo de 4, ou tab.
 *
 * `4` espaços é o nível 1 do bloco colado; `8` é o nível 2 (sub-item). O
 * texto de PDF costuma usar 4 por nível, então convertemos cada nível para
 * a indentação correspondente de lista Markdown (4 espaços por nível).
 */
const DEEP_INDENT_RE = /^((?: {4})+|\t+)(\S.*)$/;

/**
 * Profundidade do recuo: quantos níveis de 4 espaços (ou tabs) há.
 * Devolve `null` quando a linha não tem recuo aproveitável.
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

/** Mínimo de linhas seguidas com o mesmo recuo para tratar como bloco. */
const MIN_BLOCK_LINES = 2;

/** É uma linha que não deve virar item de lista? */
function looksLikeContinuation(content: string): boolean {
	if (isListItem(content)) {
		return true;
	}
	// Fecha bloco de código, régua, título, tabela: deixa quieto.
	if (/^(```|~~~|---|\+\+\+|#{1,6}\s|\|)/.test(content)) {
		return true;
	}
	// Diagrama de árvore ou tabela alinhada por espaços: `src/core/    motor`.
	// Um recuo de 4 espaços aqui é INTENCIONAL — a pessoa desenhou uma
	// estrutura visual. Converter em lista destrói o alinhamento das colunas.
	// O sinal é o espaçamento interno largo entre dois trechos de conteúdo.
	if (/\S {2,}\S/.test(content)) {
		return true;
	}
	return false;
}

/** Recuo acidental de uma linha; `null` se não tem. */
function accidentalIndent(line: string): string | null {
	const parsed = indentDepth(line);
	if (parsed === null) {
		return null;
	}
	return looksLikeContinuation(parsed.content) ? null : parsed.content;
}

/**
 * Mede o bloco indentado que CONTÉM a linha `index` e devolve o tamanho
 * total, contando para cima e para baixo.
 *
 * Contar só para baixo estava errado: a última linha de um grupo de três
 * enxergava um "bloco" de tamanho 1 e não era convertida, deixando a lista
 * incompleta — pior que não mexer.
 */
function blockSize(doc: string[], index: number): number {
	let count = 0;

	// Para baixo.
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

	// Para cima (sem contar a própria linha de novo).
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

		// Só age quando a linha faz parte de um BLOCO indentado. Uma linha
		// indentada isolada é preservada: pode ser recuo intencional.
		if (blockSize(doc, index) < MIN_BLOCK_LINES) {
			return line;
		}

		// Cada nível de 4 espaços do texto colado vira um nível de lista
		// (4 espaços por nível), preservando a hierarquia que o autor
		// enxergava no original.
		const indent = '    '.repeat(Math.max(0, parsed.depth - 1));
		return `${indent}- ${parsed.content}`;
	},
};

export { ACCIDENTAL_INDENT_RE, accidentalIndent, blockSize };
