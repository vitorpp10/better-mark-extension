/**
 * servico de ia — orquestra blindagem, chamada e validacao.
 *
 * fluxo completo (e porque cada passo existe):
 *
 *   selecao do user
 *     ↓
 *   [1] shieldProtectedBlocks   → tira codigo/tabela/front matter da vista
 *     ↓                           da ia e poe sentinela no lugar
 *   [2] runDeterministicFirst   → roda o nivel 1+2A na prosa que sobrou,
 *     ↓                           de graca e sem risco de alucinacao
 *   [3] AiProvider.format       → a ia reestrutura so a prosa
 *     ↓
 *   [4] restoreProtectedBlocks  → devolve os blocos originais intactos
 *     ↓
 *   [5] validacoes finais       → tamanho, recusa, estrutura protegida
 *     ↓
 *   markdown final (ou nada, se alguma validacao reprovar)
 *
 * licao de teste real: o modelo destruiu bloco de codigo, tabela e fundiu
 * paragrafo, mesmo com prompt mandando preservar. prompt e a segunda linha de
 * defesa; a primeira e NUNCA deixar o modelo ver oq e fragil.
 */

import type * as vscode from 'vscode';
import { AiError, AiProvider, stripCodeFence } from './provider';
import { getProvider, isKeylessProvider } from './registry';
import { formatMarkdown } from '../core/formatter';
import type { FormatOptions } from '../core/types';
import {
	compareProtectedStructure,
	restoreProtectedBlocks,
	shieldProtectedBlocks,
} from './shield';

export interface AiFormatterSettings {
	providerId: string;
	model: string;
	apiKey: string;
	timeoutMs: number;
	baseUrl?: string;
	/** id da instalacao, usado so pelo provedor `proxy`. */
	installId?: string;
	/** instrucoes extras que vem da config do user. */
	instructions?: string;
	/** opcoes do formatador deterministico rodado antes da ia. */
	formatOptions?: FormatOptions;
	/** intensidade da deducao de enfase (`off` | `safe` | `deduce`). */
	emphasis?: 'off' | 'safe' | 'deduce';
	/**
	 * `preserve` (padrao) garante que nenhuma palavra muda.
	 * `restructure` deixa reestruturar a prosa — so use em texto que ainda
	 * NAO e markdown. nesse modo `compareWords` nao se aplica.
	 */
	mode?: 'preserve' | 'restructure';
}

/** validacao de seguranca da resposta do modelo. */
export interface ValidationResult {
	ok: boolean;
	reason?: string;
}

/** relatorio do que rolou, serve pra log e pra mensagem pro user. */
export interface AiFormatReport {
	markdown: string;
	model: string;
	usage?: { inputTokens?: number; outputTokens?: number };
	/** blocos que ficaram fora da vista da ia. */
	shieldedBlocks: number;
	/** linhas de prosa que o formatador offline ja resolveu. */
	deterministicChanges: number;
}

export class AiFormatter {
	constructor(private readonly log: (message: string) => void) {}

	/** provedor resolvido a partir das configs. */
	provider(settings: AiFormatterSettings): AiProvider {
		return getProvider(settings.providerId);
	}

