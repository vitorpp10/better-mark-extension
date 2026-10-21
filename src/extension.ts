/**
 * markdownify — extensão VS Code.
 *
 * Ponto de entrada. Responsabilidade única: registrar comandos e limpar
 * recursos. A lógica vive em:
 *
 *   src/core/    → motor de formatação puro (sem `vscode`), testado por vitest
 *   src/ai/      → camada de IA, com provedores atrás de uma interface
 *   src/vscode/  → a cola com o editor (comandos, configuração, erros)
 *
 * Fluxo:
 *
 *   package.json  → declara comando / menu / ativação
 *         ↓
 *   activate()    → registra os comandos
 *         ↓
 *   comando       → lê a seleção, chama o core, escreve de volta
 */

import * as vscode from 'vscode';
import {
	registerConfigureApiKeyCommand,
	registerFormatCommand,
	registerFormatMenuCommand,
	registerFormatWithAiCommand,
	registerRestructureCommand,
	registerShowStatsCommand,
} from './vscode/commands';
import { registerStatusBarItem } from './vscode/status-bar';
import { SUPPORTED_LANGUAGES } from './core/types';
import { getAiSettings, setApiKey, clearApiKey } from './vscode/config';
import { PROVIDERS } from './ai/registry';

/**
 * API exposta para automação (scripts e testes de integração).
 *
 * Serve para gravar a API key no SecretStorage sem passar pelo input box do
 * comando interativo. Não é API pública da extensão: pode mudar sem aviso.
 */
export interface BetterMarkApi {
	setApiKey(apiKey: string): Promise<void>;
	getApiKey(): Promise<string | undefined>;
	clearApiKey(): Promise<void>;
	/** Provedores disponíveis, para diagnóstico. */
	listProviders(): string[];
}

export function activate(context: vscode.ExtensionContext): BetterMarkApi {
	console.log('markdownify ativa.');

	registerFormatMenuCommand(context);
	registerFormatCommand(context);
	registerFormatWithAiCommand(context);
	registerRestructureCommand(context);
	registerConfigureApiKeyCommand(context);
	registerShowStatsCommand(context);
	registerStatusBarItem(context);

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			setMarkdownContext(editor);
		}),
	);
	setMarkdownContext(vscode.window.activeTextEditor);

	console.log(`markdownify: idiomas suportados → ${SUPPORTED_LANGUAGES.join(', ')}`);

	// Retornar a API faz o VS Code publicá-la em `extension.exports`.
	const api: BetterMarkApi = {
		setApiKey: (apiKey: string) => setApiKey(context, apiKey),
		getApiKey: async () => (await getAiSettings(context)).apiKey,
		clearApiKey: () => clearApiKey(context),
		listProviders: () => PROVIDERS.map((provider) => provider.id),
	};
	return api;
}

export function deactivate(): void {
	// Nada a liberar: tudo foi registrado em `context.subscriptions`.
}

/** Expõe `betterMark.isMarkdown` para as `when` clauses do package.json. */
function setMarkdownContext(editor: vscode.TextEditor | undefined): void {
	const isMarkdown = editor?.document.languageId === 'markdown';
	void vscode.commands.executeCommand('setContext', 'betterMark.isMarkdown', isMarkdown);
}
