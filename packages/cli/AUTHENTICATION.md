# QA Detective CLI — Authentication Guide

## Overview

QA Detective CLI supports two authentication methods:

1. **Browser-Based OAuth Login** (Recommended for users)
2. **Token-Based Authentication** (Recommended for CI/CD)

## Browser-Based OAuth Login

### How It Works

When you run `qa-detective login`, the CLI initiates a **device flow OAuth** process:

1. CLI requests a device code from the auth service
2. Browser opens to an approval page (or you visit the URL manually)
3. You enter your email and password on the web form
4. Auth service approves the request
5. CLI receives a token and saves it to `~/.qa-detective/credentials.json`

### Setup

```bash
qa-detective login
```

You'll see:
```
🔐 Browser login initiated:
   Code: ABC123
   URL: http://localhost:3002/auth/device?userCode=ABC123
```

### Stored Credentials

After login, credentials are saved to:
```
~/.qa-detective/credentials.json
```

File contents:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "user@example.com",
  "name": "John Doe",
  "expiresAt": 1715252400000,
  "refreshToken": "optional"
}
```

**Security**: File is stored with `0o600` permissions (read/write for owner only)

### Commands

```bash
# Login
qa-detective login

# Check current user
qa-detective whoami
# Output: John Doe (john@example.com)

# Logout (clears credentials)
qa-detective logout
```

### Usage After Login

Once logged in, credentials are automatically used:

```bash
qa-detective scan https://myapp.com
# No --token needed!
```

## Token-Based Authentication

For CI/CD environments or when you prefer explicit tokens:

### Method 1: Command Line Flag

```bash
qa-detective scan https://myapp.com --token your_token_here
```

### Method 2: Environment Variable

```bash
export QA_DETECTIVE_TOKEN=your_token_here
qa-detective scan https://myapp.com
```

### Method 3: GitHub Actions

```yaml
name: QA Scan
on: [push]
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v3
      - run: npm install -g qa-detective-cli
      - name: Run QA Scan
        env:
          QA_DETECTIVE_TOKEN: ${{ secrets.QA_DETECTIVE_TOKEN }}
        run: qa-detective scan https://myapp.com --fail-on critical
```

### Method 4: GitLab CI

```yaml
qa_scan:
  image: node:18
  script:
    - npm install -g qa-detective-cli
    - qa-detective scan https://myapp.com --fail-on critical
  variables:
    QA_DETECTIVE_TOKEN: $CI_QA_DETECTIVE_TOKEN
```

## Priority Order

When authentication is needed, the CLI checks credentials in this order:

1. **`--token` flag** (highest priority)
   ```bash
   qa-detective scan https://myapp.com --token my_token
   ```

2. **`QA_DETECTIVE_TOKEN` env var**
   ```bash
   export QA_DETECTIVE_TOKEN=my_token
   qa-detective scan https://myapp.com
   ```

3. **Stored credentials** (~/.qa-detective/credentials.json)
   ```bash
   # After running: qa-detective login
   qa-detective scan https://myapp.com
   ```

4. **Unauthenticated** (error)
   ```
   ✖ No authentication found
   ```

## Local Development & Testing

### Setup

1. **Start Auth Service**
   ```bash
   cd QA-crawler
   pnpm --filter @qa-detective/auth dev
   # Runs on http://localhost:3002
   ```

2. **Start API Service** (in another terminal)
   ```bash
   pnpm --filter @qa-detective/api dev
   # Runs on http://localhost:3001
   ```

3. **Create Test Account** (browser)
   - Visit: http://localhost:3002/register
   - Register with test credentials

4. **Set Environment Variables**
   ```bash
   export QA_DETECTIVE_AUTH_URL=http://localhost:3002
   export QA_DETECTIVE_API_URL=http://localhost:3001
   ```

### Testing Login Flow

```bash
qa-detective login

# Browser opens → Enter credentials → ✓ Approved
qa-detective whoami

