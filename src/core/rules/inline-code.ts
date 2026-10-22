/**
 * nivel 2 — parte A (local, deterministica, sem IA).
 *
 * transforma rotulo de definicao em codigo inline:
 *
 *   `Conceito:`            -> `` `Conceito`: ``
 *   `GET /users:`          -> `` `GET /users`: ``
 *   `timeout_ms:`          -> `` `timeout_ms`: ``
 *
 * e menciona codigo no meio da frase:
 *
 *   "rode o npm install"   -> "rode o `npm install`"
 *   "edite extension.ts"   -> "edite `extension.ts`"
 *
 * cuidados:
 *  - texto que ja tem crase nao e tocado;
 *  - linha de codigo, tabela, citacao e front matter ficam de fora;
 *  - titulo recebe o rotulo formatado, mas nunca ganha crase extra;
 *  - frase normal nao e reescrita: so casa padrao conhecido.
 *
 * importante: a regra de crase NUNCA vira linha de paragrafo em titulo.
 * ela so mexe em linha que ja passou pela regra de titulos.
 */

import { isInlineCode, stripIndent, wrapInlineCode } from '../text';

/** termo que quase sempre e codigo quando aparece isolado. */
const CODE_TERM_RE =
	/^[A-Za-z_][A-Za-z0-9_]*(?:[.\-/\\][A-Za-z0-9_.\-/\\]+)*$/;

/**
 * extensao de arquivo que vale crase quando citada na frase.
 *
 * inclui as linguagens de C/C++ (cpp, hpp, cc, h) — faltavam na primeira
 * versao, e `app/jogo.cpp` num README de projeto C++ nao recebia crase.
 */
const FILE_EXTENSIONS =
	'md|ts|tsx|js|jsx|mjs|cjs|json|ya?ml|toml|ini|env|css|scss|html|hpp|cpp|cc|cxx|hh|hxx|h|py|rb|go|rs|java|kt|sh|bat|ps1|sql|txt|lock|gitignore|dockerignore|ttf|otf|woff2?|ogg|wav|mp3|png|jpe?g|gif|svg|ico|pdf|vsix';

/**
 * caminho de arquivo ou diretorio citado na frase.
 *
 * o lookbehind libera `../` e `./` (caminho relativo) mas ainda bloqueia
 * inicio no meio de outra palavra.
 */
const FILE_MENTION_RE = new RegExp(
	`(?<![\\w\`.])((?:\.{1,2}/|/)?(?:[\\w.\\-]+/)*[\\w.\\-]+\\.(?:${FILE_EXTENSIONS}))(?![\\w\`])`,
	'g',
);

/**
 * extensao de arquivo SOZINHA citada na frase: "os arquivos .cpp", "um .json".
 *
 * sem nome antes o `FILE_MENTION_RE` nao casa. mas `.cpp` no meio da frase e
 * referencia a arquivo sem duvida — nao existe palavra que comece com ponto e
 * seja uma extensao conhecida.
 */
const BARE_EXT_RE = new RegExp(
	`(?<![\\w\`.])[.](?:${FILE_EXTENSIONS})(?![\\w\`])`,
	'g',
);

/**
 * caminho de DIRETORIO terminado em barra: `../assets/`, `src/core/`.
 *
 * sem o `/` final nao da pra distinguir de palavra comum, entao so marca
 * quando a barra ta la — sinal sem duvida de caminho.
 */
const DIR_MENTION_RE = /(?<![\w`])((?:\.{1,2}\/|\/)?(?:[\w.\-]+\/){1,})(?![\w`])/g;

/**
 * constante e identificador TECNICO no meio da frase.
 *
 * exige sinal forte pra nao marcar palavra comum: UPPER_SNAKE
 * (`TAM_CELULA`), camelCase (`parseConfig`), snake_case com underscore
 * (`timeout_ms`) ou chamada de funcao (`preencher_tabuleiro()`).
 */
const IDENTIFIER_RE =
	/(?<![\w`])((?:[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)|(?:[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)|(?:[a-z][a-z0-9]*(?:_[a-z0-9]+)+))(?:\(\))?(?![\w`])/g;

/**
 * comando conhecido que merece crase quando citado.
 *
 * cobre tambem a forma com `sudo` na frente (`sudo apt install ...`), que e
 * como a maioria dos README escreve instrucao de instalacao.
 */
