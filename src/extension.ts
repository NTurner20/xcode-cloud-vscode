import * as vscode from 'vscode';
import { AppStoreConnectAuth } from './auth/appStoreConnectAuth';
import { XcodeCloudApi } from './api/xcodeCloudApi';
import { BuildTreeProvider } from './providers/buildTreeProvider';
import { Poller } from './poller';
import { registerAuthCommands } from './commands/authCommands';
import { registerBuildCommands } from './commands/buildCommands';
import { log, disposeLogger } from './logger';

let auth: AppStoreConnectAuth;
let api: XcodeCloudApi;
let treeProvider: BuildTreeProvider;

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

    const getPollingInterval = () => {
        const config = vscode.workspace.getConfiguration('xcodeCloud');
        return config.get<number>('pollingIntervalSeconds', 30);
    };

    const poller = new Poller(async () => {
        treeProvider.refresh();
    }, getPollingInterval);

    treeView.onDidChangeVisibility((e) => {
        poller.setVisible(e.visible);
    });

    if (treeView.visible) {
        poller.start();
    }

    // Last refreshed status bar
    const lastRefreshedItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        50,
    );
    lastRefreshedItem.command = 'xcodeCloud.refresh';
    treeProvider.onDidChangeTreeData(() => {
        const last = treeProvider.getLastRefreshed();
        if (last) {
            lastRefreshedItem.text = `$(sync) ${last.toLocaleTimeString()}`;
            lastRefreshedItem.tooltip = `Xcode Cloud: Last refreshed ${last.toLocaleString()}`;
            lastRefreshedItem.show();
        }
    });

    // Register command modules
    registerAuthCommands(context, auth, treeProvider, poller);
    registerBuildCommands(context, api, auth, treeProvider, poller);

    // Stub commands for later phases
    context.subscriptions.push(
        vscode.commands.registerCommand('xcodeCloud.viewLogs', () => {
            // Stub — wired up in Phase 4
        }),
    );

    context.subscriptions.push(treeView, lastRefreshedItem, poller);

    log('Xcode Cloud extension activated');
}

export function deactivate(): void {
    disposeLogger();
}
