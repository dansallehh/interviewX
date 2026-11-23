import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ROLE_IDS = ['fresh', 'senior', 'pm', 'dev', 'sa', 'qa', 'dba', 'ba'] as const;

type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];

async function runAxe(page: Page) {
  return new AxeBuilder({ page: page as unknown as AxePage })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
}

test.describe('Phase 1 Quality Gate: Accessibility, Keyboard Nav & CSP', () => {
  test('landing page has 0 critical/serious axe violations and 0 console/CSP errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/#/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Choose your assessment track');

    const results = await runAxe(page);

    const severe = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(severe, JSON.stringify(severe, null, 2)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('all 7 role cards are rendered and navigable via keyboard through level and brief', async ({ page }) => {
    await page.goto('/#/');

    for (const id of ROLE_IDS) {
      await expect(page.locator(`#role-card-${id}`)).toBeVisible();
    }

    // Focus first role card and traverse all 7 cards using ArrowRight
    const firstCard = page.locator('#role-card-fresh');
    await firstCard.focus();
    await expect(firstCard).toBeFocused();

    for (let i = 1; i < ROLE_IDS.length; i += 1) {
      await page.keyboard.press('ArrowRight');
      await expect(page.locator(`#role-card-${ROLE_IDS[i]}`)).toBeFocused();
    }

    // Press Enter on the 8th card (Business Analyst)
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/role\/ba$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Select assessment level');

    // Select standard level via keyboard
    const levelBtn = page.locator('#level-card-standard');
    await levelBtn.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/brief\/ba\/standard$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Business Analyst Brief');

    // Run axe on Brief page
    const briefAxe = await runAxe(page);
    const briefSevere = briefAxe.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(briefSevere, JSON.stringify(briefSevere, null, 2)).toEqual([]);
  });

  test('deep-link to invalid route renders accessible 404 view and light theme passes axe', async ({ page }) => {
    await page.goto('/#/nonexistent-route');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('does not exist');

    // Toggle to light theme and verify 0 critical/serious violations
    await page.locator('#btn-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const results = await runAxe(page);
    const severe = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(severe, JSON.stringify(severe, null, 2)).toEqual([]);
  });
});
