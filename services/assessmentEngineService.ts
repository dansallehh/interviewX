import type { AssessmentSession, Question } from '../models/question';
import { getRoleLevel, type RoleDefinition } from '../models/role';

export type RandomFn = () => number;

export interface TopicQuota {
  topic: string;
  weight: number;
  count: number;
}

export interface BuildAssessmentOptions {
  role: RoleDefinition;
  levelId?: string;
  questionPool: readonly Question[];
  seenQuestionIds?: readonly string[];
  candidateName?: string;
  accommodationMultiplier?: number;
  nowMs?: number;
  tabId?: string;
  rng?: RandomFn;
}

/**
 * Largest-remainder apportionment so weighted section counts always sum
 * exactly to totalQuestions while respecting proportional weights.
 */
export function computeTopicQuotas(
  sections: readonly { topic: string; weight: number }[],
  totalQuestions: number,
): TopicQuota[] {
  const raw = sections.map((s) => {
    const exact = s.weight * totalQuestions;
    return {
      topic: s.topic,
      weight: s.weight,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let assigned = raw.reduce((acc, r) => acc + r.floor, 0);
  const byRemainder = [...raw].sort((a, b) => b.remainder - a.remainder);

  let idx = 0;
  while (assigned < totalQuestions && byRemainder.length > 0) {
    byRemainder[idx % byRemainder.length].floor += 1;
    assigned += 1;
    idx += 1;
  }

  return raw.map((r) => ({
    topic: r.topic,
    weight: r.weight,
    count: r.floor,
  }));
}

export function shuffleArray<T>(items: readonly T[], rng: RandomFn = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function selectWeightedQuestions(
  role: RoleDefinition,
  levelId: string,
  questionPool: readonly Question[],
  seenQuestionIds: readonly string[] = [],
  rng: RandomFn = Math.random,
): Question[] {
  const level = getRoleLevel(role, levelId);
  const quotas = computeTopicQuotas(role.sections, level.questionCount);
  const seenSet = new Set(seenQuestionIds);
  const selected: Question[] = [];

  for (const quota of quotas) {
    if (quota.count <= 0) continue;

    const matching = questionPool.filter(
      (q) => q.role === role.id && q.topic === quota.topic && q.levels.includes(level.id),
    );

    if (matching.length < quota.count) {
      throw new Error(
        `Insufficient questions for ${role.id}/${level.id} topic "${quota.topic}": need ${quota.count}, found ${matching.length}.`,
      );
    }

    const unseen = shuffleArray(
      matching.filter((q) => !seenSet.has(q.id)),
      rng,
    );
    const seen = shuffleArray(
      matching.filter((q) => seenSet.has(q.id)),
      rng,
    );

    // Prioritize unseen questions; only draw from seen if the unseen pool is exhausted
    const picked = [...unseen, ...seen].slice(0, quota.count);
    selected.push(...picked);
  }

  return shuffleArray(selected, rng);
}

export function createAssessmentSession(options: BuildAssessmentOptions): {
  session: AssessmentSession;
  questions: Question[];
} {
  const {
    role,
    levelId,
    questionPool,
    seenQuestionIds = [],
    candidateName = '',
    accommodationMultiplier = 1,
    nowMs = Date.now(),
    tabId = `tab-${nowMs.toString(36)}`,
    rng = Math.random,
  } = options;

  const level = getRoleLevel(role, levelId);
  const safeMultiplier = Math.min(3, Math.max(1, accommodationMultiplier));
  const questions = selectWeightedQuestions(role, level.id, questionPool, seenQuestionIds, rng);
  const durationMs = Math.round(level.durationMinutes * 60 * 1000 * safeMultiplier);
  const randSuffix = Math.floor(rng() * 0xffffff)
    .toString(36)
    .padStart(4, '0');

  const session: AssessmentSession = {
    sessionId: `${role.id}-${level.id}-${nowMs.toString(36)}-${randSuffix}`,
    roleId: role.id,
    levelId: level.id,
    candidateName: candidateName.trim(),
    questionIds: questions.map((q) => q.id),
    responses: {},
    currentIndex: 0,
    startedAt: nowMs,
    durationMs,
    accommodationMultiplier: safeMultiplier,
    deadlineAt: nowMs + durationMs,
    status: 'in_progress',
    tabId,
    version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.1.0',
  };

  return { session, questions };
}
