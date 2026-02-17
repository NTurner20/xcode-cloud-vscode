import * as assert from 'assert';

// Test API error handling logic
// We test the error parsing without making real HTTP calls.

interface ApiError {
    id: string;
    status: string;
    code: string;
    title: string;
    detail: string;
}

interface ApiErrorResponse {
    errors: ApiError[];
}

function parseErrorResponse(body: unknown): string {
    const errorResponse = body as ApiErrorResponse;
    if (errorResponse.errors && errorResponse.errors.length > 0) {
        const firstError = errorResponse.errors[0];
        return `${firstError.title}: ${firstError.detail}`;
    }
    return 'Unknown API error';
}

describe('API Error Handling', () => {
    it('should parse App Store Connect error format', () => {
        const errorBody: ApiErrorResponse = {
            errors: [
                {
                    id: 'abc-123',
                    status: '403',
                    code: 'FORBIDDEN',
                    title: 'Access Denied',
                    detail: 'You do not have permission to access this resource.',
                },
            ],
        };

        const message = parseErrorResponse(errorBody);
        assert.strictEqual(
            message,
            'Access Denied: You do not have permission to access this resource.',
        );
    });

    it('should handle multiple errors by showing the first', () => {
        const errorBody: ApiErrorResponse = {
            errors: [
                {
                    id: '1',
                    status: '400',
                    code: 'INVALID',
                    title: 'Invalid Parameter',
                    detail: 'The limit parameter is invalid.',
                },
                {
                    id: '2',
                    status: '400',
                    code: 'INVALID',
                    title: 'Missing Field',
                    detail: 'The name field is required.',
                },
            ],
        };

        const message = parseErrorResponse(errorBody);
        assert.strictEqual(
            message,
            'Invalid Parameter: The limit parameter is invalid.',
        );
    });

    it('should handle empty errors array', () => {
        const errorBody: ApiErrorResponse = { errors: [] };
        const message = parseErrorResponse(errorBody);
        assert.strictEqual(message, 'Unknown API error');
    });

    it('should handle missing errors field', () => {
        const message = parseErrorResponse({});
        assert.strictEqual(message, 'Unknown API error');
    });
});

describe('API URL Construction', () => {
    const BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

    it('should construct product list URL', () => {
        const url = `${BASE_URL}/ciProducts?limit=200`;
        assert.ok(url.startsWith('https://api.appstoreconnect.apple.com'));
        assert.ok(url.includes('/ciProducts'));
    });

    it('should encode product ID in workflow URL', () => {
        const productId = 'abc-123';
        const url = `${BASE_URL}/ciProducts/${encodeURIComponent(productId)}/workflows?limit=200`;
        assert.ok(url.includes('abc-123'));
    });

    it('should encode special characters in IDs', () => {
        const id = 'id/with/slashes';
        const encoded = encodeURIComponent(id);
        assert.strictEqual(encoded, 'id%2Fwith%2Fslashes');
    });
});
