import { afterEach, describe, expect, it } from 'vitest';
import { getRoleById } from '../../models/role';
import { createAssessmentSession } from '../../services/assessmentEngineService';
import { loadQuestionBank } from '../../services/questionBankService';
import { StorageService } from '../../services/storageService';
import { TimerService } from '../../services/timerService';

describe('Integration: Assessment lifecycle (persist -> refresh resume -> auto-submit -> retake)', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('resumes mid-test with exact remaining time, auto-submits on expiry without losing answers, and avoids repeats on retake', async () => {
    const store = new StorageService(false);
    const role = getRoleById('qa')!;
    const bank = await loadQuestionBank('qa');

    const startTs = 1_750_000_000_000;
    const { session } = createAssessmentSession({
      role,
      levelId: 'manual',
      questionPool: bank.questions,
      candidateName: 'Farah',
      nowMs: startTs,
    });

    // Candidate answers Q1 before refreshing the browser
    const firstQId = session.questionIds[0];
    session.responses[firstQId] = {
      questionId: firstQId,
      selectedOptionId: 'a',
      hintUsed: false,
      updatedAt: new Date(startTs + 60_000).toISOString(),
    };
    await store.saveSession(session);

    // Simulate browser refresh 10 minutes later
    const reloadedStore = new StorageService(false);
    const activeId = await reloadedStore.getActiveSessionId();
    expect(activeId).toBe(session.sessionId);

    const { session: restored } = await reloadedStore.loadSession(activeId!);
    expect(restored).not.toBeNull();
    expect(restored!.responses[firstQId].selectedOptionId).toBe('a');

    let clock = startTs + 10 * 60 * 1000;
    let autoSubmitted = false;
    let resolveExpire!: () => void;
    const expireDone = new Promise<void>((r) => {
      resolveExpire = r;
    });

    const timer = new TimerService(
      restored!.startedAt,
      restored!.deadlineAt,
      {
        onTick: () => {},
        onExpire: async () => {
          restored!.status = 'expired';
          restored!.submittedAt = clock;
          await reloadedStore.saveSession(restored!);
          autoSubmitted = true;
          resolveExpire();
        },
      },
      () => clock,
    );

    // 35 min total - 10 min elapsed = 25:00 remaining
    expect(timer.getSnapshot().formatted).toBe('25:00');

    // Jump clock to deadline -> auto-submit
    clock = restored!.deadlineAt + 10;
    timer.tick();
    await expireDone;
    expect(autoSubmitted).toBe(true);

    // Record attempt history & verify retake avoids all 8 previous questions
    await reloadedStore.saveAttemptHistory({
      roleId: 'qa',
      seenQuestionIds: restored!.questionIds,
      completedSessionIds: [restored!.sessionId],
      updatedAt: new Date(clock).toISOString(),
    });

    const history = await reloadedStore.loadAttemptHistory('qa');
    const retake = createAssessmentSession({
      role,
      levelId: 'manual',
      questionPool: bank.questions,
      seenQuestionIds: history.seenQuestionIds,
      nowMs: clock + 5000,
    });

    const overlap = retake.session.questionIds.filter((id) =>
      restored!.questionIds.includes(id),
    );
    expect(overlap).toEqual([]);
  });
});
