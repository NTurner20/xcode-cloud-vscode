import * as vscode from 'vscode';
import { XcodeCloudApi, CiBuildRun, CiCompletionStatus } from './api/xcodeCloudApi';
import { AppStoreConnectAuth } from './auth/appStoreConnectAuth';
import { log } from './logger';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private knownBuildStates = new Map<string, string>();
    private initialized = false;

    constructor(
        private readonly api: XcodeCloudApi,
        private readonly auth: AppStoreConnectAuth,
    ) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100,
        );
        this.statusBarItem.command = 'workbench.view.extension.xcodeCloud';
        this.updateVisibility();
    }

    async update(): Promise<void> {
        const config = vscode.workspace.getConfiguration('xcodeCloud');
        if (!config.get<boolean>('showStatusBarItem', true)) {
            this.statusBarItem.hide();
            return;
        }

        const authenticated = await this.auth.isAuthenticated();
        if (!authenticated) {
            this.statusBarItem.hide();
            return;
        }

        try {
            const products = await this.api.listProducts();
            const allBuildRuns: CiBuildRun[] = [];

            for (const product of products) {
                const workflows = await this.api.listWorkflows(product.id);
                for (const workflow of workflows) {
                    const runs = await this.api.listBuildRuns(workflow.id);
                    allBuildRuns.push(...runs);
                }
            }

            this.updateStatusBarText(allBuildRuns);
            this.checkForTransitions(allBuildRuns);
            this.statusBarItem.show();
        } catch (error) {
            log(`Status bar update failed: ${error}`);
        }
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }

    private updateVisibility(): void {
        const config = vscode.workspace.getConfiguration('xcodeCloud');
        if (config.get<boolean>('showStatusBarItem', true)) {
            this.statusBarItem.show();
            this.statusBarItem.text = '\u2601 Xcode Cloud';
        } else {
            this.statusBarItem.hide();
        }
    }

    private updateStatusBarText(buildRuns: CiBuildRun[]): void {
        const running = buildRuns.filter(
            (r) => r.attributes.executionProgress === 'RUNNING',
        );

        if (running.length > 0) {
            this.statusBarItem.text = `\u2601 ${running.length} running`;
            this.statusBarItem.tooltip = `Xcode Cloud: ${running.length} build(s) running`;
        } else {
            const mostRecent = buildRuns
                .filter((r) => r.attributes.executionProgress === 'COMPLETE')
                .sort((a, b) => {
                    const aDate = a.attributes.finishedDate ?? a.attributes.createdDate;
                    const bDate = b.attributes.finishedDate ?? b.attributes.createdDate;
                    return new Date(bDate).getTime() - new Date(aDate).getTime();
                })[0];

            if (mostRecent) {
                const status = mostRecent.attributes.completionStatus;
                const icon = status === 'SUCCEEDED' ? '\u2705' : '\u274C';
                this.statusBarItem.text = `\u2601 Last: ${icon} ${status?.toLowerCase() ?? 'unknown'}`;
                this.statusBarItem.tooltip = `Xcode Cloud: Last build ${status?.toLowerCase() ?? 'unknown'}`;
            } else {
                this.statusBarItem.text = '\u2601 Xcode Cloud';
                this.statusBarItem.tooltip = 'Xcode Cloud';
            }
        }
    }

    private checkForTransitions(buildRuns: CiBuildRun[]): void {
        const config = vscode.workspace.getConfiguration('xcodeCloud');
        const notifyEnabled = config.get<boolean>('notifyOnBuildComplete', true);

        for (const run of buildRuns) {
            const currentState = this.getBuildStateKey(run);
            const previousState = this.knownBuildStates.get(run.id);

            if (previousState && previousState !== currentState && run.attributes.executionProgress === 'COMPLETE') {
                if (notifyEnabled && this.initialized) {
                    this.notifyBuildComplete(run);
                }
            }

            this.knownBuildStates.set(run.id, currentState);
        }

        this.initialized = true;
    }

    private getBuildStateKey(run: CiBuildRun): string {
        return `${run.attributes.executionProgress}:${run.attributes.completionStatus ?? ''}`;
    }

    private notifyBuildComplete(run: CiBuildRun): void {
        const number = run.attributes.number;
        const status = run.attributes.completionStatus as CiCompletionStatus;
        const branch = run.attributes.sourceBranchOrTag?.name ?? '';
        const branchSuffix = branch ? ` (${branch})` : '';

        if (status === 'SUCCEEDED') {
            vscode.window.showInformationMessage(
                `Build #${number}${branchSuffix} succeeded.`,
                'View Logs',
            ).then((action) => {
                if (action === 'View Logs') {
                    vscode.commands.executeCommand('xcodeCloud.viewLogs', {
                        buildRun: run,
                        itemType: 'buildRun',
                        itemId: run.id,
                    });
                }
            });
        } else if (status === 'FAILED' || status === 'ERRORED') {
            vscode.window.showErrorMessage(
                `Build #${number}${branchSuffix} failed.`,
                'View Logs',
                'Open in Browser',
            ).then((action) => {
                if (action === 'View Logs') {
                    vscode.commands.executeCommand('xcodeCloud.viewLogs', {
                        buildRun: run,
                        itemType: 'buildRun',
                        itemId: run.id,
                    });
                } else if (action === 'Open in Browser') {
                    const url = `https://appstoreconnect.apple.com/teams/builds/${run.id}`;
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
            });
        } else if (status === 'CANCELED') {
            vscode.window.showWarningMessage(
                `Build #${number}${branchSuffix} was canceled.`,
            );
        }
    }
}
