/**
 * comandos do vs code.
 *
 * aqui fica so a cola entre o editor e o motor puro:
 *
 *   editor -> selecao -> texto -> core/ai -> texto novo -> editor.edit
 *
 * nenhuma regra de markdown mora aqui. e por isso que da pra testar as
 * regras sem abrir o vs code.
 */

import * as vscode from 'vscode';
import { formatSelection } from '../core/formatter';
import { AiError } from '../ai/provider';
import { AiFormatter } from '../ai/formatter';
import { getAiSettings, getFormatOptions, setApiKey, clearApiKey } from './config';
import { isKeylessProvider } from '../ai/registry';

/** resultado de achar o alvo do comando. */
type Target =
	| { ok: true; editor: vscode.TextEditor; range: vscode.Range; text: string }
	| { ok: false; reason: string };

/**
 * descobre oq formatar.
 *
 * - com selecao -> formata a selecao (fluxo principal)
 * - sem selecao -> formata o documento inteiro (fluxo "arruma meu readme")
 */
function resolveTarget(editor: vscode.TextEditor | undefined, allowWholeDocument: boolean): Target {
	if (!editor) {
		return { ok: false, reason: 'No active editor. Open a Markdown file.' };
	}

	const selection = editor.selection;
	const selected = editor.document.getText(selection);

	if (selected.trim().length > 0) {
		// selecao vazia com cursor: expande pra linha atual.
		return { ok: true, editor, range: selection, text: selected };
	}

	if (!allowWholeDocument) {
		return { ok: false, reason: 'Nothing selected.' };
	}

	const document = editor.document;
	const fullRange = new vscode.Range(
		document.positionAt(0),
		document.positionAt(document.getText().length),
	);
	return { ok: true, editor, range: fullRange, text: document.getText() };
}

/** joga o texto novo no editor com undo funcionando (replace em 1 passo). */
async function replaceRange(editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<boolean> {
	return editor.edit((builder) => builder.replace(range, text));
}

/** comando 1: formatacao deterministica (niveis 1 + 2A). sem internet. */
export function registerFormatCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('better-mark.format', async () => {
		const target = resolveTarget(vscode.window.activeTextEditor, true);
		if (!target.ok) {
			void vscode.window.showWarningMessage(`Markdownify: ${target.reason}`);
			return;
		}

		const { editor, range, text } = target;
		const result = formatSelection(text, getFormatOptions());

		if (result.text === text) {
			void vscode.window.showInformationMessage('Markdownify: nothing to format.');
			return;
		}

		const applied = await replaceRange(editor, range, result.text);
		if (!applied) {
			void vscode.window.showErrorMessage('Markdownify: could not edit the document.');
			return;
		}

		const rules = result.appliedRules.length > 0 ? result.appliedRules.join(', ') : 'nenhuma';
		void vscode.window.showInformationMessage(
			`Markdownify: ${result.changedLines} linha(s) ajustada(s) — ${rules}.`,
		);
	});

	context.subscriptions.push(disposable);
}

/**
 * roda a formatacao com IA e joga no editor.
 *
 * ficou separado pra todo modo de IA passar pelo mesmo caminho. a unica
 * diferenca entre um modo e outro e a string do modo.
 */
