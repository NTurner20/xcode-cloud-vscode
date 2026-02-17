import * as vscode from 'vscode';
import { AppStoreConnectAuth } from '../auth/appStoreConnectAuth';
import { log } from '../logger';

// --- App Store Connect API Response Types ---

export interface ApiError {
    id: string;
    status: string;
    code: string;
    title: string;
    detail: string;
}

export interface ApiErrorResponse {
    errors: ApiError[];
}

export interface PagedDocumentLinks {
    self: string;
    next?: string;
}

export interface ResourceLinks {
    self: string;
}

export interface RelationshipData {
    type: string;
    id: string;
}

export interface Relationship {
    links?: { self?: string; related?: string };
    data?: RelationshipData | RelationshipData[];
}

// --- Ci Products ---

export interface CiProductAttributes {
    name: string;
    createdDate: string;
    productType: 'APP' | 'FRAMEWORK';
}

export interface CiProduct {
    type: 'ciProducts';
    id: string;
    attributes: CiProductAttributes;
    relationships?: Record<string, Relationship>;
    links: ResourceLinks;
}

export interface CiProductsResponse {
    data: CiProduct[];
    links: PagedDocumentLinks;
}

// --- Ci Workflows ---

export interface CiWorkflowAttributes {
    name: string;
    description: string;
    branchStartCondition?: {
        source?: { branchName?: string };
    };
    lastModifiedDate: string;
    isEnabled: boolean;
    isLockedForEditing: boolean;
    clean: boolean;
}

export interface CiWorkflow {
    type: 'ciWorkflows';
    id: string;
    attributes: CiWorkflowAttributes;
    relationships?: Record<string, Relationship>;
    links: ResourceLinks;
}

export interface CiWorkflowsResponse {
    data: CiWorkflow[];
    links: PagedDocumentLinks;
}

// --- Ci Build Runs ---

export type CiBuildRunStatus =
    | 'WAITING'
    | 'PENDING'
    | 'RUNNING'
    | 'COMPLETE';

export type CiCompletionStatus =
    | 'SUCCEEDED'
    | 'FAILED'
    | 'ERRORED'
    | 'CANCELED'
    | 'SKIPPED';

export interface CiBuildRunAttributes {
    number: number;
    createdDate: string;
    startedDate?: string;
    finishedDate?: string;
    sourceCommit?: {
        commitSha: string;
        message?: string;
        author?: { displayName?: string };
    };
    sourceBranchOrTag?: {
        name: string;
        kind: 'BRANCH' | 'TAG';
    };
    executionProgress: CiBuildRunStatus;
    completionStatus?: CiCompletionStatus;
    isPullRequestBuild: boolean;
}

export interface CiBuildRun {
    type: 'ciBuildRuns';
    id: string;
    attributes: CiBuildRunAttributes;
    relationships?: Record<string, Relationship>;
    links: ResourceLinks;
}

export interface CiBuildRunsResponse {
    data: CiBuildRun[];
    links: PagedDocumentLinks;
}

export interface CiBuildRunResponse {
    data: CiBuildRun;
    links: PagedDocumentLinks;
}

// --- Ci Build Actions (for logs/artifacts) ---

export interface CiBuildActionAttributes {
    name: string;
    actionType: string;
    startedDate?: string;
    finishedDate?: string;
    executionProgress: CiBuildRunStatus;
    completionStatus?: CiCompletionStatus;
}

export interface CiBuildAction {
    type: 'ciBuildActions';
    id: string;
    attributes: CiBuildActionAttributes;
    relationships?: Record<string, Relationship>;
    links: ResourceLinks;
}

export interface CiBuildActionsResponse {
    data: CiBuildAction[];
    links: PagedDocumentLinks;
}

// --- Ci Artifacts ---

export interface CiArtifactAttributes {
    fileType: string;
    fileName: string;
    fileSize: number;
    downloadUrl: string;
}

export interface CiArtifact {
    type: 'ciArtifacts';
    id: string;
    attributes: CiArtifactAttributes;
    links: ResourceLinks;
}

