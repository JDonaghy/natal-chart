# Known Bugs & Issues

## 🐛 Open Issues

### 2. Ephemeris File Loading in Tests
**Status**: Known Issue
**Description**: Unit tests show "Failed to parse URL" error logs when loading ephemeris files in Node.js test environment. Tests still pass via mock path handling.
**Root Cause**: Swiss Ephemeris WASM expects browser environment with proper URL resolution.

### 11. City Search Returns Only 5 Results for Short Queries
**Status**: Open
**Description**: Searching for partial city names like "lon" returns only 5 results despite `limit=10` being set in the OpenCage API call. The limit parameter may not be the issue — OpenCage may only return 5 matches for short/ambiguous queries, or cached results from before the limit change may be served. Needs investigation into whether OpenCage itself caps results, whether KV cache needs to be cleared for affected queries, or whether a different approach (e.g., autocomplete API) is needed.
**Affects**: Both birth city and transit city search (shared `CitySearch` component).

### 18. PDF Degree/Minute Font Mismatch
**Status**: Open
**Description**: The degree and minute labels on the chart wheel in the PDF export render in a default sans-serif font (Helvetica) instead of the Cormorant serif font used in the web view. Cormorant is loaded into jsPDF's VFS and text elements have explicit `font-family="Cormorant"`, but svg2pdf still doesn't pick it up. May require a different approach — e.g., converting degree/minute text to paths like glyphs, or using svg2pdf's `fontHandler` callback.
**Affects**: PDF export only. Web view renders correctly.

### 14. Missing House Cusp Degree Labels on Thick Lines
**Status**: Open
**Description**: On Astro-Seek, the thick house cusp lines have degree/minute labels displayed right on the line at the zodiac ring boundary (e.g. "15°42'" on the cusp line itself). Our chart wheel doesn't display cusp degrees on the house cusp lines at all. These labels should appear at the outer edge of the zodiac band where each thick cusp line meets the ring.
**Reference**: `samples/avu.png` — note the numbers sitting on each thick black radial line at the zodiac ring edge.

## ✅ Resolved (archived to SESSION_HISTORY.md)
- ~~#1 Deployment discrepancy~~ — Fixed with GITHUB_SHA
- ~~#3 Planet house assignments~~ — Fixed falsy-zero bug
- ~~#6 Mock geocoding~~ — Real API enabled
- ~~#8 ESLint not configured~~ — Configured and passing
- ~~#10 Inner wheel rotation~~ — Fixed toAngle modular arithmetic
- ~~#19 PDF autoTable garbled glyphs~~ — Added DejaVuSans font to autoTable styles (v0.11.1)
- ~~#20 Pluto glyph ⯓ rendering as rectangle~~ — Replaced Unicode text with SVG path rendering (v0.11.1)
- ~~#21 Timezone cleared on city selection~~ — Fixed CitySearch event ordering (v0.11.1)
- ~~#5 Chiron calculation missing~~ — Fixed Emscripten FS path mismatch
- ~~#9 TypeScript strictness~~ — All `as any` removed via proper type extensions
- ~~#7 Mobile responsiveness~~ — Full responsive layout with Tamagui (v0.7.0)
- ~~#12 Zodiacal releasing dates~~ — Fixed 365.25→360 day years, Capricorn 30→27
- ~~#13 Wheel rotation~~ — ASC Horizontal toggle added
- ~~#17 Whole Sign house assignment~~ — Whole Sign-specific fast path bypasses cusp array
- ~~#15 Planet glyphs too large~~ — Reduced sizes, radial layout, cluster-based collision avoidance
- ~~#16 Degree labels repeat planet glyph~~ — Verified: labels already separate, no repeated glyph

## 📝 Bug Reporting Template
```markdown
### Bug Description
[Concise description of the issue]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- OS: [e.g., Windows, macOS, Linux]
- Browser: [e.g., Chrome 122, Firefox 120]
- Node Version: [e.g., 20.11.0]
- Commit Hash: [e.g., a24833f]

### Screenshots/Logs
[If applicable]
```