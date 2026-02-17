import * as vscode from 'vscode';
import { LogContentProvider } from '../providers/logContentProvider';
import { BuildTreeItem } from '../providers/buildTreeProvider';

export function registerLogCommands(
    context: vscode.ExtensionContext,
    logProvider: LogContentProvider,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('xcodeCloud.viewLogs', async (item?: BuildTreeItem) => {
            if (!item?.buildRun) {
                vscode.window.showWarningMessage('Select a build run to view logs.');
                return;
            }

            await logProvider.openBuildLog(
                item.buildRun.id,
                item.buildRun.attributes.number,
            );
        }),
    );
}
