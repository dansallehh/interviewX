export type TimerWarningThreshold = '5m' | '1m' | '10s';

export interface TimerSnapshot {
  remainingMs: number;
  elapsedMs: number;
  formatted: string;
  expired: boolean;
}

export interface TimerCallbacks {
  onTick: (snapshot: TimerSnapshot) => void;
  onWarning?: (threshold: TimerWarningThreshold, message: string) => void;
  onExpire: () => void;
}

const WARNING_THRESHOLDS: readonly { id: TimerWarningThreshold; ms: number; label: string }[] = [
  { id: '5m', ms: 5 * 60 * 1000, label: '5 minutes remaining in this assessment.' },
  { id: '1m', ms: 60 * 1000, label: '1 minute remaining. Prepare to submit your answers.' },
  { id: '10s', ms: 10 * 1000, label: '10 seconds remaining. Auto-submit is imminent.' },
];

export function formatRemainingTime(ms: number): string {
  const clamped = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export class TimerService {
  private deadlineAt: number;
  private startedAt: number;
  private callbacks: TimerCallbacks;
  private nowFn: () => number;
  private intervalId: number | null = null;
  private firedWarnings = new Set<TimerWarningThreshold>();
  private expired = false;

  constructor(
    startedAt: number,
    deadlineAt: number,
    callbacks: TimerCallbacks,
    nowFn: () => number = () => Date.now(),
  ) {
    this.startedAt = startedAt;
    this.deadlineAt = deadlineAt;
    this.callbacks = callbacks;
    this.nowFn = nowFn;

    // Pre-mark thresholds already passed on mid-test resume so warnings don't spam
    const initialRemaining = this.deadlineAt - this.nowFn();
    for (const threshold of WARNING_THRESHOLDS) {
      if (initialRemaining <= threshold.ms && initialRemaining > 0) {
        // Only suppress thresholds far above current remaining time
        if (initialRemaining < threshold.ms - 2000) {
          this.firedWarnings.add(threshold.id);
        }
      }
    }
  }

  getSnapshot(): TimerSnapshot {
    const now = this.nowFn();
    const remainingMs = Math.max(0, this.deadlineAt - now);
    const elapsedMs = Math.max(0, now - this.startedAt);
    return {
      remainingMs,
      elapsedMs,
      formatted: formatRemainingTime(remainingMs),
      expired: remainingMs <= 0,
    };
  }

  start(intervalMs = 500): void {
    this.stop();
    this.tick();
    if (!this.expired) {
      this.intervalId = window.setInterval(() => this.tick(), intervalMs);
    }
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick(): void {
    const snap = this.getSnapshot();
    this.callbacks.onTick(snap);

    if (snap.expired) {
      if (!this.expired) {
        this.expired = true;
        this.stop();
        this.callbacks.onExpire();
      }
      return;
    }

    for (const threshold of WARNING_THRESHOLDS) {
      if (snap.remainingMs <= threshold.ms && !this.firedWarnings.has(threshold.id)) {
        this.firedWarnings.add(threshold.id);
        this.callbacks.onWarning?.(threshold.id, threshold.label);
      }
    }
  }
}
