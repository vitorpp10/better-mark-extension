/**
 * provedor que fala com o proxy do Markdownify.
 *
 * POR QUE ESTE PROVEDOR EXISTE (a razao de o projeto ter um servidor):
 *
 * a extensao existe pro user NAO precisar criar conta em provedor de IA,
 * gerar chave e colar em configuracao. se ele tivesse que fazer isso, a
 * extensao seria so "um jeito mais chato de usar o ChatGPT".
 *
 * mas a chave da API nao pode viajar dentro do `.vsix`: o arquivo e aberto
 * por qualquer um, e a chave seria extraida em dias — com o custo caindo na
 * conta do dono da extensao.
 *
 * a solucao e este provedor: ele fala com um servidor intermediario que
 * guarda a chave. a extensao nunca ve segredo nenhum, e o user nao configura
 * nada. e o modo padrao de `better-mark.ai.provider`.
 *
 * se o user PREFERIR usar a propria chave (por privacidade, ou porque o
 * proxy ta fora do ar), os outros provedores continuam disponiveis — este e
 * um caminho a mais, nao uma obrigacao.
 */

import {
	AiError,
	type AiFormatRequest,
	type AiFormatResponse,
	type AiProvider,
	type AiProviderConfig,
} from './provider';

/**
 * endereco padrao do proxy.
 *
 * aponta pro servidor publicado — e oq faz a extensao funcionar sem nenhuma
 * configuracao. pra desenvolver contra o servidor local, troque
 * temporariamente pra 'http://localhost:8787'.
 */
export const DEFAULT_PROXY_URL = 'https://better-mark-server.onrender.com';

export class ProxyProvider implements AiProvider {
	readonly id = 'proxy';
	readonly label = 'Markdownify (no setup)';
	readonly defaultModel = 'default';
	/**
	 * o modelo e escolhido no servidor, nao aqui. `baseUrl` da configuracao
	 * sobrescreve o endereco padrao, util pra apontar pra um proxy proprio.
	 */
	readonly isProxy = true;

	/** URL padrao; a configuracao pode sobrescrever por chamada. */
	readonly defaultBaseUrl: string;

	constructor(baseUrl: string = DEFAULT_PROXY_URL) {
		this.defaultBaseUrl = baseUrl.replace(/\/+$/, '');
	}

	/**
	 * manda pro proxy.
	 *
	 * sem `Authorization`: nao tem segredo do lado do cliente. oq a gente
	 * identifica e a INSTALACAO, pro servidor aplicar a cota diaria.
	 */
	async format(request: AiFormatRequest, config: AiProviderConfig): Promise<AiFormatResponse> {
		const controller = new AbortController();
		// o sinal do VS Code (cancelamento) e o timeout do provedor precisam
		// conviver: um aborta por escolha do user, o outro por demora.
		const onAbort = (): void => controller.abort();
		request.signal?.addEventListener('abort', onAbort, { once: true });

		try {
			const base = (config.baseUrl?.trim() || this.defaultBaseUrl).replace(/\/+$/, '');
			const response = await fetch(`${base}/format`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// identifica a instalacao pra cota. NAO e autenticacao:
					// e so pra uma pessoa nao consumir a cota de outra.
					'x-bm-install': config.installId ?? 'unknown-install',
				},
				body: JSON.stringify({
					text: request.text,
					mode: request.mode ?? 'preserve',
					emphasis: request.emphasis ?? 'deduce',
					instructions: request.instructions,
				}),
				signal: controller.signal,
			});

			if (!response.ok) {
				throw await this.translateError(response);
			}

			const data = (await response.json()) as {
				markdown?: string;
				model?: string;
				usage?: { inputTokens?: number; outputTokens?: number };
			};

			if (typeof data.markdown !== 'string' || data.markdown.length === 0) {
				throw new AiError('bad-response', 'Proxy returned an empty response.');
			}

			return {
				markdown: data.markdown,
				model: data.model ?? 'proxy',
				usage: {
					inputTokens: data.usage?.inputTokens,
					outputTokens: data.usage?.outputTokens,
				},
			};
		} catch (error) {
			if (error instanceof AiError) {
				throw error;
			}
			if (error instanceof Error && error.name === 'AbortError') {
				// distinguir os dois abortos importa: cancelamento do user nao e
				// erro, e nao deve virar notificacao vermelha.
				throw new AiError(
					request.signal?.aborted ? 'cancelled' : 'timeout',
					request.signal?.aborted
						? 'Operation cancelled.'
						: 'O servidor do Markdownify demorou demais para responder.',
				);
			}
			throw new AiError(
				'network',
				'Could not reach the Markdownify server. Is it running?',
			);
		} finally {
			request.signal?.removeEventListener('abort', onAbort);
		}
	}

	/** converte a resposta de erro do proxy em `AiError` amigavel. */
	private async translateError(response: Response): Promise<AiError> {
		// 429 tem tratamento proprio: e o limite diario, e o user precisa
		// saber que e temporario, nao que algo quebrou.
		if (response.status === 429) {
			const retry = response.headers.get('X-RateLimit-Reset');
			const quando = retry
				? new Date(Number(retry) * 1000).toLocaleString()
				: 'later';
			return new AiError(
				'rate-limit',
				`Daily limit of AI formats reached. Try again in ${quando}.`,
			);
		}

		if (response.status === 413) {
			return new AiError('bad-response', 'The text is too large for the server.');
		}

		if (response.status === 502 || response.status === 504) {
			return new AiError(
				'network',
				'The Markdownify server could not reach the AI provider.',
			);
		}

		let detail = '';
		try {
			const body = (await response.json()) as { error?: string };
			detail = body.error ?? '';
		} catch {
			// corpo nao-JSON: ignora e usa a mensagem generica.
		}

		return new AiError(
			'bad-response',
			`Servidor do Markdownify respondeu ${response.status}${detail ? `: ${detail}` : ''}.`,
		);
	}
}
