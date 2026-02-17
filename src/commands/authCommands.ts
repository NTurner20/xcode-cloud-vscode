import * as vscode from 'vscode';
import { AppStoreConnectAuth } from '../auth/appStoreConnectAuth';
import { BuildTreeProvider } from '../providers/buildTreeProvider';
import { Poller } from '../poller';

export function registerAuthCommands(
    context: vscode.ExtensionContext,
    auth: AppStoreConnectAuth,
    treeProvider: BuildTreeProvider,
    poller: Poller,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('xcodeCloud.signIn', async () => {
            const success = await auth.signIn();
            if (success) {
                treeProvider.refresh();
                poller.resetBackoff();
            }
        }),
        vscode.commands.registerCommand('xcodeCloud.signOut', async () => {
            await auth.signOut();
            treeProvider.refresh();
        }),
    );
}