const COMMAND_RE =
	/(?<!`)\b(?:sudo\s+)?(?:apt(?:-get)?|dnf|yum|pacman|brew|snap|flatpak|npm|npx|pnpm|yarn|pip3?|python3?|node|git|docker|docker-compose|kubectl|helm|cargo|rustc|go|make|cmake|g\+\+|clang|deno|bun|uv)\s+(?:run|install|add|remove|update|upgrade|test|build|init|clone|commit|push|pull|fetch|checkout|rebase|merge|status|log|diff|exec|start|dev|create|new|publish|ci|serve|watch|lint|fmt|clean)\b(?![^\s`]*`)/g;

/**
 * palavra comum em portugues/ingles que aparece como rotulo de prosa
 * ("Baixar: ...", "Resultado: ..."). um identificador de codigo quase nunca
 * coincide com elas, entao usa como veto.
 *
 * nao e lista exaustiva: e o suficiente pros falsos positivos reais.
 */
const PROSE_LABEL_WORDS = new Set([
	// portugues
	'baixar', 'executar', 'entrada', 'saida', 'resultado', 'exemplo', 'nota',
	'ideia', 'estrutura', 'stack', 'conceito', 'atencao', 'aviso', 'cuidado',
	'passo', 'objetivo', 'descricao', 'instalacao', 'configuracao', 'uso',
	'como', 'quando', 'onde', 'porque', 'motivo', 'resumo', 'introducao',
	'requisitos', 'referencia', 'links', 'licenca', 'creditos', 'autor',
	// ingles
	'note', 'warning', 'example', 'input', 'output', 'result', 'summary',
	'steps', 'goal', 'usage', 'install', 'setup', 'requirements', 'license',
	'introduction', 'overview', 'reference', 'caution', 'tip', 'todo',
]);

/** tira acento pra comparar com a lista de palavras de prosa. */
function deaccent(text: string): string {
	return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** comando que ja carrega o suficiente pra valer crase sozinho. */
const MENTION_PRONE_COMMANDS = /\b(npm|npx|pnpm|yarn|pip3?|git|docker|kubectl|cargo)\b/;

/**
 * `LABEL_RE` casa o rotulo antes dos dois-pontos. aceita crase dentro dele
 * porque a regra de mencoes pode ter rodado antes (`npm install:`).
 */
const LABEL_RE = /^([^:]{1,40}?):(?=\s|$)/;

/**
 * `Termo:` -> `` `Termo`: ``.
 *
 * so aplica quando oq vem antes dos dois-pontos "parece codigo":
 * identificador, caminho, metodo HTTP ou comando. rotulo em portugues com
 * acento ou varias palavras normais ficam como tao.
 */
export function formatDefinitionLabel(line: string): string {
	const indent = line.match(/^[ \t]*/)?.[0] ?? '';
	const body = stripIndent(line);

	// titulo nao recebe negrito. ele ja e destaque sozinho: deixar
	// "# **Feature 1:** Criar botao" e redundante e feio. mas o codigo inline
	// ainda vale dentro dele ("## Como usar `npm install`"), entao caimos
	// so na regra de mencoes, nunca na de rotulos.
	const headingMatch = body.match(/^(#{1,6}\s+)(.*)$/);
	if (headingMatch) {
		return line;
	}

	return `${indent}${formatLabelInText(body)}`;
}

function formatLabelInText(text: string): string {
	// o rotulo pode vir depois de um marcador de lista: `- Projeto: Sudoku`.
	// `LABEL_RE` e ancorado no inicio, entao recua o marcador antes de casar
	// e devolve ele intacto. sem isso o padrao mais comum de um README (lista
	// de rotulos) nao recebia negrito nenhum.
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

	// o rotulo ja veio em crase da regra de mencoes (`npm install:`):
	// basta recolocar os dois-pontos fora do codigo, sem duplicar crase.
	if (isInlineCode(label)) {
		return text;
	}

	// o rotulo pode conter crase de uma mencao no meio (`npm install`):
	// nesse caso envolve a coisa toda, dos dois-pontos pra fora.
	if (looksLikeCodeLabel(stripBackticks(label)) || (MENTION_PRONE_COMMANDS.test(label) && /\s/.test(label))) {
		const rest = text.slice(label.length + 1);
		return `${wrapInlineCode(stripBackticks(label))}:${rest}`;
	}

	// rotulo de PROSA em negrito: "Projeto: Sudoku" -> "**Projeto:** Sudoku".
	//
	// e o padrao mais visivel de um README e oq o offline nao fazia. so aplica
	// quando o rotulo e curto e parece nome de campo, nao uma frase inteira que
	// por acaso tem dois-pontos.
	if (isBoldWorthyLabel(label)) {
		const rest = text.slice(label.length + 1);
		return `**${label}:**${rest}`;
	}

	return text;
}

/**
 * decide se um rotulo de prosa merece negrito.
 *
 * criterios (todos precisam valer):
 *  - 1 a 4 palavras: rotulo de campo e curto ("Sistema operacional",
 *    "Fonts e assets"). "oq eu quis dizer com isso" nao e rotulo;
 *  - nao termina em pontuacao de frase;
 *  - nao e frase com verbo no meio (heuristica: sem virgula);
 *  - nao comeca com artigo/preposicao solta ("o", "a", "de", "em"...), que
 *    indica que os dois-pontos fazem parte da frase e nao de um rotulo;
 *  - nao e linha de codigo nem contem crase.
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
	// ja e rotulo em negrito: nao duplica.
	if (/^\*\*.*\*\*$/.test(clean)) {
		return false;
	}

	const words = clean.split(/\s+/);
	if (words.length > 4) {
		return false;
	}

	// artigo/preposicao/conjuncao no inicio indica prosa, nao rotulo.
	const first = deaccent(words[0].toLowerCase());
	if (BOLD_LABEL_STOPWORDS.has(first)) {
		return false;
	}

	// precisa comecar com maiuscula: rotulo comeca capitalizado.
	// (o `À-Þ` da regex cobre letra acentuada maiuscula.)
	if (!/^[A-ZÀ-Þ]/.test(clean)) {
		return false;
	}

	// rotulo com palavra interrogativa no inicio e pergunta/frase, nao campo:
	// "Como isso funciona:" e "Por que usar:" sao prosa.
	const interrogative = /^(como|por que|porque|quando|onde|qual|quais|quem|o que|what|how|why|when|where|which|who)\b/i;
	if (interrogative.test(clean)) {
		return false;
	}

	// frase que COMECA com verbo no imperativo e instrucao, nao rotulo:
	// "Veja o exemplo abaixo:" e "Considere o seguinte:" sao prosa.
	// rotulo de campo comeca com substantivo ("Projeto", "Fonts e assets").
	if (IMPERATIVE_STARTS.has(deaccent(words[0].toLowerCase()))) {
		return false;
	}

	return true;
}

/**
 * verbo que, no inicio, entrega instrucao/frase em vez de rotulo.
 * lista pequena e precisa: so oq aparece de fato como falso positivo.
 * rotulo de verdade ("Projeto", "Execucao") nao ta aqui.
 */
const IMPERATIVE_STARTS = new Set([
	'veja', 'vejam', 'considere', 'confira', 'note', 'observe', 'lembre',
	'use', 'utilize', 'prefira', 'evite', 'mantenha', 'escolha', 'acesse',
	'see', 'note', 'consider', 'remember', 'use', 'check', 'keep', 'avoid',
]);

/**
 * palavra que, no inicio, indica frase e nao rotulo de campo.
 * conservador de proposito: falso negativo (nao botar negrito) e barato;
 * falso positivo (botar negrito numa frase) incomoda.
 */
const BOLD_LABEL_STOPWORDS = new Set([
	'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em',
	'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'que', 'se',
	'the', 'a', 'an', 'of', 'in', 'on', 'for', 'with', 'to', 'this', 'that',
	'it', 'if', 'when', 'where', 'how', 'why', 'is', 'are',
]);

/** tira as crases pra inspecionar o conteudo. */
function stripBackticks(text: string): string {
	return text.replace(/`/g, '');
}

