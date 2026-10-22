/**
 * markdownify — extensao do vs code.
 *
 * ponto de entrada. faz uma coisa so: registra comando e limpa recurso.
 * a logica mora em:
 *
 *   src/core/    -> motor puro (sem `vscode`), testado no vitest
 *   src/ai/      -> camada de ia, provedor atras de interface
 *   src/vscode/  -> cola com o editor (comando, config, erro)
 *
 * fluxo:
 *
 *   package.json  -> declara comando / menu / ativacao
 *         |
 *   activate()    -> registra os comandos
 *         |
 *   comando       -> le a selecao, chama o core, escreve de volta
 */

import * as vscode from 'vscode';
import {
	registerConfigureApiKeyCommand,
	registerFormatCommand,
	registerFormatMenuCommand,
	registerFormatWithAiCommand,
	registerShowStatsCommand,
} from './vscode/commands';
import { registerStatusBarItem } from './vscode/status-bar';
import { SUPPORTED_LANGUAGES } from './core/types';
import { getAiSettings, setApiKey, clearApiKey } from './vscode/config';
import { PROVIDERS } from './ai/registry';

/**
 * api exposta pra automacao (script e teste de integracao).
 *
 * serve pra gravar a api key no secretstorage sem passar pelo input box do
 * comando. nao e api publica da extensao: pode mudar sem aviso.
 */
export interface BetterMarkApi {
	setApiKey(apiKey: string): Promise<void>;
	getApiKey(): Promise<string | undefined>;
	clearApiKey(): Promise<void>;
	/** provedores disponiveis, pra diagnostico. */
	listProviders(): string[];
}

export function activate(context: vscode.ExtensionContext): BetterMarkApi {
	console.log('markdownify ativa.');

	registerFormatMenuCommand(context);
	registerFormatCommand(context);
	registerFormatWithAiCommand(context);
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

	// devolver a api faz o vs code publicar ela em `extension.exports`.
	const api: BetterMarkApi = {
		setApiKey: (apiKey: string) => setApiKey(context, apiKey),
		getApiKey: async () => (await getAiSettings(context)).apiKey,
		clearApiKey: () => clearApiKey(context),
		listProviders: () => PROVIDERS.map((provider) => provider.id),
	};
	return api;
}

export function deactivate(): void {
	// nada a liberar: tudo ja foi registrado em `context.subscriptions`.
}

/** expoe `betterMark.isMarkdown` pras `when` clauses do package.json. */
function setMarkdownContext(editor: vscode.TextEditor | undefined): void {
	const isMarkdown = editor?.document.languageId === 'markdown';
	void vscode.commands.executeCommand('setContext', 'betterMark.isMarkdown', isMarkdown);
}
