/**
 * Comandos do VS Code.
 *
 * Aqui fica SÓ a cola entre o editor e o motor puro:
 *
 *   editor → seleção → texto → core/ai → novo texto → editor.edit
 *
 * Nenhuma regra de markdown mora neste arquivo. É por isso que as regras
 * podem ser testadas sem abrir o VS Code.
 */

import * as vscode from 'vscode';
import { formatSelection } from '../core/formatter';
import { AiError } from '../ai/provider';
import { AiFormatter } from '../ai/formatter';
import { getAiSettings, getFormatOptions, setApiKey, clearApiKey } from './config';
import { isKeylessProvider } from '../ai/registry';

/** Resultado de localizar o alvo do comando. */
type Target =
	| { ok: true; editor: vscode.TextEditor; range: vscode.Range; text: string }
	| { ok: false; reason: string };

/**
 * Descobre o que formatar.
 *
 * - com seleção → formata a seleção (fluxo principal);
 * - sem seleção → formata o documento inteiro (fluxo "arruma meu README").
 */
function resolveTarget(editor: vscode.TextEditor | undefined, allowWholeDocument: boolean): Target {
	if (!editor) {
		return { ok: false, reason: 'No active editor. Open a Markdown file.' };
	}

	const selection = editor.selection;
	const selected = editor.document.getText(selection);

	if (selected.trim().length > 0) {
		// Seleção vazia com cursor: expande para a linha atual.
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

/** Aplica o texto novo no editor, com Undo funcionando (replace em 1 passo). */
async function replaceRange(editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<boolean> {
	return editor.edit((builder) => builder.replace(range, text));
}

/** Comando 1: formatação determinística (Níveis 1 + 2A). Sem internet. */
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
 * Executa a formatação com IA e aplica no editor.
 *
 * Extraído para que os modos "preserve" e "restruture" compartilhem o mesmo
 * caminho — a ÚNICA diferença entre eles é uma string de modo.
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

	// Só exige chave quando o provedor realmente precisa de uma. O padrão
	// (`proxy`) é keyless: a chave vive no servidor do Markdownify, e pedir
	// chave aqui contradiria a promessa de "instale e use".
	// O `ai/formatter.ts` repete esta checagem como rede de segurança.
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
 * Comando central: um único botão que abre o menu de modos.
 *
 * POR QUE UM MENU SÓ: antes eram duas telas (offline vs. IA, depois preserve
 * vs. restructure). O usuário tinha que classificar o próprio texto antes de
 * ver a opção que queria. Agora as três opções aparecem de uma vez, cada uma
 * dizendo o que faz e qual o risco — a decisão fica em um clique.
 */
export function registerFormatMenuCommand(context: vscode.ExtensionContext): void {
	const ai = new AiFormatter((message) => console.log(`[better-mark] ${message}`));

	const disposable = vscode.commands.registerCommand('better-mark.menu', async () => {
		const picked = await vscode.window.showQuickPick(
			[
				{
					label: '$(check) Fix formatting',
					detail:
						'Offline: headings, lists, PDF indentation, bold labels and inline code. Free, instant, never touches your words.',
					value: 'offline' as const,
				},
				{
					label: '$(sparkle) Fix formatting + AI polish',
					detail:
						'Same as above, then the AI adds emphasis and code the text hints at. Validated word by word: if a word changes, the result is discarded.',
					value: 'preserve' as const,
				},
				{
					label: '$(wand) Rebuild loose text',
					detail:
						'RECOMMENDED for text copied from a PDF, site or chat. The AI rebuilds headings, lists and paragraphs, and may reword. Asks for confirmation first.',
					value: 'restructure' as const,
				},
			],
			{
				title: 'Markdownify — choose a mode',
				placeHolder: 'Already Markdown? Pick the first. Raw text from a PDF or chat? Pick the last.',
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

		if (picked.value === 'restructure') {
			const confirm = await vscode.window.showWarningMessage(
				'Rebuild mode lets the AI restructure your text, which changes more than the other modes. Continue?',
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

/** Comando 2: formatação com IA no modo `preserve` (não muda palavras). */
export function registerFormatWithAiCommand(context: vscode.ExtensionContext): void {
	const ai = new AiFormatter((message) => console.log(`[better-mark] ${message}`));
	const disposable = vscode.commands.registerCommand('better-mark.formatWithAi', async () => {
		await runAiFormat(context, ai, 'preserve');
	});
	context.subscriptions.push(disposable);
}

/** Comando: reestruturar texto solto em Markdown. */
export function registerRestructureCommand(context: vscode.ExtensionContext): void {
	const ai = new AiFormatter((message) => console.log(`[better-mark] ${message}`));
	const disposable = vscode.commands.registerCommand('better-mark.restructure', async () => {
		const confirm = await vscode.window.showWarningMessage(
			'Rebuild mode lets the AI restructure your text, which changes more than the other modes. Continue?',
			{ modal: true },
			'Continue',
		);
		if (confirm !== 'Continue') {
			return;
		}
		await runAiFormat(context, ai, 'restructure');
	});
	context.subscriptions.push(disposable);
}

/** Comando 3: configurar a API key (vai para o SecretStorage). */
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

/** Comando 4: mostra a configuração efetiva — útil para diagnosticar. */
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

/** Traduz erro de IA em mensagem útil + atalho para configurar a chave. */
function reportAiError(context: vscode.ExtensionContext, error: unknown): void {
	if (error instanceof AiError) {
		console.error('[better-mark]', error.kind, error.message);
		// Mensagens de rejeição são propositalmente descartadas na UI: o
		// usuário não precisa do detalhe técnico, e o arquivo está intacto.
		// O motivo fica no Output/console para diagnóstico.
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