/** decide se o rotulo e "coisa de codigo" e nao prosa. */
export function looksLikeCodeLabel(label: string): boolean {
	const trimmed = label.trim();
	if (trimmed.length === 0) {
		return false;
	}
	// URL nao leva crase: `https:` viraria lixo.
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
		return false;
	}
	// numero puro (ex.: `1:` em enumeracao) nao e codigo.
	if (/^\d+$/.test(trimmed)) {
		return false;
	}
	// prosa: "Baixar:", "Resultado:", "Nota:" sao rotulo de texto, nao codigo.
	if (PROSE_LABEL_WORDS.has(deaccent(trimmed.toLowerCase()))) {
		return false;
	}
	// metodo HTTP ou verbo de API seguido de rota: `GET /users`, `POST /v1/x`.
	if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+$/.test(trimmed)) {
		return true;
	}
	// caminho, arquivo ou membro: `src/core`, `index.ts`, `obj.method`.
	// vem ANTES do identificador simples, porque `index.ts` tambem casaria.
	if (CODE_TERM_RE.test(trimmed) && /[.\-_/\\]/.test(trimmed)) {
		return true;
	}
	// identificador unico (`timeout`, `parseConfig`, `MAX_RETRIES`), mas so
	// quando traz pista de codigo: underscore, camelCase ou CAIXA ALTA.
	if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
		const hasUnderscore = trimmed.includes('_');
		const isCamelCase = /[a-z][A-Z]/.test(trimmed);
		const isUpperSnake = /^[A-Z0-9_]+$/.test(trimmed) && trimmed.length > 1;
		return hasUnderscore || isCamelCase || isUpperSnake;
	}
	return false;
}

/** poe crase em arquivo e comando citado no meio da frase. */
export function formatInlineMentions(line: string): string {
	let result = line;

	// nao mexe em linha que ja usa crase de forma "densa".
	if ((result.match(/`/g) ?? []).length >= 2 && result.includes('`')) {
		// comando ainda passa, mas nunca dentro de trecho ja em crase.
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
		// so caminho que comeca com `.` ou `/`. um `algo/` solto no meio
		// da frase e ambiguo demais ("e/ou", "HTTP/2").
		if (dir.startsWith('http')) {
			return match;
		}
		return wrapInlineCode(dir);
	});
	result = result.replace(IDENTIFIER_RE, (match) => {
		// nao marca palavra que e so um nome proprio capitalizado comum.
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
