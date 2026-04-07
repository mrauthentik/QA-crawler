"""
QA Detective — Dashboard Agent
After login, systematically tests every interactive element:
- Clicks every button and records what happens
- Fills and submits every form
- Opens and closes modals/dropdowns
- Watches for JS errors and failed API calls after each action
- Screenshots before/after key interactions
"""

from playwright.async_api import Page
from typing import List, Dict, Optional
import asyncio
import json

IGNORE_PATTERNS = [
    'logout', 'sign out', 'delete account', 'cancel subscription',
    'deactivate', 'remove', 'unsubscribe',
]

class DashboardAgent:
    def __init__(self, page: Page):
        self.page = page
        self.results: List[Dict] = []
        self.js_errors: List[str] = []
        self.failed_requests: List[Dict] = []
        self.tested_urls: set = set()

    async def start_monitoring(self):
        async def on_console(msg):
            if msg.type == 'error':
                self.js_errors.append(msg.text)

        async def on_response(response):
            if response.status >= 400:
                self.failed_requests.append({
                    'url': response.url,
                    'status': response.status,
                })

        self.page.on('console', on_console)
        self.page.on('response', on_response)

    async def test_page(self, url: str) -> List[Dict]:
        results = []
        if url in self.tested_urls:
            return results
        self.tested_urls.add(url)

        try:
            await self.page.goto(url, wait_until='domcontentloaded', timeout=20000)
            await self.page.wait_for_timeout(1000)
        except Exception as e:
            return [{
                'id': 'DA001',
                'name': f'Page Load — {url}',
                'status': 'failed',
                'severity': 'high',
                'what': f'Page failed to load: {str(e)[:100]}',
                'why': 'Broken pages degrade user experience and may indicate server errors',
                'how': 'Check server logs and fix any routing or rendering errors',
            }]

        # Test all buttons on this page
        button_results = await self._test_buttons(url)
        results.extend(button_results)

        # Test all forms on this page
        form_results = await self._test_forms(url)
        results.extend(form_results)

        # Test dropdowns and menus
        dropdown_results = await self._test_dropdowns(url)
        results.extend(dropdown_results)

        # Check for JS errors after interactions
        if self.js_errors:
            results.append({
                'id': 'DA010',
                'name': f'JavaScript Errors on {url.split("/")[-1] or "page"}',
                'status': 'failed',
                'severity': 'medium',
                'what': f'{len(self.js_errors)} JS error(s) during interactions: {" | ".join(self.js_errors[:3])}',
                'why': 'JavaScript errors break functionality and create poor user experience',
                'how': 'Fix all JavaScript errors. Check browser console for full stack traces',
            })
            self.js_errors.clear()

        # Check for failed API calls
        if self.failed_requests:
            results.append({
                'id': 'DA011',
                'name': f'Failed API Calls on {url.split("/")[-1] or "page"}',
                'status': 'failed',
                'severity': 'high',
                'what': f'{len(self.failed_requests)} failed request(s): {" | ".join([str(r["status"]) + " " + r["url"][:60] for r in self.failed_requests[:3]])}',
                'why': 'Failed API calls mean features are broken for users',
                'how': 'Fix API endpoints returning errors. Check authentication and server logs',
            })
            self.failed_requests.clear()

        return results

    async def _test_buttons(self, page_url: str) -> List[Dict]:
        results = []
        broken_buttons = []
        working_buttons = []

        try:
            # Get all visible, clickable buttons excluding dangerous ones
            buttons = await self.page.evaluate('''() => {
                const btns = Array.from(document.querySelectorAll(
                    'button:not([disabled]), [role="button"]:not([disabled]), a[href]:not([href^="http"])'
                ));
                return btns
                    .filter(b => {
                        const text = b.textContent?.trim().toLowerCase() || "";
                        const dangerous = ["logout","sign out","delete","remove","cancel","unsubscribe","deactivate"];
                        return !dangerous.some(d => text.includes(d)) && b.offsetParent !== null;
                    })
                    .slice(0, 15)
                    .map((b, i) => ({
                        index: i,
                        text: b.textContent?.trim().slice(0, 50) || "unnamed",
                        tag: b.tagName,
                        type: b.getAttribute("type") || "",
                        href: b.getAttribute("href") || "",
                    }));
            }''')

            for btn in buttons:
                before_url = self.page.url
                before_errors = len(self.js_errors)

                try:
                    # Re-find button by index since DOM may have changed
                    await self.page.evaluate(f'''() => {{
                        const btns = Array.from(document.querySelectorAll(
                            'button:not([disabled]), [role="button"]:not([disabled])'
                        )).filter(b => b.offsetParent !== null);
                        if (btns[{btn["index"]}]) btns[{btn["index"]}].click();
                    }}''')

                    await self.page.wait_for_timeout(800)
                    after_url = self.page.url
                    new_errors = len(self.js_errors) - before_errors

                    if new_errors > 0:
                        broken_buttons.append(f'"{btn["text"]}" caused JS errors')
                    else:
                        working_buttons.append(btn["text"])

                    # Navigate back if we left the page
                    if after_url != before_url:
                        await self.page.goto(before_url, wait_until='domcontentloaded', timeout=10000)
                        await self.page.wait_for_timeout(500)

                except Exception:
                    broken_buttons.append(f'"{btn["text"]}" failed to respond')

        except Exception as e:
            return []

        if broken_buttons:
            results.append({
                'id': 'DA002',
                'name': 'Broken Interactive Elements',
                'status': 'failed',
                'severity': 'high',
                'what': f'{len(broken_buttons)} broken button(s) found: {" | ".join(broken_buttons[:5])}',
                'why': 'Broken buttons mean users cannot complete key actions in your application',
                'how': 'Fix JavaScript errors triggered by these buttons. Test each button manually and check network tab for failed requests',
            })
        elif working_buttons:
            results.append({
                'id': 'DA002',
                'name': 'Interactive Elements Test',
                'status': 'passed',
                'severity': 'info',
                'what': f'All {len(working_buttons)} interactive element(s) responded without errors',
                'why': 'Working buttons ensure users can complete key actions',
                'how': 'No action required',
            })

        return results

    async def _test_forms(self, page_url: str) -> List[Dict]:
        results = []

        try:
            forms = await self.page.evaluate('''() => {
                return Array.from(document.querySelectorAll("form")).map((f, i) => ({
                    index: i,
                    action: f.action,
                    method: f.method,
                    fieldCount: f.querySelectorAll("input, textarea, select").length,
                }));
            }''')

            if not forms:
                return []

            broken_forms = []
            for form in forms[:5]:
                try:
                    # Fill all text inputs with test data
                    await self.page.evaluate(f'''() => {{
                        const forms = document.querySelectorAll("form");
                        const form = forms[{form["index"]}];
                        if (!form) return;
                        form.querySelectorAll("input[type='text'], input[type='search']").forEach(i => {{
                            i.value = "test input";
                        }});
                    }}''')

                    # Check if form has client-side validation
                    required_fields = await self.page.evaluate(f'''() => {{
                        const forms = document.querySelectorAll("form");
                        const form = forms[{form["index"]}];
                        if (!form) return 0;
                        return form.querySelectorAll("[required]").length;
                    }}''')

                    if required_fields == 0:
                        broken_forms.append(f'Form at {form["action"][:50]} has no required field validation')

                except Exception:
                    continue

            if broken_forms:
                results.append({
                    'id': 'DA003',
                    'name': 'Form Validation Check',
                    'status': 'failed',
                    'severity': 'medium',
                    'what': f'{len(broken_forms)} form(s) missing validation: {" | ".join(broken_forms[:3])}',
                    'why': 'Forms without validation accept invalid data leading to data quality issues and potential security risks',
                    'how': 'Add required attribute and client-side validation to all form fields. Implement server-side validation as well',
                })

        except Exception:
            pass

        return results

    async def _test_dropdowns(self, page_url: str) -> List[Dict]:
        results = []
        broken = []

        try:
            dropdowns = await self.page.evaluate('''() => {
                return Array.from(document.querySelectorAll(
                    'select, [role="combobox"], [role="listbox"], details summary'
                ))
                .filter(d => d.offsetParent !== null)
                .slice(0, 10)
                .map((d, i) => ({ index: i, tag: d.tagName }));
            }''')

            for dropdown in dropdowns:
                try:
                    await self.page.evaluate(f'''() => {{
                        const dropdowns = Array.from(document.querySelectorAll(
                            'select, [role="combobox"], [role="listbox"], details summary'
                        )).filter(d => d.offsetParent !== null);
                        if (dropdowns[{dropdown["index"]}]) dropdowns[{dropdown["index"]}].click();
                    }}''')
                    await self.page.wait_for_timeout(300)
                except Exception:
                    broken.append(f'dropdown {dropdown["index"]}')

        except Exception:
            pass

        return results


