import * as vscode from 'vscode';
import { XcodeCloudApi, CiProduct, CiWorkflow } from '../api/xcodeCloudApi';
import { AppStoreConnectAuth } from '../auth/appStoreConnectAuth';
import { BuildTreeProvider, BuildTreeItem } from '../providers/buildTreeProvider';
import { Poller } from '../poller';
import { log } from '../logger';

export function registerBuildCommands(
    context: vscode.ExtensionContext,
    api: XcodeCloudApi,
    auth: AppStoreConnectAuth,
    treeProvider: BuildTreeProvider,
    poller: Poller,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('xcodeCloud.refresh', () => {
            poller.resetBackoff();
            treeProvider.refresh();
        }),

        vscode.commands.registerCommand('xcodeCloud.triggerBuild', async (item?: BuildTreeItem) => {
            const authenticated = await auth.isAuthenticated();
            if (!authenticated) {
                vscode.window.showWarningMessage('Please sign in to Xcode Cloud first.');
                return;
            }

            let workflowId: string | undefined;

            if (item?.itemType === 'workflow') {
                workflowId = item.itemId;
            } else {
                // Prompt user to select product then workflow
                workflowId = await pickWorkflow(api);
            }

            if (!workflowId) {
                return;
            }

            try {
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Triggering build...' },
                    async () => {
                        await api.triggerBuildRun(workflowId);
                    },
                );
                vscode.window.showInformationMessage('Build triggered successfully.');
                treeProvider.refresh();
            } catch (error) {
                log(`Failed to trigger build: ${error}`);
            }
        }),

        vscode.commands.registerCommand('xcodeCloud.cancelBuild', async (item?: BuildTreeItem) => {
            const authenticated = await auth.isAuthenticated();
            if (!authenticated) {
                vscode.window.showWarningMessage('Please sign in to Xcode Cloud first.');
                return;
            }

            if (!item?.buildRun) {
                vscode.window.showWarningMessage('Select a running build to cancel.');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Cancel build #${item.buildRun.attributes.number}?`,
                { modal: true },
                'Cancel Build',
            );

            if (confirm !== 'Cancel Build') {
                return;
            }

            try {
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Canceling build...' },
                    async () => {
                        await api.cancelBuildRun(item.buildRun!.id);
                    },
                );
                vscode.window.showInformationMessage('Build canceled.');
                treeProvider.refresh();
            } catch (error) {
                log(`Failed to cancel build: ${error}`);
            }
        }),

        vscode.commands.registerCommand('xcodeCloud.openInBrowser', (item?: BuildTreeItem) => {
            if (!item?.buildRun) {
                vscode.window.showWarningMessage('Select a build run to open in browser.');
                return;
            }
            const url = `https://appstoreconnect.apple.com/teams/builds/${item.buildRun.id}`;
            vscode.env.openExternal(vscode.Uri.parse(url));
        }),
    );
}

async function pickWorkflow(api: XcodeCloudApi): Promise<string | undefined> {
    let products: CiProduct[];
    try {
        products = await api.listProducts();
    } catch {
        return undefined;
    }

    if (products.length === 0) {
        vscode.window.showInformationMessage('No Xcode Cloud products found.');
        return undefined;
    }

    const productPick = await vscode.window.showQuickPick(
        products.map((p) => ({
            label: p.attributes.name,
            description: p.attributes.productType,
            id: p.id,
        })),
        { placeHolder: 'Select a product' },
    );

    if (!productPick) {
        return undefined;
    }

    let workflows: CiWorkflow[];
    try {
        workflows = await api.listWorkflows(productPick.id);
    } catch {
        return undefined;
    }

    if (workflows.length === 0) {
        vscode.window.showInformationMessage('No workflows found for this product.');
        return undefined;
    }

    const workflowPick = await vscode.window.showQuickPick(
        workflows.map((w) => ({
            label: w.attributes.name,
            description: w.attributes.description || '',
            id: w.id,
        })),
        { placeHolder: 'Select a workflow to trigger' },
    );

    return workflowPick?.id;
}
