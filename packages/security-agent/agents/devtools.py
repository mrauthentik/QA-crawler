from playwright.async_api import Page
from typing import List, Dict
import json

class DevToolsAgent:
    def __init__(self, page: Page):
        self.page = page
        self.network_requests: List[Dict] = []
        self.console_errors: List[str] = []
        self.responses: List[Dict] = []

    async def start_monitoring(self):
        # Monitor all network requests
        async def on_request(request):
            self.network_requests.append({
                'url': request.url,
                'method': request.method,
                'headers': dict(request.headers),
                'resource_type': request.resource_type,
            })

        async def on_response(response):
            try:
                headers = dict(response.headers)
                self.responses.append({
                    'url': response.url,
                    'status': response.status,
                    'headers': headers,
                })
            except Exception:
                pass

        async def on_console(msg):
            if msg.type == 'error':
                self.console_errors.append(msg.text)

        self.page.on('request', on_request)
        self.page.on('response', on_response)
        self.page.on('console', on_console)

    async def analyze(self) -> List[Dict]:
        results = []

        # Check console errors
        if self.console_errors:
            results.append({
                'id': 'SA020',
                'name': 'Browser Console Errors',
                'status': 'failed',
                'severity': 'medium',
                'what': f'{len(self.console_errors)} console error(s) detected: {" | ".join(self.console_errors[:3])}',
                'why': 'Console errors indicate JavaScript failures that degrade user experience and may expose internal implementation details',
                'how': 'Fix all JavaScript errors before deploying to production. Check browser console for full stack traces',
            })
        else:
            results.append({
                'id': 'SA020',
                'name': 'Browser Console Errors',
                'status': 'passed',
                'severity': 'info',
                'what': 'No console errors detected during page load',
                'why': 'Clean console indicates stable JavaScript execution',
                'how': 'No action required',
            })

        # Check for API requests without auth headers
        api_requests = [r for r in self.network_requests
                       if any(x in r['url'] for x in ['/api/', '/graphql', '/v1/', '/v2/'])
                       and r['method'] in ['POST', 'PUT', 'DELETE', 'PATCH']]

        unauth_api = [r for r in api_requests
                     if 'authorization' not in r['headers']
                     and 'x-api-key' not in r['headers']
                     and 'cookie' not in r['headers']]

        if unauth_api:
            results.append({
                'id': 'SA021',
                'name': 'Unauthenticated API Requests',
                'status': 'failed',
                'severity': 'critical',
                'what': f'{len(unauth_api)} API mutation request(s) sent without authentication headers: {", ".join([r["url"] for r in unauth_api[:3]])}',
                'why': 'Unauthenticated API endpoints allow anyone to modify data without authorization',
                'how': 'Add Authorization header or session cookie validation to all mutation endpoints',
            })

        # Check for sensitive data in request URLs
        sensitive_patterns = ['password', 'token', 'secret', 'key', 'api_key', 'access_token']
        leaked_urls = []
        for req in self.network_requests:
            url_lower = req['url'].lower()
            for pattern in sensitive_patterns:
                if f'{pattern}=' in url_lower:
                    leaked_urls.append(req['url'][:100])
                    break

        if leaked_urls:
            results.append({
                'id': 'SA022',
                'name': 'Sensitive Data in URLs',
                'status': 'failed',
                'severity': 'critical',
                'what': f'Sensitive parameters found in {len(leaked_urls)} URL(s): {", ".join(leaked_urls[:2])}',
                'why': 'Sensitive data in URLs is logged by servers, proxies and browser history — easily leaked',
                'how': 'Move sensitive parameters to POST request body or Authorization header, never query strings',
            })

        # Check response times for performance insights
        slow_responses = [r for r in self.responses
                         if r.get('status', 200) >= 400]

        if slow_responses:
            results.append({
                'id': 'SA023',
                'name': 'HTTP Error Responses Detected',
                'status': 'failed',
                'severity': 'medium',
                'what': str(len(slow_responses)) + ' HTTP error response(s) during page load: ' + ', '.join([str(r["status"]) + ' ' + r["url"][:60] for r in slow_responses[:3]]),
                'why': 'HTTP errors during page load indicate broken resources or failed API calls that degrade user experience',
                'how': 'Fix or remove broken resource references. Check server logs for root cause of API errors',
            })

        return results
