# QA Detective CLI

[![npm version](https://img.shields.io/npm/v/qa-detective-cli.svg)](https://www.npmjs.com/package/qa-detective-cli)
[![npm downloads](https://img.shields.io/npm/dw/qa-detective-cli.svg)](https://www.npmjs.com/package/qa-detective-cli)
[![license](https://img.shields.io/npm/l/qa-detective-cli.svg)](LICENSE)

Scan your web apps for security, performance, accessibility, and more—right from your terminal or CI/CD pipeline.

## ✨ What's New

- **� Smooth OAuth Login**: Browser-based `qa-detective login` (like GitHub CLI/Supabase)
- **💾 Credential Storage**: One-time login, credentials saved locally
- **🔗 Better Tunneling**: Switched from localtunnel to **ngrok** (10x more reliable)
- **🚀 Production Ready**: Fixed tunnel errors with clear guidance
- **🐍 No Python Required**: Default flow runs on pure Node.js
- **💻 Cross-Platform**: Works on Windows, Mac, Linux without extra setup

## Features

- Security, performance, accessibility, load, and Lighthouse checks
- Authenticated and custom header support
- PDF/JSON report output
- **Works locally (localhost) or external URLs**
- **Optional Python agent for advanced security analysis**
- **Browser-based OAuth login (saves credentials)**
- Integrates with Artillery and Lighthouse for real-world testing

## Quick Start (2 Minutes)

### 1. Install

```bash
npm install -g qa-detective-cli
# or
pnpm add -g qa-detective-cli
```

### 2. Authenticate (one-time)

```bash
qa-detective login
# Opens browser → log in → credentials saved automatically
```

### 3. Scan!

```bash
# That's it! No token needed
qa-detective scan https://myapp.com
```

## Usage

### Authentication

#### Browser-Based Login (Recommended)

```bash
# First time - one-time setup
qa-detective login
# 🔐 Browser login initiated:
#    Code: ABC123
#    URL: http://localhost:3002/auth/device?userCode=ABC123
# 
# → Browser opens → Enter email/password → ✓ Authenticated!
# Credentials saved to ~/.qa-detective/credentials.json

# Check who you're logged in as
qa-detective whoami
# John Doe (john@example.com)

# Logout (clears stored credentials)
qa-detective logout
```

#### Token-Based Login (CI/CD)

```bash
# Pass token directly (for automation/CI)
qa-detective scan https://myapp.com --token your_token_here

# Or set environment variable
export QA_DETECTIVE_TOKEN=your_token_here
qa-detective scan https://myapp.com
```

### Scanning

```bash
qa-detective scan <url> [options]
```

### Examples

```bash
# ─── Initial Setup ───
qa-detective login                    # One-time browser login

# ─── Basic Scans ───
qa-detective scan https://myapp.com   # Using stored credentials

# ─── Localhost with auto-tunnel ───
qa-detective scan http://localhost:3000

# ─── Authenticated Scan (target app) ───
qa-detective scan https://myapp.com --auth-email user@site.com --auth-password pass

# ─── With custom headers ───
qa-detective scan https://myapp.com --header "Authorization: Bearer token"

# ─── Save reports ───
qa-detective scan https://myapp.com -o report.json
qa-detective scan https://myapp.com -o report.pdf -f pdf

# ─── Specific checks ───
qa-detective scan https://myapp.com -c security,performance,lighthouse --max-pages 5

# ─── Use local Python agent (optional) ───
qa-detective scan https://myapp.com --local

# ─── Custom tunnel URL ───
qa-detective scan http://localhost:3000 --public-url https://my-tunnel.example.com

# ─── CI/CD with token ───
qa-detective scan https://myapp.com --token $QA_DETECTIVE_TOKEN
```

### Options

```
-e, --auth-email <email>           Login email for authenticated scans
-p, --auth-password <password>     Login password
-l, --auth-login-url <url>         Custom login page URL
-o, --output <file>                Save results to file (json/pdf)
-f, --format <format>              Output format (json|pdf, default: json)
-c, --checks <list>                Checks to run (security,performance,accessibility,load,lighthouse)
-m, --max-pages <n>                Max pages to scan (default: 10)
-t, --timeout <ms>                 Navigation timeout in ms (default: 30000)
-H, --header <header...>           Custom HTTP headers (repeatable)
--fail-on <severity>               Exit code 1 if severity found (critical|high|medium|low|info)
--token <token>                    API token (or set QA_DETECTIVE_TOKEN env)
--local                            Use local Python agent (requires Python 3.8+)
--public-url <url>                 Use custom tunnel URL for localhost
--tunnel-provider <provider>       Tunnel: ngrok (default), localtunnel, cloudflare
```

## Testing Locally

Want to test the complete flow before using in production?

### 1. Start the Auth Service

```bash
cd QA-crawler
pnpm --filter @qa-detective/auth dev
# Runs on http://localhost:3002
```

### 2. Create a Test Account (in browser)

Visit `http://localhost:3002/register` and create an account:
- Email: `test@example.com`
- Password: `Test123!@#`
- Name: `Test User`

### 3. Test Login Flow

```bash
# Set local auth URL
export QA_DETECTIVE_AUTH_URL=http://localhost:3002
export QA_DETECTIVE_API_URL=http://localhost:3001

# Start the API service (in another terminal)
pnpm --filter @qa-detective/api dev
# Runs on http://localhost:3001

# Now test CLI login
qa-detective login

# You should see:
# 🔐 Browser login initiated:
#    Code: ABC123
#    URL: http://localhost:3002/auth/device?userCode=ABC123
#
# → Browser opens
# → Enter test@example.com / Test123!@#
# → ✓ Authenticated!

# Verify credentials saved
qa-detective whoami
# Output: Test User (test@example.com)

# Test scan
qa-detective scan https://news-vision-web-info.netlify.app/
```

### 4. Cleanup

```bash
qa-detective logout
# Verify: qa-detective whoami
# Output: Not logged in. Run: qa-detective login
```

## Troubleshooting

### "Connection refused" error?

**Solution**: Use ngrok instead of localtunnel
```bash
export NGROK_AUTHTOKEN=your_token
qa-detective scan http://localhost:3000
```

### "NGROK_AUTHTOKEN not set"?

1. Get free token: https://dashboard.ngrok.com
2. Set it: `export NGROK_AUTHTOKEN=your_token`

### Need Python for deep security analysis?

```bash
# Install Python 3.8+
brew install python@3.11  # macOS
sudo apt install python3.11  # Linux

# Then use --local flag
qa-detective scan https://myapp.com --local
```

## Advanced Setup

See **[PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)** for:
- All tunnel options (ngrok, localtunnel, Cloudflare)
- Environment variables
- Docker usage
- CI/CD integration
- Performance tips

## CI/CD Integration

### GitHub Actions

```yaml
name: QA Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g qa-detective-cli
      - env:
          QA_DETECTIVE_TOKEN: ${{ secrets.QA_DETECTIVE_TOKEN }}
        run: qa-detective scan https://myapp.com --fail-on critical
```

### GitLab CI

```yaml
qa_scan:
  image: node:18
  script:
    - npm install -g qa-detective-cli
    - qa-detective scan https://myapp.com --fail-on critical
  variables:
    QA_DETECTIVE_TOKEN: $CI_QA_DETECTIVE_TOKEN
```

## Environment Variables

```bash
# API token
export QA_DETECTIVE_TOKEN=your_token

# ngrok token
export NGROK_AUTHTOKEN=your_token

# Tunnel provider (default: ngrok)
export QA_DETECTIVE_TUNNEL_PROVIDER=ngrok

# API URL (default: production)
export QA_DETECTIVE_API_URL=https://qa-detective-api-production.up.railway.app
```

## Advanced

- **Load testing**: Install [Artillery](https://artillery.io/): `npm install -g artillery`
- **Lighthouse checks**: Install [Lighthouse](https://github.com/GoogleChrome/lighthouse): `npm install -g lighthouse`
- **Custom checks**: Add custom Python checks in `security-agent/` directory

## Support

- 📖 **Setup Guide**: [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)
- � **Auth Guide**: [AUTHENTICATION.md](AUTHENTICATION.md)
- �🐛 **Report Issues**: https://github.com/mrauthentik/QA-crawler/issues
- 📚 **Main Repo**: https://github.com/mrauthentik/QA-crawler

## License

MIT

---

⚠️ **Caution**: Use test credentials only—never your real password
