import { expect, test } from '@playwright/test';

test.describe('Visual Regression Baselines', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('role selector landing matches baseline', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('#role-card-dba')).toBeVisible();
    await expect(page).toHaveScreenshot('role-selector.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('role brief screen matches baseline', async ({ page }) => {
    await page.goto('/#/brief/dba/standard');
    await expect(page.locator('#btn-start-assessment')).toBeVisible();
    await expect(page).toHaveScreenshot('role-brief-dba.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });

  test('404 screen matches baseline', async ({ page }) => {
    await page.goto('/#/invalid-route-visual');
    await expect(page.locator('#btn-404-home')).toBeVisible();
    await expect(page).toHaveScreenshot('not-found.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
});
