import { describe, expect, it, vi } from 'vitest';
import { formatRemainingTime, TimerService, type TimerWarningThreshold } from '../../services/timerService';

describe('TimerService', () => {
  it('formats mm:ss and hh:mm:ss cleanly', () => {
    expect(formatRemainingTime(0)).toBe('00:00');
    expect(formatRemainingTime(9_500)).toBe('00:10');
    expect(formatRemainingTime(5 * 60 * 1000)).toBe('05:00');
    expect(formatRemainingTime(3665 * 1000)).toBe('1:01:05');
  });

  it('fires 5m, 1m, 10s warnings once each and auto-submits once on expiry', () => {
    let now = 1_000_000;
    const deadline = now + 6 * 60 * 1000;
    const warnings: TimerWarningThreshold[] = [];
    const onExpire = vi.fn();
    const onTick = vi.fn();

    const timer = new TimerService(
      now,
      deadline,
      {
        onTick,
        onWarning: (threshold) => warnings.push(threshold),
        onExpire,
      },
      () => now,
    );

    timer.tick();
    expect(warnings).toEqual([]);

    // Advance to 5m remaining
    now = deadline - 5 * 60 * 1000;
    timer.tick();
    timer.tick(); // should not double-fire
    expect(warnings).toEqual(['5m']);

    // Advance to 1m remaining
    now = deadline - 60 * 1000;
    timer.tick();
    expect(warnings).toEqual(['5m', '1m']);

    // Advance to 10s remaining
    now = deadline - 10 * 1000;
    timer.tick();
    expect(warnings).toEqual(['5m', '1m', '10s']);

    // Expire
    now = deadline + 100;
    timer.tick();
    timer.tick(); // must not fire onExpire twice
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('resumes mid-test with accurate remaining time and suppresses already-passed warnings', () => {
    const startedAt = 1_000_000;
    const deadlineAt = startedAt + 30 * 60 * 1000;
    let now = deadlineAt - 90 * 1000; // 1m30s left after browser refresh
    const warnings: TimerWarningThreshold[] = [];

    const timer = new TimerService(
      startedAt,
      deadlineAt,
      {
        onTick: () => {},
        onWarning: (t) => warnings.push(t),
        onExpire: () => {},
      },
      () => now,
    );

    expect(timer.getSnapshot().formatted).toBe('01:30');
    timer.tick();
    expect(warnings).toEqual([]); // 5m already passed, should not spam

    now = deadlineAt - 59 * 1000;
    timer.tick();
    expect(warnings).toEqual(['1m']);
  });

  it('runs interval ticks via start() and cleans up via stop()', () => {
    vi.useFakeTimers();
    let now = 10_000;
    const onTick = vi.fn();
    const timer = new TimerService(
      now,
      now + 60_000,
      { onTick, onExpire: () => {} },
      () => now,
    );

    timer.start(250);
    now += 500;
    vi.advanceTimersByTime(500);
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(2);
    timer.stop();
    vi.useRealTimers();
  });
});
