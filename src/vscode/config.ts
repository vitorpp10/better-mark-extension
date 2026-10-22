/**
 * config da extensao.
 *
 * toda leitura de `workspace.getConfiguration` mora aqui. o resto do codigo
 * recebe objeto ja resolvido (e testavel).
 *
 * seguranca: a api key nunca fica no codigo. ela vem do setting
 * `betterMark.ai.apiKey` ou, de preferencia, do secretstorage do vs code,
 * que o so criptografa.
 */

import * as vscode from 'vscode';
import type { FormatOptions } from '../core/types';
import type { AiFormatterSettings } from '../ai/formatter';
import { getDefaultModel, getProvider, isKeylessProvider } from '../ai/registry';

export const CONFIG_SECTION = 'betterMark';
/** chave do secretstorage (mais seguro que settings.json). */
export const SECRET_API_KEY = 'betterMark.apiKey';

interface RawConfig {
	headingLevel?: number;
	inlineCodeTerms?: boolean;
	inlineCodeMentions?: boolean;
	protectBlocks?: boolean;
	ai?: {
		provider?: string;
		model?: string;
		apiKey?: string;
		baseUrl?: string;
		timeoutMs?: number;
		instructions?: string;
		emphasis?: string;
	};
}

function readConfig(): RawConfig {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	return {
		headingLevel: config.get<number>('format.headingLevel'),
		inlineCodeTerms: config.get<boolean>('level2.inlineCodeTerms'),
		inlineCodeMentions: config.get<boolean>('level2.inlineCodeMentions'),
		protectBlocks: config.get<boolean>('format.protectBlocks'),
		ai: config.get<RawConfig['ai']>('ai'),
	};
}

/** opcoes do motor deterministico (niveis 1 e 2A). */
export function getFormatOptions(): FormatOptions {
	const raw = readConfig();
	return {
		headingLevel: normalizeHeadingLevel(raw.headingLevel),
		inlineCodeTerms: raw.inlineCodeTerms ?? true,
		inlineCodeMentions: raw.inlineCodeMentions ?? true,
		protectBlocks: raw.protectBlocks ?? true,
	};
}

/** `0` = infere do documento; fora de 1-6 tambem cai em inferir. */
function normalizeHeadingLevel(level: number | undefined): number {
	if (typeof level !== 'number' || !Number.isFinite(level)) {
		return 0;
	}
	return level >= 1 && level <= 6 ? Math.floor(level) : 0;
}

/**
 * resolve as configs de IA.
 *
 * prioridade da api key:
 *   1. secretstorage (comando "set api key") — recomendado
 *   2. setting `betterMark.ai.apiKey` — so pra teste
 */
export async function getAiSettings(context: vscode.ExtensionContext): Promise<AiFormatterSettings> {
	const raw = readConfig();
	// o padrao e o `proxy`: unico provedor que roda sem o user criar conta
	// em lugar nenhum, que e o ponto da extensao.
	const providerId = raw.ai?.provider ?? 'proxy';
	const provider = getProvider(providerId);

	// o provedor `proxy` nao usa api key — a chave fica no nosso servidor.
	// buscar o secret aqui era so custo, e exigir chave quebrava o fluxo
	// "instale e use".
	const keyless = isKeylessProvider(provider.id);
	const storedSecret = keyless ? undefined : await context.secrets.get(SECRET_API_KEY);
	const apiKey = storedSecret ?? (keyless ? '' : (raw.ai?.apiKey ?? ''));

	return {
		providerId: provider.id,
		model: raw.ai?.model?.trim() || getDefaultModel(provider.id),
		apiKey,
		baseUrl: raw.ai?.baseUrl?.trim() || undefined,
		timeoutMs: normalizeTimeout(raw.ai?.timeoutMs),
		instructions: raw.ai?.instructions?.trim() || undefined,
		emphasis: normalizeEmphasis(raw.ai?.emphasis),
		installId: getInstallId(context),
	};
}

/**
 * id anonimo e estavel dessa instalacao.
 *
 * serve so pro servidor aplicar a cota diaria sem um user comer a cota do
 * outro. nao identifica ninguem, nao sai do nosso servidor e nao e segredo.
 * gerado uma vez e guardado no `globalState`.
 */
function getInstallId(context: vscode.ExtensionContext): string {
	const KEY = 'betterMark.installId';
	const existing = context.globalState.get<string>(KEY);
	if (existing) {
		return existing;
	}
	// 32 chars hex aleatorios: ja basta pra nao colidir.
	const bytes = new Uint8Array(16);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Math.floor(Math.random() * 256);
	}
	const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	void context.globalState.update(KEY, id);
	return id;
}

/** garante que o modo de enfase ta entre os validos. */
function normalizeEmphasis(value: string | undefined): 'off' | 'safe' | 'deduce' {
	return value === 'off' || value === 'safe' ? value : 'deduce';
}

function normalizeTimeout(value: number | undefined): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 30000;
	}
	return Math.min(Math.max(Math.floor(value), 5000), 120000);
}

/** grava a api key no secretstorage do vs code. */
export async function setApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
	await context.secrets.store(SECRET_API_KEY, apiKey);
}

/** apaga a api key guardada. */
export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
	await context.secrets.delete(SECRET_API_KEY);
}
