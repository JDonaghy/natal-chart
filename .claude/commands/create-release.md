Prepare and publish a release for the natal chart application. Follow these steps in order:

## 1. Determine version bump
- Read the current version from the root `package.json`
- Review all commits on `develop` since the last release tag (`git log main..develop --oneline`)
- Decide PATCH (bug fixes only), MINOR (new features), or MAJOR (breaking changes) per RELEASE.md rules

## 2. Run quality gates
- `pnpm -r test` — all tests must pass
- `pnpm --filter web typecheck` — no TypeScript errors
- `pnpm --filter web build` — production build succeeds
- `pnpm --filter web lint` — no lint errors

## 3. Bump version
- Update `"version"` in ALL 5 package.json files (root, core, web, worker, mobile) to the new version

## 4. Update documentation
Review and update these markdown files for the new release:

- **PLAN.md** — Mark completed features with `[x]`, update sprint name/status, move remaining items to planned
- **STATUS.md** — Update version number, deployment status, "What Works" checklist, and known issues. Remove stale session-specific details
- **SESSION_HISTORY.md** — Add a new session entry at the bottom (above the footer line) documenting features completed, technical improvements, and notes for this release
- **BUGS.md** — Mark any resolved bugs, add any new known issues discovered during this work

Do NOT update RELEASE.md, ARCHITECTURE.md, README.md, or CLAUDE.md unless their content is factually wrong.

## 5. Commit and push
- Stage all changed files (package.json files + updated markdown + code changes)
- Commit with message: `chore: bump version to X.Y.Z` if version-only, or a descriptive `feat:`/`fix:` message if code changes are included
- Push to `develop`

## 6. Create PR to main
- `gh pr create --base main --head develop` with a summary of changes, test plan, and checklist
- Report the PR URL

## 7. After PR is merged (remind the user)
Tell the user to run these commands after merging:
```
git checkout main && git pull
git tag v<VERSION> && git push origin v<VERSION>
```
