/**
 * Nível 2 — Parte A (local, determinística, sem IA).
 *
 * Transforma rótulos de definição em código inline:
 *
 *   `Conceito:`            → `` `Conceito`: ``
 *   `GET /users:`          → `` `GET /users`: ``
 *   `timeout_ms:`          → `` `timeout_ms`: ``
 *
 * E menções a código no meio da frase:
 *
 *   "rode o npm install"   → "rode o `npm install`"
 *   "edite extension.ts"   → "edite `extension.ts`"
 *
 * Regras de segurança (o que NÃO deve mudar):
 *  - textos que já têm crase não são tocados;
 *  - linhas de código, tabelas, citações e front matter ficam de fora;
 *  - títulos recebem o rótulo formatado, mas nunca ganham crase extra;
 *  - frases normais não são reescritas: só casamos padrões conhecidos.
 *
 * IMPORTANTE: a regra de crase NUNCA transforma uma linha de parágrafo em
 * título. Ela só mexe em linhas que já passaram pela regra de títulos.
 */

import { isInlineCode, stripIndent, wrapInlineCode } from '../text';

/** Termos que quase sempre são código quando aparecem isolados. */
const CODE_TERM_RE =
	/^[A-Za-z_][A-Za-z0-9_]*(?:[.\-/\\][A-Za-z0-9_.\-/\\]+)*$/;

/**
 * Extensões de arquivo que valem crase quando citadas na frase.
 *
 * Inclui as linguagens de C/C++ (cpp, hpp, cc, h) — faltavam na primeira
 * versão, e `app/jogo.cpp` num README de projeto C++ não recebia crase.
 */
const FILE_EXTENSIONS =
	'md|ts|tsx|js|jsx|mjs|cjs|json|ya?ml|toml|ini|env|css|scss|html|hpp|cpp|cc|cxx|hh|hxx|h|py|rb|go|rs|java|kt|sh|bat|ps1|sql|txt|lock|gitignore|dockerignore|ttf|otf|woff2?|ogg|wav|mp3|png|jpe?g|gif|svg|ico|pdf|vsix';

/**
 * Caminho de arquivo ou diretório citado na frase.
 *
 * O lookbehind permite `../` e `./` (caminhos relativos) mas ainda bloqueia
 * início no meio de outra palavra.
 */
const FILE_MENTION_RE = new RegExp(
	`(?<![\\w\`.])((?:\.{1,2}/|/)?(?:[\\w.\\-]+/)*[\\w.\\-]+\\.(?:${FILE_EXTENSIONS}))(?![\\w\`])`,
	'g',
);

/**
 * Extensão de arquivo SOZINHA citada na frase: "os arquivos .cpp", "um .json".
 *
 * Sem nome antes, `FILE_MENTION_RE` não casa. Mas `.cpp` no meio de uma frase
 * é inequivocamente referência a arquivo — não existe palavra que comece com
 * ponto e seja uma extensão conhecida.
 */
const BARE_EXT_RE = new RegExp(
	`(?<![\\w\`.])[.](?:${FILE_EXTENSIONS})(?![\\w\`])`,
	'g',
);

/**
 * Caminhos de DIRETÓRIO terminados em barra: `../assets/`, `src/core/`.
 *
 * Sem o `/` final não dá para distinguir de uma palavra comum, então só
 * marcamos quando a barra está lá — sinal inequívoco de caminho.
 */
const DIR_MENTION_RE = /(?<![\w`])((?:\.{1,2}\/|\/)?(?:[\w.\-]+\/){1,})(?![\w`])/g;

/**
 * Constantes e identificadores TÉCNICOS no meio da frase.
 *
 * Exige um sinal forte para não marcar palavras comuns: UPPER_SNAKE
 * (`TAM_CELULA`), camelCase (`parseConfig`), snake_case com underscore
 * (`timeout_ms`) ou chamada de função (`preencher_tabuleiro()`).
 */
const IDENTIFIER_RE =
	/(?<![\w`])((?:[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)|(?:[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)|(?:[a-z][a-z0-9]*(?:_[a-z0-9]+)+))(?:\(\))?(?![\w`])/g;