	/**
	 * formata um trecho com ia.
	 *
	 * `token` e o CancellationToken do VS Code: o user cancela pela barra de
	 * progresso e a request HTTP e abortada de verdade.
	 */
	async format(
		text: string,
		settings: AiFormatterSettings,
		token?: vscode.CancellationToken,
	): Promise<AiFormatReport> {
		const provider = this.provider(settings);

		// o provedor `proxy` nao exige chave: ela vive no nosso servidor. so os
		// provedores diretos (River, DeepSeek, OpenAI...) precisam dela.
		if (!settings.apiKey && !isKeylessProvider(provider.id)) {
			throw new AiError('missing-key', `No API key for ${provider.label}.`);
		}
		if (text.trim().length === 0) {
			throw new AiError('bad-response', 'Nothing selected.');
		}

		// [1] blindagem: a ia so ve prosa.
		const shielded = shieldProtectedBlocks(text);
		this.log(
			`blindagem: ${shielded.blocks.length} bloco(s) protegido(s) ` +
				`(${shielded.blocks.map((b) => b.kind).join(', ') || 'nenhum'})`,
		);

		// [2] o deterministico roda PRIMEIRO: e gratis, e confiavel, e resolve
		// os casos que o modelo errou (ex.: `2- item` → `2. item`).
		const preFormatted = formatMarkdown(shielded.text, {
			...settings.formatOptions,
			protectBlocks: true,
		});
		this.log(`pré-formatação offline: ${preFormatted.changedLines} linha(s)`);

		// se so tem bloco protegido, nao tem oq a ia fazer.
		if (preFormatted.text.trim().length === 0) {
			throw new AiError('bad-response', 'The selection contains only protected blocks.');
		}

		// [3] chamada a ia.
		const controller = new AbortController();
		const disposable = token?.onCancellationRequested(() => controller.abort());

		try {
			const response = await provider.format(
				{
					text: preFormatted.text,
					instructions: settings.instructions,
					signal: controller.signal,
					emphasis: settings.emphasis ?? 'deduce',
					mode: settings.mode ?? 'preserve',
				},
				{
					apiKey: settings.apiKey,
					model: settings.model || provider.defaultModel,
					timeoutMs: settings.timeoutMs,
					baseUrl: settings.baseUrl,
					installId: settings.installId,
				},
			);

			const candidate = stripCodeFence(response.markdown);

			// o modelo sinaliza texto vazio/ininteligivel com esse marcador, em
			// vez de devolver uma resposta inutil que passaria adiante.
			if (candidate.trim() === 'ERRO_SEM_TEXTO') {
				throw new AiError('bad-response', 'Empty or unreadable text.');
			}

			// [4] devolve os blocos originais no lugar dos sentinelas.
			const restored = restoreProtectedBlocks(shielded, candidate);
			if (!restored.ok) {
				throw new AiError(
					'bad-response',
					`A IA não preservou os marcadores de bloco protegido ` +
						`(${describeRestoreFailure(restored)}). Nothing was changed.`,
				);
			}

			// [5] validacoes finais.
			const validation = validateAiResult(preFormatted.text, restored.text);
			if (!validation.ok) {
				throw new AiError(
					'bad-response',
					`Rejected by validation (${validation.reason}). Nothing was changed.`,
				);
			}

			// segunda barreira, independente: a estrutura fragil sobreviveu?
			const structure = compareProtectedStructure(text, restored.text);
			if (!structure.ok) {
				throw new AiError(
					'bad-response',
					`Rejected: ${structure.reason}. Nothing was changed.`,
				);
			}

			// terceira barreira: a ia pode ter acrescentado MARCADOR de
			// formatacao, mas nao pode ter mudado as PALAVRA.
			//
			// importante: essa barreira so existe no modo `preserve`. no modo
			// `restructure` a ia PRECISA reescrever a estrutura da prosa (e o
			// ponto do modo), entao comparar palavra reprovaria toda resposta
			// correta. a troca e consciente: `restructure` e pra texto que
			// ainda nao e markdown, e o user e avisado de que a ia vai mexer
			// mais.
			//
			// a gente compara a PROSA blindada (`preFormatted.text`) com a
			// resposta ANTES de recolocar os blocos (`candidate`): os dois
			// lados entao ficam na mesma unidade, com os blocos representados
			// por sentinela. comparar depois da recolocacao poria o conteudo
			// real de um lado e sentinela do outro, reprovando toda resposta
			// por falso positivo.
			const aiMode = settings.mode ?? 'preserve';
			if (aiMode === 'preserve') {
				const words = compareWords(preFormatted.text, candidate);
				if (!words.ok) {
					throw new AiError(
						'bad-response',
						`Rejected: the AI changed the text, not just the formatting ` +
							`(${words.reason}). Nothing was changed.`,
					);
				}
			} else {
				// no modo restructure, ao menos garante que nada foi RESUMIDO.
				const content = validateContentPreserved(preFormatted.text, candidate);
				if (!content.ok) {
					throw new AiError(
						'bad-response',
						`Rejected: ${content.reason}. Nothing was changed.`,
					);
				}
			}

			this.log(
				`IA ok: provider=${provider.id} model=${response.model} ` +
					`in=${response.usage?.inputTokens ?? '?'} out=${response.usage?.outputTokens ?? '?'}`,
			);

			return {
				markdown: restored.text,
				model: response.model,
				usage: response.usage,
				shieldedBlocks: shielded.blocks.length,
				deterministicChanges: preFormatted.changedLines,
			};
		} finally {
			disposable?.dispose();
		}
	}
}

