import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];

async function runAxe(page: Page) {
  return new AxeBuilder({ page: page as unknown as AxePage })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
}

test.describe('Phase 4 Edge Cases: WebGL Fallback, Interviewer Mode, Responsive 360px & Offline', () => {
  test('WebGL unavailable / reduced-motion gracefully renders 2D fallback without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/brief/senior/senior');

    await expect(page.locator('.scene-fallback')).toBeVisible();
    await expect(page.locator('.scene-fallback')).toHaveAttribute('data-scene-mode', '2d-fallback');
    expect(errors).toEqual([]);
  });

  test('Interviewer Mode PIN gate rejects bad PIN, unlocks with 2026, displays reference keys, and passes axe', async ({ page }) => {
    await page.goto('/#/interviewer');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Unlock Reference Keys');

    await page.locator('#interviewer-pin-input').fill('0000');
    await page.locator('#btn-unlock-interviewer').click();
    await expect(page.locator('#interviewer-pin-error')).toBeVisible();

    await page.locator('#interviewer-pin-input').fill('2026');
    await page.locator('#btn-unlock-interviewer').click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Reference Solutions & Rubric Workbench');
    await expect(page.locator('#interviewer-bank-list article').first()).toBeVisible();

    const axeRes = await runAxe(page);
    const severe = axeRes.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(severe, JSON.stringify(severe, null, 2)).toEqual([]);
  });

  test('responsive 360px mobile viewport has zero horizontal overflow and 0 critical/serious axe violations', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/#/');
    await expect(page.locator('#role-card-fresh')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);

    const axeRes = await runAxe(page);
    const severe = axeRes.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(severe, JSON.stringify(severe, null, 2)).toEqual([]);
  });

  test('PWA manifest and service worker assets are served cleanly', async ({ request }) => {
    const manifestRes = await request.get('/manifest.webmanifest');
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.short_name).toBe('InterviewX');

    const swRes = await request.get('/sw.js');
    expect(swRes.status()).toBe(200);
    expect(await swRes.text()).toContain('interviewx-shell-v1');
  });
});
