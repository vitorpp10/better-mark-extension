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
			void vscode.window.showWarningMessage(`Paste as Markdown: ${target.reason}`);
			return;
		}

		const { editor, range, text } = target;
		const result = formatSelection(text, getFormatOptions());

		if (result.text === text) {
			void vscode.window.showInformationMessage('Paste as Markdown: nothing to format.');
			return;
		}

		const applied = await replaceRange(editor, range, result.text);
		if (!applied) {
			void vscode.window.showErrorMessage('Paste as Markdown: could not edit the document.');
			return;
		}

		const rules = result.appliedRules.length > 0 ? result.appliedRules.join(', ') : 'nenhuma';
		void vscode.window.showInformationMessage(
			`Paste as Markdown: ${result.changedLines} linha(s) ajustada(s) — ${rules}.`,
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
		void vscode.window.showWarningMessage(`Paste as Markdown: ${target.reason}`);
		return;
	}

	const { editor, range, text } = target;
	const settings = await getAiSettings(context);

	if (!settings.apiKey) {
		const action = await vscode.window.showWarningMessage(
			'Paste as Markdown: no API key configured.',
			'Set API key',
		);
		if (action === 'Set API key') {
			await vscode.commands.executeCommand('better-mark.configureApiKey');
		}
		return;
	}

	const title =
		mode === 'restructure'
			? `Paste as Markdown: restructuring text with ${settings.providerId}...`
			: `Paste as Markdown: formatting with ${settings.providerId}...`;

	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title, cancellable: true },
		async (_progress, token) => {
			try {
				const report = await ai.format(text, { ...settings, mode }, token);
				if (report.markdown === text) {
					void vscode.window.showInformationMessage('Paste as Markdown: no changes needed.');
					return;
				}
				const applied = await replaceRange(editor, range, report.markdown);
				if (!applied) {
					void vscode.window.showErrorMessage('Paste as Markdown: could not edit the document.');
					return;
				}
				const parts =
					mode === 'restructure'
						? [`markdown rebuilt by ${settings.providerId}`]
						: [`formatted by ${settings.providerId}`];
				if (report.shieldedBlocks > 0) {
					parts.push(`${report.shieldedBlocks} protected block(s) untouched`);
				}
				void vscode.window.showInformationMessage(`Paste as Markdown: ${parts.join(' — ')}.`);
			} catch (error) {
				reportAiError(context, error);
			}
		},
	);
}

/**
 * Comando central: um único botão que abre o menu de modos.
 *
 * POR QUE UM MENU: três botões separados na barra do editor poluem a
 * interface e o usuário não sabe qual escolher. Um botão só, com descrição
 * do risco de cada modo, deixa a decisão explícita no momento da escolha.
 */
export function registerFormatMenuCommand(context: vscode.ExtensionContext): void {
	const ai = new AiFormatter((message) => console.log(`[better-mark] ${message}`));

	const disposable = vscode.commands.registerCommand('better-mark.menu', async () => {
		type Mode = {
			label: string;
			detail: string;
			offline?: boolean;
			mode?: 'preserve' | 'restructure';
		};

		// DOIS modos, e não três. Antes havia "sem IA" e "IA preservando"
		// separados, mas o resultado era quase idêntico — porque o motor
		// offline ainda era fraco. Agora que ele resolve títulos, listas,
		// recuo de PDF, rótulos em negrito e código inline, a IA virou um
		// refinamento opcional sobre o mesmo resultado, não um modo à parte.
		const offlineFirst = await vscode.window.showQuickPick(
			[
				{
					label: '$(check) Fix formatting',
					detail:
						'Offline: headings, lists, PDF indentation, bold labels and inline code. Free, instant, never touches your words.',
					value: 'offline',
				},
				{
					label: '$(sparkle) Fix formatting + AI polish',
					detail:
						'Same as above, then the AI adds emphasis and code the text hints at. Validated word by word: if a word changes, the result is discarded.',
					value: 'ai',
				},
			],
			{
				title: 'Paste as Markdown — fix formatting',
				placeHolder: 'Offline handles almost everything; AI polishes further',
				matchOnDetail: true,
			},
		);

		if (!offlineFirst) {
			return;
		}

		if (offlineFirst.value === 'offline') {
			await vscode.commands.executeCommand('better-mark.format');
			return;
		}

		const modes: Mode[] = [
			{
				label: '$(check) Keep my words',
				detail:
					'Use when the text is already Markdown: the AI may only add formatting, never change a word.',
				mode: 'preserve',
			},
			{
				label: '$(wand) Rebuild loose text',
				detail:
					'Use for text copied from a PDF, site or chat with no formatting at all. The AI rebuilds headings, lists and paragraphs, and may reword more.',
				mode: 'restructure',
			},
		];

		const picked = await vscode.window.showQuickPick(modes, {
			title: 'Paste as Markdown — AI polish',
			placeHolder: 'Is your text already Markdown, or loose text from a PDF?',
			matchOnDetail: true,
		});

		if (!picked) {
			return;
		}

		if (picked.mode === 'restructure') {
			const confirm = await vscode.window.showWarningMessage(
				'Rebuild mode lets the AI restructure your text, which changes more than the other modes. Continue?',
				{ modal: true },
				'Continue',
			);
			if (confirm !== 'Continue') {
				return;
			}
		}

		await runAiFormat(context, ai, picked.mode ?? 'preserve');
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
			title: `Paste as Markdown — API key (${settings.providerId})`,
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
			void vscode.window.showInformationMessage('Paste as Markdown: API key removed.');
			return;
		}

		await setApiKey(context, apiKey.trim());
		void vscode.window.showInformationMessage('Paste as Markdown: API key saved securely.');
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
			'# Paste as Markdown — configuração atual',
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
			void vscode.window.showInformationMessage('Paste as Markdown: operation cancelled.');
			return;
		}
		if (error.kind === 'missing-key' || error.kind === 'unauthorized') {
			void vscode.window
				.showErrorMessage(`Paste as Markdown: ${error.friendlyMessage}`, 'Set API key')
				.then((action) => {
					if (action === 'Set API key') {
						void vscode.commands.executeCommand('better-mark.configureApiKey');
					}
				});
			return;
		}
		void vscode.window.showErrorMessage(`Paste as Markdown: ${error.friendlyMessage}`);
		return;
	}

	console.error('[better-mark] erro inesperado', error);
	void vscode.window.showErrorMessage(
		`Paste as Markdown: erro inesperado — ${error instanceof Error ? error.message : String(error)}`,
	);
}
