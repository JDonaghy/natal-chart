import { test, expect } from '@playwright/test';
import { gotoChart } from './fixtures';

// U+2648..U+2653 -- the raw Unicode zodiac code points (Aries..Pisces).
// This is exactly what issue #42 shipped: these render as OS colour-emoji
// badges on platforms with an emoji font that claims them, instead of the
// app's font-independent SVG glyphs (SignGlyphIcon, fixed in #42/#44).
const RAW_ZODIAC_CODEPOINTS = /[♈-♓]/;

test.describe('Zodiacal Releasing (ZR) tab', () => {
  test('renders sign glyphs as SVG, not raw Unicode', async ({ page }) => {
    await gotoChart(page);

    await page.getByRole('link', { name: 'ZR', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Zodiacal Releasing' })).toBeVisible();

    const main = page.locator('main');

    // DOM-structure guard, independent of the screenshot: every sign glyph
    // in the overview bar and timeline table must be an inline SVG
    // (aria-label carries the English sign name), and no raw zodiac code
    // point should appear as visible text anywhere in the tab. This is the
    // cheap, non-flaky half of the regression guard; the screenshot below
    // is what actually catches "looks wrong" (e.g. a *different* fallback
    // font swapping the glyph shape without the DOM changing at all).
    await expect(main.locator('svg[aria-label]').first()).toBeVisible();
    await expect(main).not.toContainText(RAW_ZODIAC_CODEPOINTS);

    // Scoped to <main> -- see chart-wheel.spec.ts for why.
    await expect(main).toHaveScreenshot('zr-tab.png');
  });
});
