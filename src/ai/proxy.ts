/**
 * Provedor que fala com o proxy do Paste as Markdown.
 *
 * POR QUE ESTE PROVEDOR EXISTE (a razão de o projeto ter um servidor):
 *
 * A extensão existe para o usuário NÃO precisar criar conta em provedor de
 * IA, gerar chave e colar em configuração. Se ele tivesse que fazer isso, a
 * extensão seria só "um jeito mais chato de usar o ChatGPT".
 *
 * Mas a chave da API não pode viajar dentro do `.vsix`: o arquivo é aberto
 * por qualquer um, e a chave seria extraída em dias — com o custo caindo na
 * conta do dono da extensão.
 *
 * A solução é este provedor: ele fala com um servidor intermediário que
 * guarda a chave. A extensão nunca vê segredo nenhum, e o usuário não
 * configura nada. É o modo padrão de `better-mark.ai.provider`.
 *
 * Se o usuário PREFERIR usar a própria chave (por privacidade, ou porque o
 * proxy está fora do ar), os outros provedores continuam disponíveis — este
 * é um caminho a mais, não uma obrigação.
 */

import {
	AiError,
	type AiFormatRequest,
	type AiFormatResponse,
	type AiProvider,
	type AiProviderConfig,
} from './provider';

/**
 * Endereço padrão do proxy.
 *
 * Durante o desenvolvimento aponta para o servidor local. Na publicação
 * passa a apontar para o domínio do deploy — trocar aqui é a única mudança
 * necessária para a extensão publicada.
 */
export const DEFAULT_PROXY_URL = 'http://localhost:8787';

export class ProxyProvider implements AiProvider {
	readonly id = 'proxy';
	readonly label = 'Paste as Markdown (no setup)';
	readonly defaultModel = 'default';
	/**
	 * O modelo é escolhido no servidor, não aqui. `baseUrl` da configuração
	 * sobrescreve o endereço padrão, útil para apontar a um proxy próprio.
	 */
	readonly isProxy = true;

	/** URL padrão; a configuração pode sobrescrever por chamada. */
	readonly defaultBaseUrl: string;

	constructor(baseUrl: string = DEFAULT_PROXY_URL) {
		this.defaultBaseUrl = baseUrl.replace(/\/+$/, '');
	}

	/**
	 * Envia para o proxy.
	 *
	 * Sem `Authorization`: não há segredo do lado do cliente. O que
	 * identificamos é a INSTALAÇÃO, para o servidor aplicar a cota diária.
	 */
	async format(request: AiFormatRequest, config: AiProviderConfig): Promise<AiFormatResponse> {
		const controller = new AbortController();
		// O sinal do VS Code (cancelamento) e o timeout do provedor precisam
		// coexistir: um aborta por escolha do usuário, o outro por demora.
		const onAbort = (): void => controller.abort();
		request.signal?.addEventListener('abort', onAbort, { once: true });

		try {
			const base = (config.baseUrl?.trim() || this.defaultBaseUrl).replace(/\/+$/, '');
			const response = await fetch(`${base}/format`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// Identifica a instalação para a cota. NÃO é autenticação:
					// é só para uma pessoa não consumir a cota de outra.
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
				throw new AiError('bad-response', 'Proxy devolveu resposta vazia.');
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
				// Distinguir os dois abortos importa: cancelamento do usuário
				// não é erro, e não deve virar notificação vermelha.
				throw new AiError(
					request.signal?.aborted ? 'cancelled' : 'timeout',
					request.signal?.aborted
						? 'Operação cancelada.'
						: 'O servidor do Paste as Markdown demorou demais para responder.',
				);
			}
			throw new AiError(
				'network',
				'Não foi possível falar com o servidor do Paste as Markdown. Ele está rodando?',
			);
		} finally {
			request.signal?.removeEventListener('abort', onAbort);
		}
	}

	/** Converte a resposta de erro do proxy em `AiError` amigável. */
	private async translateError(response: Response): Promise<AiError> {
		// 429 tem tratamento próprio: é o limite diário, e o usuário precisa
		// saber que é temporário, não que algo quebrou.
		if (response.status === 429) {
			const retry = response.headers.get('X-RateLimit-Reset');
			const quando = retry
				? new Date(Number(retry) * 1000).toLocaleString()
				: 'mais tarde';
			return new AiError(
				'rate-limit',
				`Limite diário de formatações com IA atingido. Tente de novo em ${quando}.`,
			);
		}

		if (response.status === 413) {
			return new AiError('bad-response', 'O texto é grande demais para o servidor.');
		}

		if (response.status === 502 || response.status === 504) {
			return new AiError(
				'network',
				'O servidor do Paste as Markdown não conseguiu falar com o provedor de IA.',
			);
		}

		let detail = '';
		try {
			const body = (await response.json()) as { error?: string };
			detail = body.error ?? '';
		} catch {
			// Corpo não-JSON: ignoramos e usamos a mensagem genérica.
		}

		return new AiError(
			'bad-response',
			`Servidor do Paste as Markdown respondeu ${response.status}${detail ? `: ${detail}` : ''}.`,
		);
	}
}
