# QA Detective CLI - Production Setup Guide

## ✅ What's Fixed in Latest Version

1. **Tunnel Error Resolved** - Replaced unreliable `localtunnel` with robust `ngrok` + fallback support
2. **Better Error Messages** - Clear guidance on fixing tunnel issues
3. **Multiple Options** - Use ngrok, provide custom URL, or scan public URLs
4. **Production Ready** - Retry logic, proper async/await, async tunnel cleanup

---

## 🚀 Quick Start (3 Steps)

### 1. Install qa-detective CLI

```bash
npm install -g qa-detective-cli
# or if using yarn/pnpm
pnpm add -g qa-detective-cli
```

### 2. Get ngrok Token (Recommended - Free Tier Available)

```bash
# Visit: https://dashboard.ngrok.com/get-started/your-authtoken
# Copy your authtoken, then set it:
export NGROK_AUTHTOKEN=your_authtoken_here

# For Windows (PowerShell):
# $env:NGROK_AUTHTOKEN="your_authtoken_here"
```

### 3. Run Scan

```bash
# Scan local app (auto-creates tunnel)
qa-detective scan http://localhost:3000

# Scan with authentication
qa-detective scan http://localhost:3000 --auth-email user@example.com --auth-password pass

# Scan external URL
qa-detective scan https://myapp.com

# Save report
qa-detective scan https://myapp.com --output report.json --format json
qa-detective scan https://myapp.com --output report.pdf --format pdf

# Run specific checks
qa-detective scan https://myapp.com --checks security,performance,lighthouse
```

---

## 🔧 Configuration

### Tunnel Providers (Choose One)

#### ✅ **Option 1: ngrok (Recommended - Most Reliable)**

```bash
# 1. Get free account: https://dashboard.ngrok.com
# 2. Set authtoken:
export NGROK_AUTHTOKEN=your_token

# 3. Scan localhost
qa-detective scan http://localhost:3000
```

**Pros:**
- Most reliable & stable
- Free tier: 1 tunnel, 40 conn/min
- Excellent uptime (99.9%+)
- No firewall issues

**Cons:**
- Requires signup (free)
- Free tier has limits

---

#### ⚡ **Option 2: localtunnel (Fallback)**

```bash
# Works out of the box, no setup needed
qa-detective scan http://localhost:3000 --tunnel-provider localtunnel
```

**Pros:**
- No signup required
- Works instantly

**Cons:**
- Less reliable (your current issue)
- Higher failure rate in some regions
- Slower startup

---

#### 🌩️ **Option 3: Custom Public URL**

If you already have a tunnel (Cloudflare, SSH, etc):

```bash
# Start your own tunnel:
cloudflared tunnel --url localhost:3000

# Then use its URL:
qa-detective scan http://localhost:3000 --public-url https://your-tunnel.loca.lt
```

---

## 📦 Python Dependency (Optional, Not Required)

The CLI works **without Python** by default. Python is only needed for the `--local` flag for deep security analysis:

```bash
# Uses remote API (no Python needed)
qa-detective scan https://myapp.com

# Uses local Python agent (requires Python 3.8+)
qa-detective scan https://myapp.com --local
```

**To use `--local` flag, install Python:**

```bash
# macOS
brew install python@3.11

# Ubuntu/Debian
sudo apt-get install python3.11

# Windows
# Download from https://www.python.org/downloads/
```

---

## 🔒 Environment Variables

```bash
# Set API token (optional, for authentication)
export QA_DETECTIVE_TOKEN=your_api_token

# Set ngrok token
export NGROK_AUTHTOKEN=your_ngrok_token

# Set tunnel provider (default: ngrok)
export QA_DETECTIVE_TUNNEL_PROVIDER=ngrok

# Set API URL (default: production)
export QA_DETECTIVE_API_URL=https://qa-detective-api-production.up.railway.app
```

---

## ❌ Troubleshooting

### Error: "Connection refused: localtunnel.me"

```bash
# Solution: Use ngrok instead
export NGROK_AUTHTOKEN=your_token
qa-detective scan http://localhost:3000
```

### Error: "NGROK_AUTHTOKEN not set"

```bash
# Get free token: https://dashboard.ngrok.com
export NGROK_AUTHTOKEN=your_token
qa-detective scan http://localhost:3000
```

### Error: "Could not connect to API"

```bash
# Check API is running:
curl https://qa-detective-api-production.up.railway.app/health

# Or set custom API URL:
export QA_DETECTIVE_API_URL=http://localhost:5000
qa-detective scan https://myapp.com
```

### Tunnel works but API can't reach it

```bash
# Check tunnel is accessible:
curl $(qa-detective scan http://localhost:3000 2>&1 | grep "https://")

# If timeout, increase timeout:
qa-detective scan http://localhost:3000 --timeout 60000
```

### Python issues with `--local` flag

```bash
# Check Python installed
python3 --version

# Should output Python 3.8+
# If not, install: https://www.python.org/downloads/
```

---

## 📊 All CLI Options

```bash
qa-detective scan <url> [options]

Arguments:
  <url>                     Target URL (e.g., https://myapp.com)

Options:
  -e, --auth-email <email>          Login email for authenticated scans
  -p, --auth-password <password>    Login password for authenticated scans
  -l, --auth-login-url <url>        Custom login page URL
  -o, --output <file>               Save to file (json/pdf)
  -f, --format <format>             Output format (json|pdf, default: json)
  -c, --checks <list>               Checks to run (security,performance,accessibility,load,lighthouse)
  -m, --max-pages <n>               Max pages to scan (default: 10)
  -t, --timeout <ms>                Navigation timeout (default: 30000)
  -H, --header <header...>          Custom HTTP headers (repeatable)
  --fail-on <severity>              Exit code 1 if severity found (critical|high|medium|low|info)
  --token <token>                   API token (or set QA_DETECTIVE_TOKEN)
  --local                           Use local Python agent (requires Python 3.8+)
  --public-url <url>                Custom tunnel URL
  --tunnel-provider <provider>      Tunnel provider (ngrok|localtunnel|cloudflare, default: ngrok)
  -h, --help                        Show help
```

---

## 🐳 Docker Usage (No Local Setup Needed)

```bash
docker run -it \
  -e NGROK_AUTHTOKEN=your_token \
  -e QA_DETECTIVE_TOKEN=your_api_token \
  qa-detective-cli qa-detective scan http://localhost:3000
```

---

## 📈 Performance Tips

1. **Faster scans**: Run without Python (`--local` flag)
2. **Better tunnels**: Use ngrok (10x more stable)
3. **Parallel scans**: Create separate tunnels for each app
4. **Caching**: Results are cached by the API

---

## 🤝 Support

- **Issues**: https://github.com/mrauthentik/QA-crawler/issues
- **Docs**: https://github.com/mrauthentik/QA-crawler
- **ngrok Help**: https://ngrok.com/docs
