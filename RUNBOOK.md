# Operations & Deployment Runbook

## 1. Deployment Procedure (GitHub Pages)

InterviewX deploys automatically to GitHub Pages via `.github/workflows/ci.yml` **only from `main`** after all gates pass:

1. Verify Repository **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**.
2. Merge an approved PR into `main` (all required checks must be green: `secret-scan`, `quality-gate`).
3. Confirm the `deploy` job completes and outputs the live GitHub Pages URL.
4. Perform the live smoke test:
   - Open `https://<owner>.github.io/interviewX/#/`
   - Verify 0 console/CSP errors in DevTools.
   - Complete 1 end-to-end role flow (`Pick Role → Pick Level → Brief → Start → Submit → Report`).
   - Verify offline reload after Service Worker activation.

## 2. Tagged Releases (SemVer)

```powershell
# Update version in package.json and CHANGELOG.md, commit to main, then tag:
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## 3. Rollback Procedure

If a production defect (S1/S2) is detected on the live GitHub Pages URL:

```powershell
# Option A: Revert the offending commit on main (preferred — preserves audit trail)
git checkout main
git pull origin main
git revert <bad-commit-sha> --no-edit
git push origin main

# Option B: Restore a known-good SemVer tag onto main
git checkout main
git reset --hard v1.0.0
git push --force-with-lease origin main
```

Pushing the revert triggers CI and redeploys the known-good build to GitHub Pages automatically within ~3 minutes.

## 4. Common Failures & Troubleshooting

| Failure | Cause | Resolution |
|---|---|---|
| `validate:bank` fails with pool error | A topic has fewer than 2× required questions | Add tagged questions to `data/questions/<role>.json` and re-run `npm run validate:bank`. |
| `check:budget` exceeds 200 KB gzip | Heavy library imported statically in initial entry | Convert to dynamic `import(...)` and confirm Vite splits it into a lazy chunk. |
| CSP console violation on fonts or WASM | Asset inlined as `data:` or missing `'wasm-unsafe-eval'` | Ensure `build.assetsInlineLimit: 0` in `vite.config.ts` and `public/sql-wasm.wasm` is copied via `scripts/copy-assets.mjs`. |
| Playwright preview server timeout on Windows | IPv6 `localhost` mismatch | Keep `--host 127.0.0.1` in `package.json` `preview` script. |
| Stale offline cache after deploy | Client browser holds old Service Worker cache | Bump `CACHE_NAME` in `public/sw.js` (`interviewx-shell-v2`) or click **Clear All My Data** in footer. |
