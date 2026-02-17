import * as vscode from 'vscode';
import { AppStoreConnectAuth } from './auth/appStoreConnectAuth';
import { XcodeCloudApi } from './api/xcodeCloudApi';
import { BuildTreeProvider } from './providers/buildTreeProvider';
import { Poller } from './poller';
import { log, disposeLogger } from './logger';

let auth: AppStoreConnectAuth;
let api: XcodeCloudApi;
let treeProvider: BuildTreeProvider;
let poller: Poller;

export function getAuth(): AppStoreConnectAuth {
    return auth;
}

export function getApi(): XcodeCloudApi {
    return api;
}

export function getTreeProvider(): BuildTreeProvider {
    return treeProvider;
}

export function activate(context: vscode.ExtensionContext): void {
    log('Xcode Cloud extension activating');

    auth = new AppStoreConnectAuth(context.secrets);
    api = new XcodeCloudApi(auth);
    treeProvider = new BuildTreeProvider(api, auth);

    const treeView = vscode.window.createTreeView('xcodeCloudBuilds', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });

    // Polling setup
    const getPollingInterval = () => {
        const config = vscode.workspace.getConfiguration('xcodeCloud');
        return config.get<number>('pollingIntervalSeconds', 30);
    };

    poller = new Poller(async () => {
        treeProvider.refresh();
    }, getPollingInterval);

    // Only poll when sidebar is visible
    treeView.onDidChangeVisibility((e) => {
        poller.setVisible(e.visible);
    });

    // Start polling if tree is initially visible
    if (treeView.visible) {
        poller.start();
    }

    // Status bar item for last refreshed time
    const lastRefreshedItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        50,
    );
    lastRefreshedItem.command = 'xcodeCloud.refresh';

    const updateLastRefreshed = () => {
        const last = treeProvider.getLastRefreshed();
        if (last) {
            lastRefreshedItem.text = `$(sync) ${last.toLocaleTimeString()}`;
            lastRefreshedItem.tooltip = `Xcode Cloud: Last refreshed ${last.toLocaleString()}`;
            lastRefreshedItem.show();
        }
    };

    treeProvider.onDidChangeTreeData(() => {
        updateLastRefreshed();
    });

    // Register commands
    context.subscriptions.push(
        treeView,
        lastRefreshedItem,
        poller,
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
        vscode.commands.registerCommand('xcodeCloud.refresh', () => {
            poller.resetBackoff();
            treeProvider.refresh();
        }),
        vscode.commands.registerCommand('xcodeCloud.triggerBuild', () => {
            // Stub — wired up in Phase 3
        }),
        vscode.commands.registerCommand('xcodeCloud.cancelBuild', () => {
            // Stub — wired up in Phase 3
        }),
        vscode.commands.registerCommand('xcodeCloud.viewLogs', () => {
            // Stub — wired up in Phase 4
        }),
        vscode.commands.registerCommand('xcodeCloud.openInBrowser', () => {
            // Stub — wired up in Phase 3
        }),
    );

    log('Xcode Cloud extension activated');
}

export function deactivate(): void {
    disposeLogger();
}
