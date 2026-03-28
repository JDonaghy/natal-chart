# Known Bugs & Issues

## 🚨 Critical
### 1. Deployment Discrepancy
**Status**: Fix in Progress  
**Description**: Changes deployed to GitHub Pages don't match local testing. User reports seeing "Birth Timezone box" (possibly old timezone selector) instead of expected read-only timezone display with "(detected from city)" text.

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
- ✅ Fixed vite.config.ts to use GITHUB_SHA in CI (commit pending)
- ⏳ Need to commit fix and trigger new deployment
- ⏳ Verify deployed version shows correct commit hash after deployment

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
**Status**: Expected Behavior  
**Description**: City search uses mock data only, requires Cloudflare Worker deployment with OpenCage API key for real geocoding.

**Current State**: Mock data covers major cities but lacks comprehensive coverage.

### 5. Mobile Responsiveness
**Status**: Known Limitation  
**Description**: Chart wheel at 800px diameter may not render well on mobile devices.

**Affected Components**: ChartWheel component with fixed 800px size.

## 🔧 Low Priority
### 6. ESLint Not Configured
**Status**: Known Issue  
**Description**: `pnpm --filter web lint` fails because ESLint is not installed/configured.

**Impact**: No linting performed during development.

### 7. TypeScript Strictness
**Status**: Technical Debt  
**Description**: Some type assertions (`as`) used instead of proper type guards.

**Files to Review**: Core calculator logic and React component props.

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