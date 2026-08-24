import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fontUrl, loadLocalFonts } from './loadFonts';

/**
 * Issue #43: App.css used to hardcode the GitHub Pages subpath into two
 * `@font-face` `url()`s, which 404s on Cloudflare Pages (a different
 * DEPLOY_BASE). The fonts are now registered at runtime from
 * `import.meta.env.BASE_URL` instead — these tests pin that down and guard
 * against a hardcoded deploy path creeping back in.
 */

describe('fontUrl', () => {
  it('builds the URL from the configured base, not a separately hardcoded path', () => {
    const base = import.meta.env.BASE_URL;
    expect(fontUrl('DejaVuSans.ttf')).toBe(
      `${base}${base.endsWith('/') ? '' : '/'}fonts/DejaVuSans.ttf`,
    );
  });

  it('never doubles the slash between base and the fonts directory', () => {
    expect(fontUrl('DejaVuSans.ttf')).not.toMatch(/\/\/fonts\//);
  });

  it('produces distinct URLs per file, both ending in the requested filename', () => {
    const dejaVu = fontUrl('DejaVuSans.ttf');
    const cormorant = fontUrl('Cormorant-Regular.ttf');
    expect(dejaVu).not.toBe(cormorant);
    expect(dejaVu.endsWith('/fonts/DejaVuSans.ttf')).toBe(true);
    expect(cormorant.endsWith('/fonts/Cormorant-Regular.ttf')).toBe(true);
  });
});

describe('loadLocalFonts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers both local fonts via the FontFace API using fontUrl()', async () => {
    const registered: string[] = [];

    class FakeFontFace {
      family: string;
      source: string;
      constructor(family: string, source: string) {
        this.family = family;
        this.source = source;
      }
      load() {
        return Promise.resolve(this);
      }
    }

    vi.stubGlobal('FontFace', FakeFontFace);
    vi.stubGlobal('document', {
      fonts: {
        add: (face: FakeFontFace) => registered.push(face.source),
      },
    });

    loadLocalFonts();
    // Let the FontFace.load() microtask chain flush.
    await Promise.resolve();
    await Promise.resolve();

    expect(registered).toHaveLength(2);
    expect(registered).toContain(`url(${fontUrl('DejaVuSans.ttf')})`);
    expect(registered).toContain(`url(${fontUrl('Cormorant-Regular.ttf')})`);
  });

  it('no-ops without throwing when the FontFace API is unavailable (e.g. jsdom)', () => {
    expect(() => loadLocalFonts()).not.toThrow();
  });
});

describe('App.css', () => {
  it('has no url() pointing at a root-absolute deploy-specific path', () => {
    const css = readFileSync(resolve(__dirname, '../App.css'), 'utf-8');

    // Any url() present at all must be relative, not root-absolute — a
    // root-absolute url() is exactly what bypasses Vite's base rewriting
    // and is how issue #43 happened.
    const urls = [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1] ?? '');
    for (const url of urls) {
      expect(url.startsWith('/')).toBe(false);
    }
  });
});
