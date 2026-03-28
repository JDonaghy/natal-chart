# Agent Guidelines for Natal Chart Application

This document provides essential information for AI coding agents working on this natal chart astrology application.

## Project Overview

**Type**: Monorepo natal chart calculation and visualization application  
**Architecture**: Serverless-first, browser-based calculations using WebAssembly  
**Deployment**: GitHub Pages (web), Cloudflare Workers (geocoding proxy)  
**Package Manager**: pnpm with workspaces

### Monorepo Structure
```
natal-chart/
  packages/
    core/       # Pure TypeScript calculation engine (swisseph-wasm wrapper)
    web/        # Vite + React application
    worker/     # Cloudflare Worker for geocoding proxy
    mobile/     # React Native (future)
```

## Build, Test & Development Commands

### Initial Setup
```bash
# Install pnpm if not available
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Development
```bash
# Run web app in development mode
pnpm --filter web dev

# Run worker locally (requires wrangler)
pnpm --filter worker dev
# or: wrangler dev (from packages/worker directory)

# Run all tests across workspace
pnpm -r test

# Run tests in specific package
pnpm --filter core test
pnpm --filter web test

# Run single test file (adjust based on test framework)
pnpm --filter core test -- path/to/test.spec.ts
pnpm --filter web test -- --run path/to/component.test.tsx
```

### Building & Deployment
```bash
# Build for production
pnpm build

# Build specific package
pnpm --filter web build

# Deploy to GitHub Pages (automated via CI)
pnpm deploy
```

### Linting & Formatting
```bash
# Lint all packages
pnpm -r lint

# Format code
pnpm -r format

# Type check
pnpm -r typecheck
```

## Code Style Guidelines

### TypeScript

- **Strict mode**: All packages use strict TypeScript (`strict: true`)
- **No `any` types**: Full type safety required - use `unknown` if type is truly unknown
- **Prefer interfaces over types** for public APIs and data structures
- **Explicit return types** on all exported functions
- **Avoid type assertions** (`as`) unless absolutely necessary

Example:
```typescript
// Good
interface BirthData {
  dateTimeUtc: Date;
  latitude: number;
  longitude: number;
  houseSystem: 'P' | 'W' | 'K';
}

export async function calculateChart(data: BirthData): Promise<ChartResult> {
  // implementation
}

// Bad
export async function calculateChart(data: any) {
  // implementation
}
```

### Imports

- **Monorepo imports**: Use workspace protocol
  ```typescript
  // In packages/web
  import { calculateChart, type BirthData } from '@natal-chart/core';
  ```
- **Group and order imports**:
  1. External dependencies (`react`, `swisseph-wasm`)
  2. Workspace packages (`@natal-chart/core`)
  3. Relative imports (`./components`, `../utils`)
  4. Type-only imports last or inline with `type` keyword
  
- **Named imports preferred** over default imports for consistency
- **Avoid barrel exports** that re-export everything - be explicit

### Naming Conventions

- **Files**: `kebab-case.ts`, `PascalCase.tsx` (for React components)
- **Components**: `PascalCase` (e.g., `ChartWheel`, `BirthDataForm`)
- **Functions/variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` for true constants
- **Types/Interfaces**: `PascalCase`
- **Enums**: `PascalCase` for name, `PascalCase` for members

### Error Handling

- **Always handle WASM loading errors** - swisseph-wasm is critical dependency
- **Validate user input** before calculations
- **Use typed errors** - create custom error classes when appropriate
  ```typescript
  class EphemerisLoadError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'EphemerisLoadError';
    }
  }
  ```
- **Graceful degradation**: Handle offline scenarios gracefully
- **Worker errors**: Return proper HTTP status codes with error messages
- **Never swallow errors silently** - always log or propagate

### React Patterns

- **Functional components only** - no class components
- **Hooks**: Use built-in hooks; custom hooks for shared logic
- **Props**: Define explicit prop interfaces
  ```typescript
  interface ChartWheelProps {
    chartData: ChartResult;
    size?: number;
    onPlanetClick?: (planet: PlanetPosition) => void;
  }
  ```
- **Event handlers**: Prefix with `handle` (e.g., `handleSubmit`, `handlePlanetClick`)
- **State management**: Use React state/context; avoid external state libraries initially

### Formatting

- **Indentation**: 2 spaces
- **Line length**: 100 characters (soft limit)
- **Semicolons**: Required
- **Quotes**: Single quotes for strings, double quotes for JSX attributes
- **Trailing commas**: Yes (in objects, arrays, function parameters)

## Critical Implementation Notes

### HIGHEST PRIORITY: swisseph-wasm Validation

**Before implementing any features, validate swisseph-wasm works correctly.**

