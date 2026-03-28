# Known Bugs & Issues

## 🚨 Critical
### 1. Deployment Discrepancy
**Status**: Investigating  
**Description**: Changes deployed to GitHub Pages don't match local testing. User reports seeing "Birth Timezone box" (possibly old timezone selector) instead of expected read-only timezone display with "(detected from city)" text.

**Symptoms**:
- Local development shows correct UI (no timezone selector, read-only display)
- Deployed version may show different UI elements
- GitHub Actions build succeeds but deployed content appears outdated

**Potential Causes**:
- GitHub Pages caching/CDN issues
- Build process differences between local and CI
- Environment variable discrepancies affecting build output
- Hash-based routing issues with GitHub Pages SPA

**Investigation Steps**:
1. Compare deployed JS file hash with local build hash
2. Check GitHub Actions build logs for warnings/errors
3. Verify 404.html SPA fallback is properly deployed
4. Test hard refresh and cache clearing
5. Check for environment-specific code paths
6. **NEW**: Verify build version in footer shows latest commit hash
7. **NEW**: Clear browser cache completely (site data, not just cache)

**Progress**:
- ✅ Added build version tracking (commit hash in footer)
- ✅ Deployed version with build tracking (commit 0a0eee4)
- ⏳ Waiting for user verification of deployed version

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