async function runAiFormat(
	context: vscode.ExtensionContext,
	ai: AiFormatter,
	mode: 'preserve' | 'restructure',
): Promise<void> {
	const target = resolveTarget(vscode.window.activeTextEditor, true);
	if (!target.ok) {
		void vscode.window.showWarningMessage(`Markdownify: ${target.reason}`);
		return;
	}

	const { editor, range, text } = target;
	const settings = await getAiSettings(context);

	// so pede chave quando o provedor precisa mesmo. o padrao (`proxy`) e
	// keyless: a chave fica no servidor do markdownify, e pedir chave aqui
	// quebrava a promessa de "instale e use". bug real, corrigido em 21/10.
	// o ai/formatter.ts repete essa checagem como rede de seguranca.
	if (!settings.apiKey && !isKeylessProvider(settings.providerId)) {
		const action = await vscode.window.showWarningMessage(
			`Markdownify: "${settings.providerId}" needs an API key.`,
			'Set API key',
		);
		if (action === 'Set API key') {
			await vscode.commands.executeCommand('better-mark.configureApiKey');
		}
		return;
	}

	const title =
		mode === 'restructure'
			? `Markdownify: restructuring text with ${settings.providerId}...`
			: `Markdownify: formatting with ${settings.providerId}...`;

	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title, cancellable: true },
		async (_progress, token) => {
			try {
				const report = await ai.format(text, { ...settings, mode }, token);
				if (report.markdown === text) {
					void vscode.window.showInformationMessage('Markdownify: no changes needed.');
					return;
				}
				const applied = await replaceRange(editor, range, report.markdown);
				if (!applied) {
					void vscode.window.showErrorMessage('Markdownify: could not edit the document.');
					return;
				}
				const parts =
					mode === 'restructure'
						? [`markdown rebuilt by ${settings.providerId}`]
						: [`formatted by ${settings.providerId}`];
				if (report.shieldedBlocks > 0) {
					parts.push(`${report.shieldedBlocks} protected block(s) untouched`);
				}
				void vscode.window.showInformationMessage(`Markdownify: ${parts.join(' — ')}.`);
			} catch (error) {
				reportAiError(context, error);
			}
		},
	);
}

/**
 * comando central: um botao so que abre o menu de modos.
 *
 * dois modos, nao tres. o "IA sem mudar palavra" saiu em 22/10: o offline ja
 * entrega isso, e melhor (instantaneo, sem rede, sem risco). manter os dois
 * gerava confusao sem ganho. agora a escolha e binaria:
 *
 *   offline -> conserta o obvio, nunca muda palavra
 *   IA      -> reformata tudo, do jeito que o claude faria
 */
export function registerFormatMenuCommand(context: vscode.ExtensionContext): void {
	const ai = new AiFormatter((message) => console.log(`[markdownify] ${message}`));

	const disposable = vscode.commands.registerCommand('better-mark.menu', async () => {
		const picked = await vscode.window.showQuickPick(
			[
				{
					label: '$(check) Fix formatting',
					detail:
						'Offline and instant. Headings, lists, PDF indentation, bold labels and inline code. Never changes a single word.',
					value: 'offline' as const,
				},
				{
					label: '$(sparkle) Format with AI',
					detail:
						'RECOMMENDED. Sends the text to the AI and rebuilds it as proper Markdown — headings, lists, code blocks, emphasis. Works on already-broken Markdown too. Never touches code, tables or front matter. Asks for confirmation first.',
					value: 'restructure' as const,
				},
			],
			{
				title: 'Markdownify — choose a mode',
				placeHolder: 'Offline fixes the obvious. AI rebuilds everything.',
				matchOnDetail: true,
			},
		);

		if (!picked) {
			return;
		}

		if (picked.value === 'offline') {
			await vscode.commands.executeCommand('better-mark.format');
			return;
		}

		{
			const confirm = await vscode.window.showWarningMessage(
				'The AI will rebuild your text and may reword it. Code blocks, tables and front matter are never touched. Continue?',
				{ modal: true },
				'Continue',
			);
			if (confirm !== 'Continue') {
				return;
			}
		}

		await runAiFormat(context, ai, picked.value);
	});

	context.subscriptions.push(disposable);
}

/** comando 2: reformata com IA direto, sem passar pelo menu. */
export function registerFormatWithAiCommand(context: vscode.ExtensionContext): void {
	const ai = new AiFormatter((message) => console.log(`[markdownify] ${message}`));
	const disposable = vscode.commands.registerCommand('better-mark.formatWithAi', async () => {
		await runAiFormat(context, ai, 'restructure');
	});
	context.subscriptions.push(disposable);
}

