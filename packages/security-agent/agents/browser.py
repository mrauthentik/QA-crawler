from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from typing import Optional, List, Dict

EMAIL_SELECTORS = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[id="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="username" i]',
]

PASSWORD_SELECTORS = [
    'input[type="password"]',
    'input[name="password"]',
    'input[id="password"]',
]

SUBMIT_SELECTORS = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Login")',
    'button:has-text("Log in")',
    'button:has-text("Continue")',
]

class BrowserAgent:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            user_agent='Mozilla/5.0 (compatible; QADetective-SecurityAgent/1.0)',
        )
        self.page = await self.context.new_page()
        return self

    async def __aexit__(self, *args):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def navigate(self, url: str):
        await self.page.goto(url, wait_until='networkidle', timeout=30000)

    async def login(self, login_url: str, email: str, password: str) -> bool:
        try:
            await self.page.goto(login_url, wait_until='domcontentloaded', timeout=20000)

            # Dismiss cookie banners / popups that block clicks
            cookie_selectors = [
                'button:has-text("Accept")',
                'button:has-text("Accept All")',
                'button:has-text("Allow")',
                'button:has-text("Got it")',
                'button:has-text("OK")',
                'button:has-text("Close")',
                'button:has-text("Dismiss")',
                '[aria-label="Close"]',
                '[data-testid="cookie-accept"]',
                '.cookie-accept',
                '#cookie-accept',
            ]
            for sel in cookie_selectors:
                try:
                    btn = await self.page.query_selector(sel)
                    if btn and await btn.is_visible():
                        await btn.click(timeout=3000)
                        await self.page.wait_for_timeout(500)
                        break
                except Exception:
                    continue

            # Find email field
            email_selector = None
            for sel in EMAIL_SELECTORS:
                if await self.page.query_selector(sel):
                    email_selector = sel
                    break

            # Find password field
            password_selector = None
            for sel in PASSWORD_SELECTORS:
                if await self.page.query_selector(sel):
                    password_selector = sel
                    break

            # Find submit button
            submit_selector = None
            for sel in SUBMIT_SELECTORS:
                if await self.page.query_selector(sel):
                    submit_selector = sel
                    break

            if not email_selector or not password_selector or not submit_selector:
                return False

            await self.page.fill(email_selector, email)
            await self.page.fill(password_selector, password)
            # Remove any fixed overlays blocking the click (cookie banners etc)
            await self.page.evaluate('''() => {
                const overlays = document.querySelectorAll(
                    '[class*="fixed"][class*="bottom"], [class*="fixed"][class*="z-50"], ' +
                    '[class*="cookie"], [class*="consent"], [class*="banner"], ' +
                    '[class*="toast"], [class*="notification"], [class*="popup"]'
                );
                overlays.forEach(el => el.remove());
            }''')
            await self.page.wait_for_timeout(300)

            # Try normal click, then JS click, then dispatch event
            try:
                await self.page.click(submit_selector, timeout=5000, force=True)
            except Exception:
                try:
                    await self.page.evaluate(f'''() => {{
                        const btn = document.querySelector('{submit_selector}');
                        if (btn) btn.click();
                    }}''')
                except Exception:
                    await self.page.dispatch_event(submit_selector, 'click')

            await self.page.wait_for_load_state('domcontentloaded')

            # Check if still on login page
            current_url = self.page.url
            return current_url != login_url

        except Exception:
            return False

    async def check_cookies(self) -> List[Dict]:
        results = []
        cookies = await self.context.cookies()

        insecure_cookies = []
        for cookie in cookies:
            issues = []
            if not cookie.get('httpOnly'):
                issues.append('missing HttpOnly flag (accessible via JavaScript)')
            if not cookie.get('secure'):
                issues.append('missing Secure flag (sent over HTTP)')
            if not cookie.get('sameSite') or cookie.get('sameSite') == 'None':
                issues.append('missing SameSite flag (CSRF risk)')

            if issues:
                insecure_cookies.append(f"{cookie['name']}: {', '.join(issues)}")

        if insecure_cookies:
            results.append({
                'id': 'SA010',
                'name': 'Cookie Security Flags',
                'status': 'failed',
                'severity': 'high',
                'what': f'{len(insecure_cookies)} insecure cookie(s) found: {" | ".join(insecure_cookies[:3])}',
                'why': 'Insecure cookies can be stolen via XSS attacks or sent over unencrypted connections, exposing user sessions',
                'how': 'Set HttpOnly, Secure, and SameSite=Strict flags on all session cookies',
            })
        else:
            results.append({
                'id': 'SA010',
                'name': 'Cookie Security Flags',
                'status': 'passed',
                'severity': 'info',
                'what': f'All {len(cookies)} cookie(s) have proper security flags',
                'why': 'Secure cookies protect user sessions from theft',
                'how': 'No action required',
            })

        return results

    async def check_mixed_content(self) -> List[Dict]:
        # Check for HTTP resources on HTTPS page
        is_https = self.base_url.startswith('https')
        if not is_https:
            return [{
                'id': 'SA011',
                'name': 'Mixed Content Check',
                'status': 'skipped',
                'severity': 'info',
                'what': 'Site is not using HTTPS — mixed content check skipped',
                'why': 'Mixed content only applies to HTTPS pages',
                'how': 'Migrate to HTTPS first',
            }]

        mixed = await self.page.evaluate('''() => {
            const resources = performance.getEntriesByType("resource");
            return resources
                .filter(r => r.name.startsWith("http://"))
                .map(r => r.name)
                .slice(0, 5);
        }''')

        if mixed:
            return [{
                'id': 'SA011',
                'name': 'Mixed Content Check',
                'status': 'failed',
                'severity': 'medium',
                'what': f'Found {len(mixed)} HTTP resource(s) on HTTPS page: {", ".join(mixed[:3])}',
                'why': 'Mixed content allows attackers to intercept or modify HTTP resources, compromising page security',
                'how': 'Update all resource URLs to use HTTPS or protocol-relative URLs (//)',
            }]

        return [{
            'id': 'SA011',
            'name': 'Mixed Content Check',
            'status': 'passed',
            'severity': 'info',
            'what': 'No mixed content found — all resources loaded over HTTPS',
            'why': 'Mixed content compromises HTTPS security',
            'how': 'No action required',
        }]
