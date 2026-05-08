# 🧪 Testing & Publishing: Quick Start

## ❌ NO - Don't publish to npm immediately!

## ✅ YES - Test locally first using `npm link`

---

## 5-Minute Local Testing

### Step 1: Build
```bash
cd packages/cli
npm install  # Install dependencies (includes Jest)
npm run build
```

### Step 2: Link Globally
```bash
npm link
# Now 'qa-detective' works globally!
```

### Step 3: Test It
```bash
# Test external URL
qa-detective scan https://example.com

# Test localhost
export NGROK_AUTHTOKEN=3CiPAE7IOIEMPWvRIUykRylta2G_6TR6AoEk69i9hnjFxwvAi
qa-detective scan http://localhost:3000

# Test report generation
qa-detective scan https://example.com -o test-report.json

# Test help
qa-detective --help
```

### Step 4: Run Tests
```bash
# All tests
npm run test:all

# Just unit tests
npm test

# Just smoke tests  
npm run test:smoke

# Watch mode (auto-rerun on changes)
npm run test:watch
```

### Step 5: Verify Everything Works
```bash
# If all tests pass ✓
# You're ready to publish!

# First, unlink the local version
npm unlink -g qa-detective-cli
```

---

## What Tests Do

### ✅ Unit Tests
- URL detection (localhost, 127.0.0.1, etc.)
- Port extraction
- Security finding formats

**Run:** `npm test`

### ✅ Snapshot Tests
- Ensures output format never changes unexpectedly
- Stored in `test/__snapshots__/`

**Run:** `npm test -- security-scanner.snapshot.test.ts`

**Update after intentional changes:** `npm run test:snapshot`

### ✅ Smoke Tests
- Basic CLI functionality
- Ensures build works
- Verifies output structure

**Run:** `npm run test:smoke`

### ✅ All Tests
- Everything together

**Run:** `npm run test:all`

---

## Publishing Flow

```
┌─────────────────────────────────────────┐
│ 1. npm run build                        │
│    (Compile TypeScript → JavaScript)    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ 2. npm test && npm run test:smoke       │
│    (Run all tests)                      │
│    ✓ All pass?                          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ 3. npm link → test locally              │
│    qa-detective scan ...                │
│    ✓ Works?                             │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ 4. npm version patch                    │
│    (Updates package.json version)       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ 5. npm publish                          │
│    (Publishes to npm registry)          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ 6. npm install -g qa-detective-cli      │
│    (Users can now install it!)          │
└─────────────────────────────────────────┘
```

---

## Complete Commands

### Local Testing (Right Now!)
```bash
# Install & setup
cd packages/cli
npm install

# Build
npm run build

# Link globally
npm link

# Test it works
qa-detective scan https://example.com

# Run test suite
npm run test:all

# Cleanup
npm unlink -g qa-detective-cli
```

### Publishing (After Tests Pass)
```bash
cd packages/cli

# Update version (1.3.0 → 1.3.1)
npm version patch

# Publish to npm
npm publish

# Verify
npm info qa-detective-cli

# Users install with:
npm install -g qa-detective-cli@latest
```

---

## Snapshot Testing Explained

### What Are Snapshots?

Snapshots are "saved outputs" that ensure CLI behavior doesn't change unexpectedly.

**First run:**
```bash
npm test -- security-scanner.snapshot.test.ts
# Creates: test/__snapshots__/security-scanner.snapshot.test.ts.snap
# Content: Exact JSON of findings structure
```

**Later runs:**
```bash
npm test
# Compares current output with saved snapshot
# ✓ PASS = Output unchanged
# ✗ FAIL = Output changed (you must review & approve)
```

### When to Update Snapshots

**DO update snapshots:**
```bash
# After intentional changes to output format
npm run test:snapshot
```

**DON'T blindly update snapshots:**
```bash
# Always review changes first!
git diff test/__snapshots__/
```

---

## Real Example: Testing Your Changes

### Scenario: You added a new security check

```bash
# 1. Add code to nodeSecurityScanner.ts
# 2. Build
npm run build

# 3. Run tests - they fail (new output doesn't match snapshot)
npm test
# ✗ FAIL: security finding format changed

# 4. Review the difference
npm test -- --verbose
# Shows what changed

# 5. If it's correct, update snapshot
npm run test:snapshot

# 6. Tests pass now
npm test
# ✓ PASS

# 7. Verify locally
npm link
qa-detective scan https://example.com

# 8. Commit changes
git add test/__snapshots__/
git commit -m "Add new security check: XYZ detection"
```

---

## Test Coverage

```bash
# Run tests with coverage report
npm test -- --coverage

# Shows:
# ✓ 85% of functions covered
# ✓ 92% of lines covered
# ✓ Coverage threshold: 50% (passing)
```

---

## Troubleshooting

### "Command not found: qa-detective"
```bash
# Did you npm link?
npm link

# Is it linked?
which qa-detective
# Should show: /usr/local/bin/qa-detective
```

### "Tests fail: MODULE NOT FOUND"
```bash
# Install dependencies
npm install

# Rebuild
npm run build

# Retry tests
npm test
```

### "Snapshots don't match"
```bash
# This is expected when output format changes
# Review the diff first
npm test -- --verbose

# If changes are intentional:
npm run test:snapshot

# Commit the snapshot changes
git add test/__snapshots__/
```

### "npm publish fails"
```bash
# Did you build?
npm run build

# Did you update version?
npm version patch

# Are you logged in to npm?
npm whoami
# If not: npm login

# Then publish
npm publish
```

---

## Current Status

✅ Code ready  
✅ Tests configured (Jest + snapshots)  
✅ Build working  
⏳ Ready for your local testing!

---

## Next Steps

1. **Test locally** (5 minutes):
   ```bash
   npm run build && npm link
   qa-detective scan https://example.com
   ```

2. **Run tests** (1 minute):
   ```bash
   npm run test:all
   ```

3. **Publish** (when ready):
   ```bash
   npm version patch && npm publish
   ```

4. **Users install**:
   ```bash
   npm install -g qa-detective-cli@latest
   ```

---

## Documentation

- 📖 **[TESTING.md](TESTING.md)** - Comprehensive testing guide
- 📦 **[PRODUCTION_SETUP.md](../cli/PRODUCTION_SETUP.md)** - For end users
- 🏗️ **[ARCHITECTURE.md](../cli/ARCHITECTURE.md)** - System design
- ⚡ **[QUICK_REFERENCE.md](../cli/QUICK_REFERENCE.md)** - Commands cheatsheet

---

## Summary

```bash
# DON'T
npm publish  # ❌ Without testing first

# DO
npm run build        # ✓ Build
npm run test:all     # ✓ Test
npm link             # ✓ Test locally
qa-detective ...     # ✓ Verify works
npm unlink           # ✓ Cleanup
npm publish          # ✓ Publish
```

**Ready?** Start testing: `npm run build && npm link`
