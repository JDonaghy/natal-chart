# Known Bugs & Issues

## 🚨 Critical
### 1. Deployment Discrepancy
**Status**: Resolved  
**Description**: ~~Changes deployed to GitHub Pages don't match local testing. User reports seeing "Birth Timezone box" (possibly old timezone selector) instead of expected read-only timezone display with "(detected from city)" text.~~ **RESOLVED**: Fix deployed with proper CI build version injection using GITHUB_SHA environment variable. Timezone selector removed, read-only display working correctly.

**Symptoms**:
- Local development shows correct UI (no timezone selector, read-only display)
- Deployed version may show different UI elements
- GitHub Actions build succeeds but deployed content appears outdated
- Build version in footer shows "unknown" instead of commit hash

**Root Cause**: CI build uses shallow git clone where `git rev-parse --short HEAD` fails. Build version falls back to "unknown".

**Fix**: Updated vite.config.ts to use `GITHUB_SHA` environment variable in CI (always available), falling back to git locally.

**Progress**:
- ✅ Added build version tracking (commit hash in footer)
- ✅ Deployed version with build tracking (commit 0a0eee4) — showed "unknown" due to CI issue
- ✅ Fixed vite.config.ts to use GITHUB_SHA in CI (committed and pushed)
- ✅ New deployment triggered with fix (commits b4705c3, 676bfe9, ece131d)
- ✅ Verified deployed version shows correct commit hash

**Recommendations**:
- Clear browser cache and site data for GitHub Pages domain to ensure latest JavaScript loads
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) after deployment completes
- Verify build version in footer matches latest commit hash (first 7 characters of commit)

## 🐛 High Priority
### 2. Ephemeris File Loading in Tests
**Status**: Known Issue  
**Description**: Unit tests fail to load ephemeris files with "Failed to parse URL" error when running in Node.js test environment.

**Affected Tests**:
- Integration tests in `packages/web/src/integration.test.ts`
- Calculator tests in `packages/core/test/calculator.test.ts`

**Workaround**: Tests use mock path handling but still show error logs.

**Root Cause**: Swiss Ephemeris WASM file loading expects browser environment with proper URL resolution.

## ⚠️ Medium Priority
### 3. Chiron Calculation Missing
**Status**: Expected Behavior  
**Description**: Chiron positions cannot be calculated without asteroid ephemeris files (`seas_18.se1`).

**Current State**: Chiron is skipped in calculations with appropriate warning message.

**Solution Required**: Place asteroid ephemeris files in `packages/web/public/ephemeris/` directory.

### 4. Mock Geocoding Data Limitations
**Status**: Resolved  
**Description**: Real geocoding via Cloudflare Worker with OpenCage API key is now enabled. Timezone extraction and coordinate parsing work for both forward and reverse geocoding.

**Current State**: Production uses live OpenCage API with 30-day cache. Mock data is no longer used.

### 5. Mobile Responsiveness
**Status**: Improved  
**Description**: Chart wheel now uses aspect-ratio wrapper with max-width: 100% and overflow: auto for mobile compatibility. Wheel size remains 800px but scales down on small screens.

**Affected Components**: ChartWheel component with responsive wrapper.

## 🔧 Low Priority
### 6. ESLint Not Configured
**Status**: Resolved  
**Description**: ESLint is now properly configured with root `eslint.config.js` covering TypeScript and React rules. Linting passes for all packages.

**Impact**: Linting now runs successfully with `pnpm --filter web lint`.

### 7. TypeScript Strictness
**Status**: Improved  
**Description**: Type assertions have been reduced; strict TypeScript configuration enforced. Some `as any` assertions remain in core calculator where type safety is challenging.

**Files to Review**: Core calculator logic (6 instances of `as any`).

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