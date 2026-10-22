/**
 * provedores openai-comutiveis.
 *
 * DeepSeek, GLM (Zhipu) e Nemotron (NVIDIA NIM) falam o mesmo dialeto
 * `/chat/completions`, entao compartilham a mesma implementacao e so mudam
 * baseUrl, modelo padrao e nome.
 *
 * `fetch` e global no Node 18+ / VS Code 1.8x, entao nao adicionamos
 * dependencia nenhuma pra HTTP.
 */

import {
	AiError,
	AiFormatResponse,
	AiProvider,
	AiProviderConfig,
	AiFormatRequest,
	buildSystemPrompt,
	buildUserPrompt,
	stripCodeFence,
} from './provider';

interface ChatChoice {
	message?: { content?: string };
}

interface ChatResponse {
	choices?: ChatChoice[];
	model?: string;
	usage?: { prompt_tokens?: number; completion_tokens?: number };
	error?: { message?: string; type?: string; code?: string };
}

/**
 * cliente base pra qualquer endpoint `/chat/completions`.
 * as subclasses so definem identidade e padroes.
 */
export abstract class OpenAiCompatibleProvider implements AiProvider {
	abstract readonly id: string;
	abstract readonly label: string;
	abstract readonly defaultModel: string;

	/** caminho do endpoint, relativo ao baseUrl. */
	protected readonly path = '/chat/completions';

	async format(request: AiFormatRequest, config: AiProviderConfig): Promise<AiFormatResponse> {
		if (!config.apiKey) {
			throw new AiError('missing-key', `No API key configured for ${this.label}.`);
		}

		const baseUrl = (config.baseUrl ?? this.defaultBaseUrl()).replace(/\/+$/, '');
		const url = `${baseUrl}${this.path}`;

		const body = {
			model: config.model || this.defaultModel,
			messages: [
				{ role: 'system', content: buildSystemPrompt(request.emphasis ?? 'deduce', request.mode ?? 'preserve') },
				{ role: 'user', content: buildUserPrompt(request) },
			],
			temperature: 0,
			stream: false,
		};

		const raw = await this.post(url, config, body, request.signal);
		const content = raw.choices?.[0]?.message?.content;
		if (typeof content !== 'string' || content.trim().length === 0) {
			throw new AiError('bad-response', 'Response has no text content.', raw);
		}

		return {
			markdown: stripCodeFence(content),
			model: raw.model ?? config.model ?? this.defaultModel,
			usage: {
				inputTokens: raw.usage?.prompt_tokens,
				outputTokens: raw.usage?.completion_tokens,
			},
		};
	}

	protected abstract defaultBaseUrl(): string;

	/** POST com timeout, cancelamento e traducao de erro HTTP. */
	protected async post(
		url: string,
		config: AiProviderConfig,
		body: unknown,
		signal?: AbortSignal,
	): Promise<ChatResponse> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
		const onAbort = () => controller.abort();
		signal?.addEventListener('abort', onAbort, { once: true });

		let response: Response;
		try {
			response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${config.apiKey}`,
				},
				body: JSON.stringify(body),
				signal: controller.signal,
			});
		} catch (error) {
			if (signal?.aborted) {
				throw new AiError('cancelled', 'Request cancelled by the user.', error);
			}
			if (controller.signal.aborted) {
				throw new AiError('timeout', `Timeout of ${config.timeoutMs}ms exceeded.`, error);
			}
			throw new AiError('network', 'Could not connect to the provider.', error);
		} finally {
			clearTimeout(timeout);
			signal?.removeEventListener('abort', onAbort);
		}

		const text = await response.text();
		let parsed: ChatResponse;
		try {
			parsed = text.length > 0 ? (JSON.parse(text) as ChatResponse) : {};
		} catch (error) {
			throw new AiError('bad-response', `Response is not valid JSON: ${text.slice(0, 200)}`, error);
		}

		if (!response.ok) {
			const detail = parsed.error?.message ?? text.slice(0, 200);
			throw new AiError(mapHttpStatus(response.status), `HTTP ${response.status}: ${detail}`, parsed);
		}

		return parsed;
	}
}

/** traduz status HTTP pro vocabulario de erro da extensao. */
export function mapHttpStatus(status: number): 'unauthorized' | 'rate-limit' | 'network' | 'unknown' {
	if (status === 401 || status === 403) {
		return 'unauthorized';
	}
	if (status === 429) {
		return 'rate-limit';
	}
	if (status >= 500) {
		return 'network';
	}
	return 'unknown';
}

/** DeepSeek — https://api.deepseek.com */
export class DeepSeekProvider extends OpenAiCompatibleProvider {
	readonly id = 'deepseek';
	readonly label = 'DeepSeek';
	readonly defaultModel = 'deepseek-chat';
	protected defaultBaseUrl(): string {
		return 'https://api.deepseek.com/v1';
	}
}

/** GLM / Zhipu AI — https://open.bigmodel.cn */
export class GlmProvider extends OpenAiCompatibleProvider {
	readonly id = 'glm';
	readonly label = 'GLM (Zhipu)';
	readonly defaultModel = 'glm-4-flash';
	protected defaultBaseUrl(): string {
		return 'https://open.bigmodel.cn/api/paas/v4';
	}
}

/** Nemotron via NVIDIA NIM — https://integrate.api.nvidia.com */
export class NemotronProvider extends OpenAiCompatibleProvider {
	readonly id = 'nemotron';
	readonly label = 'Nemotron (NVIDIA NIM)';
	readonly defaultModel = 'nvidia/llama-3.3-nemotron-super-49b-v1';
	protected defaultBaseUrl(): string {
		return 'https://integrate.api.nvidia.com/v1';
	}
}

/** OpenAI — mantido como fallback generico. */
export class OpenAiProvider extends OpenAiCompatibleProvider {
	readonly id = 'openai';
	readonly label = 'OpenAI';
	readonly defaultModel = 'gpt-4o-mini';
	protected defaultBaseUrl(): string {
		return 'https://api.openai.com/v1';
	}
}

/**
 * River AI — gateway compativel com OpenAI.
 *
 * chave comeca com `rv_`. serve modelo de varios fabricantes pelo mesmo
 * endpoint, por isso o modelo precisa ser qualificado (`fabricante/modelo`).
 */
export class RiverProvider extends OpenAiCompatibleProvider {
	readonly id = 'river';
	readonly label = 'River AI';
	readonly defaultModel = 'deepseek-ai/DeepSeek-V4.1-Flash';
	protected defaultBaseUrl(): string {
		return 'https://api.river.ai/v1';
	}
}
