// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "better-mark" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('better-mark.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from better_mark!');
	});

	context.subscriptions.push(disposable);

	const command_button = vscode.commands.registerCommand('better-mark.button', () => {
		const editor = vscode.window.activeTextEditor;
		if(!editor) {
			vscode.window.showErrorMessage('No active text editor found.');
			return;
		}
		const user_selection = editor.selection;
		const text_selected = editor.document.getText(user_selection);
		if(text_selected.length === 0) {
			vscode.window.showErrorMessage('No text selected.');
			return;
		} 
		editor.edit((editBuilder) => {
			const new_text_selected: string = formatToMarkdown(text_selected);
			editBuilder.replace(user_selection, new_text_selected);
		}).then(success => {
			if(success) {
				vscode.window.showInformationMessage('Modified changes.');
			} else {
				vscode.window.showErrorMessage('Error modifying changes.');
			}
		});
	});
	context.subscriptions.push(command_button);
}

// This method is called when user needs format any texts lines
function formatToMarkdown(text: string): string {
	const lines = text.split('\n');
	const new_lines = [];
	for(let i = 0; i < lines.length; i++) {
		let current_line = lines[i];
		current_line = formatToTitle(current_line);
		new_lines.push(current_line);
	}
	return new_lines.join('\n');
}

// This method is called when needs change text to better text
function formatToTitle(text: string): string { 
	let result = text.trim();
	const is_short =  result.length < 80;
	const has_no_line_breaks = !result.includes('\n');
	const does_not_end_with_period = !result.endsWith('.');
	const nothing = result.length !== 0;
	if(is_short && has_no_line_breaks && does_not_end_with_period && nothing) {
		result = `# ${result}`;
	} 
	return result;
}

// This method is called when your extension is deactivated
export function deactivate() {}