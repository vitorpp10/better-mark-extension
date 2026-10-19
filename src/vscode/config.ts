/**
 * Configuração da extensão.
 *
 * Toda a leitura de `workspace.getConfiguration` vive aqui: o resto do
 * código recebe objetos já resolvidos (e testáveis).
 *
 * Decisão de segurança: a API key NUNCA fica no código. Ela é lida da
 * configuração do VS Code (setting `betterMark.ai.apiKey`) ou, de
 * preferência, do SecretStorage do VS Code, que é criptografado pelo SO.
 */

import * as vscode from 'vscode';
import type { FormatOptions } from '../core/types';
import type { AiFormatterSettings } from '../ai/formatter';
import { getDefaultModel, getProvider, isKeylessProvider } from '../ai/registry';

export const CONFIG_SECTION = 'betterMark';
/** Chave usada no SecretStorage (mais seguro que settings.json). */
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

/** Opções do motor determinístico (Níveis 1 e 2A). */
export function getFormatOptions(): FormatOptions {
	const raw = readConfig();
	return {
		headingLevel: normalizeHeadingLevel(raw.headingLevel),
		inlineCodeTerms: raw.inlineCodeTerms ?? true,
		inlineCodeMentions: raw.inlineCodeMentions ?? true,
		protectBlocks: raw.protectBlocks ?? true,
	};
}

/** `0` = inferir do documento; fora de 1–6 também cai em inferir. */
function normalizeHeadingLevel(level: number | undefined): number {
	if (typeof level !== 'number' || !Number.isFinite(level)) {
		return 0;
	}
	return level >= 1 && level <= 6 ? Math.floor(level) : 0;
}

/**
 * Resolve as configurações de IA.
 *
 * Ordem de prioridade da API key:
 *   1. SecretStorage (comando "Configurar API key") — recomendado;
 *   2. setting `betterMark.ai.apiKey` — conveniência para testes.
 */
export async function getAiSettings(context: vscode.ExtensionContext): Promise<AiFormatterSettings> {
	const raw = readConfig();
	// O padrão é o `proxy`: é o único provedor que funciona sem o usuário
	// criar conta em lugar nenhum, que é o ponto da extensão.
	const providerId = raw.ai?.provider ?? 'proxy';
	const provider = getProvider(providerId);

	// O provedor `proxy` NÃO usa API key — a chave vive no nosso servidor.
	// Buscar o secret aqui seria só custo, e exigir a chave quebraria o
	// fluxo "instale e use".
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
 * Identificador anônimo e estável desta instalação.
 *
 * Serve SÓ para o servidor aplicar a cota diária sem que uma pessoa consuma
 * a cota de outra. Não identifica o usuário, não sai do nosso servidor e não
 * é segredo. Gerado uma vez e guardado no `globalState`.
 */
function getInstallId(context: vscode.ExtensionContext): string {
	const KEY = 'betterMark.installId';
	const existing = context.globalState.get<string>(KEY);
	if (existing) {
		return existing;
	}
	// 32 caracteres hexadecimais aleatórios: suficiente para não colidir.
	const bytes = new Uint8Array(16);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Math.floor(Math.random() * 256);
	}
	const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	void context.globalState.update(KEY, id);
	return id;
}

/** Garante que o modo de ênfase é um dos valores válidos. */
function normalizeEmphasis(value: string | undefined): 'off' | 'safe' | 'deduce' {
	return value === 'off' || value === 'safe' ? value : 'deduce';
}

function normalizeTimeout(value: number | undefined): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 30000;
	}
	return Math.min(Math.max(Math.floor(value), 5000), 120000);
}

/** Grava a API key no SecretStorage do VS Code. */
export async function setApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
	await context.secrets.store(SECRET_API_KEY, apiKey);
}

/** Remove a API key armazenada. */
export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
	await context.secrets.delete(SECRET_API_KEY);
}
