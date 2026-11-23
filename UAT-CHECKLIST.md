# UAT & Release Go/No-Go Checklist

## 1. Manual UAT Checklist (7 Roles)

Run by a human tester / SME prior to signing off a production release.

| Role | Flow Verified (Role → Level → Brief → Assess → Submit → Report) | Role-Specific Checks | SME Sign-Off |
|---|---|---|---|
| **Fresh Graduate (`fresh`)** | [ ] Pass | SQL query runs against `employees`, logic/networking/OS/communication scoring accurate | [ ] |
| **Senior Engineer (`senior`)** | [ ] Pass | Architecture/incident scenarios + O(n) JS code runner in Web Worker passes tests | [ ] |
| **Project Manager (`pm`)** | [ ] Pass | EVM (SPI/CPI), CPM float, RAID/RACI, and change control accuracy verified by PM SME | [ ] |
| **Developer (`dev`)** | [ ] Pass | JS code runner + `orders_ops` JOIN/anti-join SQL runner + MVC/API scoring accurate | [ ] |
| **System Analyst (`sa`)** | [ ] Pass | BRD/FRD, UML Sequence/State, Fit-Gap, and UAT RTM items accurate | [ ] |
| **Quality Assurance (`qa`)** | [ ] Pass | BVA/equivalence, Playwright automation, S1–S4 triage, and flaky-test code task verified by QA SME | [ ] |
| **Oracle 12c DBA (`dba`)** | [ ] Pass | CDB/PDB `C##`, `SYSBACKUP`, RMAN PITR/BMR, `V$SESSION` locks, and SQL tuning verified by Oracle DBA SME | [ ] |
| **Business Analyst (`ba`)** | [ ] Pass | BABOK discovery, NPV/payback ROI modelling, live `orders_ops` KPI SQL analytics, and WSJF/Kano/RICE prioritization verified by BA SME | [ ] |

### Cross-Cutting Functional UAT
- [ ] Mid-test refresh resumes exact remaining timer and saved answers.
- [ ] Timer accommodation (`1.25×`, `1.5×`, `2.0×`) scales duration and announces `5m`/`1m`/`10s` warnings.
- [ ] Timer expiry auto-submits without losing any answer.
- [ ] Opening the same session in a second tab displays the multi-tab conflict warning.
- [ ] Export PDF downloads cleanly and includes score, verdict, topics, and share code.
- [ ] Export JSON → Re-import validates SHA-256 checksum; mutating 1 character triggers rejection.
- [ ] Shareable Result Code verifies authentic codes and rejects tampered codes.
- [ ] Retake generates a fresh non-overlapping question set.
- [ ] Interviewer Mode PIN gate unlocks (`2026`), displays reference answers/rubrics, and exports notes.
- [ ] Keyboard-only navigation (Tab, Arrow keys, Enter) works across all routes; 360px mobile has 0 overflow.
- [ ] **Clear All My Data** wipes all local state cleanly.

---

## 2. Go / No-Go Release Checklist

- [ ] All GitHub Actions CI gates green (`secret-scan`, `lint`, `typecheck`, `validate:bank`, `test:coverage ≥ 85%`, `build`, `check:budget < 200 KB`, `test:a11y`, `test:e2e`, `lighthouse ≥ 90`).
- [ ] **0 open S1 (Critical) or S2 (High)** defects.
- [ ] SME content sign-off completed for all 7 roles (especially Oracle 12c DBA, QA, and PM).
- [ ] Lighthouse CI report attached (Performance, Accessibility, Best Practices, SEO all ≥ 90).
- [ ] Live GitHub Pages smoke test passed on production URL.
- [ ] Release tagged (`v1.0.0`) and `CHANGELOG.md` updated.

**Release Decision**: `[ ] GO` / `[ ] NO-GO` — Signed: ___________________ Date: ___________

---

## 3. Defect Severity Definitions & Log Template

| Severity | Definition | Release Policy |
|---|---|---|
| **S1 Critical** | App crash, data loss, broken assessment submission, security/CSP failure, or wrong pass/fail verdict | **Blocks release** |
| **S2 High** | Major feature broken (PDF/JSON export, SQL/Code runner, timer resume, or a11y critical/serious violation) | **Blocks release** |
| **S3 Medium** | Minor functional or layout defect with a clear workaround | Fix or document waiver |
| **S4 Low** | Cosmetic polish, minor copy tweak | Defer to next minor release |

### Defect Log

| ID | Severity | Role / Route | Summary | Status | Owner |
|---|---|---|---|---|---|
| D-001 | — | — | *(No open defects at v1.0.0 release candidate)* | Closed | — |
