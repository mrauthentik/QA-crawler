from playwright.async_api import Page
from typing import List, Dict
import json
import requests as http_requests

class ApiScanner:
    def __init__(self, page: Page, network_requests: List[Dict]):
        self.page = page
        self.network_requests = network_requests

    def _get_base_url(self, url: str) -> str:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"

    async def scan(self) -> List[Dict]:
        results = []
        page_url = self.page.url
        base_url = self._get_base_url(page_url)

        # Check GraphQL introspection
        graphql_urls = [r['url'] for r in self.network_requests
                       if 'graphql' in r['url'].lower()]

        if graphql_urls:
            graphql_url = graphql_urls[0]
            try:
                resp = http_requests.post(
                    graphql_url,
                    json={'query': '{ __schema { types { name } } }'},
                    timeout=10,
                    headers={'Content-Type': 'application/json'},
                )
                if resp.status_code == 200 and '__schema' in resp.text:
                    results.append({
                        'id': 'SA040',
                        'name': 'GraphQL Introspection Enabled',
                        'status': 'failed',
                        'severity': 'high',
                        'what': f'GraphQL introspection is enabled at {graphql_url} — full schema exposed',
                        'why': 'Introspection reveals your entire API schema to attackers, making it trivial to discover all queries, mutations and data structures',
                        'how': 'Disable introspection in production. In Apollo: set introspection: false. In most frameworks add a depth-limit rule',
                    })
                else:
                    results.append({
                        'id': 'SA040',
                        'name': 'GraphQL Introspection Check',
                        'status': 'passed',
                        'severity': 'info',
                        'what': 'GraphQL introspection is disabled in production',
                        'why': 'Introspection reveals API schema to attackers',
                        'how': 'No action required',
                    })
            except Exception:
                pass

        # Check for exposed API endpoints without auth
        api_endpoints = list(set([
            r['url'] for r in self.network_requests
            if '/api/' in r['url'] or '/v1/' in r['url'] or '/v2/' in r['url']
        ]))

        unprotected = []
        for endpoint in api_endpoints[:5]:  # Test first 5 to avoid spam
            try:
                resp = http_requests.get(endpoint, timeout=5, allow_redirects=False)
                # If we get 200 without any auth, it might be unprotected
                if resp.status_code == 200:
                    content_type = resp.headers.get('content-type', '')
                    if 'application/json' in content_type:
                        # Check if it returns actual data (not just a health check)
                        try:
                            data = resp.json()
                            if isinstance(data, (list, dict)) and len(str(data)) > 100:
                                unprotected.append(endpoint)
                        except Exception:
                            pass
            except Exception:
                continue

        if unprotected:
            results.append({
                'id': 'SA041',
                'name': 'Potentially Unprotected API Endpoints',
                'status': 'failed',
                'severity': 'high',
                'what': f'{len(unprotected)} API endpoint(s) return data without authentication: {", ".join([u.split("/")[-1] for u in unprotected[:3]])}',
                'why': 'Unprotected endpoints expose user data and allow unauthorized access to your system',
                'how': 'Add authentication middleware to all API endpoints. Use JWT tokens or session cookies. Test each endpoint with and without valid credentials',
            })

        # Check CORS policy
        try:
            resp = http_requests.options(
                page_url,
                headers={'Origin': 'https://evil.com', 'Access-Control-Request-Method': 'GET'},
                timeout=5,
            )
            allow_origin = resp.headers.get('Access-Control-Allow-Origin', '')
            allow_credentials = resp.headers.get('Access-Control-Allow-Credentials', '')

            if allow_origin == '*' and allow_credentials.lower() == 'true':
                results.append({
                    'id': 'SA042',
                    'name': 'CORS Misconfiguration',
                    'status': 'failed',
                    'severity': 'critical',
                    'what': 'CORS allows any origin (*) with credentials=true — this is a critical misconfiguration',
                    'why': 'This combination allows any malicious website to make authenticated requests to your API on behalf of your users',
                    'how': 'Never combine Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true. Specify exact allowed origins instead',
                })
            elif allow_origin == 'https://evil.com':
                results.append({
                    'id': 'SA042',
                    'name': 'CORS Misconfiguration',
                    'status': 'failed',
                    'severity': 'high',
                    'what': 'CORS policy reflects any requesting origin — allows cross-origin requests from untrusted sites',
                    'why': 'Overly permissive CORS allows attackers to make API requests from malicious sites using victim credentials',
                    'how': 'Whitelist specific trusted origins in your CORS configuration. Never use wildcard in production',
                })
            else:
                results.append({
                    'id': 'SA042',
                    'name': 'CORS Policy Check',
                    'status': 'passed',
                    'severity': 'info',
                    'what': 'CORS policy correctly rejects untrusted origins',
                    'why': 'Proper CORS prevents cross-origin attacks',
                    'how': 'No action required',
                })
        except Exception:
            pass

        return results
