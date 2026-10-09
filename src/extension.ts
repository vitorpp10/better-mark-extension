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
			vscode.window.showInformationMessage('No active text editor found.');
			return;
		}
		const user_selection = editor.selection;
		const text_selected = editor.document.getText(user_selection);
		if(text_selected.length === 0) {
			vscode.window.showInformationMessage('No text selected.');
			return;
		}
	});

	context.subscriptions.push(command_button);
}

// This method is called when your extension is deactivated
export function deactivate() {}