/** mensagem legivel do porque a recolocacao falhou. */
function describeRestoreFailure(result: {
	missing: number[];
	duplicated: number[];
	mangled: boolean;
}): string {
	const partes: string[] = [];
	if (result.missing.length > 0) {
		partes.push(`deleted ${result.missing.length}`);
	}
	if (result.duplicated.length > 0) {
		partes.push(`duplicated ${result.duplicated.length}`);
	}
	if (result.mangled) {
		partes.push('broke the marker format');
	}
	return partes.join(', ') || 'unknown reason';
}

/**
 * normaliza o texto tirando TUDO oq e marcador de formatacao, deixa so as
 * palavra. serve pra provar que a ia so acrescentou formatacao.
 *
 * tira:
 *  - enfase: `**`, `__`, `~~`, e `*`/`_` solto usado como par;
 *  - crase de codigo inline;
 *  - marcador de titulo (`#`);
 *  - marcador de lista (`- `, `* `, `1. `);
 *  - espaco sobrando (a ia pode reindentar de leve).
 *
 * oq NAO tira: letra, numero, pontuacao de frase. se a ia trocar uma palavra,
 * o resultado normalizado muda e a validacao reprova.
 */
export function normalizeForWordComparison(text: string): string {
	return text
		// sentinela e encanamento, nao conteudo: ignorada dos dois lados.
		.replace(/<!--\s*BM-PROTECTED[^>]*-->/g, '')
		.replace(/`+/g, '') // codigo inline
		.replace(/\*\*|__|~~/g, '') // enfase forte e tachado
		.replace(/(^|[\s(])[*_](?=\S)/g, '$1') // abre italico
		.replace(/(?<=\S)[*_](?=[\s).,;:!?]|$)/g, '') // fecha italico
		.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '') // titulo ATX
		.replace(/^[ \t]*([-*+]|\d{1,9}[.)\]\-}])[ \t]+/gm, '') // lista
		.replace(/[ \t]+/g, ' ') // espaco normalizado
		.replace(/[ \t]*\n[ \t]*/g, '\n') // espaco em volta da quebra
		.replace(/\n{2,}/g, '\n') // linha em branco nao conta
		.trim();
}

/**
 * compara o conteudo PALAVRA por palavra, ignorando formatacao.
 *
 * e a garantia central do modo dedutivo: a ia pode marcar `npm install` como
 * codigo ou **Atencao** como negrito, mas se trocar, apagar ou acrescentar
 * qualquer palavra, a resposta e descartada.
 *
 * formatador que reescreve o texto do user nao e formatador.
 */
/**
 * guarda de conteudo pro modo `restructure`.
 *
 * nesse modo a ia PODE reestruturar a prosa, entao `compareWords` nao se
 * aplica — comparar palavra por palavra reprovaria toda resposta correta
 * (quebrar um paragrafo em lista ja muda a sequencia de token).
 *
 * mas "pode reestruturar" nao e "pode resumir". o risco real do restructure e
 * o modelo decidir encurtar. entao a gente checa:
 *
 *  1. nenhum token TECNICO do original sumiu (caminho, comando, constante,
 *     identificador) — e o conteudo que mais importa num README e oq o modelo
 *     mais tende a "limpar" ao resumir;
 *  2. o volume nao encolheu de forma suspeita.
 *
 * e uma rede mais frouxa que `compareWords`, e e honesto dizer isso: o modo
 * restructure da mais liberdade pra ia porque a tarefa exige.
 */
export function validateContentPreserved(
	before: string,
	after: string,
): { ok: boolean; reason?: string } {
	const afterLower = after.toLowerCase();

	// (1) token tecnico precisa sobreviver.
	const tokens = new Set<string>();
	for (const match of before.matchAll(
		/[\w.\-/]{3,}\.(?:ts|js|tsx|jsx|py|cpp|hpp|c|h|json|md|txt|yml|yaml|toml|sh)\b/gi,
	)) {
		tokens.add(match[0].toLowerCase());
	}
	// palavra toda em maiuscula costuma ser constante ou sigla (TAM_CELULA,
	// HTTP), e essas precisam sobreviver. mas titulo escrito em caixa alta
	// ("INTRODUCAO AO PROJETO") casa com o mesmo padrao — e normalizar esse
	// titulo pra Title Case e exatamente oq a ia deve fazer. contar essas
	// palavra como termo tecnico reprovava toda resposta correta.
	//
	// foi o bug visto no laptop em 22/10: um documento com secao em caixa alta
	// voltava sempre com "content lost (3 technical terms disappeared:
	// especificacao, introducao, codigo)" — a ia tinha acertado.
	//
	// criterio: linha inteira em caixa alta (ignorando pontuacao) e titulo,
	// nao token. sigla solta no meio da prosa continua sendo token.
	const upperOnlyLines = new Set<string>();
	for (const line of before.split('\n')) {
		const limpa = line.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
		if (limpa.length >= 3 && limpa === limpa.toUpperCase() && /\p{Lu}/u.test(limpa)) {
			for (const palavra of limpa.split(/\s+/)) {
				if (palavra.length >= 3) {
					upperOnlyLines.add(palavra.toLowerCase());
				}
			}
		}
	}
	for (const match of before.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) {
		const palavra = match[0].toLowerCase();
		if (upperOnlyLines.has(palavra)) {
			continue;
		}
		tokens.add(palavra);
	}
	for (const match of before.matchAll(/\b[a-z]+_[a-z_]+\b/g)) {
		tokens.add(match[0].toLowerCase());
	}

	const missing = [...tokens].filter((t) => !afterLower.includes(t));
	// tolera 1 token ausente (pode ter sido reformulado), nao mais: varios
	// ausente indica sumico de conteudo.
	if (missing.length > 1) {
		return {
			ok: false,
			reason:
				`content lost (${missing.length} technical terms disappeared: ` +
				`${missing.slice(0, 3).join(', ')})`,
		};
	}

	// (2) volume: markdown reestruturado tende a crescer (marcador
	// acrescentado). encolher muito indica resumo.
	const beforeChars = before.replace(/\s+/g, ' ').trim().length;
	const afterChars = after.replace(/\s+/g, ' ').trim().length;
	if (beforeChars > 200 && afterChars < beforeChars * 0.6) {
		return {
			ok: false,
			reason:
				`the text shrank too much (${beforeChars} → ${afterChars} characters), ` +
				`sinal de resumo`,
		};
	}

	return { ok: true };
}

export function compareWords(before: string, after: string): { ok: boolean; reason?: string } {
	const a = normalizeForWordComparison(before);
	const b = normalizeForWordComparison(after);

	if (a === b) {
		return { ok: true };
	}

	// acha a primeira divergencia pra dar mensagem util.
	const beforeWords = a.split(/\s+/);
	const afterWords = b.split(/\s+/);
	const max = Math.max(beforeWords.length, afterWords.length);

	for (let i = 0; i < max; i++) {
		if (beforeWords[i] !== afterWords[i]) {
			const de = beforeWords[i] ?? '(fim)';
			const para = afterWords[i] ?? '(fim)';
			return { ok: false, reason: `palavra ${i + 1}: "${de}" → "${para}"` };
		}
	}

	return { ok: false, reason: 'diferença estrutural no texto' };
}

/** tolerancia de encolhimento: a ia nao pode sumir com o conteudo. */
const MIN_LENGTH_RATIO = 0.5;
/** tolerancia de crescimento: evita que o modelo "explique" ou invente. */
const MAX_LENGTH_RATIO = 2.5;

/**
 * regra de sanidade aplicada na resposta antes de tocar no documento.
 *
 * se o modelo respondeu algo muito diferente (muito menor, muito maior ou
 * vazio), e mais seguro NAO alterar o arquivo e mostrar um erro.
 */
export function validateAiResult(original: string, candidate: string): ValidationResult {
	const trimmed = candidate.trim();
	if (trimmed.length === 0) {
		return { ok: false, reason: 'resposta vazia' };
	}

	const originalTrimmed = original.trim();
	if (originalTrimmed.length === 0) {
		return { ok: true };
	}

	const ratio = trimmed.length / originalTrimmed.length;
	if (ratio < MIN_LENGTH_RATIO) {
		return { ok: false, reason: `resposta muito curta (${Math.round(ratio * 100)}% do original)` };
	}
	if (ratio > MAX_LENGTH_RATIO) {
		return { ok: false, reason: `resposta muito longa (${Math.round(ratio * 100)}% do original)` };
	}

	if (/^(desculpe|sinto muito|i'?m sorry|não posso|i cannot)/i.test(trimmed)) {
		return { ok: false, reason: 'o modelo se recusou a responder' };
	}

	// o modelo nao pode devolver codigo-fonte em vez do markdown pedido.
	if (/^(def |function |class |import |const |let |var )/m.test(trimmed) && !/^#/m.test(trimmed)) {
		return { ok: false, reason: 'a resposta parece código-fonte, não Markdown' };
	}

	return { ok: true };
}
