/**
 * Tipos compartilhados pelo motor de formatação.
 *
 * Nada aqui importa o módulo `vscode`: o motor é TypeScript puro e pode ser
 * testado por CLI (vitest). O VS Code só entra na camada `src/vscode`.
 */

/** Idiomas em que a extensão se considera "em casa". */
export const SUPPORTED_LANGUAGES = ['markdown'] as const;

/**
 * Estrutura de linhas de um texto markdown.
 *
 * O motor trabalha linha por linha, mas algumas regras precisam saber o que
 * vem antes/depois (listas, citações, blocos de código). Por isso separamos:
 *
 * - `lines`  → texto exato de cada linha (sem o `\n`), usado para reconstruir.
 * - `eol`    → terminador de linha detectado (`\n`, `\r\n` ou `''`).
 * - `fenced` → true quando a linha está DENTRO de um bloco ``` ou ~~~.
 */
export interface DocumentLines {
	lines: string[];
	eol: string;
	fenced: boolean[];
}

/** Contexto opcional passado para cada regra. */
export interface FormatContext {
	/** Compartilhado entre regras para que uma não desfaça a outra. */
	state: FormatState;
}

/** Estado compartilhado durante uma execução de `formatMarkdown`. */
export interface FormatState {
	/** True depois que a regra de títulos já emitiu um heading. */
	headingEmitted: boolean;
	/** True quando a regra de títulos encontrou o PRIMEIRO candidato. */
	headingCandidateFound: boolean;
	/**
	 * Níveis de título já existentes no trecho (`#`, `##`, ...).
	 * Usado para inferir o nível do próximo heading em vez de cravar `#`.
	 */
	existingLevels: number[];
	/**
	 * True quando a linha atual está DENTRO de um bloco frágil (fence, tabela,
	 * front matter...). Dentro de um bloco nada é reformatado, nem mesmo a
	 * indentação — um recuo dentro de código é significativo.
	 */
	insideProtected: boolean;
}

/**
 * Uma regra do pipeline.
 *
 * `id`    → nome curto (aparece em testes e em diagnósticos).
 * `apply` → recebe UMA linha e devolve a linha transformada (ou a mesma).
 */
export interface Rule {
	id: string;
	/** Recebe UMA linha e devolve a linha transformada (ou a MESMA referência). */
	apply(line: string, index: number, doc: string[], ctx: FormatContext, options: never): string;
}

/** Opções do pipeline. */
export interface FormatOptions {
	/** Nível máximo de heading a emitir (1–6). Padrão: inferido/1. */
	headingLevel?: number;
	/** Ativa a regra de código inline do Nível 2 (`Termo:` → `` `Termo`: ``). */
	inlineCodeTerms?: boolean;
	/** Ativa a regra de menções a código (nomes de arquivo, funções...). */
	inlineCodeMentions?: boolean;
	/** Preserva blocos de código, tabelas, front matter e HTML. Padrão: true. */
	protectBlocks?: boolean;
}

/** Resultado de uma formatação, com o que mudou (útil para relatórios/testes). */
export interface FormatResult {
	text: string;
	/** Ids das regras que alteraram pelo menos uma linha. */
	appliedRules: string[];
	/** Quantidade de linhas alteradas. */
	changedLines: number;
}

/**
 * Classificação estrutural de uma linha.
 * Usado pelo scanner e pelas regras para saber o que é intocável.
 */
export type ProtectedKind =
	| 'fence'
	| 'frontMatter'
	| 'table'
	| 'html'
	| 'blockquote';