/**
 * Comandos conhecidos que merecem crase quando citados.
 *
 * Cobre também a forma com `sudo` na frente (`sudo apt install ...`), que é
 * como a maioria dos READMEs escreve instruções de instalação.
 */
const COMMAND_RE =
	/(?<!`)\b(?:sudo\s+)?(?:apt(?:-get)?|dnf|yum|pacman|brew|snap|flatpak|npm|npx|pnpm|yarn|pip3?|python3?|node|git|docker|docker-compose|kubectl|helm|cargo|rustc|go|make|cmake|g\+\+|clang|deno|bun|uv)\s+(?:run|install|add|remove|update|upgrade|test|build|init|clone|commit|push|pull|fetch|checkout|rebase|merge|status|log|diff|exec|start|dev|create|new|publish|ci|serve|watch|lint|fmt|clean)\b(?![^\s`]*`)/g;

/**
 * Palavras comuns em português/inglês que aparecem como rótulo de prosa
 * ("Baixar: ...", "Resultado: ..."). Um identificador de código quase nunca
 * coincide com elas, então usamos como veto.
 *
 * Não é uma lista exaustiva: é o suficiente para os falsos positivos reais.
 */
const PROSE_LABEL_WORDS = new Set([
	// português
	'baixar', 'executar', 'entrada', 'saida', 'resultado', 'exemplo', 'nota',
	'ideia', 'estrutura', 'stack', 'conceito', 'atencao', 'aviso', 'cuidado',
	'passo', 'objetivo', 'descricao', 'instalacao', 'configuracao', 'uso',
	'como', 'quando', 'onde', 'porque', 'motivo', 'resumo', 'introducao',
	'requisitos', 'referencia', 'links', 'licenca', 'creditos', 'autor',
	// inglês
	'note', 'warning', 'example', 'input', 'output', 'result', 'summary',
	'steps', 'goal', 'usage', 'install', 'setup', 'requirements', 'license',
	'introduction', 'overview', 'reference', 'caution', 'tip', 'todo',
]);

/** Remove acentos para comparar com a lista de palavras de prosa. */
function deaccent(text: string): string {
	return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Comandos que já carregam o suficiente para valerem crase sozinhos. */
const MENTION_PRONE_COMMANDS = /\b(npm|npx|pnpm|yarn|pip3?|git|docker|kubectl|cargo)\b/;

/**
 * `LABEL_RE` casa o rótulo antes dos dois-pontos. Aceitamos crases dentro
 * dele porque a regra de menções pode ter rodado antes (`npm install:`).
 */
const LABEL_RE = /^([^:]{1,40}?):(?=\s|$)/;

/**
 * `Termo:` → `` `Termo`: ``.
 *
 * Só aplica quando o que vem antes dos dois-pontos "parece código":
 * identificador, caminho, método HTTP ou comando. Rótulos em português com
 * acento ou várias palavras normais ficam como estão.
 */
export function formatDefinitionLabel(line: string): string {
	const indent = line.match(/^[ \t]*/)?.[0] ?? '';
	const body = stripIndent(line);

	// Um TÍTULO não recebe negrito. Ele já é destaque por si só: deixar
	// "# **Feature 1:** Criar botão" é redundante e feio. Mas o código inline
	// ainda vale dentro dele ("## Como usar `npm install`"), então caímos
	// apenas na regra de menções, nunca na de rótulos.
	const headingMatch = body.match(/^(#{1,6}\s+)(.*)$/);
	if (headingMatch) {
		return line;
	}

	return `${indent}${formatLabelInText(body)}`;
}

function formatLabelInText(text: string): string {
	// O rótulo pode vir depois de um marcador de lista: `- Projeto: Sudoku`.
	// `LABEL_RE` é ancorado no início, então recuamos o marcador antes de
	// casar e o devolvemos intacto. Sem isso, o padrão mais comum de um
	// README (lista de rótulos) não recebia negrito nenhum.
	const marker = text.match(/^([ \t]*(?:[-*+]|\d{1,9}[.)\]\-}])[ \t]+)/);
	if (marker) {
		const inner = formatLabelInText(text.slice(marker[1].length));
		return `${marker[1]}${inner}`;
	}

	const match = text.match(LABEL_RE);
	if (!match) {
		return text;
	}

	const label = match[1];
	if (label.length === 0) {
		return text;
	}

	// O rótulo já veio em crase da regra de menções (`npm install:`):
	// basta recolocar os dois-pontos fora do código, sem duplicar crase.
	if (isInlineCode(label)) {
		return text;
	}

	// O rótulo pode conter crase de uma menção no meio (`npm install`):
	// nesse caso envolvemos a coisa toda, dos dois-pontos para fora.
	if (looksLikeCodeLabel(stripBackticks(label)) || (MENTION_PRONE_COMMANDS.test(label) && /\s/.test(label))) {
		const rest = text.slice(label.length + 1);
		return `${wrapInlineCode(stripBackticks(label))}:${rest}`;
	}

	// Rótulo de PROSA em negrito: "Projeto: Sudoku" → "**Projeto:** Sudoku".
	//
	// É o padrão mais visível de um README e o que o offline não fazia. Só
	// aplicamos quando o rótulo é curto e parece um nome de campo, não uma
	// frase inteira que por acaso tem dois-pontos.
	if (isBoldWorthyLabel(label)) {
		const rest = text.slice(label.length + 1);
		return `**${label}:**${rest}`;
	}

	return text;
}

/**
 * Decide se um rótulo de prosa merece negrito.
 *
 * Critérios (todos precisam valer):
 *  - 1 a 4 palavras: rótulos de campo são curtos ("Sistema operacional",
 *    "Fonts e assets"). "o que eu quis dizer com isso" não é rótulo;
 *  - não termina em pontuação de frase;
 *  - não é uma frase com verbo no meio (heurística: sem vírgula);
 *  - não começa com artigo/preposição solta ("o", "a", "de", "em"...), que
 *    indica que o dois-pontos faz parte da frase e não de um rótulo;
 *  - não é uma linha de código nem contém crase.
 */
function isBoldWorthyLabel(label: string): boolean {
	const clean = label.trim();
	if (clean.length === 0 || clean.length > 40) {
		return false;
	}
	if (clean.includes('`') || clean.includes('*') || clean.includes('_')) {
		return false;
	}
	if (clean.includes(',') || /[.!?]$/.test(clean)) {
		return false;
	}
	// Já é rótulo em negrito: não duplica.
	if (/^\*\*.*\*\*$/.test(clean)) {
		return false;
	}

	const words = clean.split(/\s+/);
	if (words.length > 4) {
		return false;
	}

	// Artigo/preposição/conjunção no início indica prosa, não rótulo.
	const first = deaccent(words[0].toLowerCase());
	if (BOLD_LABEL_STOPWORDS.has(first)) {
		return false;
	}

	// Precisa começar com maiúscula: rótulos começam capitalizados.
	if (!/^[A-ZÀ-Þ]/.test(clean)) {
		return false;
	}

	// Rótulo com palavra interrogativa no início é pergunta/frase, não campo:
	// "Como isso funciona:" e "Por que usar:" são prosa.
	const interrogative = /^(como|por que|porque|quando|onde|qual|quais|quem|o que|what|how|why|when|where|which|who)\b/i;
	if (interrogative.test(clean)) {
		return false;
	}

	// Frase que COMEÇA com verbo no imperativo é instrução, não rótulo:
	// "Veja o exemplo abaixo:" e "Considere o seguinte:" são prosa.
	// Rótulos de campo começam com substantivo ("Projeto", "Fonts e assets").
	if (IMPERATIVE_STARTS.has(deaccent(words[0].toLowerCase()))) {
		return false;
	}

	return true;
}

