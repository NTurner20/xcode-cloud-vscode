import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Xcode Cloud');
    }
    return outputChannel;
}

export function log(message: string): void {
    getOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function disposeLogger(): void {
    outputChannel?.dispose();
    outputChannel = undefined;
}
