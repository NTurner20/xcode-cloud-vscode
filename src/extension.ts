import * as vscode from 'vscode';
import { AppStoreConnectAuth } from './auth/appStoreConnectAuth';
import { XcodeCloudApi } from './api/xcodeCloudApi';
import { log, disposeLogger } from './logger';

let auth: AppStoreConnectAuth;
let api: XcodeCloudApi;

export function getAuth(): AppStoreConnectAuth {
    return auth;
}

export function getApi(): XcodeCloudApi {
    return api;
}

export function activate(context: vscode.ExtensionContext): void {
    log('Xcode Cloud extension activating');

    auth = new AppStoreConnectAuth(context.secrets);
    api = new XcodeCloudApi(auth);

    context.subscriptions.push(
        vscode.commands.registerCommand('xcodeCloud.signIn', () => auth.signIn()),
        vscode.commands.registerCommand('xcodeCloud.signOut', () => auth.signOut()),
        vscode.commands.registerCommand('xcodeCloud.refresh', () => {
            // Stub — wired up in Phase 2
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
            // Stub — wired up in Phase 5
        }),
    );

    log('Xcode Cloud extension activated');
}

export function deactivate(): void {
    disposeLogger();
}
