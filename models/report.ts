import type { QuestionType } from './question';
import type { RoleId } from './role';

export type ReadinessVerdict = 'Ready' | 'Borderline' | 'Needs Preparation';

export interface QuestionScore {
  questionId: string;
  topic: string;
  type: QuestionType;
  prompt: string;
  score: number; // 0 to 1
  maxScore: number; // 1
  passed: boolean;
  feedback: string;
  explanation: string;
  hintUsed: boolean;
  needsManualReview?: boolean;
}

export interface TopicScore {
  topic: string;
  weight: number;
  earned: number;
  possible: number;
  percentage: number;
}

export interface AssessmentReport {
  sessionId: string;
  roleId: RoleId;
  roleName: string;
  levelId: string;
  levelLabel: string;
  candidateName: string;
  completedAt: string;
  elapsedMs: number;
  durationMs: number;
  passMark: number;
  overallScore: number; // 0 to 100
  verdict: ReadinessVerdict;
  topicScores: TopicScore[];
  questionScores: QuestionScore[];
  shareCode: string;
  version: string;
}

export interface ReportExportEnvelope {
  schemaVersion: '1.0.0';
  exportedAt: string;
  report: AssessmentReport;
  checksum: string;
}

export interface ShareCodePayload {
  v: 1;
  r: RoleId;
  l: string;
  s: number;
  p: ReadinessVerdict;
  d: string;
  t: Record<string, number>;
}
