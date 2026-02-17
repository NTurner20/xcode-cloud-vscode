import * as assert from 'assert';

// Test poller backoff logic without VS Code dependencies
// The Poller class depends on vscode.Disposable, so we test the backoff algorithm directly.

const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

function calculateBackoff(
    baseIntervalSeconds: number,
    consecutiveFailures: number,
    minimumMs: number = 10000,
): number {
    const baseMs = Math.max(baseIntervalSeconds * 1000, minimumMs);
    if (consecutiveFailures === 0) {
        return baseMs;
    }
    return Math.min(baseMs * Math.pow(2, consecutiveFailures), MAX_BACKOFF_MS);
}

describe('Poller Backoff Logic', () => {
    it('should return base interval with no failures', () => {
        const backoff = calculateBackoff(30, 0);
        assert.strictEqual(backoff, 30000); // 30 seconds
    });

    it('should double after first failure', () => {
        const backoff = calculateBackoff(30, 1);
        assert.strictEqual(backoff, 60000); // 60 seconds
    });

    it('should quadruple after second failure', () => {
        const backoff = calculateBackoff(30, 2);
        assert.strictEqual(backoff, 120000); // 2 minutes
    });

    it('should cap at max backoff (5 minutes)', () => {
        const backoff = calculateBackoff(30, 10);
        assert.strictEqual(backoff, MAX_BACKOFF_MS);
    });

    it('should enforce minimum interval of 10 seconds', () => {
        const backoff = calculateBackoff(5, 0);
        assert.strictEqual(backoff, 10000);
    });

    it('should apply exponential backoff to minimum interval', () => {
        const backoff = calculateBackoff(5, 1);
        assert.strictEqual(backoff, 20000); // 10s * 2
    });

    it('should respect custom base interval', () => {
        const backoff = calculateBackoff(60, 0);
        assert.strictEqual(backoff, 60000); // 60 seconds
    });

    it('should cap even with large base interval', () => {
        const backoff = calculateBackoff(60, 5);
        assert.strictEqual(backoff, MAX_BACKOFF_MS);
    });
});
