/**
 * registro de provedores.
 *
 * ponto unico onde a extensao resolve qual provedor usar. pra adicionar um
 * provedor novo basta implementar `AiProvider` e registrar aqui, nada mais no
 * codigo precisa saber que ele existe.
 */

import type { AiProvider } from './provider';
import {
	DeepSeekProvider,
	GlmProvider,
	NemotronProvider,
	OpenAiProvider,
	RiverProvider,
} from './openai-compatible';
import { GeminiProvider } from './gemini';
import { ProxyProvider } from './proxy';

/**
 * a ordem importa: o primeiro e o padrao e aparece no topo do seletor.
 *
 * o proxy vem primeiro porque e o unico que funciona sem o user criar conta em
 * lugar nenhum, que e o ponto da extensao. quem preferir usar a propria chave
 * escolhe outro provedor nas configuracoes.
 */
export const PROVIDERS: readonly AiProvider[] = [
	new ProxyProvider(),
	new RiverProvider(),
	new DeepSeekProvider(),
	new GeminiProvider(),
	new GlmProvider(),
	new NemotronProvider(),
	new OpenAiProvider(),
];

/** ids validos, na ordem em que aparecem no seletor do VS Code. */
export const PROVIDER_IDS = PROVIDERS.map((provider) => provider.id);

/** true quando o provedor nao exige API key (fala com o nosso servidor). */
export function isKeylessProvider(id: string): boolean {
	return id === 'proxy';
}

/** busca por id, com fallback pro primeiro (DeepSeek por padrao). */
export function getProvider(id: string): AiProvider {
	return PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0];
}

/** modelo padrao do provedor, usado quando o user nao configura nada. */
export function getDefaultModel(id: string): string {
	return getProvider(id).defaultModel;
}
