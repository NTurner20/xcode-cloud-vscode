import * as assert from 'assert';

// Test tree item construction logic
// We extract the pure functions from BuildTreeProvider to test without VS Code deps.

type CiBuildRunStatus = 'WAITING' | 'PENDING' | 'RUNNING' | 'COMPLETE';
type CiCompletionStatus = 'SUCCEEDED' | 'FAILED' | 'ERRORED' | 'CANCELED' | 'SKIPPED';

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

describe('Build Status Icons', () => {
    it('should show check for succeeded', () => {
        assert.strictEqual(getBuildStatusIcon('COMPLETE', 'SUCCEEDED'), '\u2705');
    });

    it('should show X for failed', () => {
        assert.strictEqual(getBuildStatusIcon('COMPLETE', 'FAILED'), '\u274C');
    });

    it('should show X for errored', () => {
        assert.strictEqual(getBuildStatusIcon('COMPLETE', 'ERRORED'), '\u274C');
    });

    it('should show no-entry for canceled', () => {
        assert.strictEqual(getBuildStatusIcon('COMPLETE', 'CANCELED'), '\uD83D\uDEAB');
    });

    it('should show skip icon for skipped', () => {
        assert.strictEqual(getBuildStatusIcon('COMPLETE', 'SKIPPED'), '\u23ED\uFE0F');
    });

    it('should show spinner for running', () => {
        assert.strictEqual(getBuildStatusIcon('RUNNING'), '\uD83D\uDD04');
    });

    it('should show hourglass for pending', () => {
        assert.strictEqual(getBuildStatusIcon('PENDING'), '\u23F3');
    });

    it('should show hourglass for waiting', () => {
        assert.strictEqual(getBuildStatusIcon('WAITING'), '\u23F3');
    });

    it('should show question mark for unknown completion', () => {
        assert.strictEqual(getBuildStatusIcon('COMPLETE'), '\u2753');
    });
});

describe('Duration Formatting', () => {
    it('should return empty string when no start date', () => {
        assert.strictEqual(formatDuration(), '');
        assert.strictEqual(formatDuration(undefined), '');
    });

    it('should format seconds-only duration', () => {
        const start = new Date('2024-01-01T00:00:00Z').toISOString();
        const end = new Date('2024-01-01T00:00:45Z').toISOString();
        assert.strictEqual(formatDuration(start, end), '45s');
    });

    it('should format minutes and seconds', () => {
        const start = new Date('2024-01-01T00:00:00Z').toISOString();
        const end = new Date('2024-01-01T00:05:30Z').toISOString();
        assert.strictEqual(formatDuration(start, end), '5m 30s');
    });

    it('should handle zero-second duration', () => {
        const time = new Date('2024-01-01T00:00:00Z').toISOString();
        assert.strictEqual(formatDuration(time, time), '0s');
    });

    it('should format exact minutes', () => {
        const start = new Date('2024-01-01T00:00:00Z').toISOString();
        const end = new Date('2024-01-01T00:03:00Z').toISOString();
        assert.strictEqual(formatDuration(start, end), '3m 0s');
    });
});