/**
 * Verbos que, no início, denunciam instrução/frase em vez de rótulo.
 * Lista pequena e de alta precisão: só o que aparece de fato como falso
 * positivo. Um rótulo de verdade ("Projeto", "Execução") não está aqui.
 */
const IMPERATIVE_STARTS = new Set([
	'veja', 'vejam', 'considere', 'confira', 'note', 'observe', 'lembre',
	'use', 'utilize', 'prefira', 'evite', 'mantenha', 'escolha', 'acesse',
	'see', 'note', 'consider', 'remember', 'use', 'check', 'keep', 'avoid',
]);

/**
 * Palavras que, no início, indicam frase e não rótulo de campo.
 * Conservador de propósito: falso negativo (não botar negrito) é barato;
 * falso positivo (botar negrito numa frase) incomoda.
 */
const BOLD_LABEL_STOPWORDS = new Set([
	'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em',
	'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'que', 'se',
	'the', 'a', 'an', 'of', 'in', 'on', 'for', 'with', 'to', 'this', 'that',
	'it', 'if', 'when', 'where', 'how', 'why', 'is', 'are',
]);

/** Remove crases para inspeção do conteúdo. */
function stripBackticks(text: string): string {
	return text.replace(/`/g, '');
}

/** Decide se o rótulo é "coisa de código" e não prosa. */
export function looksLikeCodeLabel(label: string): boolean {
	const trimmed = label.trim();
	if (trimmed.length === 0) {
		return false;
	}
	// URL não leva crase: `https:` viraria lixo.
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
		return false;
	}
	// Número puro (ex.: `1:` em enumeração) não é código.
	if (/^\d+$/.test(trimmed)) {
		return false;
	}
	// Prosa: "Baixar:", "Resultado:", "Nota:" são rótulos de texto, não código.
	if (PROSE_LABEL_WORDS.has(deaccent(trimmed.toLowerCase()))) {
		return false;
	}
	// Método HTTP ou verbo de API seguido de rota: `GET /users`, `POST /v1/x`.
	if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+$/.test(trimmed)) {
		return true;
	}
	// Caminho, arquivo ou membro: `src/core`, `index.ts`, `obj.method`.
	// Vem ANTES do identificador simples, porque `index.ts` também casaria.
	if (CODE_TERM_RE.test(trimmed) && /[.\-_/\\]/.test(trimmed)) {
		return true;
	}
	// Identificador único (`timeout`, `parseConfig`, `MAX_RETRIES`), mas só
	// quando traz pista de código: underscore, camelCase ou CAIXA ALTA.
	if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
		const hasUnderscore = trimmed.includes('_');
		const isCamelCase = /[a-z][A-Z]/.test(trimmed);
		const isUpperSnake = /^[A-Z0-9_]+$/.test(trimmed) && trimmed.length > 1;
		return hasUnderscore || isCamelCase || isUpperSnake;
	}
	return false;
}

/** Aplica crase em arquivos e comandos citados no meio da frase. */
export function formatInlineMentions(line: string): string {
	let result = line;

	// Evita mexer em linhas que já usam crase de forma "densa".
	if ((result.match(/`/g) ?? []).length >= 2 && result.includes('`')) {
		// Ainda permitimos comandos, mas nunca dentro de trechos já em crase.
		result = result.replace(COMMAND_RE, (match) => wrapInlineCode(match));
		return result;
	}

	result = result.replace(COMMAND_RE, (match) => wrapInlineCode(match));
	result = result.replace(FILE_MENTION_RE, (match, file: string) => {
		if (match.startsWith('`') || file.startsWith('http')) {
			return match;
		}
		return wrapInlineCode(file);
	});
	result = result.replace(BARE_EXT_RE, (match) => wrapInlineCode(match));
	result = result.replace(DIR_MENTION_RE, (match, dir: string) => {
		// Só caminhos que começam com `.` ou `/` — um `algo/` solto no meio
		// de uma frase é ambíguo demais ("e/ou", "HTTP/2").
		if (dir.startsWith('http')) {
			return match;
		}
		return wrapInlineCode(dir);
	});
	result = result.replace(IDENTIFIER_RE, (match) => {
		// Não marcar palavras que são só um nome próprio capitalizado comum.
		if (PROSE_LABEL_WORDS.has(deaccent(match.replace(/\(\)$/, '').toLowerCase()))) {
			return match;
		}
		return wrapInlineCode(match);
	});

	return result;
}

export const inlineCodeRule = {
	id: 'inline-code',

	apply(line: string, _index: number, _doc: string[], _ctx: unknown, options: { inlineCodeTerms?: boolean; inlineCodeMentions?: boolean }): string {
		if (line.trim().length === 0) {
			return line;
		}
		let result = line;
		if (options.inlineCodeMentions) {
			result = formatInlineMentions(result);
		}
		if (options.inlineCodeTerms) {
			result = formatDefinitionLabel(result);
		}
		return result;
	},
};
