/**
 * Serviço de IA — orquestra blindagem, chamada e validação.
 *
 * FLUXO COMPLETO (e por que cada passo existe):
 *
 *   seleção do usuário
 *     ↓
 *   [1] shieldProtectedBlocks   → tira código/tabela/front matter da vista
 *     ↓                           da IA e põe sentinelas no lugar
 *   [2] runDeterministicFirst   → roda o Nível 1+2A na prosa que sobrou,
 *     ↓                           de graça e sem risco de alucinação
 *   [3] AiProvider.format       → a IA reestrutura só a prosa
 *     ↓
 *   [4] restoreProtectedBlocks  → devolve os blocos originais intactos
 *     ↓
 *   [5] validações finais       → tamanho, recusa, estrutura protegida
 *     ↓
 *   markdown final (ou nada, se alguma validação reprovar)
 *
 * Lição aprendida em teste real: o modelo destruiu bloco de código, tabela e
 * fundiu parágrafos, mesmo com prompt mandando preservar. Prompt é a segunda
 * linha de defesa; a primeira é NUNCA deixar o modelo ver o que é frágil.
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
	/** Identificador da instalação, usado só pelo provedor `proxy`. */
	installId?: string;
	/** Instruções extras vindas da configuração do usuário. */
	instructions?: string;
	/** Opções do formatador determinístico aplicado antes da IA. */
	formatOptions?: FormatOptions;
	/** Intensidade da dedução de ênfase (`off` | `safe` | `deduce`). */
	emphasis?: 'off' | 'safe' | 'deduce';
	/**
	 * `preserve` (padrão) garante que nenhuma palavra muda.
	 * `restructure` permite reestruturar a prosa — use só em texto que ainda
	 * NÃO é Markdown. Nesse modo `compareWords` não se aplica.
	 */
	mode?: 'preserve' | 'restructure';
}

/** Validação de segurança da resposta do modelo. */
export interface ValidationResult {
	ok: boolean;
	reason?: string;
}

/** Relatório do que aconteceu, útil para log e para a mensagem ao usuário. */
export interface AiFormatReport {
	markdown: string;
	model: string;
	usage?: { inputTokens?: number; outputTokens?: number };
	/** Blocos que ficaram fora da vista da IA. */
	shieldedBlocks: number;
	/** Linhas de prosa que o formatador offline já resolveu. */
	deterministicChanges: number;
}

export class AiFormatter {
	constructor(private readonly log: (message: string) => void) {}

	/** Provedor resolvido a partir das configurações. */
	provider(settings: AiFormatterSettings): AiProvider {
		return getProvider(settings.providerId);
	}

