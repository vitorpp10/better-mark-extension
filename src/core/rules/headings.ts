/**
 * Nível 1 — Títulos.
 *
 * A pergunta central não é "como fazer regex?", é:
 * **quais linhas realmente são um título?**
 *
 * Regras (todas precisam passar — a lista de "não deve mudar" é tão
 * importante quanto a de "deve mudar"):
 *
 *  DEVE virar título:
 *   - linha curta (≤ 80 colunas), sem pontuação final de frase
 *   - primeira linha de uma seção, seguida por linha em branco ou por conteúdo
 *
 *  NÃO DEVE mudar:
 *   - parágrafos longos ou com pontuação final (. ! ? , ; :)
 *   - linhas que já são título (`#`, `##`...)
 *   - itens de lista, citações, tabelas, código
 *   - linhas de continuação de um parágrafo anterior
 *   - a maioria das linhas de um bloco (apenas a primeira vira título)
 */

import type { FormatContext, FormatOptions } from '../types';
import { isBlank, stripInlineFormatting } from '../text';
import { isListItem } from '../scanner';

const EXISTING_HEADING_RE = /^ {0,3}(#{1,6})(\s|$)/;
const MAX_HEADING_LENGTH = 80;
/**
 * A partir deste tamanho a linha "já é uma frase": 80 é o limite duro do
 * markdown, mas frases reais começam bem antes. Sem isso, subtítulos
 * descritivos como "Health check failed because the database is unavailable"
 * virariam `#` — exatamente o falso positivo que queremos evitar.
 */
const PROSE_LENGTH = 60;

/**
 * Conectivos que praticamente só aparecem em frase, nunca em título.
 * "and"/"but"/"because" em inglês e os equivalentes em português.
 */
const PROSE_CONNECTIVES =
	/\b(because|and|but|however|although|therefore|que|porque|pois|quando|enquanto|embora|portanto|porém)\b/i;

/**
 * Número de palavras acima do qual a linha é prosa, não título.
 * Títulos de verdade são curtos; 10 palavras já é generoso.
 */
const MAX_HEADING_WORDS = 10;
/** Marcador de item de lista em qualquer nível. */
const ORDERED_OR_BULLET_RE = /^([ \t]*)([-*+]|\d{1,9}[.)\]\-}])[ \t]+/;

/**
 * True quando a linha contém ênfase inline (`**negrito**`, `__negrito__`,
 * `*itálico*`, `_itálico_`, `~~tachado~~`).
 *
 * Usado como VETO de título: um título raramente tem ênfase, mas uma frase
 * de prosa frequentemente tem. Sem este veto, "Vamos usar o **negrito**
 * aqui" virava "# Vamos usar o negrito aqui".
 *
 * Cuidado com `*` de lista: um item `* comprado` NÃO é itálico. Por isso o
 * par de asteriscos precisa estar dentro da linha, com conteúdo entre eles.
 */
export function hasInlineEmphasis(text: string): boolean {
	const body = text.replace(/^[ \t]*([-*+]|\d{1,9}[.)\]\-}])[ \t]+/, '');
	return (
		/\*\*[^*\n]+\*\*/.test(body) ||
		/__[^_\n]+__/.test(body) ||
		/~~[^~\n]+~~/.test(body) ||
		/(?<![*\w])\*[^*\s][^*\n]*\*(?![*\w])/.test(body) ||
		/(?<![_\w])_[^_\s][^_\n]*_(?![_\w])/.test(body)
	);
}

export const headingsRule = {
	id: 'headings',

	apply(line: string, index: number, doc: string[], ctx: FormatContext, options: Required<FormatOptions>): string {
		if (isBlank(line)) {
			return line;
		}

		// Já é título: registra o nível para inferir os próximos e não mexe.
		const existing = line.match(EXISTING_HEADING_RE);
		if (existing) {
			ctx.state.existingLevels.push(existing[1].length);
			ctx.state.headingEmitted = true;
			return line;
		}

		// Nunca transformar item de lista em título.
		if (isListItem(line)) {
			return line;
		}

		// Só a PRIMEIRA linha de um bloco pode virar título. Se a linha
		// anterior é texto (não vazia, não lista), isto é continuação.
		if (index > 0 && !isBlank(doc[index - 1])) {
			return line;
		}

		// Um título nunca é seguido imediatamente por texto sem linha em branco:
		// isso é o padrão de um parágrafo sendo "fatiado".
		if (index + 1 < doc.length && !isBlank(doc[index + 1])) {
			return line;
		}

		// A DECISÃO usa a linha CRUA, não a aparada: o recuo é parte da
		// informação ("  texto" é lista/continuação, não título). Só o
		// conteúdo aparado é que vai para o heading emitido.
		if (!isHeadingLike(line)) {
			return line;
		}

		const result = line.trim();
		const indent = '';
		const level = resolveLevel(ctx, options);
		ctx.state.headingEmitted = true;
		return `${indent}${'#'.repeat(level)} ${result}`;
	},
};

