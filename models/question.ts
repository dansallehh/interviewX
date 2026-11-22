import type { RoleId, RoleLevel, RoleSectionPreview } from './role';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'mcq' | 'multi' | 'scenario' | 'sql' | 'code';

export interface RoleProfile {
  id: RoleId;
  code: string;
  name: string;
  shortName: string;
  tagline: string;
  focus: string[];
  motif: string;
  accentHex: string;
  rubricId: string;
  levels: RoleLevel[];
  sections: RoleSectionPreview[];
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface RubricCriterion {
  id: string;
  label: string;
  weight: number;
}

export interface SqlExpectedResult {
  columns: string[];
  rows: (string | number | null)[][];
  orderMatters: boolean;
}

export interface CodeTestCase {
  args: unknown[];
  expected: unknown;
}

export interface Question {
  id: string;
  role: RoleId;
  levels: string[];
  topic: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  prompt: string;
  hint?: string;
  explanation: string;
  options?: QuestionOption[];
  answerHash?: string;
  answerObfuscated?: string;
  minSelections?: number;
  datasetId?: 'employees' | 'orders_ops';
  starterCode?: string;
  referenceSqlObfuscated?: string;
  expectedResult?: SqlExpectedResult;
  language?: 'javascript';
  functionName?: string;
  testCases?: CodeTestCase[];
  referenceCodeObfuscated?: string;
  minWords?: number;
  keyPoints?: string[];
  rubric: RubricCriterion[];
}

export interface QuestionBank {
  roleId: RoleId;
  version: string;
  questions: Question[];
}

export interface QuestionResponse {
  questionId: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  textResponse?: string;
  sqlQuery?: string;
  codeResponse?: string;
  hintUsed: boolean;
  updatedAt: string;
}

export interface AssessmentSession {
  sessionId: string;
  roleId: RoleId;
  levelId: string;
  candidateName: string;
  questionIds: string[];
  responses: Record<string, QuestionResponse>;
  currentIndex: number;
  startedAt: number;
  durationMs: number;
  accommodationMultiplier: number;
  deadlineAt: number;
  status: 'in_progress' | 'submitted' | 'expired';
  submittedAt?: number;
  tabId: string;
  version: string;
}

export interface AttemptHistoryRecord {
  roleId: RoleId;
  seenQuestionIds: string[];
  completedSessionIds: string[];
  updatedAt: string;
}