	/**
	 * Formata um trecho com IA.
	 *
	 * `token` é o CancellationToken do VS Code: o usuário pode cancelar pela
	 * barra de progresso e a requisição HTTP é abortada de verdade.
	 */
	async format(
		text: string,
		settings: AiFormatterSettings,
		token?: vscode.CancellationToken,
	): Promise<AiFormatReport> {
		const provider = this.provider(settings);

		// O provedor `proxy` não exige chave: ela vive no nosso servidor. Só
		// os provedores diretos (River, DeepSeek, OpenAI...) precisam dela.
		if (!settings.apiKey && !isKeylessProvider(provider.id)) {
			throw new AiError('missing-key', `No API key for ${provider.label}.`);
		}
		if (text.trim().length === 0) {
			throw new AiError('bad-response', 'Nothing selected.');
		}

		// [1] Blindagem: a IA só vê prosa.
		const shielded = shieldProtectedBlocks(text);
		this.log(
			`blindagem: ${shielded.blocks.length} bloco(s) protegido(s) ` +
				`(${shielded.blocks.map((b) => b.kind).join(', ') || 'nenhum'})`,
		);

		// [2] O determinístico roda PRIMEIRO: é grátis, é confiável, e resolve
		// os casos que o modelo errou (ex.: `2- item` → `2. item`).
		const preFormatted = formatMarkdown(shielded.text, {
			...settings.formatOptions,
			protectBlocks: true,
		});
		this.log(`pré-formatação offline: ${preFormatted.changedLines} linha(s)`);

		// Se só há blocos protegidos, não há o que a IA fazer.
		if (preFormatted.text.trim().length === 0) {
			throw new AiError('bad-response', 'The selection contains only protected blocks.');
		}

		// [3] Chamada à IA.
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

			// O modelo sinaliza texto vazio/ininteligível com este marcador,
			// em vez de devolver uma resposta inútil que passaria adiante.
			if (candidate.trim() === 'ERRO_SEM_TEXTO') {
				throw new AiError('bad-response', 'Empty or unreadable text.');
			}

			// [4] Devolve os blocos originais no lugar dos sentinelas.
			const restored = restoreProtectedBlocks(shielded, candidate);
			if (!restored.ok) {
				throw new AiError(
					'bad-response',
					`A IA não preservou os marcadores de bloco protegido ` +
						`(${describeRestoreFailure(restored)}). Nothing was changed.`,
				);
			}

			// [5] Validações finais.
			const validation = validateAiResult(preFormatted.text, restored.text);
			if (!validation.ok) {
				throw new AiError(
					'bad-response',
					`Rejected by validation (${validation.reason}). Nothing was changed.`,
				);
			}

			// Segunda barreira, independente: a estrutura frágil sobreviveu?
			const structure = compareProtectedStructure(text, restored.text);
			if (!structure.ok) {
				throw new AiError(
					'bad-response',
					`Rejected: ${structure.reason}. Nothing was changed.`,
				);
			}

			// Terceira barreira: a IA pode ter acrescentado MARCADORES de
			// formatação, mas não pode ter mudado as PALAVRAS.
			//
			// IMPORTANTE: esta barreira só existe no modo `preserve`. No modo
			// `restructure` a IA PRECISA reescrever a estrutura da prosa (é o
			// ponto do modo), então comparar palavras reprovaria toda resposta
			// correta. A troca é consciente: `restructure` é para texto que
			// ainda não é Markdown, e o usuário é avisado de que a IA vai
			// mexer mais.
			//
			// Comparamos a PROSA blindada (`preFormatted.text`) com a resposta
			// ANTES de recolocar os blocos (`candidate`): os dois lados então
			// estão na mesma unidade, com os blocos representados por
			// sentinelas. Comparar depois da recolocação colocaria o conteúdo
			// real de um lado e sentinelas do outro, reprovando toda resposta
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
				// No modo restructure, ao menos garantimos que nada foi RESUMIDO.
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

/** Mensagem legível sobre por que a recolocação falhou. */
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
 * Normaliza o texto removendo TUDO que é marcador de formatação, deixando só
 * as palavras. Serve para provar que a IA só acrescentou formatação.
 *
 * Removemos:
 *  - ênfase: `**`, `__`, `~~`, e `*`/`_` isolados usados como par;
 *  - crases de código inline;
 *  - marcadores de título (`#`);
 *  - marcadores de lista (`- `, `* `, `1. `);
 *  - espaços em excesso (a IA pode reindentar levemente).
 *
 * O que NÃO removemos: letras, números, pontuação de frase. Se a IA trocar
 * uma palavra, o resultado normalizado muda e a validação reprova.
 */
export function normalizeForWordComparison(text: string): string {
	return text
		// Sentinelas são encanamento, não conteúdo: ignoradas dos dois lados.
		.replace(/<!--\s*BM-PROTECTED[^>]*-->/g, '')
		.replace(/`+/g, '') // código inline
		.replace(/\*\*|__|~~/g, '') // ênfase forte e tachado
		.replace(/(^|[\s(])[*_](?=\S)/g, '$1') // abre itálico
		.replace(/(?<=\S)[*_](?=[\s).,;:!?]|$)/g, '') // fecha itálico
		.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '') // títulos ATX
		.replace(/^[ \t]*([-*+]|\d{1,9}[.)\]\-}])[ \t]+/gm, '') // listas
		.replace(/[ \t]+/g, ' ') // espaços normalizados
		.replace(/[ \t]*\n[ \t]*/g, '\n') // espaços em volta da quebra
		.replace(/\n{2,}/g, '\n') // linhas em branco não contam
		.trim();
}

/**
 * Compara o conteúdo PALAVRA por palavra, ignorando formatação.
 *
 * Esta é a garantia central do modo dedutivo: a IA tem liberdade para marcar
 * `npm install` como código ou **Atenção** como negrito, mas se ela trocar,
 * apagar ou acrescentar qualquer palavra, a resposta é descartada.
 *
 * Um formatador que reescreve o texto do usuário não é um formatador.
 */
/**
 * Guarda de conteúdo para o modo `restructure`.
 *
 * Neste modo a IA PODE reestruturar a prosa, então `compareWords` não se
 * aplica — comparar palavra por palavra reprovaria toda resposta correta
 * (quebrar um parágrafo em lista já muda a sequência de tokens).
 *
 * Mas "pode reestruturar" não é "pode resumir". O risco real do modo
 * restructure é o modelo decidir encurtar. Verificamos então:
 *
 *  1. nenhum token TÉCNICO do original desapareceu (caminhos, comandos,
 *     constantes, identificadores) — é o conteúdo que mais importa num
 *     README e o que o modelo mais tende a "limpar" ao resumir;
 *  2. o volume não encolheu de forma suspeita.
 *
 * É uma rede mais frouxa que `compareWords`, e é honesto dizer isso: o modo
 * restructure dá mais liberdade à IA porque a tarefa exige.
 */
export function validateContentPreserved(
	before: string,
	after: string,
): { ok: boolean; reason?: string } {
	const afterLower = after.toLowerCase();

	// (1) Tokens técnicos precisam sobreviver.
	const tokens = new Set<string>();
	for (const match of before.matchAll(
		/[\w.\-/]{3,}\.(?:ts|js|tsx|jsx|py|cpp|hpp|c|h|json|md|txt|yml|yaml|toml|sh)\b/gi,
	)) {
		tokens.add(match[0].toLowerCase());
	}
	for (const match of before.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) {
		tokens.add(match[0].toLowerCase());
	}
	for (const match of before.matchAll(/\b[a-z]+_[a-z_]+\b/g)) {
		tokens.add(match[0].toLowerCase());
	}

	const missing = [...tokens].filter((t) => !afterLower.includes(t));
	// Toleramos 1 token ausente (pode ter sido reformulado), não mais: vários
	// ausentes indicam sumiço de conteúdo.
	if (missing.length > 1) {
		return {
			ok: false,
			reason:
				`content lost (${missing.length} technical terms disappeared: ` +
				`${missing.slice(0, 3).join(', ')})`,
		};
	}

	// (2) Volume: markdown reestruturado tende a crescer (marcadores
	// acrescentados). Encolher muito indica resumo.
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

	// Identifica a primeira divergência para dar mensagem útil.
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

/** Tolerância de encolhimento: a IA não pode sumir com o conteúdo. */
const MIN_LENGTH_RATIO = 0.5;
/** Tolerância de crescimento: evita que o modelo "explique" ou invente. */
const MAX_LENGTH_RATIO = 2.5;

/**
 * Regras de sanidade aplicadas à resposta antes de tocar no documento.
 *
 * Se o modelo respondeu algo muito diferente (muito menor, muito maior ou
 * vazio), é mais seguro NÃO alterar o arquivo e mostrar um erro.
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

	// O modelo não pode devolver código-fonte em vez do markdown pedido.
	if (/^(def |function |class |import |const |let |var )/m.test(trimmed) && !/^#/m.test(trimmed)) {
		return { ok: false, reason: 'a resposta parece código-fonte, não Markdown' };
	}

	return { ok: true };
}
