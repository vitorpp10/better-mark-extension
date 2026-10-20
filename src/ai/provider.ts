/**
 * Nível 2 — Parte B: camada de IA.
 *
 * Contrato ÚNICO que a extensão conhece. Os provedores concretos
 * (DeepSeek, Gemini, GLM, Nemotron/OpenAI-compatíveis) ficam atrás desta
 * interface, para que a extensão nunca vire "a extensão do Gemini".
 *
 *   Nível 2
 *     ↓
 *   AiFormatter
 *     ↓
 *   AiProvider  ← interface
 *     ↓
 *   DeepSeek / Gemini / GLM / Nemotron / OpenAI
 */

/** Requisição de formatação enviada ao provedor. */
export interface AiFormatRequest {
	/** Trecho markdown que o usuário selecionou (já blindado). */
	text: string;
	/** Instruções extras (ex.: "apenas padronize listas"). */
	instructions?: string;
	/** AbortSignal para cancelamento (o VS Code dá suporte nativo). */
	signal?: AbortSignal;
	/**
	 * Intensidade da dedução de ênfase.
	 * - `off`    → não acrescenta negrito/itálico;
	 * - `safe`   → só padrões inequívocos;
	 * - `deduce` → deduz a partir das pistas do texto (padrão).
	 */
	emphasis?: 'off' | 'safe' | 'deduce';
	/**
	 * Modo de operação:
	 * - `preserve`    → não muda palavras (padrão);
	 * - `restructure` → converte texto solto em Markdown, podendo
	 *                   reestruturar a prosa.
	 */
	mode?: 'preserve' | 'restructure';
}

/** Resposta normalizada, independente do provedor. */
export interface AiFormatResponse {
	/** Markdown resultante, já sem cercas de código. */
	markdown: string;
	/** Modelo que respondeu (para log/diagnóstico). */
	model: string;
	/** Tokens usados, quando o provedor informa. */
	usage?: { inputTokens?: number; outputTokens?: number };
}

/** Configuração resolvida de um provedor. */
export interface AiProviderConfig {
	apiKey: string;
	model: string;
	baseUrl?: string;
	timeoutMs: number;
	/**
	 * Identificador da instalação, usado SÓ pelo provedor `proxy` para a cota
	 * diária do servidor. Não é segredo e não autentica nada.
	 */
	installId?: string;
}

/** Erros que a UI precisa distinguir para dar boa mensagem ao usuário. */
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
	 * Mensagem amigável para `showErrorMessage`.
	 *
	 * Em INGLÊS: a extensão é publicada para uso global, então tudo que o
	 * usuário final vê na tela (notificação, erro, tooltip) é em inglês.
	 * Comentários e documentação seguem em português.
	 */
	get friendlyMessage(): string {
		switch (this.kind) {
			case 'missing-key':
				return 'No API key configured. Run "Paste as Markdown: Set API key".';
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

/** Interface que todo provedor implementa. */
export interface AiProvider {
	/** Identificador curto: `deepseek`, `gemini`, `glm`, `nemotron`. */
	readonly id: string;
	/** Nome para exibir ao usuário. */
	readonly label: string;
	/** Modelo padrão quando o usuário não escolhe. */
	readonly defaultModel: string;
	/** Formata um trecho markdown. */
	format(request: AiFormatRequest, config: AiProviderConfig): Promise<AiFormatResponse>;
}

/**
 * O prompt do sistema vive em `prompt.ts` (é longo e tem testes próprios).
 * Reexportado aqui para que os provedores tenham um ponto único de import.
 */
export { SYSTEM_PROMPT, buildSystemPrompt, buildUserPrompt } from './prompt';
export type { EmphasisMode } from './prompt';

/**
 * Remove cercas de código que o modelo às vezes adiciona em volta da resposta.
 * Também remove preâmbulos do tipo "Aqui está o markdown:".
 */
export function stripCodeFence(raw: string): string {
	let text = raw.trim();

	// ```markdown ... ```
	const fence = text.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
	if (fence) {
		text = fence[1];
	}

	// Preâmbulo curto antes de um fence interno.
	const withPreamble = text.match(/^(?:Aqui est[áa][\s\S]*?:\s*\n)?```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
	if (withPreamble) {
		text = withPreamble[1];
	}

	return text;
}