This is the riskiest dependency. Create a spike test:
```typescript
// Test that ephemeris loads and calculates correctly
const sunPosition = await calculatePlanetPosition({
  planet: 'sun',
  dateTimeUtc: new Date('1990-06-15T12:00:00Z'),
  latitude: 51.5,
  longitude: -0.1,
});
// Verify against known chart service
```

**Ephemeris File Setup**:
- Place `.se1` files in `packages/web/public/ephemeris/`
- Configure Vite to serve with correct MIME type
- Files must be co-located with WASM binary in production

### GitHub Pages Configuration

**Required Vite config**:
```typescript
// vite.config.ts
export default defineConfig({
  base: '/natal-chart/', // Must match repository name
  // ... other config
});
```

**Routing**: Use hash-based routing (`createHashRouter`) to avoid SPA routing issues on GitHub Pages.

### Cloudflare Worker Constraints

- **Thin proxy only** - just geocoding, no business logic
- **Validate Turnstile tokens** before processing requests
- **Rate limiting**: 10 requests/minute per IP
- **KV cache**: 30-day TTL for geocoding results
- **CORS**: Restrict to GitHub Pages domain only

### Chart Rendering Challenges

**Planet glyph collision detection** is the most complex rendering task:
- Planets within ~5° overlap visually
- Implement angular offset algorithm to nudge glyphs
- SVG coordinate system: 0° Aries at 9 o'clock, counter-clockwise
- Ascendant always positioned at 9 o'clock (left side)

## Visual Design Standards

- **Aesthetic**: Classic/traditional astrology (parchment and gold)
- **Background**: Warm parchment `#F5F0E8` or cream
- **Lines**: Fine gold stroke `#B8860B` or `#D4AF37`
- **Typography**: Serif fonts (IM Fell English, Crimson Text, or Cormorant)
- **Symbols**: Unicode astrological glyphs (☉ ☽ ♂ ♃ ♀ ☿ ♄)
- **Aspect colors**: Blue (trines), red (squares), green (sextiles)

## Development Workflow

### First-Time Setup Priority

1. Initialize git repository and create GitHub repo
2. Set up pnpm workspace with all packages
3. **SPIKE: Validate swisseph-wasm** (highest risk item)
4. Implement `packages/core` calculation engine
5. Build birth data form with geocoding
6. Implement SVG chart wheel rendering
7. Add planet glyphs with collision detection
8. Add aspect lines
9. Configure GitHub Actions for auto-deployment
10. Add localStorage persistence and shareable URLs

### Git Commits

- **Conventional commits**: Use prefixes (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Atomic commits**: One logical change per commit
- **Descriptive messages**: Focus on "why" not just "what"

### Testing Strategy

- **Unit tests**: All calculation logic in `packages/core`
- **Integration tests**: WASM loading and ephemeris access
- **Component tests**: React components with React Testing Library
- **E2E tests**: Critical user flows (birth data → chart rendering)
- **Validation tests**: Compare calculations against known chart services

## Release & Git Workflow

### Branch Strategy
- **main**: Production-ready code only. Deploys automatically via GitHub Actions.
- **develop**: Default development branch. All feature work happens here.
- **feature/***: Short-lived branches for specific features.
- **release/***: Release preparation branches.

### Workflow Rules
1. **Never push directly to `main`** - use PRs from `develop`
2. **All PRs must pass CI** (build, test, lint, typecheck)
3. **Version bump required** for PRs to `main`
4. **Use conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`, etc.
5. **Test locally before PR**: `pnpm -r test && pnpm -r lint && pnpm build`

### Release Process
1. **Develop on `develop`** branch
2. **Verify functionality locally** (tests, build, manual smoke test)
3. **Bump version** in `package.json` files (patch/minor/major)
4. **Create PR to `main`** with release notes
5. **Merge PR** (squash or merge commit, not rebase)
6. **Tag release** after merge: `git tag v0.1.1 && git push origin v0.1.1`
7. **Deployment happens automatically** via GitHub Actions

### Agent Instructions
- Always work on `develop` branch unless fixing critical bug in `main`
- Before creating PR to `main`, ensure:
  - Version incremented according to semantic versioning
  - RELEASE.md updated if process changes
  - All quality gates pass (see RELEASE.md)
- Use `gh pr create` for PR creation with proper title/description
- Reference RELEASE.md for detailed versioning rules

## Common Pitfalls

1. **Don't skip swisseph-wasm validation** - this is where projects fail
2. **Remember the base path** for GitHub Pages in Vite config
3. **Hash routing is mandatory** for v1 (can migrate later with custom domain)
4. **Ephemeris files must be in public folder** - not imported as modules
5. **Worker needs Turnstile validation** before processing any requests
6. **Planet collision detection** requires careful SVG geometry math
