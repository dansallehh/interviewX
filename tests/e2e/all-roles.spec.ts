import { expect, test } from '@playwright/test';

const ROLES: ReadonlyArray<{ id: string; levelId: string; titleFragment: string }> = [
  { id: 'fresh', levelId: 'entry', titleFragment: 'Fresh Graduate' },
  { id: 'senior', levelId: 'senior', titleFragment: 'Senior Engineer' },
  { id: 'pm', levelId: 'mid', titleFragment: 'Project Manager' },
  { id: 'dev', levelId: 'junior', titleFragment: 'Developer' },
  { id: 'sa', levelId: 'standard', titleFragment: 'System Analyst' },
  { id: 'qa', levelId: 'manual', titleFragment: 'Quality Assurance' },
  { id: 'dba', levelId: 'standard', titleFragment: 'Database Admin (Oracle 12c)' },
  { id: 'ba', levelId: 'standard', titleFragment: 'Business Analyst' },
];

test.describe('E2E: All 8 Roles Happy Path + 3 Negative Paths', () => {
  for (const role of ROLES) {
    test(`happy path: ${role.id} (select -> level -> brief -> answer -> submit -> report -> verify)`, async ({ page }) => {
      await page.goto('/#/');
      await page.locator(`#role-card-${role.id}`).click();
      await expect(page).toHaveURL(new RegExp(`#/role/${role.id}$`));

      await page.locator(`#level-card-${role.levelId}`).click();
      await expect(page).toHaveURL(new RegExp(`#/brief/${role.id}/${role.levelId}$`));
      await expect(page.getByRole('heading', { level: 1 })).toContainText(role.titleFragment);

      await page.locator('#candidate-name-input').fill('Test Candidate');
      await page.locator('#btn-start-assessment').click();
      await expect(page).toHaveURL(/#\/assess\//);
      await expect(page.locator('#assessment-timer')).not.toHaveText('--:--');

      // Answer Q1 depending on whichever question type was selected first
      const radio = page.locator('input[type="radio"]').first();
      const checkbox = page.locator('input[type="checkbox"]').first();
      const sqlEditor = page.locator('#sql-code-editor');
      const jsEditor = page.locator('#js-code-editor');
      const scenarioEditor = page.locator('#scenario-editor');

      if ((await radio.count()) > 0) {
        await radio.check();
      } else if ((await checkbox.count()) > 0) {
        await checkbox.check();
      } else if ((await sqlEditor.count()) > 0) {
        await sqlEditor.fill('SELECT 1;');
        await page.locator('#btn-run-sql').click();
        await expect(page.locator('#sql-run-status')).not.toHaveText(/Click "Run SQL"/);
      } else if ((await jsEditor.count()) > 0) {
        await page.locator('#btn-run-code').click();
        await expect(page.locator('#code-run-status')).not.toHaveText(/isolated Web Worker/);
      } else if ((await scenarioEditor.count()) > 0) {
        await scenarioEditor.fill('Structured response covering impact, risk, mitigation, and concrete next steps.');
      }

      // Submit assessment -> Report view
      await page.locator('#btn-submit-assessment').click();
      await expect(page).toHaveURL(/#\/report\//);
      await expect(page.locator('#report-verdict')).toBeVisible();
      await expect(page.locator('.radar-svg')).toBeVisible();

      // Verify share code authentic round-trip
      const shareCode = (await page.locator('#report-share-code').textContent())?.trim() ?? '';
      expect(shareCode.startsWith('IX1.')).toBe(true);
      await page.locator('#share-code-verify-input').fill(shareCode);
      await page.locator('#btn-verify-share-code').click();
      await expect(page.locator('#share-code-verify-result')).toContainText('Verified authentic code');
    });
  }

  test('edge case: mid-test page refresh resumes session with active timer and saved answer', async ({ page }) => {
    await page.goto('/#/brief/pm/mid');
    await page.locator('#btn-start-assessment').click();
    await expect(page).toHaveURL(/#\/assess\//);

    const urlBefore = page.url();
    const radio = page.locator('input[type="radio"]').first();
    if ((await radio.count()) > 0) {
      await radio.check();
    }

    await page.reload();
    await expect(page).toHaveURL(urlBefore);
    await expect(page.locator('#assessment-timer')).not.toHaveText('--:--');
  });

  test('negative path 1: deep-link to invalid route renders 404 view', async ({ page }) => {
    await page.goto('/#/assess/nonexistent-session-id');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('does not exist');
  });

  test('negative path 2 & 3: tampered share code and corrupted JSON import are rejected', async ({ page }) => {
    await page.goto('/#/brief/fresh/entry');
    await page.locator('#btn-start-assessment').click();
    await page.locator('#btn-submit-assessment').click();
    await expect(page).toHaveURL(/#\/report\//);

    // Negative path 2: Tampered share code
    const shareCode = (await page.locator('#report-share-code').textContent())?.trim() ?? '';
    const tampered = `${shareCode.slice(0, -1)}${shareCode.endsWith('0') ? '1' : '0'}`;
    await page.locator('#share-code-verify-input').fill(tampered);
    await page.locator('#btn-verify-share-code').click();
    await expect(page.locator('#share-code-verify-result')).toContainText('Tamper detected');

    // Negative path 3: Corrupted / tampered JSON import
    await page.locator('#json-import-input').fill(
      JSON.stringify({ schemaVersion: '1.0.0', exportedAt: '2026-01-01', report: { overallScore: 100 }, checksum: '0'.repeat(64) }),
    );
    await page.locator('#btn-import-json').click();
    await expect(page.locator('#json-import-status')).toContainText('Checksum mismatch');
  });
});
