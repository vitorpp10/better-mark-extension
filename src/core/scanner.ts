/**
 * varredura estrutural do trecho.
 *
 * antes de qualquer regra rodar, precisamos saber QUAIS linhas sao intocaveis:
 * blocos de codigo, front matter, tabelas, HTML, citacoes. essa e a defesa
 * mais importante contra "a extensao estragou meu README".
 *
 * sem `vscode` aqui: recebe string, devolve metadado.
 */

import type { ProtectedKind } from './types';

export interface ScanResult {
	/** pra cada linha, o tipo de bloco protegido (ou null). */
	protectedKind: (ProtectedKind | null)[];
	/** true quando a linha faz parte de um fence ``` / ~~~. */
	fenced: boolean[];
}

const FENCE_RE = /^[ \t]{0,3}(```+|~~~+)(.*)$/;
const FRONT_MATTER_RE = /^(-{3}|\+{3})\s*$/;
const LIST_ITEM_RE = /^([ \t]*)([-*+]|\d{1,9}[.)\]\-}])[ \t]+\S/;

/** true quando a barra de tabela aparece fora de codigo inline. */
function hasTablePipe(line: string): boolean {
	const withoutCode = line.replace(/`[^`]*`/g, '');
	return withoutCode.includes('|');
}

/** linha so com pipes, tracos, dois-pontos e espaco -> `| --- |`. */
export function isTableDelimiter(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed.includes('-') || !trimmed.includes('|')) {
		return false;
	}
	return /^\|?[\s:|-]+\|?$/.test(trimmed) && /^[|\s:-]+$/.test(trimmed);
}

/** true quando a linha inicia um item de lista. */
export function isListItem(line: string): boolean {
	return LIST_ITEM_RE.test(line);
}

/** tira o marcador (`-`, `*`, `+`, `1.`, `1)`) de um item de lista. */
export function listMarker(line: string): string | null {
	return line.match(LIST_ITEM_RE)?.[2] ?? null;
}

/**
 * true quando o `---` na linha `index` ABRE um bloco de front matter.
 *
 * separa front matter de regua horizontal (`---` sozinha) olhando oq vem
 * depois: front matter tem linhas `chave: valor` e fecha com outro `---`.
 * regua horizontal e seguida de texto comum ou linha em branco.
 *
 * isso evita proteger regua solta (que e so decoracao e pode ser reformatada
 * normal) e evita tratar todo `---` como abertura.
 */
function startsFrontMatterBlock(lines: string[], index: number): boolean {
	// `---` na primeira linha e front matter por definicao.
	if (index === 0) {
		return true;
	}
	// precisa tar isolado: nada antes na mesma linha, nada depois.
	// procura o fechamento e exige pelo menos uma linha com `chave: valor`.
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
 * percorre o texto marcando regiao protegida.
 *
 * regras de protecao:
 * 1. fence aberto (```/~~~) protege tudo ate o fence de fechamento.
 * 2. front matter (`---` na primeira linha) protege ate o `---` de volta.
 * 3. tabela: linha com `|` seguida de delimitador, ou ja dentro de tabela.
 * 4. bloco HTML (`<div>`, `<details>`, `<table>`...) protege ate fechar.
 * 5. bloco de citacao (`>`) e protegido: reescrever citacao e trabalho da IA.
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

		// --- 1. blocos de codigo -------------------------------------------
		const fence = line.match(FENCE_RE);
		if (fenceChar !== null) {
			fenced[i] = true;
			insideFence[i] = true;
			kind[i] = 'fence';
			if (fence && fence[1][0] === fenceChar && trimmed.startsWith(fenceChar)) {
				// fence de fechamento.
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

		// --- 2. front matter e blocos `---` --------------------------------
		// `---` na primeira linha e front matter YAML classico. mas `---`
		// tambem aparece no MEIO do documento como separador de secao ou
		// front matter de trecho colado. antes so tratavamos o caso da
		// primeira linha, e o bloco do meio ficava exposto — num teste real
		// a IA recebeu `---\ntitle: x\n---` e reescreveu o conteudo.
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

		// --- 4. tabelas ---------------------------------------------------
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

		// --- 5. citacoes e labels ----------------------------------------
		if (/^[ \t]{0,3}>/.test(line)) {
			kind[i] = 'blockquote';
			continue;
		}
	}

	return { protectedKind: kind, fenced };
}
