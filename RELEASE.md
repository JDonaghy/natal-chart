# Release Process & Version Management

This document outlines the release workflow, semantic versioning rules, and deployment procedures for the Natal Chart application.

## Versioning Scheme

We use [Semantic Versioning 2.0.0](https://semver.org/) starting at version **0.1.0**.

### Version Format: `MAJOR.MINOR.PATCH`

- **0.1.0** - Initial development release (current)
- **0.x.y** - Development phase (pre-1.0)
  - `MAJOR` = 0: Initial development, breaking changes allowed
  - `MINOR` = feature additions, minor breaking changes
  - `PATCH` = bug fixes, no breaking changes

Post-1.0.0:
- **MAJOR** version: Incompatible API changes
- **MINOR** version: New functionality (backwards compatible)
- **PATCH** version: Bug fixes (backwards compatible)

### Pre-release Labels (Optional)
- `-alpha.1`: Early testing, unstable
- `-beta.1`: Feature complete, testing
- `-rc.1`: Release candidate

## Git Branch Strategy

```
main (protected)
├─ Always deployable
├─ Only merged via PR from develop
├─ Tags: v0.1.0, v0.2.0, etc.
└─ Triggers GitHub Pages deployment

develop (default branch for development)
├─ All feature work happens here
├─ Must pass CI before PR to main
└─ Never push directly to main

feature/xyz
├─ Short-lived branches for features
├─ Created from develop
└─ Merged back to develop via PR
```

## Release Workflow

### 1. Development Phase (on `develop` branch)
- All development work happens on `develop` branch
- Features are implemented, tested locally
- CI runs on push to `develop` (build, test, lint)
- Regular commits with conventional commit messages

### 2. Pre-release Preparation
Before creating a release PR:
1. **Verify local functionality**:
   ```bash
   pnpm install
   pnpm -r test
   pnpm -r lint
   pnpm -r typecheck
   pnpm build
   ```
2. **Update version numbers**:
   - Update root `package.json` version
   - Update package-specific `package.json` versions if needed
   - Use `pnpm version <patch|minor|major>` (carefully)
3. **Update CHANGELOG.md** (if maintained)
4. **Create release notes** summarizing changes

### 3. Create Release PR to `main`
```bash
# From develop branch
git checkout develop
git pull origin develop

# Create release branch (optional)
git checkout -b release/v0.2.0

# Update version (example: patch bump)
pnpm version patch --no-git-tag-version

# Commit version bump
git add package.json packages/*/package.json
git commit -m "chore: bump version to 0.1.1"

# Push and create PR
git push origin release/v0.2.0
gh pr create --base main --title "Release v0.2.0" --body-file RELEASE_NOTES.md
```

### 4. PR Review & Merge
- Reviewers verify changes, tests pass
- Merge PR to `main` using "Squash and merge" or "Create a merge commit"
- **Never use "Rebase and merge"** (preserves release commit)

### 5. Tag and Release (Automated via GitHub Actions)
Once merged to `main`:
1. **Deploy workflow** automatically:
   - Builds all packages
   - Deploys web app to GitHub Pages
   - Deploys worker to Cloudflare (if changed)

2. **Create Git tag** (manual or automated):
   ```bash
   git checkout main
   git pull origin main
   git tag -a v0.2.0 -m "Release v0.2.0"
   git push origin v0.2.0
   ```

3. **GitHub Release** (optional):
   - Create release from tag
   - Attach release notes
   - Mark as pre-release if alpha/beta

## Version Increment Guidelines

### When to bump PATCH (0.1.0 → 0.1.1):
- Bug fixes
- Documentation updates
- CI/CD improvements
- Dependency updates (non-breaking)
- Security patches

### When to bump MINOR (0.1.0 → 0.2.0):
- New features
- UI/UX improvements
- Minor breaking changes (acceptable in 0.x)
- Significant refactoring
- New API endpoints

### When to bump MAJOR (0.1.0 → 1.0.0):
- First stable release
- Major breaking changes
- Complete redesign
- Platform changes

## Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature (triggers MINOR bump)
- `fix:` Bug fix (triggers PATCH bump)
- `docs:` Documentation only
- `style:` Formatting, missing semi-colons
- `refactor:` Code change that neither fixes bug nor adds feature
- `perf:` Performance improvement
- `test:` Adding missing tests
- `chore:` Maintenance, dependencies, version bumps
- `ci:` CI/CD changes
- `build:` Build system changes

## CI/CD Pipeline

### On push to `develop`:
- Install dependencies
- Type check
- Lint
- Run tests
- Build packages

### On push to `main` (or tag):
- All of the above PLUS:
- Deploy web app to GitHub Pages
- (Future) Deploy worker to Cloudflare

### Manual deployment:
```bash
# Deploy web app
pnpm --filter web build
# Manual upload to GitHub Pages if needed

# Deploy worker
pnpm --filter worker deploy
```

## Hotfix Procedure

For critical bugs in production (`main` branch):

1. Create hotfix branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug
   ```

2. Fix bug and test:
   ```bash
   pnpm -r test
   pnpm build
   ```

3. Bump patch version:
   ```bash
   pnpm version patch --no-git-tag-version
   git add package.json
   git commit -m "fix: critical bug description"
   ```

4. Merge to both `main` and `develop`:
   ```bash
   # Merge to main
   git checkout main
   git merge --no-ff hotfix/critical-bug
   git push origin main
   
   # Merge to develop
   git checkout develop
   git merge --no-ff hotfix/critical-bug
   git push origin develop
   ```

5. Create tag for release:
   ```bash
   git tag -a v0.1.1 -m "Hotfix v0.1.1"
   git push origin v0.1.1
   ```

## Package Version Management

This is a monorepo with multiple packages:
- `@natal-chart/core` - Calculation engine
- `@natal-chart/web` - React web application
- `@natal-chart/worker` - Cloudflare Worker
- `@natal-chart/mobile` - React Native (future)

**Version sync policy**: All packages share the same version number for simplicity. When releasing, update all `package.json` files to the same version.

## Rollback Procedure

If a release causes issues:

1. **GitHub Pages**: Revert to previous deployment via GitHub Pages settings
2. **Cloudflare Worker**: Use wrangler rollback or deploy previous version
3. **Git**: Revert merge commit and force push (only in emergencies):
   ```bash
   git revert <merge-commit-sha> --no-edit
   git push origin main
   ```

 ## Quality Gates

Before any release:
- [ ] All tests pass
- [ ] No linting errors
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Manual smoke test of critical paths (see below)
- [ ] Coordinate detection working
- [ ] OpenStreetMap validation link functional
- [ ] Geocoding proxy operational
- [ ] Chart calculation works with sample data

### Manual Smoke Test Steps

Run these tests locally before merging release PR:

1. **Start development server**:
   ```bash
   pnpm --filter web dev
   ```
   Open http://localhost:3000 in browser

2. **Test birth data form**:
   - Verify default values (London, 1990-06-15, 12:00) pre-filled
   - Click "Search" button for city search (should show mock results)
   - Select a city from dropdown (should populate coordinates/timezone)
   - Verify coordinate display updates
   - For coordinate input: enter "51.5074, -0.1278" and validate OpenStreetMap link appears

3. **Test chart calculation**:
   - Click "Calculate Natal Chart" (should navigate to /chart)
   - Verify chart wheel renders with planets, houses, aspects
   - Check zodiac degree markings (small ticks, 5° medium ticks, sign boundaries)
   - Verify house cusp degree display shows exact degree/minute
   - Verify chart information overlay shows birth data

4. **Test geocoding proxy**:
   - In worker package directory: `pnpm --filter worker dev`
   - Verify worker starts on http://localhost:8787
   - Test endpoint: `curl "http://localhost:8787/geocode?q=London"` (should return mock data)

5. **Test localStorage persistence**:
   - After calculating chart, refresh page
   - Verify form pre-fills with saved data
   - Navigate back to chart page, verify chart loads

6. **Test responsiveness**:
   - Resize browser window, ensure chart scales appropriately
   - Check mobile view (developer tools)

7. **Verify ephemeris loading**:
   - Check browser console for WASM loading messages
   - No errors related to swisseph-wasm or ephemeris files

### Automated Smoke Test Script

Create `scripts/smoke-test.sh` for CI (future enhancement):

---

*Last updated: $(date +%Y-%m-%d)*