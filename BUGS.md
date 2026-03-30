# Known Bugs & Issues

## 🐛 Open Issues

### 2. Ephemeris File Loading in Tests
**Status**: Known Issue
**Description**: Unit tests show "Failed to parse URL" error logs when loading ephemeris files in Node.js test environment. Tests still pass via mock path handling.
**Root Cause**: Swiss Ephemeris WASM expects browser environment with proper URL resolution.

### 5. Chiron Calculation Missing
**Status**: Expected Behavior
**Description**: Chiron skipped in calculations (with warning) — requires asteroid ephemeris files (`seas_18.se1`) in `packages/web/public/ephemeris/`.

### 11. City Search Returns Only 5 Results for Short Queries
**Status**: Open
**Description**: Searching for partial city names like "lon" returns only 5 results despite `limit=10` being set in the OpenCage API call. The limit parameter may not be the issue — OpenCage may only return 5 matches for short/ambiguous queries, or cached results from before the limit change may be served. Needs investigation into whether OpenCage itself caps results, whether KV cache needs to be cleared for affected queries, or whether a different approach (e.g., autocomplete API) is needed.
**Affects**: Both birth city and transit city search (shared `CitySearch` component).

### 7. Mobile Responsiveness
**Status**: Improved
**Description**: Chart wheel uses aspect-ratio wrapper with overflow auto. Works but could be further optimized for small screens.

### 9. TypeScript Strictness
**Status**: Resolved
**Description**: ~~6 `as any` assertions remain in core calculator~~ All removed via proper type extensions for swisseph-wasm.

## ✅ Resolved (archived to SESSION_HISTORY.md)
- ~~#1 Deployment discrepancy~~ — Fixed with GITHUB_SHA
- ~~#3 Planet house assignments~~ — Fixed falsy-zero bug
- ~~#6 Mock geocoding~~ — Real API enabled
- ~~#8 ESLint not configured~~ — Configured and passing
- ~~#10 Inner wheel rotation~~ — Fixed toAngle modular arithmetic

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