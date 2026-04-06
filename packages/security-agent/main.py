#!/usr/bin/env python3
"""
QA Detective — Python Security Agent
Performs deep security analysis including:
- DevTools network monitoring (API leak detection)
- JavaScript secret scanning
- Cookie security flags
- Mixed content detection
- GraphQL introspection check
- CORS misconfiguration
- Console error monitoring
"""

import asyncio
import json
import sys
import argparse
from agents.browser import BrowserAgent
from agents.secret_scanner import SecretScanner
from agents.api_scanner import ApiScanner
from agents.devtools import DevToolsAgent
from agents.dashboard import run_dashboard_tests

async def run(url: str, auth_email: str = None, auth_password: str = None, auth_login_url: str = None) -> dict:
    results = []

    async with BrowserAgent(url) as agent:
        # Login if credentials provided
        if auth_email and auth_password:
            login_url = auth_login_url or url
            logged_in = await agent.login(login_url, auth_email, auth_password)
            results.append({
                'id': 'SA001',
                'name': 'Authenticated Session Test',
                'status': 'passed' if logged_in else 'failed',
                'severity': 'info' if logged_in else 'high',
                'what': f'Login {"succeeded" if logged_in else "failed"} at {login_url}',
                'why': 'Authenticated testing ensures dashboard and protected pages are tested',
                'how': 'Verify login form selectors and credentials are correct' if not logged_in else 'Authentication working correctly',
            })

        # Run all checks
        devtools_agent = DevToolsAgent(agent.page)
        await devtools_agent.start_monitoring()

        # Navigate and collect data
        await agent.navigate(url)

        # Get DevTools findings
        devtools_results = await devtools_agent.analyze()
        results.extend(devtools_results)

        # Secret scanning — check JS bundles
        secret_scanner = SecretScanner(agent.page)
        secret_results = await secret_scanner.scan()
        results.extend(secret_results)

        # API endpoint scanning
        api_scanner = ApiScanner(agent.page, devtools_agent.network_requests)
        api_results = await api_scanner.scan()
        results.extend(api_results)

        # Dashboard testing — only if authenticated
        if auth_email and auth_password:
            # Get list of pages to test from crawled links
            all_links = await agent.page.evaluate('''() => {
                return Array.from(document.querySelectorAll("a[href]"))
                    .map(a => a.href)
                    .filter(h => h.startsWith(window.location.origin))
                    .slice(0, 5);
            }''')
            dashboard_results = await run_dashboard_tests(agent.page, [url] + all_links[:4])
            results.extend(dashboard_results)

        # Cookie security
        cookie_results = await agent.check_cookies()
        results.extend(cookie_results)

        # Mixed content
        mixed_results = await agent.check_mixed_content()
        results.extend(mixed_results)

    return {
        'url': url,
        'total': len(results),
        'results': results,
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='QA Detective Security Agent')
    parser.add_argument('url', help='Target URL to scan')
    parser.add_argument('--auth-email', help='Login email', default=None)
    parser.add_argument('--auth-password', help='Login password', default=None)
    parser.add_argument('--auth-login-url', help='Login page URL', default=None)
    args = parser.parse_args()

    result = asyncio.run(run(
        args.url,
        auth_email=args.auth_email,
        auth_password=args.auth_password,
        auth_login_url=args.auth_login_url,
    ))

    # Output JSON to stdout for Node.js to consume
    print(json.dumps(result, indent=2))