/** comando 3: configurar a api key (vai pro secretstorage). */
export function registerConfigureApiKeyCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('better-mark.configureApiKey', async () => {
		const settings = await getAiSettings(context);
		const current = settings.apiKey.length > 0 ? '••••••••' : '(vazia)';

		const apiKey = await vscode.window.showInputBox({
			title: `Markdownify — API key (${settings.providerId})`,
			prompt: `Current value: ${current}. Stored in VS Code SecretStorage (encrypted by the OS), never in settings.json.`,
			password: true,
			ignoreFocusOut: true,
			placeHolder: 'paste your API key here',
		});

		if (apiKey === undefined) {
			return; // usuário cancelou
		}

		if (apiKey.trim().length === 0) {
			await clearApiKey(context);
			void vscode.window.showInformationMessage('Markdownify: API key removed.');
			return;
		}

		await setApiKey(context, apiKey.trim());
		void vscode.window.showInformationMessage('Markdownify: API key saved securely.');
	});

	context.subscriptions.push(disposable);
}

/** comando 4: mostra a config que ta valendo — bom pra diagnosticar. */
export function registerShowStatsCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('better-mark.showStats', async () => {
		const format = getFormatOptions();
		const ai = await getAiSettings(context);
		const editor = vscode.window.activeTextEditor;

		const lines = [
			'# Markdownify — configuração atual',
			'',
			'## Nível 1 / 2A (offline)',
			'',
			`- Nível do título: ${format.headingLevel === 0 ? 'inferido do documento' : `h${format.headingLevel}`}`,
			`- Proteger blocos: ${format.protectBlocks ? 'sim' : 'NÃO (arriscado)'}`,
			`- Código inline em rótulos: ${format.inlineCodeTerms ? 'sim' : 'não'}`,
			`- Código inline em menções: ${format.inlineCodeMentions ? 'sim' : 'não'}`,
			'',
			'## Nível 2B (IA)',
			'',
			`- Provedor: \`${ai.providerId}\``,
			`- Modelo: \`${ai.model}\``,
			`- API key: ${ai.apiKey ? 'configurada' : 'AUSENTE'}`,
			`- Timeout: ${ai.timeoutMs} ms`,
			`- Base URL: ${ai.baseUrl ?? 'padrão do provedor'}`,
			'',
			'## Editor ativo',
			'',
			`- Arquivo: ${editor ? `\`${editor.document.fileName}\`` : 'nenhum'}`,
			`- Idioma: ${editor?.document.languageId ?? '—'}`,
			`- Seleção: ${editor ? `${editor.document.getText(editor.selection).length} caractere(s)` : '—'}`,
		];

		const document = await vscode.workspace.openTextDocument({
			content: lines.join('\n'),
			language: 'markdown',
		});
		await vscode.window.showTextDocument(document, { preview: true });
	});

	context.subscriptions.push(disposable);
}

/** vira erro de IA em mensagem util + atalho pra configurar a chave. */
function reportAiError(context: vscode.ExtensionContext, error: unknown): void {
	if (error instanceof AiError) {
		console.error('[better-mark]', error.kind, error.message);
		// rejeicao nao aparece na ui de proposito: o user nao precisa do
		// detalhe tecnico e o arquivo ta intacto. o motivo fica no console.
		if (error.kind === 'cancelled') {
			void vscode.window.showInformationMessage('Markdownify: operation cancelled.');
			return;
		}
		if (error.kind === 'missing-key' || error.kind === 'unauthorized') {
			void vscode.window
				.showErrorMessage(`Markdownify: ${error.friendlyMessage}`, 'Set API key')
				.then((action) => {
					if (action === 'Set API key') {
						void vscode.commands.executeCommand('better-mark.configureApiKey');
					}
				});
			return;
		}
		void vscode.window.showErrorMessage(`Markdownify: ${error.friendlyMessage}`);
		return;
	}

	console.error('[better-mark] erro inesperado', error);
	void vscode.window.showErrorMessage(
		`Markdownify: erro inesperado — ${error instanceof Error ? error.message : String(error)}`,
	);
}
