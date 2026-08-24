import { test, expect } from '@playwright/test';
import { gotoChart } from './fixtures';

test.describe('Natal chart wheel', () => {
  test('renders the fixed chart wheel', async ({ page }) => {
    await gotoChart(page);

    // Chart Wheel is the default tab on /chart.
    await expect(page.getByRole('button', { name: 'Chart Wheel' })).toBeVisible();

    // Scoped to <main> so the header (nav + auth widget, whose state can
    // race a real page load) and the footer (build hash / version / build
    // date, which is intentionally different every run) never enter the
    // comparison -- see e2e/README.md.
    await expect(page.locator('main')).toHaveScreenshot('chart-wheel.png');
  });
});
