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

async def run(url: str, auth_email: str = None, auth_password: str = None, auth_login_url: str = None, checks: str = None, max_pages: int = None, timeout: int = 30000, headers: list = None) -> dict:
    import time
    import requests
    import importlib.util
    results = []
    enabled_checks = [c.strip() for c in checks.split(',')] if checks else []
    # Accessibility check (real logic using axe-core via playwright-axe)
    if not enabled_checks or 'accessibility' in enabled_checks:
        try:
            from playwright_axe import Axe
            async with BrowserAgent(url) as agent_acc:
                await agent_acc.navigate(url)
                axe = Axe(agent_acc.page)
                await axe.inject()
                results_axe = await axe.run()
                violations = results_axe.get('violations', [])
                if violations:
                    for v in violations:
                        results.append({
                            'id': f'ACX-{v.get("id", "")}',
                            'name': v.get('help', 'Accessibility Violation'),
                            'status': 'failed',
                            'severity': 'high',
                            'what': v.get('description', ''),
                            'why': v.get('helpUrl', ''),
                            'how': ', '.join([n.get('message', '') for n in v.get('nodes', [])]),
                        })
                else:
                    results.append({
                        'id': 'AC001',
                        'name': 'Accessibility Check',
                        'status': 'passed',
                        'severity': 'info',
                        'what': 'No accessibility violations found',
                        'why': 'Axe-core scan passed',
                        'how': 'axe-core automated scan',
                    })
        except Exception as e:
            results.append({
                'id': 'ACERR',
                'name': 'Accessibility Check Error',
                'status': 'failed',
                'severity': 'high',
                'what': f'Accessibility check failed: {e}',
                'why': 'axe-core or playwright-axe not installed or error occurred',
                'how': 'pip install playwright-axe',
            })

    # Load check (real logic: run Artillery if available)
    if not enabled_checks or 'load' in enabled_checks:
        import subprocess
        try:
            # Write a minimal Artillery config
            import tempfile, os, yaml
            config = {
                'config': {'target': url, 'phases': [{'duration': 5, 'arrivalRate': 1}]},
                'scenarios': [{'flow': [{'get': {'url': '/'}}]}]
            }
            tmp = tempfile.NamedTemporaryFile('w+', delete=False, suffix='.yml')
            yaml.dump(config, tmp)
            tmp.close()
            # Run Artillery
            proc = subprocess.run(['artillery', 'run', tmp.name], capture_output=True, text=True, timeout=30)
            os.unlink(tmp.name)
            if proc.returncode == 0:
                results.append({
                    'id': 'LD001',
                    'name': 'Artillery Load Test',
                    'status': 'passed',
                    'severity': 'info',
                    'what': 'Artillery load test completed',
                    'why': 'Artillery ran successfully',
                    'how': proc.stdout[:500],
                })
            else:
                results.append({
                    'id': 'LDERR',
                    'name': 'Artillery Load Test',
                    'status': 'failed',
                    'severity': 'high',
                    'what': f'Artillery failed: {proc.stderr}',
                    'why': 'Artillery error',
                    'how': 'Check Artillery installation',
                })
        except Exception as e:
            results.append({
                'id': 'LDERR',
                'name': 'Artillery Load Test Error',
                'status': 'failed',
                'severity': 'high',
                'what': f'Artillery load test failed: {e}',
                'why': 'Artillery not installed or error',
                'how': 'npm install -g artillery',
            })

    # Lighthouse check (real logic: run Lighthouse CLI if available)
    if not enabled_checks or 'lighthouse' in enabled_checks:
        import subprocess
        try:
            proc = subprocess.run(['lighthouse', url, '--output=json', '--output-path=lhreport.json', '--quiet', '--chrome-flags=--headless'], capture_output=True, text=True, timeout=60)
            if proc.returncode == 0:
                with open('lhreport.json', 'r') as f:
                    lh_json = json.load(f)
                score = lh_json.get('categories', {}).get('performance', {}).get('score', 0) * 100
                results.append({
                    'id': 'LH001',
                    'name': 'Lighthouse Performance',
                    'status': 'passed' if score >= 80 else 'failed',
                    'severity': 'info' if score >= 80 else 'high',
                    'what': f'Lighthouse performance score: {score}',
                    'why': 'Lighthouse CLI run',
                    'how': 'lighthouse --output=json',
                })
            else:
                results.append({
                    'id': 'LHERR',
                    'name': 'Lighthouse Check',
                    'status': 'failed',
                    'severity': 'high',
                    'what': f'Lighthouse failed: {proc.stderr}',
                    'why': 'Lighthouse error',
                    'how': 'Check Lighthouse installation',
                })
        except Exception as e:
            results.append({
                'id': 'LHERR',
                'name': 'Lighthouse Check Error',
                'status': 'failed',
                'severity': 'high',
                'what': f'Lighthouse check failed: {e}',
                'why': 'Lighthouse not installed or error',
                'how': 'npm install -g lighthouse',
            })

    # Custom check: run user script custom_check.py if present
    if not enabled_checks or 'custom' in enabled_checks:
        try:
            import os
            custom_path = os.path.join(os.path.dirname(__file__), 'custom_check.py')
            if os.path.exists(custom_path):
                spec = importlib.util.spec_from_file_location('custom_check', custom_path)
                custom_mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(custom_mod)
                if hasattr(custom_mod, 'run_custom_check'):
                    custom_result = custom_mod.run_custom_check(url=url, headers=headers)
                    results.append(custom_result)
                else:
                    results.append({
                        'id': 'CUERR',
                        'name': 'Custom Check',
                        'status': 'failed',
                        'severity': 'high',
                        'what': 'custom_check.py missing run_custom_check()',
                        'why': 'No run_custom_check function',
                        'how': 'Define run_custom_check(url, headers)',
                    })
            else:
                results.append({
                    'id': 'CU001',
                    'name': 'Custom Check',
                    'status': 'skipped',
                    'severity': 'info',
                    'what': 'No custom_check.py found',
                    'why': 'No custom check script present',
                    'how': 'Add custom_check.py with run_custom_check()',
                })
        except Exception as e:
            results.append({
                'id': 'CUERR',
                'name': 'Custom Check Error',
                'status': 'failed',
                'severity': 'high',
                'what': f'Custom check failed: {e}',
                'why': 'Exception in custom check',
                'how': 'Debug custom_check.py',
            })

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

        # Security checks (default if no --checks or if 'security' is present)
        if not enabled_checks or 'security' in enabled_checks:
            devtools_agent = DevToolsAgent(agent.page)
            await devtools_agent.start_monitoring()
            await agent.navigate(url)
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

            # Cookie security
            cookie_results = await agent.check_cookies()
            results.extend(cookie_results)

            # Mixed content
            mixed_results = await agent.check_mixed_content()
            results.extend(mixed_results)

        # Dashboard/performance checks (if requested and authenticated)
        if (not enabled_checks or 'performance' in enabled_checks) and auth_email and auth_password:
            # Get list of pages to test from crawled links
            all_links = await agent.page.evaluate('''() => {
                return Array.from(document.querySelectorAll("a[href]"))
                    .map(a => a.href)
                    .filter(h => h.startsWith(window.location.origin));
            }''')
            page_list = [url] + all_links
            if max_pages:
                page_list = page_list[:max_pages]
            dashboard_results = await run_dashboard_tests(agent.page, page_list)
            results.extend(dashboard_results)

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
    parser.add_argument('--checks', help='Comma-separated checks to run (e.g., security,performance)', default=None)
    parser.add_argument('--max-pages', type=int, help='Max pages to scan ', default=None)
    parser.add_argument('--timeout', type=int, help='Navigation/HTTP timeout in ms', default=30000)
    parser.add_argument('--header', action='append', help='Custom HTTP header (repeatable)', default=None)
    args = parser.parse_args()

    result = asyncio.run(run(
        args.url,
        auth_email=args.auth_email,
        auth_password=args.auth_password,
        auth_login_url=args.auth_login_url,
        checks=args.checks,
        max_pages=args.max_pages,
        timeout=args.timeout,
        headers=args.header
    ))

    # Output JSON to stdout for Node.js to consume
    print(json.dumps(result, indent=2))
