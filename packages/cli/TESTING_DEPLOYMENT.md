# CLI Authentication Testing & Deployment Guide

## 🎯 What's Changed

### Frontend (Dashboard) - ❌ NO CHANGES NEEDED
- Dashboard continues to work as-is
- Auth service gains new device flow endpoints for CLI
- Both dashboard and CLI can coexist using same auth service

### CLI - ✅ MAJOR UPDATES
- New `login` command (browser-based OAuth)
- Auto-credential loading for scans
- `logout` and `whoami` commands
- Token caching to `~/.qa-detective/credentials.json`

### Auth Service - ✅ NEW ENDPOINTS
- `POST /auth/device-code` - Generate device code
- `GET /auth/device` - Approval page
- `POST /auth/approve-device` - Credential submission
- `POST /auth/device-token` - Token polling

---

## 🧪 Testing Checklist

### Phase 1: Local Testing (5 minutes)

```bash
# Terminal 1: Start Auth Service
cd /home/uche/projects/QA-crawler
pnpm --filter @qa-detective/auth dev

# Wait for: "Auth service running at http://localhost:3002"
```

```bash
# Terminal 2: Create test account
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@qa.com",
    "name": "QA Tester",
    "password": "Test123!@#"
  }'

# Should return: {"token": "...", "user": {...}}
```

```bash
# Terminal 3: Start API Service
pnpm --filter @qa-detective/api dev

# Wait for: "API running at http://localhost:3001"
```

```bash
# Terminal 4: Set environment variables and test CLI
export QA_DETECTIVE_AUTH_URL=http://localhost:3002
export QA_DETECTIVE_API_URL=http://localhost:3001

# Test 1: Login Flow
qa-detective login

# Expected:
# 🔐 Browser login initiated:
#    Code: XYZ123
#    URL: http://localhost:3002/auth/device?userCode=XYZ123
#
# → Browser opens automatically
# → Enter: test@qa.com / Test123!@#
# → Click "Approve & Login"
# → CLI shows: ✓ Authenticated!

# Test 2: Verify credentials saved
qa-detective whoami
# Expected: QA Tester (test@qa.com)

# Test 3: Scan without --token flag
qa-detective scan https://news-vision-web-info.netlify.app/

# Expected: Should work without needing --token

# Test 4: Logout
qa-detective logout

# Test 5: Verify logged out
qa-detective whoami
# Expected: Not logged in. Run: qa-detective login
```

### Phase 2: Token-Based Auth Testing (3 minutes)

```bash
# Test CI/CD token flow
export QA_DETECTIVE_API_URL=http://localhost:3001

# Generate token directly
TOKEN=$(curl -s -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@qa.com",
    "password": "Test123!@#"
  }' | jq -r '.token')

echo "Token: $TOKEN"

# Test with --token flag
qa-detective scan https://news-vision-web-info.netlify.app/ --token $TOKEN

# Expected: Should work with explicit token
```

### Phase 3: Production Testing (Before Publishing)

```bash
# Test against production auth/api
qa-detective login
# Should connect to production auth service

# Get a real token from production
qa-detective whoami

# Test scan
qa-detective scan https://example.com
```

---

## 📋 Testing Matrix

| Scenario | Command | Expected | Status |
|----------|---------|----------|--------|
| Browser Login | `qa-detective login` | Browser opens, approval sent | ⏳ |
| Check Login | `qa-detective whoami` | Shows user email | ⏳ |
| Scan (Auto Token) | `qa-detective scan <url>` | Uses stored credentials | ⏳ |
| Scan (Explicit Token) | `qa-detective scan <url> --token X` | Uses provided token | ⏳ |
| Scan (Env Var) | `QA_DETECTIVE_TOKEN=X qa-detective scan <url>` | Uses env var | ⏳ |
| Logout | `qa-detective logout` | Clears credentials | ⏳ |
| Already Logged In | `qa-detective login` | Overwrites existing | ⏳ |
| Device Code Expiry | Wait 11 min in login | Shows "expired" error | ⏳ |
| Wrong Password | Enter bad password | Shows "invalid" error | ⏳ |
| Multiple Accounts | Login, logout, login | Switches accounts | ⏳ |