/**
 * Uma linha é "cara de título"?
 *
 * Casos que passam: `Health check`, `Database health check`, `Como usar`,
 * `Configuração da API`, `Nível 1`.
 *
 * Casos que NÃO passam: parágrafos (longos ou terminados em pontuação de
 * frase), listas, blocos, linhas de rótulo (`Baixar: algo`) e — bug corrigido
 * na v0.3.0 — frases de prosa que contêm formatação inline.
 */
export function isHeadingLike(text: string): boolean {
	// Linha INDENTADA não é título. Um recuo no início significa lista,
	// continuação de item ou bloco — nunca um heading. Sem este veto,
	// "    so uma linha aqui" (indentada) virava "# so uma linha aqui",
	// promovendo um trecho de texto colado a título do documento.
	if (/^[ \t]/.test(text)) {
		return false;
	}

	// BUG CORRIGIDO: antes usávamos `stripInlineFormatting` e decidíamos sobre
	// o texto "limpo". Assim, "Vamos usar o **negrito** aqui" virava
	// "# Vamos usar o negrito aqui" — uma frase de prosa promovida a título.
	// Título de verdade quase nunca tem ênfase, então a presença de
	// formatação inline é um sinal FORTE de prosa. Verificamos no texto cru.
	if (hasInlineEmphasis(text)) {
		return false;
	}

	const plain = stripInlineFormatting(text).trim();
	if (plain.length === 0 || plain.length > MAX_HEADING_LENGTH) {
		return false;
	}
	// Título não termina em pontuação de frase nem em vírgula/dois-pontos.
	if (/[.!?,;:]$/.test(plain)) {
		return false;
	}
	// Linha com `rotulo: valor` é definição/prosa, não título. Um título
	// verdadeiro com dois-pontos no meio (`API: guia rápido`) também cai
	// aqui — é uma perda aceitável para não estragar texto corrido.
	if (/^[^\s:][^:]{0,39}:\s+\S/.test(plain)) {
		return false;
	}
	// Proporção/medida (`16:9 proporcao`, `3:2 tela`) e horário (`10:30
	// reunião`) têm dois-pontos colado, sem espaço — o teste acima não pega.
	if (/^\d+:\d+/.test(plain)) {
		return false;
	}
	// Não pode conter quebras internas.
	if (plain.includes('\n')) {
		return false;
	}
	// Precisa ter pelo menos uma letra ou número.
	if (!/[\p{L}\p{N}]/u.test(plain)) {
		return false;
	}

	// --- Daqui para baixo: heurísticas de "isto é prosa, não título" ---
	// Nenhuma delas depende do tamanho: uma frase curta com conectivo
	// ("Health check failed because the database is gone") também é prosa.
	if (PROSE_CONNECTIVES.test(plain)) {
		return false;
	}
	// Muitas palavras = frase. Títulos são curtos.
	if (plain.split(/\s+/).length > MAX_HEADING_WORDS) {
		return false;
	}
	// Linha comprida começando com minúscula: quase certamente continuação
	// de frase ou texto corrido.
	if (plain.length > PROSE_LENGTH && /^[a-zà-öø-ÿ]/.test(plain)) {
		return false;
	}
	return true;
}

/**
 * Decide o nível do heading.
 *
 * - `options.headingLevel` entre 1 e 6 vence;
 * - `0` (padrão) = inferir do documento: usa o menor nível já presente;
 * - sem nenhum heading no trecho, usa 1.
 */
function resolveLevel(ctx: FormatContext, options: Required<FormatOptions>): number {
	const explicit = options.headingLevel;
	if (explicit >= 1 && explicit <= 6) {
		return explicit;
	}
	if (ctx.state.existingLevels.length > 0) {
		return Math.min(...ctx.state.existingLevels);
	}
	return 1;
}

/** Reexportado para os testes explorarem a regex de item de lista. */
export { ORDERED_OR_BULLET_RE };
