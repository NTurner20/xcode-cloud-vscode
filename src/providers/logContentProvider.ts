import * as vscode from 'vscode';
import { XcodeCloudApi } from '../api/xcodeCloudApi';
import { log } from '../logger';

export const LOG_SCHEME = 'xcodecloud-log';

interface LogSession {
    buildRunId: string;
    content: string;
    isComplete: boolean;
    pollingTimer?: ReturnType<typeof setInterval>;
}

export class LogContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this._onDidChange.event;

    private sessions = new Map<string, LogSession>();

    constructor(private readonly api: XcodeCloudApi) {}

    async openBuildLog(buildRunId: string, buildNumber: number): Promise<void> {
        const uri = vscode.Uri.parse(`${LOG_SCHEME}://build/${buildRunId}?label=Build%20%23${buildNumber}%20Log`);

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loading build logs...' },
            async () => {
                await this.fetchLogs(buildRunId, uri);
            },
        );

        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, {
            preview: false,
            preserveFocus: false,
        });

        // Apply decorations after a brief delay
        setTimeout(() => this.applyDecorations(doc), 100);
    }

    provideTextDocumentContent(uri: vscode.Uri): string {
        const session = this.sessions.get(uri.path);
        if (!session) {
            return 'Loading...';
        }
        return session.content;
    }

    dispose(): void {
        for (const session of this.sessions.values()) {
            if (session.pollingTimer) {
                clearInterval(session.pollingTimer);
            }
        }
        this.sessions.clear();
        this._onDidChange.dispose();
    }

    private async fetchLogs(buildRunId: string, uri: vscode.Uri): Promise<void> {
        try {
            const buildRun = await this.api.getBuildRun(buildRunId);
            const actions = await this.api.listBuildActions(buildRunId);
            const isRunning = buildRun.attributes.executionProgress === 'RUNNING';

            let content = this.formatLogHeader(buildRun.attributes);

            for (const action of actions) {
                content += `\n${'='.repeat(60)}\n`;
                content += `STEP: ${action.attributes.name}\n`;
                content += `Type: ${action.attributes.actionType}\n`;
                content += `Status: ${action.attributes.executionProgress}`;
                if (action.attributes.completionStatus) {
                    content += ` (${action.attributes.completionStatus})`;
                }
                content += '\n';
                if (action.attributes.startedDate) {
                    content += `Started: ${new Date(action.attributes.startedDate).toLocaleString()}\n`;
                }
                if (action.attributes.finishedDate) {
                    content += `Finished: ${new Date(action.attributes.finishedDate).toLocaleString()}\n`;
                }
                content += `${'='.repeat(60)}\n`;
            }

            if (!isRunning) {
                content += '\n---\n';
                content += `Build ${buildRun.attributes.completionStatus ?? 'UNKNOWN'}\n`;

                // Add artifacts link
                try {
                    const artifacts = await this.api.listArtifacts(buildRunId);
                    if (artifacts.length > 0) {
                        content += `\nArtifacts (${artifacts.length}):\n`;
                        for (const artifact of artifacts) {
                            content += `  - ${artifact.attributes.fileName} (${formatBytes(artifact.attributes.fileSize)})\n`;
                        }
                        content += `\nOpen Artifacts in Browser: https://appstoreconnect.apple.com/teams/builds/${buildRunId}\n`;
                    }
                } catch {
                    // Artifacts may not be available
                }
            }

            const session: LogSession = {
                buildRunId,
                content,
                isComplete: !isRunning,
            };

            this.sessions.set(uri.path, session);

            // Live tailing for in-progress builds
            if (isRunning) {
                session.pollingTimer = setInterval(async () => {
                    try {
                        const updatedRun = await this.api.getBuildRun(buildRunId);
                        const updatedActions = await this.api.listBuildActions(buildRunId);
                        const stillRunning = updatedRun.attributes.executionProgress === 'RUNNING';

                        let updatedContent = this.formatLogHeader(updatedRun.attributes);

                        for (const action of updatedActions) {
                            updatedContent += `\n${'='.repeat(60)}\n`;
                            updatedContent += `STEP: ${action.attributes.name}\n`;
                            updatedContent += `Type: ${action.attributes.actionType}\n`;
                            updatedContent += `Status: ${action.attributes.executionProgress}`;
                            if (action.attributes.completionStatus) {
                                updatedContent += ` (${action.attributes.completionStatus})`;
                            }
                            updatedContent += '\n';
                            if (action.attributes.startedDate) {
                                updatedContent += `Started: ${new Date(action.attributes.startedDate).toLocaleString()}\n`;
                            }
                            if (action.attributes.finishedDate) {
                                updatedContent += `Finished: ${new Date(action.attributes.finishedDate).toLocaleString()}\n`;
                            }
                            updatedContent += `${'='.repeat(60)}\n`;
                        }

                        if (!stillRunning) {
                            updatedContent += '\n---\n';
                            updatedContent += `Build ${updatedRun.attributes.completionStatus ?? 'UNKNOWN'}\n`;

                            if (session.pollingTimer) {
                                clearInterval(session.pollingTimer);
                                session.pollingTimer = undefined;
                            }
                            session.isComplete = true;
                        }

                        session.content = updatedContent;
                        this._onDidChange.fire(uri);
                    } catch (error) {
                        log(`Log tailing error: ${error}`);
                    }
                }, 5000);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const session: LogSession = {
                buildRunId,
                content: `Failed to load logs: ${msg}`,
                isComplete: true,
            };
            this.sessions.set(uri.path, session);
        }
    }

    private formatLogHeader(attrs: { number: number; createdDate: string; startedDate?: string; executionProgress: string; sourceBranchOrTag?: { name: string } ; sourceCommit?: { commitSha: string; message?: string } }): string {
        let header = `XCODE CLOUD BUILD #${attrs.number}\n`;
        header += `${'='.repeat(60)}\n`;
        header += `Status: ${attrs.executionProgress}\n`;
        header += `Created: ${new Date(attrs.createdDate).toLocaleString()}\n`;
        if (attrs.startedDate) {
            header += `Started: ${new Date(attrs.startedDate).toLocaleString()}\n`;
        }
        if (attrs.sourceBranchOrTag) {
            header += `Branch: ${attrs.sourceBranchOrTag.name}\n`;
        }
        if (attrs.sourceCommit) {
            header += `Commit: ${attrs.sourceCommit.commitSha.substring(0, 7)}`;
            if (attrs.sourceCommit.message) {
                header += ` - ${attrs.sourceCommit.message}`;
            }
            header += '\n';
        }
        header += `${'='.repeat(60)}\n`;
        return header;
    }

    private applyDecorations(doc: vscode.TextDocument): void {
        const editor = vscode.window.visibleTextEditors.find(
            (e) => e.document.uri.toString() === doc.uri.toString(),
        );
        if (!editor) {
            return;
        }

        const errorDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            isWholeLine: true,
        });
        const warningDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 200, 0, 0.1)',
            isWholeLine: true,
        });
        const headerDecoration = vscode.window.createTextEditorDecorationType({
            fontWeight: 'bold',
        });

        const errorRanges: vscode.Range[] = [];
        const warningRanges: vscode.Range[] = [];
        const headerRanges: vscode.Range[] = [];

        for (let i = 0; i < doc.lineCount; i++) {
            const line = doc.lineAt(i);
            const text = line.text.toLowerCase();

            if (text.includes('error:') || text.includes('error :')) {
                errorRanges.push(line.range);
            } else if (text.includes('warning:') || text.includes('warning :')) {
                warningRanges.push(line.range);
            } else if (text.startsWith('STEP:') || text.startsWith('===')) {
                headerRanges.push(line.range);
            }
        }

        editor.setDecorations(errorDecoration, errorRanges);
        editor.setDecorations(warningDecoration, warningRanges);
        editor.setDecorations(headerDecoration, headerRanges);
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
