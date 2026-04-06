from playwright.async_api import Page
from typing import List, Dict
import re
import json

# Patterns for common secrets
SECRET_PATTERNS = [
    (r'AIza[0-9A-Za-z\-_]{35}', 'Google API Key', 'critical'),
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key', 'critical'),
    (r'sk-[a-zA-Z0-9]{48}', 'OpenAI API Key', 'critical'),
    (r'sk_live_[0-9a-zA-Z]{24,}', 'Stripe Live Secret Key', 'critical'),
    (r'pk_live_[0-9a-zA-Z]{24,}', 'Stripe Live Publishable Key', 'high'),
    (r'ghp_[0-9a-zA-Z]{36}', 'GitHub Personal Access Token', 'critical'),
    (r'ghs_[0-9a-zA-Z]{36}', 'GitHub App Token', 'critical'),
    (r'-----BEGIN RSA PRIVATE KEY-----', 'RSA Private Key', 'critical'),
    (r'-----BEGIN PRIVATE KEY-----', 'Private Key', 'critical'),
    (r'mongodb\+srv://[^\s"\']+', 'MongoDB Connection String', 'critical'),
    (r'postgres://[^\s"\']+', 'PostgreSQL Connection String', 'critical'),
    (r'mysql://[^\s"\']+', 'MySQL Connection String', 'critical'),
    (r'redis://[^\s"\']+', 'Redis Connection String', 'high'),
    (r'["\']?firebase["\']?\s*:\s*["\'][A-Za-z0-9_-]{20,}', 'Firebase Config', 'high'),
    (r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', 'Bearer Token in Source', 'high'),
    (r'(?i)api[_-]?key["\']?\s*[:=]\s*["\'][A-Za-z0-9_\-]{16,}', 'Generic API Key', 'high'),
    (r'(?i)secret["\']?\s*[:=]\s*["\'][A-Za-z0-9_\-]{8,}', 'Generic Secret', 'medium'),
]

class SecretScanner:
    def __init__(self, page: Page):
        self.page = page

    async def scan(self) -> List[Dict]:
        results = []
        findings = []

        # Get all script sources
        scripts = await self.page.evaluate('''() => {
            const scripts = Array.from(document.querySelectorAll("script"));
            return scripts.map(s => ({
                src: s.src || "inline",
                content: s.src ? "" : s.textContent?.slice(0, 50000) || ""
            }));
        }''')

        # Scan inline scripts
        for script in scripts:
            content = script.get('content', '')
            if not content:
                continue

            for pattern, name, severity in SECRET_PATTERNS:
                matches = re.findall(pattern, content)
                if matches:
                    # Redact the actual secret value
                    sample = matches[0][:20] + '...' if len(matches[0]) > 20 else matches[0]
                    findings.append(f'{name} found in inline script (sample: {sample})')

        # Fetch and scan external JS files
        js_urls = await self.page.evaluate('''() => {
            return Array.from(document.querySelectorAll("script[src]"))
                .map(s => s.src)
                .filter(src => src.startsWith(window.location.origin))
                .slice(0, 10);
        }''')

        for js_url in js_urls:
            try:
                response = await self.page.goto(js_url, timeout=10000)
                if response and response.ok:
                    content = await response.text()
                    for pattern, name, severity in SECRET_PATTERNS:
                        matches = re.findall(pattern, content)
                        if matches:
                            sample = matches[0][:20] + '...' if len(matches[0]) > 20 else matches[0]
                            findings.append(f'{name} found in {js_url.split("/")[-1]} (sample: {sample})')
                # Navigate back
                await self.page.go_back()
            except Exception:
                continue

        if findings:
            results.append({
                'id': 'SA030',
                'name': 'Secret / API Key Exposure in JavaScript',
                'status': 'failed',
                'severity': 'critical',
                'what': f'{len(findings)} secret(s) found in client-side JavaScript: {" | ".join(findings[:5])}',
                'why': 'Secrets exposed in JavaScript are visible to every user and can be used to access your backend systems, databases and third-party services',
                'how': 'Move all secrets to server-side environment variables. Use public/restricted API keys for client-side code only. Rotate any exposed keys immediately',
            })
        else:
            results.append({
                'id': 'SA030',
                'name': 'Secret / API Key Exposure in JavaScript',
                'status': 'passed',
                'severity': 'info',
                'what': 'No secrets or API keys detected in client-side JavaScript',
                'why': 'Exposed secrets give attackers full access to your backend services',
                'how': 'No action required — continue using environment variables for secrets',
            })

        return results
