/**
 * tipos compartilhados pelo motor de formatacao.
 *
 * nada aqui importa o modulo `vscode`: o motor e TypeScript puro e roda em
 * CLI (vitest). o VS Code so entra na camada `src/vscode`.
 */

/** idiomas em que a extensao se considera em casa. */
export const SUPPORTED_LANGUAGES = ['markdown'] as const;

/**
 * estrutura de linhas de um texto markdown.
 *
 * o motor trabalha linha por linha, mas algumas regras precisam saber oq vem
 * antes/depois (listas, citacoes, blocos de codigo). por isso separamos:
 *
 * - `lines`  -> texto exato de cada linha (sem o `\n`), usado pra reconstruir.
 * - `eol`    -> terminador de linha detectado (`\n`, `\r\n` ou `''`).
 * - `fenced` -> true quando a linha ta DENTRO de um bloco ``` ou ~~~.
 */
export interface DocumentLines {
	lines: string[];
	eol: string;
	fenced: boolean[];
}

/** contexto opcional passado pra cada regra. */
export interface FormatContext {
	/** compartilhado entre regras pra uma nao desfazer a outra. */
	state: FormatState;
}

/** estado compartilhado durante uma execucao de `formatMarkdown`. */
export interface FormatState {
	/** true depois que a regra de titulos ja emitiu um heading. */
	headingEmitted: boolean;
	/** true quando a regra de titulos achou o PRIMEIRO candidato. */
	headingCandidateFound: boolean;
	/**
	 * niveis de titulo que ja existem no trecho (`#`, `##`, ...).
	 * serve pra inferir o nivel do proximo heading em vez de cravar `#`.
	 */
	existingLevels: number[];
	/**
	 * true quando a linha atual ta DENTRO de um bloco fragil (fence, tabela,
	 * front matter...). dentro de um bloco nada e reformatado, nem a
	 * indentacao — recuo dentro de codigo e significativo.
	 */
	insideProtected: boolean;
}

/**
 * uma regra do pipeline.
 *
 * `id`    -> nome curto (aparece em testes e em diagnosticos).
 * `apply` -> recebe UMA linha e devolve a linha transformada (ou a mesma).
 */
export interface Rule {
	id: string;
	/** recebe UMA linha e devolve a linha transformada (ou a MESMA referencia). */
	apply(line: string, index: number, doc: string[], ctx: FormatContext, options: never): string;
}

/** opcoes do pipeline. */
export interface FormatOptions {
	/** nivel maximo de heading a emitir (1–6). padrao: inferido/1. */
	headingLevel?: number;
	/** ativa a regra de codigo inline do nivel 2 (`Termo:` -> `` `Termo`: ``). */
	inlineCodeTerms?: boolean;
	/** ativa a regra de mencoes a codigo (nomes de arquivo, funcoes...). */
	inlineCodeMentions?: boolean;
	/** preserva blocos de codigo, tabelas, front matter e HTML. padrao: true. */
	protectBlocks?: boolean;
}

/** resultado de uma formatacao, com oq mudou (util pra relatorio/teste). */
export interface FormatResult {
	text: string;
	/** ids das regras que alteraram pelo menos uma linha. */
	appliedRules: string[];
	/** quantas linhas mudaram. */
	changedLines: number;
}

/**
 * classificacao estrutural de uma linha.
 * o scanner e as regras usam pra saber oq e intocavel.
 */
export type ProtectedKind =
	| 'fence'
	| 'frontMatter'
	| 'table'
	| 'html'
	| 'blockquote';
