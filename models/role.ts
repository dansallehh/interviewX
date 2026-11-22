export type RoleId = 'fresh' | 'senior' | 'pm' | 'dev' | 'sa' | 'qa' | 'dba';

export interface RoleLevel {
  id: string;
  label: string;
  summary: string;
  durationMinutes: number;
  questionCount: number;
  passMark: number;
}

export interface RoleSectionPreview {
  topic: string;
  weight: number;
}

export interface RoleDefinition {
  id: RoleId;
  code: string;
  name: string;
  shortName: string;
  tagline: string;
  focus: readonly string[];
  motif: string;
  accentHex: string;
  levels: readonly RoleLevel[];
  sections: readonly RoleSectionPreview[];
}

export const ROLES: readonly RoleDefinition[] = [
  {
    id: 'fresh',
    code: 'FRG',
    name: 'Fresh Graduate',
    shortName: 'Fresh Grad',
    tagline: 'Core CS fundamentals, relational SQL, networking, OS, and structured problem solving.',
    focus: ['Logic', 'Basic SQL', 'Networking', 'OS', 'Aptitude', 'Communication'],
    motif: 'lattice-prism',
    accentHex: '#34d399',
    levels: [
      {
        id: 'entry',
        label: 'Entry / Intern',
        summary: 'Foundational aptitude, SQL queries, and core CS concepts.',
        durationMinutes: 35,
        questionCount: 15,
        passMark: 65,
      },
      {
        id: 'associate',
        label: 'Graduate Associate',
        summary: 'Applied troubleshooting, SQL aggregation, and system basics.',
        durationMinutes: 45,
        questionCount: 18,
        passMark: 70,
      },
    ],
    sections: [
      { topic: 'Logic & Aptitude', weight: 0.25 },
      { topic: 'Basic SQL', weight: 0.25 },
      { topic: 'Networking & OS', weight: 0.25 },
      { topic: 'Communication', weight: 0.25 },
    ],
  },
  {
    id: 'senior',
    code: 'SEN',
    name: 'Senior Engineer',
    shortName: 'Senior Eng',
    tagline: 'Distributed architecture, trade-off analysis, performance engineering, and incident leadership.',
    focus: ['Architecture', 'Trade-offs', 'Performance', 'Mentoring', 'Incident Leadership'],
    motif: 'orbital-mesh',
    accentHex: '#818cf8',
    levels: [
      {
        id: 'senior',
        label: 'Senior (L5)',
        summary: 'Service design, scaling bottlenecks, code quality, and team mentoring.',
        durationMinutes: 50,
        questionCount: 16,
        passMark: 75,
      },
      {
        id: 'staff',
        label: 'Staff / Principal (L6)',
        summary: 'Multi-region resilience, org-wide trade-offs, and high-severity incident command.',
        durationMinutes: 60,
        questionCount: 18,
        passMark: 80,
      },
    ],
    sections: [
      { topic: 'Architecture & Trade-offs', weight: 0.35 },
      { topic: 'Performance & Reliability', weight: 0.25 },
      { topic: 'Incident Leadership', weight: 0.2 },
      { topic: 'Mentoring & Review', weight: 0.2 },
    ],
  },
  {
    id: 'pm',
    code: 'PMO',
    name: 'Project Manager',
    shortName: 'Project Mgr',
    tagline: 'Scope governance, critical-path scheduling, risk registers, stakeholder alignment, and change control.',
    focus: ['Scope', 'Schedule', 'Risk', 'Stakeholders', 'Change Control'],
    motif: 'vector-gantt',
    accentHex: '#f59e0b',
    levels: [
      {
        id: 'mid',
        label: 'Project Manager',
        summary: 'Delivery execution, RAID logs, sprint/waterfall hybrids, and escalations.',
        durationMinutes: 40,
        questionCount: 15,
        passMark: 70,
      },
      {
        id: 'program',
        label: 'Senior / Program Manager',
        summary: 'Cross-team dependencies, executive governance, and contract change control.',
        durationMinutes: 50,
        questionCount: 18,
        passMark: 75,
      },
    ],
    sections: [
      { topic: 'Scope & Change Control', weight: 0.3 },
      { topic: 'Schedule & Delivery', weight: 0.25 },
      { topic: 'Risk Management', weight: 0.25 },
      { topic: 'Stakeholder Alignment', weight: 0.2 },
    ],
  },
  {
    id: 'dev',
    code: 'DEV',
    name: 'Developer',
    shortName: 'Developer',
    tagline: 'Web and backend engineering, strict MVC design, REST APIs, JS/Node debugging, and code review.',
    focus: ['Web / Backend', 'MVC', 'APIs', 'JS / Node', 'Debugging', 'Code Review'],
    motif: 'circuit-cube',
    accentHex: '#22d3ee',
    levels: [
      {
        id: 'junior',
        label: 'Junior Developer',
        summary: 'Core JavaScript, HTTP fundamentals, clean MVC structure, and bug fixing.',
        durationMinutes: 40,
        questionCount: 15,
        passMark: 70,
      },
      {
        id: 'mid',
        label: 'Mid-Level Developer',
        summary: 'API design, async Node.js debugging, state management, and PR review.',
        durationMinutes: 50,
        questionCount: 18,
        passMark: 75,
      },
    ],
    sections: [
      { topic: 'JS / Node & Debugging', weight: 0.3 },
      { topic: 'Web / Backend & APIs', weight: 0.3 },
      { topic: 'MVC & Code Review', weight: 0.2 },
      { topic: 'Data & SQL', weight: 0.2 },
    ],
  },
  {
    id: 'sa',
    code: 'SYA',
    name: 'System Analyst',
    shortName: 'System Analyst',
    tagline: 'Requirements elicitation, BRD/FRD specifications, UML & flowcharts, UAT, and gap analysis.',
    focus: ['Requirements', 'BRD / FRD', 'UML / Flowcharts', 'UAT', 'Gap Analysis'],
    motif: 'blueprint-nodes',
    accentHex: '#c084fc',
    levels: [
      {
        id: 'standard',
        label: 'System Analyst',
        summary: 'Functional specs, sequence/activity diagrams, UAT criteria, and traceability.',
        durationMinutes: 45,
        questionCount: 15,
        passMark: 70,
      },
      {
        id: 'lead',
        label: 'Lead System Analyst',
        summary: 'Enterprise integration mapping, legacy migration gap analysis, and sign-off governance.',
        durationMinutes: 50,
        questionCount: 18,
        passMark: 75,
      },
    ],
    sections: [
      { topic: 'Requirements & BRD/FRD', weight: 0.3 },
      { topic: 'UML & Process Modelling', weight: 0.25 },
      { topic: 'Gap Analysis', weight: 0.25 },
      { topic: 'UAT & Traceability', weight: 0.2 },
    ],
  },
  {
    id: 'qa',
    code: 'QAE',
    name: 'Quality Assurance',
    shortName: 'QA Engineer',
    tagline: 'Risk-based test design, Playwright/API automation, defect triage, and regression strategy.',
    focus: ['Test Design', 'Automation', 'Defect Triage', 'Regression'],
    motif: 'shield-matrix',
    accentHex: '#fb7185',
    levels: [
      {
        id: 'manual',
        label: 'QA Analyst',
        summary: 'Boundary/equivalence test design, exploratory testing, and S1–S4 defect triage.',
        durationMinutes: 40,
        questionCount: 15,
        passMark: 70,
      },
      {
        id: 'sdet',
        label: 'QA Automation / SDET',
        summary: 'Flake-resistant E2E suites, CI quality gates, contract testing, and regression selection.',
        durationMinutes: 50,
        questionCount: 18,
        passMark: 75,
      },
    ],
    sections: [
      { topic: 'Test Design', weight: 0.3 },
      { topic: 'Automation & CI', weight: 0.25 },
      { topic: 'Defect Triage', weight: 0.25 },
      { topic: 'Regression Strategy', weight: 0.2 },
    ],
  },
  {
    id: 'dba',
    code: 'DBA',
    name: 'Database Admin (Oracle 12c)',
    shortName: 'Oracle DBA',
    tagline: 'Oracle 12c privileges, RMAN backup & recovery, SQL tuning, lock contention, and production RCA.',
    focus: ['Privileges', 'Backup / RMAN', 'Tuning', 'Locks', 'RCA'],
    motif: 'cylinder-vault',
    accentHex: '#fb923c',
    levels: [
      {
        id: 'standard',
        label: 'Oracle 12c DBA',
        summary: 'Users/roles, RMAN recovery, execution plans, and blocking session diagnostics.',
        durationMinutes: 50,
        questionCount: 16,
        passMark: 75,
      },
      {
        id: 'senior',
        label: 'Senior Oracle DBA',
        summary: 'CDB/PDB multitenant administration, AWR/ASH tuning, deadlock RCA, and zero-RPO recovery.',
        durationMinutes: 60,
        questionCount: 18,
        passMark: 80,
      },
    ],
    sections: [
      { topic: 'Privileges & Security', weight: 0.2 },
      { topic: 'Backup & RMAN', weight: 0.25 },
      { topic: 'SQL & Instance Tuning', weight: 0.25 },
      { topic: 'Locks & RCA', weight: 0.3 },
    ],
  },
] as const;

export function getRoleById(id: string): RoleDefinition | undefined {
  return ROLES.find((role) => role.id === id);
}

export function getRoleLevel(role: RoleDefinition, levelId?: string): RoleLevel {
  if (levelId) {
    const found = role.levels.find((lvl) => lvl.id === levelId);
    if (found) return found;
  }
  return role.levels[0];
}