# Should show your test account
```

### Testing Token-Based Auth

```bash
# Get token manually from auth service
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Use token for scan
export QA_DETECTIVE_TOKEN=<token_from_above>
qa-detective scan https://myapp.com
```

## Device Flow Architecture

### Device Code Flow Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                        Device Flow OAuth                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CLI → Auth Service:  POST /device-code                  │
│     "Give me a device code"                                 │
│                                                              │
│  2. Auth Service → CLI:  {deviceCode, userCode, URL}        │
│     "Here's your code"                                      │
│                                                              │
│  3. CLI:  Display URL and open browser                      │
│                                                              │
│  4. User → Browser:  GET /auth/device?userCode=ABC123       │
│     "Visit this URL with this code"                         │
│                                                              │
│  5. Browser → User:  Form for email/password                │
│                                                              │
│  6. User → Browser:  POST /approve-device                   │
│     "Submit email/password"                                 │
│                                                              │
│  7. Browser → Auth Service:  Verify credentials             │
│                                                              │
│  8. Auth Service:  Mark deviceCode as approved              │
│                                                              │
│  9. CLI:  Poll /device-token with deviceCode                │
│     "Is user approved yet?"                                 │
│                                                              │
│ 10. Auth Service → CLI:  {token, email, name}               │
│     "Yes! Here's the token"                                 │
│                                                              │
│ 11. CLI:  Save credentials locally                          │
│                                                              │
│ 12. User:  ✓ Authenticated!                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Endpoints

**Auth Service** (default: http://localhost:3002/auth)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/device-code` | POST | Generate device code |
| `/device` | GET | Browser approval page |
| `/approve-device` | POST | User submits credentials |
| `/device-token` | POST | CLI polls for token |

## Environment Variables

### CLI Configuration

```bash
# Authentication
export QA_DETECTIVE_TOKEN=your_token          # Direct token
export QA_DETECTIVE_AUTH_URL=http://localhost:3002  # Auth service (dev)

# API
export QA_DETECTIVE_API_URL=http://localhost:3001   # API service (dev)

# Tunneling
export QA_DETECTIVE_TUNNEL_PROVIDER=ngrok     # Tunnel provider
export NGROK_AUTHTOKEN=your_ngrok_token       # ngrok token
```

## Security Considerations

### ✅ Best Practices

- **Use browser login** when possible (credentials never enter terminal history)
- **Use environment variables** in CI/CD (not command-line flags)
- **Rotate tokens** regularly
- **Keep ~/.qa-detective/credentials.json safe** (don't commit, don't share)
- **Use separate CI/CD tokens** (easier to rotate if compromised)

### ⚠️ Caution

- **Never use real passwords in CLI tests**
- **Never commit `.qa-detective/credentials.json`** to git
- **Never share your auth tokens** via email/Slack/etc
- **Be careful with `--token` flag** (may appear in shell history/logs)

## Troubleshooting

### "Authentication required" Error

**Problem**: CLI says "Authentication required" but you're logged in

**Solution**:
```bash
# Check if credentials exist
cat ~/.qa-detective/credentials.json

# If missing, re-login
qa-detective login

# If it exists, verify it's not corrupted
qa-detective whoami
```

### "Device code expired" Error

**Problem**: Took too long to approve the login

**Solution**:
- Device codes expire after 10 minutes
- Run `qa-detective login` again
- Approve quickly

### Token Validation Fails

**Problem**: Token is valid but says "invalid" on scan

**Solution**:
```bash
# Check API URL is correct
echo $QA_DETECTIVE_API_URL
# Should be: http://localhost:3001 (dev) or production URL

# Test token directly
curl -H "Authorization: Bearer $QA_DETECTIVE_TOKEN" \
  http://localhost:3001/api/runs
```

### Credentials Not Found After Login

**Problem**: Logged in successfully but credentials not saved

**Solution**:
```bash
# Check file permissions
ls -la ~/.qa-detective/credentials.json

# Should have -rw------- (0o600) permissions
# If different, fix permissions:
chmod 600 ~/.qa-detective/credentials.json

# Re-login if file is corrupted
rm ~/.qa-detective/credentials.json
qa-detective login
```

## FAQ

**Q: Is my password stored?**
A: No. Only the token is stored. Your password is only sent to the browser form.

**Q: How long is the token valid?**
A: Token validity depends on your auth service configuration. Check with your admin.

**Q: Can I use multiple accounts?**
A: Currently, credentials are stored globally. Logout and login with a different account to switch.

**Q: What if I forget my password?**
A: Use the dashboard's password reset feature.

**Q: Can I use this in Docker?**
A: Yes, but you need to handle credential persistence:
```dockerfile
# Mount credentials volume
docker run -v ~/.qa-detective:/root/.qa-detective qa-detective-cli login
```

**Q: What about 2FA?**
A: Device flow currently doesn't support 2FA. Contact support for enterprise features.

## Support

- 📖 Main README: [README.md](README.md)
- 🐛 Report Issues: https://github.com/mrauthentik/QA-crawler/issues
- 📚 Full Docs: https://github.com/mrauthentik/QA-crawler/tree/develop/packages/cli
