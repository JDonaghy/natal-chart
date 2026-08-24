import { test, expect } from '@playwright/test';
import { gotoChart } from './fixtures';

test.describe('Planet positions table', () => {
  test('renders the fixed chart planet list', async ({ page }) => {
    await gotoChart(page);

    await page.getByRole('button', { name: 'Planets' }).click();
    await expect(page.getByRole('heading', { name: 'Planet Positions' })).toBeVisible();

    // Scoped to <main> -- see chart-wheel.spec.ts for why.
    await expect(page.locator('main')).toHaveScreenshot('positions.png');
  });
});
