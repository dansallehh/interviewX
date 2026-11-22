# Question Authoring Guide

This guide defines the editorial and technical quality bar for InterviewX questions across all 7 roles.

## Core Principles

1. **Realistic & Applied**: Prefer scenario-grounded decisions, debugging, and hands-on queries over trivia.
2. **Unambiguous**: Every MCQ must have exactly **one** defensible best answer; multi-select items must explicitly state "Select ALL..." and have ≥ 2 correct options.
3. **Concise Copy**: Clear, direct phrasing with zero placeholder text or unnecessary verbosity.
4. **No Near-Duplicates**: CI fails automatically if any two prompts share ≥ 78% normalized token similarity.

## Question Type Rules

| Type | Required Fields | Automated Scoring |
|---|---|---|
| `mcq` | ≥ 4 `options`, `answerHash`, `answerObfuscated`, `explanation`, `rubric` | Exact SHA-256 hash match |
| `multi` | ≥ 4 `options`, `minSelections`, `answerHash` (sorted keys), `answerObfuscated`, `explanation`, `rubric` | Exact sorted set hash match |
| `sql` | `datasetId`, `starterCode`, `referenceSqlObfuscated`, `expectedResult` (`columns`, `rows`, `orderMatters`) | Executed via `sql.js` against seed dataset |
| `code` | `language: "javascript"`, `functionName`, `starterCode`, `testCases` (≥ 2), `referenceCodeObfuscated` | Executed in isolated Web Worker sandbox |
| `scenario` | `minWords`, `keyPoints` (≥ 2), `explanation`, `rubric` | Automated concept/word estimate + flagged for Interviewer rubric review |

## Domain-Specific Guidance

- **Oracle 12c DBA (`dba`)**: Distinguish clearly between ANSI SQL executed in browser SQLite (`sql.js`) and Oracle 12c-specific concepts (CDB/PDB `C##` common users, `SYSBACKUP`, RMAN `ARCHIVELOG`/Block Media Recovery, `V$SESSION.BLOCKING_SESSION`, `ORA-00060`, unindexed FK `TM` locks, AWR/ASH).
- **Quality Assurance (`qa`)**: Cover BVA/equivalence partitioning, decision tables, Playwright auto-waiting, S1–S4 severity vs priority, and risk-based regression.
- **Project Manager (`pm`)**: Ensure EVM math (`SPI = EV/PV`, `CPI = EV/AC`), CPM zero-float rules, PERT `(O+4M+P)/6`, RAID vs RACI, and formal CCB change control are exact.

## Authoring Quality Checklist

- [ ] Prompt is clear, self-contained, and ≥ 12 characters.
- [ ] Explanation teaches *why* the answer is correct (not just restating the option letter).
- [ ] Rubric contains ≥ 2 criteria with weights summing to `1.0`.
- [ ] Difficulty (`easy | medium | hard`) matches target `levels`.
- [ ] SQL queries run cleanly on the target dataset and pass `npm run validate:bank`.
- [ ] SME reviewed before merging to `main`.