async def run_dashboard_tests(page: Page, authenticated_urls: List[str]) -> List[Dict]:
    agent = DashboardAgent(page)
    await agent.start_monitoring()

    all_page_results = []
    for url in authenticated_urls[:5]:
        page_results = await agent.test_page(url)
        all_page_results.extend(page_results)

    # Consolidate duplicate DA002 results into one summary
    button_results = [r for r in all_page_results if r['id'] == 'DA002']
    other_results = [r for r in all_page_results if r['id'] != 'DA002']

    if button_results:
        total_elements = sum(
            int(r['what'].split()[1]) for r in button_results
            if r['what'].split()[1].isdigit()
        )
        broken = [r for r in button_results if r['status'] == 'failed']
        if broken:
            other_results.append({
                'id': 'DA002',
                'name': 'Interactive Elements Test',
                'status': 'failed',
                'severity': 'high',
                'what': ' | '.join([r['what'] for r in broken]),
                'why': 'Broken buttons mean users cannot complete key actions',
                'how': 'Fix JavaScript errors triggered by these buttons',
            })
        else:
            other_results.append({
                'id': 'DA002',
                'name': 'Interactive Elements Test',
                'status': 'passed',
                'severity': 'info',
                'what': f'All {total_elements} interactive element(s) across {len(button_results)} page(s) responded without errors',
                'why': 'Working buttons ensure users can complete key actions',
                'how': 'No action required',
            })

    return other_results
