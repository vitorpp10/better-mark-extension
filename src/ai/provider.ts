/**
 * nivel 2 — parte B: camada de IA.
 *
 * contrato unico que a extensao conhece. os provedores concretos
 * (DeepSeek, Gemini, GLM, Nemotron/OpenAI-compativeis) ficam atras desta
 * interface, pra extensao nunca virar "a extensao do Gemini".
 *
 *   nivel 2
 *     ↓
 *   AiFormatter
 *     ↓
 *   AiProvider  ← interface
 *     ↓
 *   DeepSeek / Gemini / GLM / Nemotron / OpenAI
 */

/** request de formatacao mandado pro provedor. */
export interface AiFormatRequest {
	/** trecho markdown que o user selecionou (ja blindado). */
	text: string;
	/** instrucoes extras (ex.: "apenas padronize listas"). */
	instructions?: string;
	/** AbortSignal pra cancelamento (o VS Code da suporte nativo). */
	signal?: AbortSignal;
	/**
	 * intensidade da deducao de enfase.
	 * - `off`    -> nao acrescenta negrito/italico;
	 * - `safe`   -> so padroes inequivocos;
	 * - `deduce` -> deduz pelas pistas do texto (padrao).
	 */
	emphasis?: 'off' | 'safe' | 'deduce';
	/**
	 * modo de operacao:
	 * - `preserve`    -> nao muda palavra (padrao);
	 * - `restructure` -> vira texto solto em Markdown, podendo
	 *                    reestruturar a prosa.
	 */
	mode?: 'preserve' | 'restructure';
}

/** resposta normalizada, independente do provedor. */
export interface AiFormatResponse {
	/** markdown resultante, ja sem cerca de codigo. */
	markdown: string;
	/** modelo que respondeu (pra log/diagnostico). */
	model: string;
	/** tokens usados, quando o provedor informa. */
	usage?: { inputTokens?: number; outputTokens?: number };
}

/** configuracao resolvida de um provedor. */
export interface AiProviderConfig {
	apiKey: string;
	model: string;
	baseUrl?: string;
	timeoutMs: number;
	/**
	 * id da instalacao, usado so pelo provedor `proxy` pra cota diaria do
	 * servidor. nao e segredo e nao autentica nada.
	 */
	installId?: string;
}

/** erros que a UI precisa distinguir pra dar mensagem boa pro user. */
export type AiErrorKind =
	| 'missing-key'
	| 'unauthorized'
	| 'rate-limit'
	| 'timeout'
	| 'network'
	| 'bad-response'
	| 'cancelled'
	| 'unknown';

export class AiError extends Error {
	constructor(
		readonly kind: AiErrorKind,
		message: string,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = 'AiError';
	}

	/**
	 * mensagem amigavel pro `showErrorMessage`.
	 *
	 * em INGLES: a extensao e publicada pra uso global, entao tudo que o user
	 * final ve na tela (notificacao, erro, tooltip) fica em ingles. comentario
	 * e documentacao seguem em portugues.
	 */
	get friendlyMessage(): string {
		switch (this.kind) {
			case 'missing-key':
				return 'No API key configured. Run "Markdownify: Set API key".';
			case 'unauthorized':
				return 'Invalid API key, or it has no permission for this model.';
			case 'rate-limit':
				return 'Rate limit reached at the provider. Try again in a moment.';
			case 'timeout':
				return 'The provider took too long to respond (timeout).';
			case 'network':
				return 'Network failure while contacting the AI provider.';
			case 'bad-response':
				return 'The provider returned a response that could not be used.';
			case 'cancelled':
				return 'Operation cancelled.';
			default:
				return `Unexpected error calling the AI: ${this.message}`;
		}
	}
}

/** interface que todo provedor implementa. */
export interface AiProvider {
	/** id curto: `deepseek`, `gemini`, `glm`, `nemotron`. */
	readonly id: string;
	/** nome pra exibir pro user. */
	readonly label: string;
	/** modelo padrao quando o user nao escolhe. */
	readonly defaultModel: string;
	/** formata um trecho markdown. */
	format(request: AiFormatRequest, config: AiProviderConfig): Promise<AiFormatResponse>;
}

/**
 * o prompt de sistema mora em `prompt.ts` (e longo e tem teste proprio).
 * reexportado aqui pra os provedores terem um ponto unico de import.
 */
export { SYSTEM_PROMPT, buildSystemPrompt, buildUserPrompt } from './prompt';
export type { EmphasisMode } from './prompt';

/**
 * tira cerca de codigo que o modelo as vezes poe em volta da resposta.
 * tambem tira preambulo tipo "Aqui está o markdown:".
 */
export function stripCodeFence(raw: string): string {
	let text = raw.trim();

	// ```markdown ... ```
	const fence = text.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
	if (fence) {
		text = fence[1];
	}

	// preambulo curto antes de um fence interno.
	const withPreamble = text.match(/^(?:Aqui est[áa][\s\S]*?:\s*\n)?```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
	if (withPreamble) {
		text = withPreamble[1];
	}

	return text;
}
