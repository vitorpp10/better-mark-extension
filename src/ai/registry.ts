/**
 * Registro de provedores.
 *
 * Ponto único onde a extensão resolve "qual provedor usar". Para adicionar
 * um provedor novo basta implementar `AiProvider` e registrar aqui — nada
 * mais no código precisa saber que ele existe.
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
 * Ordem importa: o primeiro é o padrão e aparece no topo do seletor.
 *
 * O proxy vem primeiro porque é o único que funciona SEM o usuário criar
 * conta em lugar nenhum — que é o ponto da extensão. Quem preferir usar a
 * própria chave escolhe outro provedor nas configurações.
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

/** Ids válidos, na ordem em que aparecem no seletor do VS Code. */
export const PROVIDER_IDS = PROVIDERS.map((provider) => provider.id);

/** True quando o provedor não exige API key (fala com o nosso servidor). */
export function isKeylessProvider(id: string): boolean {
	return id === 'proxy';
}

/** Busca por id, com fallback para o primeiro (DeepSeek por padrão). */
export function getProvider(id: string): AiProvider {
	return PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0];
}

/** Modelo padrão do provedor, usado quando o usuário não configura nada. */
export function getDefaultModel(id: string): string {
	return getProvider(id).defaultModel;
}
