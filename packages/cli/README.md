# QA Detective CLI

[![npm version](https://img.shields.io/npm/v/qa-detective-cli.svg)](https://www.npmjs.com/package/qa-detective-cli)
[![npm downloads](https://img.shields.io/npm/dw/qa-detective-cli.svg)](https://www.npmjs.com/package/qa-detective-cli)
[![license](https://img.shields.io/npm/l/qa-detective-cli.svg)](LICENSE)
# QA Detective CLI

Scan your web apps for security, performance, accessibility, and more—right from your terminal or CI/CD pipeline.

## Features
- Security, performance, accessibility, load, and Lighthouse checks
- Authenticated and custom header support
- PDF/JSON report output
- Extensible with custom Python checks
- Integrates with Artillery and Lighthouse for real-world testing

## Installation
```bash
npm install -g qa-detective-cli
```

## Usage
```bash
qa-detective scan <url> [options]
```

### Examples
```bash
qa-detective scan https://myapp.com
qa-detective scan https://myapp.com -e user@site.com -p pass
qa-detective scan https://myapp.com -c security,performance,lighthouse,load --max-pages 5
qa-detective scan https://myapp.com -o report.json
qa-detective scan https://myapp.com -o report.pdf -f pdf
qa-detective scan https://myapp.com -H "Authorization: Bearer <token>" -t 60000
```

### Options
- `-e, --auth-email <email>`: Login email for authenticated scans
- `-p, --auth-password <password>`: Login password
- `-l, --auth-login-url <url>`: Custom login page URL
- `-o, --output <file>`: Save results to file (json/pdf)
- `-f, --format <format>`: Output format: json (default) or pdf
- `-c, --checks <list>`: Comma-separated checks to run (security,performance,accessibility,load,lighthouse,custom)
- `-m, --max-pages <n>`: Max pages to scan (default: 10)
- `-t, --timeout <ms>`: Navigation or HTTP timeout in milliseconds (default: 30000)
- `-H, --header <header...>`: Custom HTTP headers (repeatable, e.g., -H "Authorization: Bearer ...")
- `--fail-on <severity>`: Exit with code 1 if severity found (e.g., critical,high)

## Advanced
- **Load testing:** Install [Artillery](https://artillery.io/) globally: `npm install -g artillery`
- **Lighthouse checks:** Install [Lighthouse](https://github.com/GoogleChrome/lighthouse) globally: `npm install -g lighthouse`
- **Custom checks:** Add a `custom_check.py` file in your agent directory with a `run_custom_check()` function.

## CI/CD Integration
Add to your `package.json` scripts:
```json
"precommit": "qa-detective scan http://localhost:3000 --fail-on critical"
```

## License
MIT

---
[GitHub](https://github.com/mrauthentik/QA-crawler)

## Caution
Please use test credentials only — never your real password