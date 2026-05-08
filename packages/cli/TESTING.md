# Testing Guide: qa-detective-cli

## Overview

This document explains how to test the CLI locally before publishing to npm.

## Local Testing (Without Publishing)

### Option 1: Using `npm link` (Recommended)

`npm link` makes your local package available globally without publishing to npm.

```bash
# Step 1: Build the CLI
cd packages/cli
npm run build

# Step 2: Link it globally
npm link

# Step 3: Test from anywhere
qa-detective scan https://example.com
qa-detective scan http://localhost:3000
qa-detective --help

# Step 4: Unlink when done
npm unlink -g qa-detective-cli
```

**Pros:**
- ✅ No npm publish needed
- ✅ Changes reflect immediately after rebuild
- ✅ Works globally like installed package
- ✅ Easy cleanup

### Option 2: Running Directly

```bash
# Build
npm run build

# Run directly
node dist/index.js scan https://example.com
```

**Pros:**
- ✅ Simple, no linking
- ✅ Fast testing

**Cons:**
- ❌ Must use full path
- ❌ Doesn't test bin link

### Option 3: Using `npx`

```bash
# Build and test with npx
npm run build
npx ./packages/cli scan https://example.com
```

---

## Testing Workflow

### 1. Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Update snapshots (after intentional changes)
npm run test:snapshot
```

**What it tests:**
- ✅ Tunnel URL detection (`isLocalUrl`)
- ✅ Port extraction (`extractPort`)
- ✅ Security findings format
- ✅ Score calculation
- ✅ Report generation

### 2. Smoke Tests

```bash
# Run basic CLI smoke tests
npm run test:smoke

# Manually test before smoke test
npm run build
node dist/index.js scan https://example.com --checks security
```

**What it tests:**
- ✅ CLI builds without errors
- ✅ Basic scan works
- ✅ Output contains expected strings

### 3. Full Test Suite

```bash
# Run everything
npm run test:all

# Equivalent to:
# npm test && npm run test:smoke
```

---

## Snapshot Testing

Snapshot tests verify output format consistency.

### Running Snapshots

```bash
# Run snapshot tests
npm test -- security-scanner.snapshot.test.ts

# Update snapshots after intentional changes
npm run test:snapshot
```

### Example Snapshot

First run creates snapshot:
```
PASS test/security-scanner.snapshot.test.ts
  Security Finding Snapshots
    ✓ should match snapshot for security finding structure (2ms)

Snapshots:   1 new
```

Snapshots stored in: `test/__snapshots__/security-scanner.snapshot.test.ts.snap`

### When to Update Snapshots

Update snapshots when:
- ✅ You intentionally change security finding format
- ✅ You add new severity levels
- ✅ You refactor report structure

**NEVER** update snapshots blindly! Review changes first:

```bash
# View what changed
git diff test/__snapshots__/

# Then update if intentional
npm run test:snapshot
```

---

## Pre-Publication Checklist

Before publishing to npm:

```bash
# 1. Build
npm run build
# ✓ Should complete without errors

# 2. Run all tests
npm run test:all
# ✓ All tests should pass

# 3. Local link test
npm link
qa-detective scan https://example.com
# ✓ Should work like installed package
npm unlink -g qa-detective-cli

# 4. Check files
npm run build
ls -la dist/
# ✓ Should have index.js and all source files

# 5. Verify package.json
cat package.json | grep -A 5 '"bin"'
# ✓ Should have bin entry pointing to dist/index.js

# 6. Test edge cases
qa-detective scan http://localhost:3000 --timeout 60000
qa-detective scan https://example.com --auth-email user@example.com --auth-password pass
qa-detective scan https://example.com -o report.json
# ✓ All should work without errors
```

---

## Publishing to npm

Once all tests pass:

### Step 1: Update Version

```bash
cd packages/cli

# Patch (1.3.0 → 1.3.1)
npm version patch

# Minor (1.3.0 → 1.4.0)
npm version minor

# Major (1.3.0 → 2.0.0)
npm version major
```

### Step 2: Publish

```bash
# Public (default)
npm publish

# Check what will be published
npm publish --dry-run

# Private
npm publish --access private
```

### Step 3: Verify

```bash
# View on npm
npm info qa-detective-cli

# Install from npm (in new terminal)
npm install -g qa-detective-cli

# Test it
qa-detective scan https://example.com

# Check version
qa-detective --version
```

---

## Testing Different Scenarios

### Test External URL
```bash
qa-detective scan https://example.com
# No tunnel needed, should work immediately
```

### Test Localhost
```bash
# Start your app first
npm run dev

# In another terminal
export NGROK_AUTHTOKEN=your_token
qa-detective scan http://localhost:3000
# Should create tunnel, scan, and show results
```

### Test with Auth
```bash
qa-detective scan https://app.example.com \
  --auth-email test@example.com \
  --auth-password testpass123
# Should authenticate and scan
```

### Test Report Generation
```bash
qa-detective scan https://example.com -o report.json
# Should create report.json

qa-detective scan https://example.com -o report.pdf -f pdf
# Should create report.pdf
```

### Test Error Handling
```bash
# Test without ngrok token (should show helpful error)
unset NGROK_AUTHTOKEN
qa-detective scan http://localhost:3000
# Should show guidance on how to set token

# Test with invalid URL
qa-detective scan not-a-url
# Should show URL validation error

# Test with network error
qa-detective scan https://invalid-domain-12345.example.com
# Should show connection error
```

---

## CI/CD Testing (GitHub Actions Example)

```yaml
name: Test & Publish
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: cd packages/cli && npm ci
      - run: cd packages/cli && npm run build
      - run: cd packages/cli && npm test
      - run: cd packages/cli && npm run test:smoke
      
      - name: Publish to npm
        if: success()
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: cd packages/cli && npm publish
```

---

## Troubleshooting

### Tests fail with "module not found"

```bash
# Solution: Install dependencies
npm install

# Or in packages/cli
cd packages/cli
npm install
```

### Snapshots don't match

```bash
# View the diff
npm test -- --no-coverage --verbose

# If changes are intentional:
npm run test:snapshot
```

### Build fails

```bash
# Check TypeScript errors
npm run build

# Try cleaning and rebuilding
rm -rf dist/
npm run build
```

### CLI doesn't work after npm link

```bash
# Rebuild after code changes
npm run build

# If still broken:
npm unlink -g qa-detective-cli
npm link
```

---

## Summary

### Quick Testing Routine

```bash
# Before every commit
npm run build
npm test

# Before publishing
npm run test:all
npm link
qa-detective scan https://example.com
npm unlink -g qa-detective-cli

# Then publish
npm publish
```

### Key Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript → JavaScript |
| `npm test` | Run unit & snapshot tests |
| `npm run test:watch` | Auto-run tests on file changes |
| `npm run test:smoke` | Run basic functionality tests |
| `npm run test:all` | Run all tests |
| `npm link` | Use local package globally |
| `npm publish` | Publish to npm registry |

---

## Next Steps

1. ✅ Build: `npm run build`
2. ✅ Test: `npm run test:all`
3. ✅ Link: `npm link`
4. ✅ Manual test: `qa-detective scan https://example.com`
5. ✅ Publish: `npm publish`

All tests documented in `/test/` directory.
