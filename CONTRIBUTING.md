# Contributing to QA Detective

Welcome to the team. This document explains everything you need to know to contribute effectively.

---

## First Steps

1. Read the [README.md](README.md) fully — understand the architecture before touching code
2. Follow the Getting Started section to set up your local environment
3. Ask to be added to the GitHub repository
4. Pick up an issue assigned to you from the GitHub Issues board

---

## Branching Strategy

We use a simplified Git Flow:
```
main          ← Production only. Never commit here directly.
  └── develop ← Integration branch. All features merge here first.
        ├── feature/your-feature-name
        ├── fix/bug-description
        └── chore/task-description
```

### Rules

- **Never push directly to `main` or `develop`**
- Always create a branch from `develop`
- Open a Pull Request to merge back into `develop`
- At least one review required before merging

### Creating a Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

---

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):
```
type(scope): short description

Examples:
feat(dashboard): add live progress indicator
fix(executor): handle timeout on slow SPAs
docs(readme): update installation steps
test(crawler): add unit tests for form extraction
chore(deps): update playwright to 1.44
refactor(reporter): extract score calculation to utils
```

**Types:** `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`

---

## Pull Request Process

1. Make sure your branch is up to date with `develop`
2. Run through the checklist before opening a PR:
   - Code works locally end to end
   - No console errors or TypeScript errors (`pnpm type-check`)
   - Commit messages follow the convention above
3. Open a PR against `develop` — never against `main`
4. Fill in the PR template
5. Request a review from the relevant code owner

---

## Code Style

- **TypeScript strict mode** is enabled — no `any` types
- **Prettier** handles formatting — run `pnpm format` before committing
- **ESLint** handles linting — run `pnpm lint` before committing
- Use `async/await` not `.then()` chains
- Always handle errors explicitly — no silent catches
- Every exported function needs a TypeScript return type

---

## Package Ownership

Before modifying a package, understand what it does:

| Package | What it does | Key file |
|---|---|---|
| `packages/crawler` | Visits URLs with Playwright, extracts links/forms/errors | `src/index.ts` |
| `packages/ai-engine` | Sends crawl data to Groq AI, returns structured test plan | `src/planner.ts` |
| `packages/executor` | Runs test cases with Playwright, returns pass/fail results | `src/index.ts` |
| `packages/reporter` | Sends results to Groq AI, returns detective report | `src/index.ts` |
| `apps/api` | Express server, BullMQ worker, PostgreSQL queries | `src/index.ts` |
| `apps/dashboard` | Next.js frontend (in development) | `src/app/page.tsx` |

---

## Environment Setup

Follow the README Getting Started section exactly. If something doesn't work, check:

1. Are all env variables exported in your shell (`echo $DATABASE_URL`)?
2. Is Docker running and are containers healthy (`docker compose ps`)?
3. Did you run `pnpm install` from the root after pulling?
4. Did you install Playwright deps (`npx playwright install-deps chromium`)?

---

## Getting Help

- Check existing GitHub Issues before asking
- If stuck for more than 30 minutes, ask in the team chat
- Never merge something you don't fully understand

---

## Scripts Reference

Run all of these from the **root** of the repository:

| Command | When to use |
|---|---|
| `pnpm run type-check` | Before every commit — checks all packages |
| `pnpm run check:all` | Before opening a PR — full type check + build |
| `pnpm run build` | Verify everything compiles to dist/ |
| `pnpm run dev` | Local development — starts all watchers |

### Single package checks

If you're only working on one package, run its check directly to save time:
```bash
# Only check the package you're working on
pnpm run type-check --filter @qa-detective/executor

# Check everything once you're done
pnpm run type-check
```

### Pre-PR checklist — run these in order
```bash
# 1. Type check everything
pnpm run type-check

# 2. Make sure it builds
pnpm run build

# 3. If both pass — open your PR
```

If either command fails, fix the errors before opening the PR. The CI will catch the same errors and block the merge anyway — better to catch them locally first.
