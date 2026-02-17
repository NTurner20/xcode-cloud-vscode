import * as vscode from 'vscode';

export function activate(_context: vscode.ExtensionContext): void {
    const outputChannel = vscode.window.createOutputChannel('Xcode Cloud');
    outputChannel.appendLine('Xcode Cloud extension activated');
}

export function deactivate(): void {
    // Clean up resources
}
