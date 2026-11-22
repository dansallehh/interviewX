# Contributing to InterviewX

Thank you for contributing to InterviewX! All contributions must preserve strict MVC separation, Windows 11 PowerShell compatibility, and pass every automated Quality Gate.

## Development Workflow (Windows 11 PowerShell)

```powershell
git checkout -b feat/your-change
npm ci
npm run dev
```

Before opening a Pull Request, run the full gate:

```powershell
npm run gate:p4
```

## How to Add a Question (Validation Walkthrough)

1. Choose the target role file under `data/questions/<role>.json` (`fresh`, `senior`, `pm`, `dev`, `sa`, `qa`, `dba`).
2. Follow the schema in `data/schemas/question-bank.schema.json` and the quality standards in [`QUESTION-AUTHORING.md`](QUESTION-AUTHORING.md).
3. Ensure:
   - `id` is globally unique (`<role>-<topic>-<number>`).
   - `topic` matches an exact section name in `data/roles/<role>.json`.
   - `levels` references valid level IDs in `data/roles/<role>.json`.
   - `rubric` has at least 2 criteria whose weights sum to `1.0`.
   - For `mcq`/`multi`: at least 4 options (`a`–`d`), `answerHash` (SHA-256 of `<id>::<canonicalAnswer>`), and `answerObfuscated`.
   - For `sql`: valid `datasetId` (`employees` or `orders_ops`), `referenceSqlObfuscated`, and verified `expectedResult`.
   - For `code`: `functionName`, at least 2 `testCases`, and `referenceCodeObfuscated`.
4. Run Content QA:

```powershell
npm run validate:bank
```

The script validates JSON schemas, rejects near-duplicate prompts (≥ 78% token Jaccard similarity), enforces ≥ 2× pool size per weighted topic, and executes every SQL reference query against `sql.js`.

## How to Add a New Role

1. Add the role ID to the `enum` list in `data/schemas/role-profile.schema.json`, `data/schemas/question-bank.schema.json`, and `models/role.ts`.
2. Create `data/roles/<role>.json` with section weights summing to `1.0`.
3. Create `data/questions/<role>.json` with ≥ 2× pool size per topic for every level.
4. Register the lazy import in `services/questionBankService.ts`, accent variables in `assets/styles/tokens.css`, 2D SVG motif in `views/roleMotifs.ts`, and 3D geometry in `views/roleSceneView.ts`.
5. Add the new role to `tests/e2e/all-roles.spec.ts` and run `npm run gate:p4`.