export interface CiArtifactsResponse {
    data: CiArtifact[];
    links: PagedDocumentLinks;
}

// --- Start Build Request ---

export interface CiBuildRunCreateRequest {
    data: {
        type: 'ciBuildRuns';
        relationships: {
            workflow: {
                data: {
                    type: 'ciWorkflows';
                    id: string;
                };
            };
        };
    };
}

const BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

export class XcodeCloudApi {
    constructor(private readonly auth: AppStoreConnectAuth) {}

    // --- Products ---

    async listProducts(): Promise<CiProduct[]> {
        const response = await this.get<CiProductsResponse>('/ciProducts?limit=200');
        return response.data;
    }

    // --- Workflows ---

    async listWorkflows(productId: string): Promise<CiWorkflow[]> {
        const response = await this.get<CiWorkflowsResponse>(
            `/ciProducts/${encodeURIComponent(productId)}/workflows?limit=200`
        );
        return response.data;
    }

    // --- Build Runs ---

    async listBuildRuns(workflowId: string): Promise<CiBuildRun[]> {
        const response = await this.get<CiBuildRunsResponse>(
            `/ciWorkflows/${encodeURIComponent(workflowId)}/buildRuns?limit=25&sort=-number`
        );
        return response.data;
    }

    async getBuildRun(buildRunId: string): Promise<CiBuildRun> {
        const response = await this.get<CiBuildRunResponse>(
            `/ciBuildRuns/${encodeURIComponent(buildRunId)}`
        );
        return response.data;
    }

    async triggerBuildRun(workflowId: string): Promise<CiBuildRun> {
        const body: CiBuildRunCreateRequest = {
            data: {
                type: 'ciBuildRuns',
                relationships: {
                    workflow: {
                        data: {
                            type: 'ciWorkflows',
                            id: workflowId,
                        },
                    },
                },
            },
        };

        const response = await this.post<CiBuildRunResponse>('/ciBuildRuns', body);
        return response.data;
    }

    async cancelBuildRun(buildRunId: string): Promise<void> {
        // The App Store Connect API doesn't have a direct cancel endpoint.
        // Cancellation is done by deleting the build run.
        await this.delete(`/ciBuildRuns/${encodeURIComponent(buildRunId)}`);
    }

    // --- Build Actions (for logs) ---

    async listBuildActions(buildRunId: string): Promise<CiBuildAction[]> {
        const response = await this.get<CiBuildActionsResponse>(
            `/ciBuildRuns/${encodeURIComponent(buildRunId)}/actions?limit=50`
        );
        return response.data;
    }

    // --- Artifacts ---

    async listArtifacts(buildRunId: string): Promise<CiArtifact[]> {
        const response = await this.get<CiArtifactsResponse>(
            `/ciBuildRuns/${encodeURIComponent(buildRunId)}/artifacts?limit=50`
        );
        return response.data;
    }

    // --- HTTP Methods ---

    private async get<T>(path: string): Promise<T> {
        return this.request<T>('GET', path);
    }

    private async post<T>(path: string, body: unknown): Promise<T> {
        return this.request<T>('POST', path, body);
    }

    private async delete(path: string): Promise<void> {
        await this.request<void>('DELETE', path);
    }

    private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        const token = await this.auth.getToken();
        const url = `${BASE_URL}${path}`;

        log(`${method} ${path}`);

        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
        };

        if (body) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        if (response.status === 204 || method === 'DELETE') {
            return undefined as T;
        }

        return (await response.json()) as T;
    }

    private async handleErrorResponse(response: Response): Promise<never> {
        let message = `API request failed: ${response.status} ${response.statusText}`;

        try {
            const errorBody = (await response.json()) as ApiErrorResponse;
            if (errorBody.errors && errorBody.errors.length > 0) {
                const firstError = errorBody.errors[0];
                message = `${firstError.title}: ${firstError.detail}`;
                log(`API error: ${JSON.stringify(errorBody.errors)}`);
            }
        } catch {
            log(`API error: ${response.status} ${response.statusText}`);
        }

        vscode.window.showErrorMessage(message);
        throw new Error(message);
    }
}
