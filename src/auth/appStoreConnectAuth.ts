import * as vscode from 'vscode';
import * as jwt from 'jsonwebtoken';
import { log } from '../logger';

const SECRET_KEY_API_KEY_ID = 'xcodeCloud.apiKeyId';
const SECRET_KEY_ISSUER_ID = 'xcodeCloud.issuerId';
const SECRET_KEY_PRIVATE_KEY = 'xcodeCloud.privateKey';

const TOKEN_LIFETIME_SECONDS = 20 * 60; // 20 minutes
const TOKEN_REFRESH_BUFFER_SECONDS = 60; // Refresh 1 minute before expiry

export interface Credentials {
    apiKeyId: string;
    issuerId: string;
    privateKey: string;
}

export class AppStoreConnectAuth {
    private cachedToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(private readonly secretStorage: vscode.SecretStorage) {}

    async signIn(): Promise<boolean> {
        const method = await vscode.window.showQuickPick(
            [
                { label: 'Browse for .p8 file', value: 'file' },
                { label: 'Paste private key', value: 'paste' },
            ],
            { placeHolder: 'How would you like to provide your private key?' }
        );

        if (!method) {
            return false;
        }

        const apiKeyId = await vscode.window.showInputBox({
            prompt: 'Enter your API Key ID',
            placeHolder: 'e.g. ABC1234DEF',
            ignoreFocusOut: true,
        });
        if (!apiKeyId) {
            return false;
        }

        const issuerId = await vscode.window.showInputBox({
            prompt: 'Enter your Issuer ID',
            placeHolder: 'e.g. 12345678-1234-1234-1234-123456789012',
            ignoreFocusOut: true,
        });
        if (!issuerId) {
            return false;
        }

        let privateKey: string | undefined;

        if (method.value === 'file') {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { 'Private Key': ['p8'] },
                title: 'Select your App Store Connect API private key (.p8)',
            });
            if (!fileUri || fileUri.length === 0) {
                return false;
            }
            const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
            privateKey = Buffer.from(fileContent).toString('utf-8');
        } else {
            privateKey = await vscode.window.showInputBox({
                prompt: 'Paste your private key content (including BEGIN/END lines)',
                placeHolder: '-----BEGIN PRIVATE KEY-----\n...',
                ignoreFocusOut: true,
            });
        }

        if (!privateKey) {
            return false;
        }

        // Validate credentials by making a test API call
        const credentials: Credentials = { apiKeyId, issuerId, privateKey };
        const valid = await this.validateCredentials(credentials);
        if (!valid) {
            vscode.window.showErrorMessage('Invalid credentials. Could not authenticate with App Store Connect.');
            return false;
        }

        // Store credentials securely
        await this.secretStorage.store(SECRET_KEY_API_KEY_ID, apiKeyId);
        await this.secretStorage.store(SECRET_KEY_ISSUER_ID, issuerId);
        await this.secretStorage.store(SECRET_KEY_PRIVATE_KEY, privateKey);

        this.cachedToken = null;
        this.tokenExpiry = 0;

        log('Signed in to App Store Connect');
        vscode.window.showInformationMessage('Signed in to Xcode Cloud.');
        return true;
    }

    async signOut(): Promise<void> {
        await this.secretStorage.delete(SECRET_KEY_API_KEY_ID);
        await this.secretStorage.delete(SECRET_KEY_ISSUER_ID);
        await this.secretStorage.delete(SECRET_KEY_PRIVATE_KEY);
        this.cachedToken = null;
        this.tokenExpiry = 0;
        log('Signed out of App Store Connect');
        vscode.window.showInformationMessage('Signed out of Xcode Cloud.');
    }

    async isAuthenticated(): Promise<boolean> {
        const credentials = await this.getCredentials();
        return credentials !== null;
    }

    async getCredentials(): Promise<Credentials | null> {
        const apiKeyId = await this.secretStorage.get(SECRET_KEY_API_KEY_ID);
        const issuerId = await this.secretStorage.get(SECRET_KEY_ISSUER_ID);
        const privateKey = await this.secretStorage.get(SECRET_KEY_PRIVATE_KEY);

        if (!apiKeyId || !issuerId || !privateKey) {
            return null;
        }

        return { apiKeyId, issuerId, privateKey };
    }

    async getToken(): Promise<string> {
        const now = Math.floor(Date.now() / 1000);

        if (this.cachedToken && now < this.tokenExpiry - TOKEN_REFRESH_BUFFER_SECONDS) {
            return this.cachedToken;
        }

        const credentials = await this.getCredentials();
        if (!credentials) {
            throw new Error('Not authenticated. Please sign in first.');
        }

        this.cachedToken = this.generateToken(credentials, now);
        this.tokenExpiry = now + TOKEN_LIFETIME_SECONDS;

        return this.cachedToken;
    }

    private generateToken(credentials: Credentials, now: number): string {
        const payload = {
            iss: credentials.issuerId,
            iat: now,
            exp: now + TOKEN_LIFETIME_SECONDS,
            aud: 'appstoreconnect-v1',
        };

        return jwt.sign(payload, credentials.privateKey, {
            algorithm: 'ES256',
            header: {
                alg: 'ES256',
                kid: credentials.apiKeyId,
                typ: 'JWT',
            },
        });
    }

    private async validateCredentials(credentials: Credentials): Promise<boolean> {
        try {
            const now = Math.floor(Date.now() / 1000);
            const token = this.generateToken(credentials, now);

            const response = await fetch('https://api.appstoreconnect.apple.com/v1/apps?limit=1', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return response.ok || response.status === 403;
        } catch (error) {
            log(`Credential validation failed: ${error}`);
            return false;
        }
    }
}
