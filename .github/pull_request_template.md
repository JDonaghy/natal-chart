# Pull Request

## Description
<!-- Describe the purpose of this PR. For releases, summarize changes since last release. -->

## Type of Change
<!-- Mark with an x -->
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring
- [ ] Release preparation

## Release Checklist (for release PRs)
<!-- Required for PRs to main branch -->
- [ ] Version bumped in all `package.json` files (see RELEASE.md)
- [ ] All tests pass (`pnpm -r test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Type checking passes (`pnpm -r typecheck`)
- [ ] Manual smoke test completed
- [ ] Release notes prepared (update RELEASE.md or include in PR description)
- [ ] Coordinate detection feature verified
- [ ] OpenStreetMap validation link functional
- [ ] Geocoding proxy operational

## Testing
<!-- Describe how you tested these changes -->
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing performed (list scenarios)

## Screenshots/Logs
<!-- If applicable, add screenshots or logs to help explain your changes -->

## Related Issues
<!-- Link to any related issues, e.g., "Fixes #123" -->

## Deployment Notes
<!-- Any special considerations for deployment? -->

## Reviewer Checklist
- [ ] Code follows project conventions
- [ ] Tests are adequate
- [ ] Documentation updated if needed
- [ ] Version bump appropriate (semantic versioning)
- [ ] Release checklist completed (for release PRs)