import * as vscode from 'vscode';
import {
    XcodeCloudApi,
    CiProduct,
    CiWorkflow,
    CiBuildRun,
    CiBuildRunStatus,
    CiCompletionStatus,
} from '../api/xcodeCloudApi';
import { AppStoreConnectAuth } from '../auth/appStoreConnectAuth';

export type TreeItemType = 'product' | 'workflow' | 'buildRun';

export class BuildTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: TreeItemType,
        public readonly itemId: string,
        public readonly parentId?: string,
    ) {
        super(label, collapsibleState);
    }

    // Attached data for commands
    public product?: CiProduct;
    public workflow?: CiWorkflow;
    public buildRun?: CiBuildRun;
}

function getBuildStatusIcon(
    progress: CiBuildRunStatus,
    completion?: CiCompletionStatus,
): string {
    if (progress === 'COMPLETE') {
        switch (completion) {
            case 'SUCCEEDED': return '\u2705';
            case 'FAILED':
            case 'ERRORED': return '\u274C';
            case 'CANCELED': return '\uD83D\uDEAB';
            case 'SKIPPED': return '\u23ED\uFE0F';
            default: return '\u2753';
        }
    }
    switch (progress) {
        case 'RUNNING': return '\uD83D\uDD04';
        case 'PENDING':
        case 'WAITING': return '\u23F3';
        default: return '\u2753';
    }
}

function formatDuration(startDate?: string, endDate?: string): string {
    if (!startDate) {
        return '';
    }
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
}

export class BuildTreeProvider implements vscode.TreeDataProvider<BuildTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<BuildTreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private lastRefreshed: Date | null = null;
    private message: string | undefined;

    constructor(
        private readonly api: XcodeCloudApi,
        private readonly auth: AppStoreConnectAuth,
    ) {}

    refresh(): void {
        this.lastRefreshed = new Date();
        this._onDidChangeTreeData.fire(undefined);
    }

    getLastRefreshed(): Date | null {
        return this.lastRefreshed;
    }

    getTreeItem(element: BuildTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: BuildTreeItem): Promise<BuildTreeItem[]> {
        const authenticated = await this.auth.isAuthenticated();
        if (!authenticated) {
            this.message = 'Sign in to view Xcode Cloud builds';
            return [];
        }
        this.message = undefined;

        try {
            if (!element) {
                return this.getProducts();
            }
            if (element.itemType === 'product') {
                return this.getWorkflows(element.itemId);
            }
            if (element.itemType === 'workflow') {
                return this.getBuildRuns(element.itemId);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to load tree data: ${msg}`);
        }

        return [];
    }

    private async getProducts(): Promise<BuildTreeItem[]> {
        const products = await this.api.listProducts();
        return products.map((product) => {
            const item = new BuildTreeItem(
                product.attributes.name,
                vscode.TreeItemCollapsibleState.Expanded,
                'product',
                product.id,
            );
            item.product = product;
            item.contextValue = 'product';
            item.tooltip = `${product.attributes.name} (${product.attributes.productType})`;
            item.iconPath = new vscode.ThemeIcon('package');
            return item;
        });
    }

    private async getWorkflows(productId: string): Promise<BuildTreeItem[]> {
        const workflows = await this.api.listWorkflows(productId);
        return workflows.map((workflow) => {
            const item = new BuildTreeItem(
                workflow.attributes.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                'workflow',
                workflow.id,
                productId,
            );
            item.workflow = workflow;
            item.contextValue = 'workflow';
            item.tooltip = workflow.attributes.description || workflow.attributes.name;
            item.iconPath = new vscode.ThemeIcon('gear');
            return item;
        });
    }

    private async getBuildRuns(workflowId: string): Promise<BuildTreeItem[]> {
        const buildRuns = await this.api.listBuildRuns(workflowId);
        return buildRuns.map((run) => {
            const attrs = run.attributes;
            const icon = getBuildStatusIcon(attrs.executionProgress, attrs.completionStatus);
            const branch = attrs.sourceBranchOrTag?.name ?? '';
            const duration = formatDuration(attrs.startedDate, attrs.finishedDate);
            const description = [branch, duration].filter(Boolean).join(' \u00B7 ');

            const item = new BuildTreeItem(
                `${icon} #${attrs.number}`,
                vscode.TreeItemCollapsibleState.None,
                'buildRun',
                run.id,
                workflowId,
            );
            item.buildRun = run;
            item.description = description;

            const status = attrs.executionProgress === 'COMPLETE'
                ? attrs.completionStatus ?? 'UNKNOWN'
                : attrs.executionProgress;
            item.contextValue = attrs.executionProgress === 'RUNNING'
                ? 'buildRun-running'
                : `buildRun-${status.toLowerCase()}`;

            const commitSha = attrs.sourceCommit?.commitSha?.substring(0, 7) ?? '';
            const commitMsg = attrs.sourceCommit?.message ?? '';
            item.tooltip = new vscode.MarkdownString(
                `**Build #${attrs.number}**\n\n` +
                `Status: ${status}\n\n` +
                (branch ? `Branch: \`${branch}\`\n\n` : '') +
                (commitSha ? `Commit: \`${commitSha}\` ${commitMsg}\n\n` : '') +
                (duration ? `Duration: ${duration}\n\n` : '') +
                `Created: ${new Date(attrs.createdDate).toLocaleString()}`
            );

            return item;
        });
    }
}
