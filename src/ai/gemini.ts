/**
 * Gemini (Google AI Studio) — dialeto próprio (`generateContent`).
 *
 * Diferente dos provedores OpenAI-compatíveis, a chave vai na query string
 * e o corpo usa `contents`/`parts`. Por isso vive em arquivo separado: foi
 * exatamente para isto que a interface `AiProvider` existe.
 */

import {
	AiError,
	AiFormatRequest,
	AiFormatResponse,
	AiProvider,
	AiProviderConfig,
	buildSystemPrompt,
	buildUserPrompt,
	stripCodeFence,
} from './provider';

interface GeminiResponse {
	candidates?: Array<{
		content?: { parts?: Array<{ text?: string }> };
		finishReason?: string;
	}>;
	usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
	error?: { message?: string; status?: string };
}

export class GeminiProvider implements AiProvider {
	readonly id = 'gemini';
	readonly label = 'Gemini (Google)';
	readonly defaultModel = 'gemini-2.0-flash';

	async format(request: AiFormatRequest, config: AiProviderConfig): Promise<AiFormatResponse> {
		if (!config.apiKey) {
			throw new AiError('missing-key', 'Nenhuma API key configurada para o Gemini.');
		}

		const base = (config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
		const model = config.model || this.defaultModel;
		const url = `${base}/models/${encodeURIComponent(model)}:generateContent`;

		const prompt = buildUserPrompt(request);

		const body = {
			systemInstruction: { parts: [{ text: buildSystemPrompt(request.emphasis ?? 'deduce', request.mode ?? 'preserve') }] },
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			generationConfig: { temperature: 0 },
		};

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
		const onAbort = () => controller.abort();
		request.signal?.addEventListener('abort', onAbort, { once: true });

		let response: Response;
		try {
			response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// A chave do Gemini vai no header, não na URL (evita vazar em logs).
					'x-goog-api-key': config.apiKey,
				},
				body: JSON.stringify(body),
				signal: controller.signal,
			});
		} catch (error) {
			if (request.signal?.aborted) {
				throw new AiError('cancelled', 'Requisição cancelada.', error);
			}
			if (controller.signal.aborted) {
				throw new AiError('timeout', `Timeout de ${config.timeoutMs}ms excedido.`, error);
			}
			throw new AiError('network', 'Não foi possível conectar ao Gemini.', error);
		} finally {
			clearTimeout(timeout);
			request.signal?.removeEventListener('abort', onAbort);
		}

		const text = await response.text();
		let parsed: GeminiResponse;
		try {
			parsed = text.length > 0 ? (JSON.parse(text) as GeminiResponse) : {};
		} catch (error) {
			throw new AiError('bad-response', `Resposta não é JSON válido: ${text.slice(0, 200)}`, error);
		}

		if (!response.ok) {
			const detail = parsed.error?.message ?? text.slice(0, 200);
			const kind = response.status === 401 || response.status === 403
				? 'unauthorized'
				: response.status === 429
					? 'rate-limit'
					: response.status >= 500
						? 'network'
						: 'unknown';
			throw new AiError(kind, `HTTP ${response.status}: ${detail}`, parsed);
		}

		const content = parsed.candidates?.[0]?.content?.parts
			?.map((part) => part.text ?? '')
			.join('');

		if (typeof content !== 'string' || content.trim().length === 0) {
			throw new AiError('bad-response', 'Resposta sem conteúdo de texto.', parsed);
		}

		return {
			markdown: stripCodeFence(content),
			model,
			usage: {
				inputTokens: parsed.usageMetadata?.promptTokenCount,
				outputTokens: parsed.usageMetadata?.candidatesTokenCount,
			},
		};
	}
}
