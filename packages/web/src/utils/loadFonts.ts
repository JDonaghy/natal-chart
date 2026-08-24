/**
 * Registers the two self-hosted webfonts (DejaVu Sans for astrological
 * Unicode glyphs, Cormorant for PDF export — see `pdfExport.ts`) via the
 * FontFace API instead of a static `@font-face` rule in App.css.
 *
 * Why not plain CSS: `vite.config.ts` sets `base` from `DEPLOY_BASE`, which
 * points at a GitHub-Pages-only subpath by default and at `/` for Cloudflare
 * Pages. Vite rewrites *relative* `url()`s in CSS to respect `base`, but a
 * hardcoded root-absolute `url()` baking in one deploy's subpath is left
 * untouched and 404s on the other target (issue #43). Building the URL from
 * `import.meta.env.BASE_URL` at runtime keeps it correct under either
 * target without duplicating the font files.
 *
 * The files stay in `public/fonts/` (not moved into `src/assets/`) because
 * `pdfExport.ts` also fetches them by that literal path at runtime, and
 * `symbols.test.ts` reads them straight off disk to validate glyph coverage.
 */

interface LocalFontSpec {
  family: string;
  file: string;
  weight: string;
}

const LOCAL_FONTS: LocalFontSpec[] = [
  { family: 'DejaVuSans', file: 'DejaVuSans.ttf', weight: 'normal' },
  { family: 'Cormorant', file: 'Cormorant-Regular.ttf', weight: '400' },
];

/** Builds the base-aware URL for a font file under `public/fonts/`. */
export function fontUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${base.endsWith('/') ? '' : '/'}fonts/${file}`;
}

/**
 * Loads and registers the local webfonts with the document's FontFaceSet.
 * Safe to call multiple times or in non-browser environments (SSR/tests) —
 * it no-ops when `document.fonts` isn't available.
 */
export function loadLocalFonts(): void {
  if (typeof document === 'undefined' || !('fonts' in document)) return;

  for (const { family, file, weight } of LOCAL_FONTS) {
    const url = fontUrl(file);
    const face = new FontFace(family, `url(${url})`, { weight, style: 'normal' });
    face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
      })
      .catch((err: unknown) => {
        console.error(`Failed to load local font "${family}" from ${url}:`, err);
      });
  }
}
