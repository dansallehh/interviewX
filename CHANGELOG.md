# Changelog

All notable changes to InterviewX are documented in this file. This project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-22

### Added
- **Business Analyst (`ba`) Assessment Track**:
  - New role profile (`data/roles/ba.json`) with **Business Analyst** (35 min, 8 questions) and **Senior / Lead Business Analyst** (45 min, 10 questions) levels across 4 weighted sections (`Discovery & Elicitation`, `Business Case & ROI`, `KPI & Data Analysis`, `Backlog & Value Delivery`).
  - 24 tagged SME-grade questions (`data/questions/ba.json`, 2× topic pool enforced), including **3 live `sql.js`-verified KPI analytics queries** (regional AOV, tier segmentation, revenue-at-risk), NPV/Payback/TCO financial scenarios, Goodhart's Law & A/B testing guardrails, and WSJF/RICE/Kano prioritization.
  - Sky-blue per-role accent tokens (`#38bdf8` dark / `#0369a1` light), 2D SVG compass prism motif, lazy Three.js `TetrahedronGeometry` 3D scene, Interviewer Mode support, and full Playwright E2E + keyboard accessibility coverage.

## [1.0.0] - 2026-11-22

### Added
- **Phase 1 — Architecture, Design System & Role Selector Shell**:
  - Strict MVC folder architecture (`/models`, `/views`, `/controllers`, `/services`, `/data`, `/assets`, `/tests`, `/scripts`).
  - Dark graphite + light CSS-variable design tokens, self-hosted typography (`Space Grotesk`, `IBM Plex Sans`, `JetBrains Mono`), and 7 per-role accents with 2D SVG motifs.
  - Hash-based router (`#/`, `#/role/:id`, `#/brief/:id/:level`, `#/assess/:sessionId`, `#/report/:sessionId`, `#/interviewer`, `#/404`), global error boundary with privacy-safe diagnostics, and footer **Clear All My Data** control.
- **Phase 2 — Role Profiles, Question Bank, Engine, Persistence & Content QA**:
  - JSON Schemas, 7 role profiles (`fresh`, `senior`, `pm`, `dev`, `sa`, `qa`, `dba`), 168 tagged questions with SHA-256 hashed / obfuscated answer keys, and 2 relational SQL datasets (`employees`, `orders_ops`).
  - Weighted `AssessmentEngineService` (largest-remainder quotas, Fisher-Yates shuffle, cross-attempt repeat avoidance), drift-corrected `TimerService` (accommodations + ARIA warnings), resilient `StorageService` (IndexedDB / localStorage / memory fallback + corruption detection), and `TabSyncService` (multi-tab conflict detection).
  - Automated `scripts/validate-bank.mjs` enforcing schemas, near-duplicate rejection, 2× topic pool coverage, and `sql.js` verification of all 10 SQL tasks.
- **Phase 3 — Interactive Runners, Scoring, Report & Export**:
  - Lazy-loaded `sql.js` SQL runner (self-hosted `public/sql-wasm.wasm`) and isolated Web Worker JavaScript code runner (1.5s timeout + memory guard + no network/DOM).
  - Live 5-type Assessment Workspace, weighted `ScoringService`, accessible SVG Radar Chart, Readiness Report, lazy `jsPDF` export, SHA-256 checksummed JSON export/import, and signed Shareable Result Code with tamper detection.
  - Playwright E2E happy paths for all 7 roles + 3 negative paths + visual regression baselines.
- **Phase 4 — Three.js Scenes, Interviewer Mode, PWA & Security Hardening**:
  - Lazy-loaded Three.js per-role 3D procedural scenes (capped DPR ≤ 1.5, pauses on `document.hidden`) with automatic 2D fallback for WebGL-unavailable, low-end, or `prefers-reduced-motion` contexts.
  - PIN-gated Interviewer Mode (`2026` demo default) with honest static-site security note, reference key/SQL/code inspection, live rubric checklist, observation notes, and JSON export.
  - PWA manifest, self-hosted icon, offline-capable Service Worker (`public/sw.js`), Dependabot config, Lighthouse CI config (≥ 90), and `gitleaks` secret scanning in CI.
- **Phase 5 — Release Documentation**:
  - Complete `README.md`, `CONTRIBUTING.md`, `QUESTION-AUTHORING.md`, `RUNBOOK.md`, `UAT-CHECKLIST.md`, `CHANGELOG.md`, and MIT `LICENSE`.

### Removed
- Removed legacy duplicated `screen_interview.html` and broken `window.notebookAppApi` host shim dependency.
