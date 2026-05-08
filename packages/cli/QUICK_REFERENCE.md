# QA Detective - Quick Reference Card

## Installation
```bash
npm install -g qa-detective-cli
export NGROK_AUTHTOKEN=your_token  # Get from https://dashboard.ngrok.com
```

## Common Commands

### Scan External URL
```bash
qa-detective scan https://myapp.com
```

### Scan Localhost (Auto Tunnel)
```bash
qa-detective scan http://localhost:3000
```

### With Authentication
```bash
qa-detective scan https://myapp.com \
  --auth-email user@example.com \
  --auth-password yourpassword
```

### Save Reports
```bash
# JSON
qa-detective scan https://myapp.com -o report.json

# PDF
qa-detective scan https://myapp.com -o report.pdf -f pdf
```

### Specific Checks
```bash
qa-detective scan https://myapp.com -c security,performance
```

### Custom Headers
```bash
qa-detective scan https://myapp.com \
  --header "Authorization: Bearer token" \
  --header "X-Custom: value"
```

### Use Python Agent (Deep Analysis)
```bash
qa-detective scan https://myapp.com --local
```

### CI/CD (Fail on Issues)
```bash
qa-detective scan https://myapp.com --fail-on critical
# Exits with code 1 if critical issues found
```

### Use Custom Tunnel
```bash
qa-detective scan http://localhost:3000 \
  --public-url https://my-tunnel.example.com
```

## Environment Variables

```bash
# ngrok token (most important)
export NGROK_AUTHTOKEN=your_token

# API token (if using authenticated API)
export QA_DETECTIVE_TOKEN=your_api_token

# Tunnel provider
export QA_DETECTIVE_TUNNEL_PROVIDER=ngrok  # or localtunnel

# Custom API URL
export QA_DETECTIVE_API_URL=http://localhost:5000
```

## All Options

| Option | Short | Value | Default | Notes |
|--------|-------|-------|---------|-------|
| auth-email | -e | email | - | For login |
| auth-password | -p | pass | - | For login |
| auth-login-url | -l | url | - | Custom login |
| output | -o | file | - | Save results |
| format | -f | json/pdf | json | Report format |
| checks | -c | list | all | Comma-separated |
| max-pages | -m | number | 10 | Pages to scan |
| timeout | -t | ms | 30000 | Page load timeout |
| header | -H | text | - | HTTP headers |
| fail-on | - | severity | - | Exit code 1 if found |
| token | - | token | - | API authentication |
| local | - | - | false | Use Python agent |
| public-url | - | url | - | Custom tunnel |
| tunnel-provider | - | ngrok/lt/cf | ngrok | Tunnel choice |

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Connection refused: localtunnel.me" | `export NGROK_AUTHTOKEN=...` then retry |
| "NGROK_AUTHTOKEN not set" | Get token from https://dashboard.ngrok.com |
| "Could not connect to API" | Check `QA_DETECTIVE_API_URL` environment variable |
| "Timeout" | Increase with `--timeout 60000` |
| "Python not found" (--local) | Install Python 3.8+: `brew install python@3.11` |

## Performance Tips

- Use external URL instead of localhost (no tunnel overhead)
- Reduce max-pages: `--max-pages 2` for quick scans
- Use specific checks: `-c security` instead of all checks
- Run in parallel: Multiple instances with different URLs

## Examples

### Development
```bash
qa-detective scan http://localhost:3000 \
  --output dev-report.json \
  --max-pages 3
```

### Production Check
```bash
qa-detective scan https://myapp.com \
  --fail-on critical \
  --checks security,performance
```

### Authentication
```bash
qa-detective scan https://myapp.com \
  --auth-email test@example.com \
  --auth-password testpass123 \
  --output authenticated-report.pdf \
  --format pdf
```

### CI/CD
```bash
qa-detective scan $STAGING_URL \
  --token $QA_DETECTIVE_TOKEN \
  --fail-on critical,high \
  --output ci-report.json
```

### Local Deep Analysis
```bash
qa-detective scan https://myapp.com \
  --local \
  --output deep-analysis.json
```

## Getting Help

```bash
qa-detective --help
qa-detective scan --help

# Detailed docs
# https://github.com/mrauthentik/QA-crawler/packages/cli/PRODUCTION_SETUP.md
```

## Setup Script

```bash
bash setup.sh
# Interactive setup for ngrok and qa-detective
```
