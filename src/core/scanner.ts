/**
 * Varredura estrutural do trecho.
 *
 * Antes de qualquer regra rodar, precisamos saber QUAIS linhas são intocáveis:
 * blocos de código, front matter, tabelas, HTML, citações. Essa é a defesa
 * mais importante contra "a extensão estragou meu README".
 *
 * Sem `vscode` aqui: recebe strings, devolve metadados.
 */

import type { ProtectedKind } from './types';

export interface ScanResult {
	/** Para cada linha, o tipo de bloco protegido (ou null). */
	protectedKind: (ProtectedKind | null)[];
	/** True quando a linha faz parte de um fence ``` / ~~~. */
	fenced: boolean[];
}

const FENCE_RE = /^[ \t]{0,3}(```+|~~~+)(.*)$/;
const FRONT_MATTER_RE = /^(-{3}|\+{3})\s*$/;
const LIST_ITEM_RE = /^([ \t]*)([-*+]|\d{1,9}[.)\]\-}])[ \t]+\S/;

/** True quando a barra de tabela aparece fora de código inline. */
function hasTablePipe(line: string): boolean {
	const withoutCode = line.replace(/`[^`]*`/g, '');
	return withoutCode.includes('|');
}

/** Linha composta só por pipes, traços, dois-pontos e espaços → `| --- |`. */
export function isTableDelimiter(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed.includes('-') || !trimmed.includes('|')) {
		return false;
	}
	return /^\|?[\s:|-]+\|?$/.test(trimmed) && /^[|\s:-]+$/.test(trimmed);
}

/** True quando a linha inicia um item de lista. */
export function isListItem(line: string): boolean {
	return LIST_ITEM_RE.test(line);
}

/** Extrai o marcador (`-`, `*`, `+`, `1.`, `1)`) de um item de lista. */
export function listMarker(line: string): string | null {
	return line.match(LIST_ITEM_RE)?.[2] ?? null;
}

/**
 * True quando o `---` na linha `index` ABRE um bloco de front matter.
 *
 * Distingue front matter de uma régua horizontal (`---` sozinha) olhando o
 * que vem depois: front matter tem linhas `chave: valor` e fecha com outro
 * `---`. Uma régua horizontal é seguida por texto comum ou linha em branco.
 *
 * Isso evita proteger uma régua solta (que é só decoração e pode ser
 * reformatada normalmente) e evita também tratar todo `---` como abertura.
 */
function startsFrontMatterBlock(lines: string[], index: number): boolean {
	// `---` na primeira linha é front matter por definição.
	if (index === 0) {
		return true;
	}
	// Precisa estar isolado: nada antes na mesma linha, nada depois.
	// Procura o fechamento e exige pelo menos uma linha com `chave: valor`.
	for (let i = index + 1; i < Math.min(lines.length, index + 40); i++) {
		const line = lines[i];
		if (FRONT_MATTER_RE.test(line)) {
			return i > index + 1;
		}
		if (!/^\s*[\w.-]+\s*:/.test(line) && line.trim().length > 0) {
			return false;
		}
	}
	return false;
}

/**
 * Percorre o texto marcando regiões protegidas.
 *
 * Regras de proteção:
 * 1. Fence aberto (```/~~~) protege tudo até o fence de fechamento.
 * 2. Front matter (`---` na primeira linha) protege até o `---` de volta.
 * 3. Tabelas: uma linha com `|` seguida de delimitador, ou já dentro de tabela.
 * 4. Blocos HTML (`<div>`, `<details>`, `<table>`...) protegem até fecharem.
 * 5. Blocos de citação (`>`) são protegidos: reescrever citação é trabalho da IA.
 */
export function scanProtected(text: string): ScanResult {
	const lines = text.split(/\r\n|\r|\n/);
	const kind: (ProtectedKind | null)[] = new Array(lines.length).fill(null);
	const fenced: boolean[] = new Array(lines.length).fill(false);
	const insideFence = new Array(lines.length).fill(false);

	let fenceChar: string | null = null;
	let inFrontMatter = false;
	let inHtml = false;
	let inTable = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		// --- 1. Blocos de código -------------------------------------------
		const fence = line.match(FENCE_RE);
		if (fenceChar !== null) {
			fenced[i] = true;
			insideFence[i] = true;
			kind[i] = 'fence';
			if (fence && fence[1][0] === fenceChar && trimmed.startsWith(fenceChar)) {
				// Fence de fechamento.
				fenceChar = null;
			}
			continue;
		}
		if (fence) {
			fenceChar = fence[1][0];
			fenced[i] = true;
			insideFence[i] = true;
			kind[i] = 'fence';
			continue;
		}

		// --- 2. Front matter e blocos `---` --------------------------------
		// `---` na primeira linha é front matter YAML clássico. Mas `---`
		// também aparece no MEIO de documentos como separador de seção ou
		// como front matter de um trecho colado. Antes só tratávamos o caso
		// da primeira linha, e o bloco do meio ficava exposto — num teste
		// real a IA recebeu `---\ntitle: x\n---` e reescreveu o conteúdo.
		if (inFrontMatter) {
			kind[i] = 'frontMatter';
			if (FRONT_MATTER_RE.test(line)) {
				inFrontMatter = false;
			}
			continue;
		}
		if (FRONT_MATTER_RE.test(line) && startsFrontMatterBlock(lines, i)) {
			inFrontMatter = true;
			kind[i] = 'frontMatter';
			continue;
		}

		// --- 3. HTML ------------------------------------------------------
		if (inHtml) {
			kind[i] = 'html';
			if (/<\/(div|details|summary|table|section|ul|ol|p|pre|code)>/i.test(line)) {
				inHtml = false;
			}
			continue;
		}
		if (/^<[a-zA-Z][^>]*>$/.test(trimmed) && !/\/>$/.test(trimmed)) {
			kind[i] = 'html';
			inHtml = true;
			continue;
		}

		// --- 4. Tabelas ---------------------------------------------------
		if (inTable) {
			kind[i] = 'table';
			if (!hasTablePipe(line) && trimmed.length > 0) {
				inTable = false;
			}
			continue;
		}
		if (
			hasTablePipe(line) &&
			i + 1 < lines.length &&
			isTableDelimiter(lines[i + 1])
		) {
			inTable = true;
			kind[i] = 'table';
			continue;
		}

		// --- 5. Citações e labels ----------------------------------------
		if (/^[ \t]{0,3}>/.test(line)) {
			kind[i] = 'blockquote';
			continue;
		}
	}

	return { protectedKind: kind, fenced };
}