---

## 🚀 Deployment Steps

### 1. Verify Type Checking

```bash
pnpm run type-check
# Should show: All 8 packages successful
```

### 2. Rebuild CLI

```bash
cd packages/cli
pnpm run build
# Should compile without errors
```

### 3. Test Built Version Locally

```bash
npm test  # If test script exists
# OR manually test:
npm install -g file:$(pwd)
qa-detective login
qa-detective whoami
```

### 4. Publish to NPM

```bash
cd packages/cli

# Bump version
npm version patch  # 1.3.1 → 1.3.2

# Publish
npm publish --access public

# Verify on npm
npm info qa-detective-cli
# Check version and keywords
```

### 5. Publish to GitHub

```bash
cd /home/uche/projects/QA-crawler

# Commit changes (if not already done)
git add .
git commit -m "release: v1.3.2 - device flow OAuth authentication"

# Create tag
git tag -a v1.3.2 -m "Device flow OAuth for CLI"

# Push
git push origin feature/ux-improvements
git push origin v1.3.2

# Create GitHub Release
# Visit: https://github.com/mrauthentik/QA-crawler/releases/new
# Tag: v1.3.2
# Title: "CLI Authentication: Device Flow OAuth"
# Description: (copy from AUTHENTICATION.md)
```

---

## ✅ Pre-Release Checklist

- [ ] All tests pass locally
- [ ] Type checking passes: `pnpm run type-check`
- [ ] CLI builds successfully: `pnpm run build`
- [ ] Manual testing complete (all scenarios in matrix)
- [ ] README updated with new examples
- [ ] AUTHENTICATION.md created and accurate
- [ ] package.json keywords updated
- [ ] CHANGELOG entry added
- [ ] Commit messages clear and descriptive
- [ ] Version bumped appropriately
- [ ] Published to npm
- [ ] GitHub release created
- [ ] Documentation links updated (if needed)

---

## 🐛 Common Issues & Fixes

### Issue: Browser doesn't open
**Fix**: URL is displayed in terminal, visit manually

### Issue: "Device code expired"
**Fix**: Device codes expire after 10 min, run login again

### Issue: "Credentials file not found"
**Fix**: Run `qa-detective login` first

### Issue: Wrong credentials
**Fix**: Run `qa-detective logout` then `qa-detective login` again

### Issue: "Cannot reach auth service"
**Fix**: Ensure `QA_DETECTIVE_AUTH_URL` is set correctly

---

## 📝 Documentation to Update After Release

### 1. NPM Package Page
- Add authentication section to npm README preview
- Link to AUTHENTICATION.md
- Include "Browser Login" example

### 2. Main GitHub Wiki
- Add "CLI Authentication" page
- Link from main README
- Add device flow diagram

### 3. API Documentation
- Document new device flow endpoints
- Include example requests/responses
- Update auth service API docs

### 4. Release Notes
- Highlight "Breaking: Must run `qa-detective login` first"
- Show before/after comparison
- Link to migration guide

---

## 🔄 Post-Release Tasks

After successful release:

1. **Monitor npm downloads**
   ```bash
   npm info qa-detective-cli | grep downloads
   ```

2. **Check GitHub issues** for auth-related problems

3. **Update dashboard** if needed (no changes required, but good to announce)

4. **Announce in release notes**:
   - ✨ New smooth OAuth login
   - 📱 No more token copying
   - 🔒 Secure local storage
   - 🚀 Better UX for all users

---

## 🆘 Support Commands

```bash
# Check CLI version
qa-detective --version

# Get help
qa-detective --help
qa-detective login --help
qa-detective scan --help

# Debug info
ls -la ~/.qa-detective/
cat ~/.qa-detective/credentials.json

# Clear everything
qa-detective logout
rm -rf ~/.qa-detective/
```

---

## 🎓 Documentation References

- **README.md** - Quick start + examples
- **AUTHENTICATION.md** - Detailed auth guide
- **PRODUCTION_SETUP.md** - Advanced setup
- **Main GitHub** - Full project docs
