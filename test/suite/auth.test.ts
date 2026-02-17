import * as assert from 'assert';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Test JWT generation logic directly (extracted from AppStoreConnectAuth)
// We can't test the full auth flow without VS Code's SecretStorage,
// so we test the JWT generation and token caching logic.

function generateToken(
    issuerId: string,
    apiKeyId: string,
    privateKey: string,
    now: number,
    lifetimeSeconds: number,
): string {
    const payload = {
        iss: issuerId,
        iat: now,
        exp: now + lifetimeSeconds,
        aud: 'appstoreconnect-v1',
    };

    return jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        header: {
            alg: 'ES256',
            kid: apiKeyId,
            typ: 'JWT',
        },
    });
}

describe('JWT Generation', () => {
    let privateKey: string;
    let publicKey: string;

    before(() => {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        privateKey = keyPair.privateKey;
        publicKey = keyPair.publicKey;
    });

    it('should generate a valid ES256 JWT', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = generateToken('issuer-123', 'key-456', privateKey, now, 1200);

        assert.ok(token);
        assert.strictEqual(token.split('.').length, 3);
    });

    it('should include correct claims', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = generateToken('issuer-123', 'key-456', privateKey, now, 1200);

        const decoded = jwt.verify(token, publicKey, { algorithms: ['ES256'] }) as jwt.JwtPayload;

        assert.strictEqual(decoded.iss, 'issuer-123');
        assert.strictEqual(decoded.aud, 'appstoreconnect-v1');
        assert.strictEqual(decoded.iat, now);
        assert.strictEqual(decoded.exp, now + 1200);
    });

    it('should include kid in header', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = generateToken('issuer-123', 'key-456', privateKey, now, 1200);

        const header = JSON.parse(
            Buffer.from(token.split('.')[0], 'base64url').toString(),
        );

        assert.strictEqual(header.kid, 'key-456');
        assert.strictEqual(header.alg, 'ES256');
        assert.strictEqual(header.typ, 'JWT');
    });

    it('should reject expired tokens', () => {
        const pastTime = Math.floor(Date.now() / 1000) - 2400;
        const token = generateToken('issuer-123', 'key-456', privateKey, pastTime, 1200);

        assert.throws(() => {
            jwt.verify(token, publicKey, { algorithms: ['ES256'] });
        }, /jwt expired/);
    });
});

describe('Token Caching Logic', () => {
    it('should consider token valid before expiry buffer', () => {
        const now = Math.floor(Date.now() / 1000);
        const tokenExpiry = now + 1200; // 20 minutes from now
        const refreshBuffer = 60;

        const isValid = now < tokenExpiry - refreshBuffer;
        assert.strictEqual(isValid, true);
    });

    it('should consider token stale within refresh buffer', () => {
        const now = Math.floor(Date.now() / 1000);
        const tokenExpiry = now + 30; // Only 30 seconds left
        const refreshBuffer = 60;

        const isValid = now < tokenExpiry - refreshBuffer;
        assert.strictEqual(isValid, false);
    });

    it('should consider token stale after expiry', () => {
        const now = Math.floor(Date.now() / 1000);
        const tokenExpiry = now - 100; // Already expired
        const refreshBuffer = 60;

        const isValid = now < tokenExpiry - refreshBuffer;
        assert.strictEqual(isValid, false);
    });
});
