import * as vscode from 'vscode';
import { log } from './logger';

const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes
const BASE_INTERVAL_MS_MINIMUM = 10 * 1000; // 10 seconds

export class Poller implements vscode.Disposable {
    private timer: ReturnType<typeof setInterval> | null = null;
    private consecutiveFailures = 0;
    private visible = true;
    private disposed = false;

    constructor(
        private readonly callback: () => Promise<void>,
        private readonly getIntervalSeconds: () => number,
    ) {}

    start(): void {
        this.stop();
        this.scheduleNext();
    }

    stop(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.consecutiveFailures = 0;
            this.start();
        } else {
            this.stop();
        }
    }

    resetBackoff(): void {
        this.consecutiveFailures = 0;
    }

    dispose(): void {
        this.disposed = true;
        this.stop();
    }

    private scheduleNext(): void {
        if (this.disposed) {
            return;
        }

        const baseMs = Math.max(
            this.getIntervalSeconds() * 1000,
            BASE_INTERVAL_MS_MINIMUM,
        );
        const backoffMs = this.consecutiveFailures > 0
            ? Math.min(baseMs * Math.pow(2, this.consecutiveFailures), MAX_BACKOFF_MS)
            : baseMs;

        this.timer = setTimeout(async () => {
            if (this.disposed || !this.visible) {
                return;
            }

            try {
                await this.callback();
                this.consecutiveFailures = 0;
            } catch (error) {
                this.consecutiveFailures++;
                log(`Poll failed (attempt ${this.consecutiveFailures}): ${error}`);
            }

            this.scheduleNext();
        }, backoffMs);
    }
}
