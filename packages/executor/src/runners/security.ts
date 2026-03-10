import { Page } from 'playwright';
import { TestResult } from '../types';

type SecurityCheck = (page: Page, baseUrl: string) => Promise<{ passed: boolean; issues: string[]; severity: 'critical' | 'high' | 'medium' | 'low' | 'info' }>;

// ─── Individual security checks ───────────────────────────────────────────────

async function checkSecurityHeaders(page: Page, baseUrl: string) {
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const headers = response?.headers() ?? {};
  const issues: string[] = [];

  const required: Record<string, { description: string; severity: 'critical' | 'high' | 'medium' }> = {
    'x-content-type-options':    { description: 'Prevents MIME type sniffing attacks', severity: 'high' },
    'x-frame-options':           { description: 'Prevents clickjacking attacks', severity: 'high' },
    'strict-transport-security': { description: 'Enforces HTTPS connections (HSTS)', severity: 'critical' },
    'content-security-policy':   { description: 'Controls resource loading to prevent XSS', severity: 'critical' },
    'x-xss-protection':          { description: 'Legacy XSS filter for older browsers', severity: 'medium' },
    'referrer-policy':           { description: 'Controls referrer information leakage', severity: 'medium' },
    'permissions-policy':        { description: 'Controls browser feature access', severity: 'low' },
  };

  let highestSeverity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';
  const severityRank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

  for (const [header, meta] of Object.entries(required)) {
    if (!headers[header]) {
      issues.push(`Missing ${header}: ${meta.description}`);
      if (severityRank[meta.severity] > severityRank[highestSeverity]) {
        highestSeverity = meta.severity;
      }
    }
  }

  return { passed: issues.length === 0, issues, severity: highestSeverity };
}

async function checkHTTPS(page: Page, baseUrl: string) {
  const issues: string[] = [];

  if (!baseUrl.startsWith('https://')) {
    issues.push('Site is not served over HTTPS — all traffic is unencrypted');
    return { passed: false, issues, severity: 'critical' as const };
  }

  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const headers = response?.headers() ?? {};

  if (!headers['strict-transport-security']) {
    issues.push('HSTS header missing — browser may allow HTTP downgrade attacks');
  }

  // Check if HTTP redirects to HTTPS
  try {
    const httpUrl = baseUrl.replace('https://', 'http://');
    const httpResponse = await page.goto(httpUrl, { waitUntil: 'load', timeout: 10000 });
    const finalUrl = page.url();
    if (!finalUrl.startsWith('https://')) {
      issues.push('HTTP does not redirect to HTTPS — insecure connections accepted');
    }
    void httpResponse;
  } catch {
    // redirect check failed — not critical
  }

  // Check for mixed content
  const mixedContent = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.filter(r => r.name.startsWith('http://')).map(r => r.name);
  });

  if (mixedContent.length > 0) {
    issues.push(`Mixed content: ${mixedContent.length} resource(s) loaded over HTTP — ${mixedContent.slice(0, 2).join(', ')}`);
  }

  const severity = issues.some(i => i.includes('not served')) ? 'critical'
    : issues.some(i => i.includes('HSTS')) ? 'high'
    : 'medium';

  return { passed: issues.length === 0, issues, severity: severity as 'critical' | 'high' | 'medium' };
}

async function checkXSS(page: Page, baseUrl: string) {
  const issues: string[] = [];
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const headers = response?.headers() ?? {};

  if (!headers['content-security-policy']) {
    issues.push('No Content-Security-Policy header — page has no XSS protection policy');
  } else {
    const csp = headers['content-security-policy'];
    if (csp.includes("'unsafe-inline'")) {
      issues.push("CSP contains 'unsafe-inline' — inline scripts are allowed, reducing XSS protection");
    }
    if (csp.includes("'unsafe-eval'")) {
      issues.push("CSP contains 'unsafe-eval' — eval() is allowed, weakening XSS protection");
    }
    if (csp.includes('*')) {
      issues.push('CSP contains wildcard (*) source — too permissive, allows any origin');
    }
  }

  if (!headers['x-xss-protection']) {
    issues.push('Missing X-XSS-Protection header — legacy XSS filter not enabled');
  }

  // Test basic reflected XSS detection
  const xssPayload = '<script>alert(1)</script>';
  const testUrl = `${baseUrl}?q=${encodeURIComponent(xssPayload)}`;
  try {
    await page.goto(testUrl, { waitUntil: 'load', timeout: 15000 });
    const content = await page.content();
    if (content.includes(xssPayload)) {
      issues.push('CRITICAL: Possible reflected XSS — raw script tag found in page response');
    }
  } catch {
    // XSS probe failed — page may not accept query params
  }

  const severity = issues.some(i => i.includes('CRITICAL')) ? 'critical'
    : issues.some(i => i.includes('No Content-Security-Policy')) ? 'high'
    : 'medium';

  return { passed: issues.length === 0, issues, severity: severity as 'critical' | 'high' | 'medium' };
}

async function checkCSP(page: Page, baseUrl: string) {
  const issues: string[] = [];
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const headers = response?.headers() ?? {};
  const csp = headers['content-security-policy'];

  if (!csp) {
    issues.push('No Content-Security-Policy header found');
    return { passed: false, issues, severity: 'critical' as const };
  }

  // Parse and validate CSP directives
  const directives = csp.split(';').map(d => d.trim());
  const directiveMap: Record<string, string> = {};
  for (const d of directives) {
    const [name, ...values] = d.split(/\s+/);
    if (name) directiveMap[name.toLowerCase()] = values.join(' ');
  }

  if (!directiveMap['default-src'] && !directiveMap['script-src']) {
    issues.push("CSP missing 'default-src' or 'script-src' — script sources not restricted");
  }

  if (directiveMap['default-src']?.includes('*') || directiveMap['script-src']?.includes('*')) {
    issues.push('CSP uses wildcard for script sources — any origin can execute scripts');
  }

  if (!directiveMap['frame-ancestors']) {
    issues.push("CSP missing 'frame-ancestors' — clickjacking protection not defined in CSP");
  }

  if (!directiveMap['upgrade-insecure-requests'] && !directiveMap['block-all-mixed-content']) {
    issues.push('CSP does not enforce HTTPS for subresources');
  }

  const severity = issues.length >= 2 ? 'high' : 'medium';
  return { passed: issues.length === 0, issues, severity: severity as 'high' | 'medium' };
}

async function checkSensitiveDataExposure(page: Page, baseUrl: string) {
  const issues: string[] = [];
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const bodyText = await page.content();

  const patterns: Array<{ pattern: RegExp; label: string; severity: 'critical' | 'high' | 'medium' }> = [
    { pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{10,}/gi,        label: 'API key exposed in source',       severity: 'critical' },
    { pattern: /password\s*[:=]\s*['"][^'"]{3,}/gi,                   label: 'Password exposed in source',      severity: 'critical' },
    { pattern: /secret\s*[:=]\s*['"][^'"]{5,}/gi,                     label: 'Secret exposed in source',        severity: 'critical' },
    { pattern: /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,                   label: 'Bearer token exposed in source',  severity: 'critical' },
    { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g,             label: 'Private key exposed in source',   severity: 'critical' },
    { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,   label: 'Email addresses exposed',         severity: 'low' },
  ];

  let highestSeverity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';
  const severityRank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

  for (const { pattern, label, severity } of patterns) {
    if (pattern.test(bodyText)) {
      issues.push(`${label} detected in page HTML`);
      if (severityRank[severity] > severityRank[highestSeverity]) {
        highestSeverity = severity;
      }
    }
  }

  // Check for exposed .env or config files
  const sensitiveFiles = ['/.env', '/.git/config', '/config.json', '/wp-config.php'];
  for (const file of sensitiveFiles) {
    try {
      const res = await page.goto(`${new URL(baseUrl).origin}${file}`, { timeout: 5000 });
      if (res && res.status() === 200) {
        issues.push(`Sensitive file accessible: ${file} returns HTTP 200`);
        highestSeverity = 'critical';
      }
    } catch {
      // file not accessible — good
    }
  }

  return { passed: issues.length === 0, issues, severity: highestSeverity };
}

async function checkCORS(page: Page, baseUrl: string) {
  const issues: string[] = [];
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const headers = response?.headers() ?? {};

  const acao = headers['access-control-allow-origin'];
  if (acao === '*') {
    issues.push('CORS allows all origins (Access-Control-Allow-Origin: *) — any site can make cross-origin requests');
  }

  const acac = headers['access-control-allow-credentials'];
  if (acao === '*' && acac === 'true') {
    issues.push('CRITICAL: CORS allows all origins with credentials — high risk of cross-origin data theft');
  }

  const severity = issues.some(i => i.includes('CRITICAL')) ? 'critical' : 'medium';
  return { passed: issues.length === 0, issues, severity: severity as 'critical' | 'medium' };
}

async function checkClickjacking(page: Page, baseUrl: string) {
  const issues: string[] = [];
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const headers = response?.headers() ?? {};

  if (!headers['x-frame-options']) {
    issues.push('Missing X-Frame-Options header — page can be embedded in iframes (clickjacking risk)');
  } else {
    const xfo = headers['x-frame-options'].toLowerCase();
    if (!['deny', 'sameorigin'].includes(xfo)) {
      issues.push(`X-Frame-Options set to '${xfo}' — should be DENY or SAMEORIGIN`);
    }
  }

  const csp = headers['content-security-policy'] ?? '';
  if (!csp.includes('frame-ancestors')) {
    issues.push("CSP missing 'frame-ancestors' directive — modern clickjacking protection not set");
  }

  const severity = issues.length >= 2 ? 'high' : 'medium';
  return { passed: issues.length === 0, issues, severity: severity as 'high' | 'medium' };
}

// ─── Router — maps test name keywords to the right check ──────────────────────

function resolveCheck(testName: string): SecurityCheck {
  const name = testName.toLowerCase();

  if (name.includes('xss') || name.includes('cross-site scripting')) return checkXSS;
  if (name.includes('https') || name.includes('ssl') || name.includes('tls') || name.includes('mixed content')) return checkHTTPS;
  if (name.includes('csp') || name.includes('content security policy')) return checkCSP;
  if (name.includes('clickjack') || name.includes('frame') || name.includes('iframe')) return checkClickjacking;
  if (name.includes('cors') || name.includes('cross-origin') || name.includes('same-origin')) return checkCORS;
  if (name.includes('sensitive') || name.includes('exposed') || name.includes('secret') || name.includes('leak')) return checkSensitiveDataExposure;
  if (name.includes('header')) return checkSecurityHeaders;

  // Default — run full header check
  return checkSecurityHeaders;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runSecurityTest(
  page: Page,
  testCase: { id: string; name: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();

  try {
    const check = resolveCheck(testCase.name);
    const { passed, issues, severity } = await check(page, baseUrl);

    if (passed) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'passed',
        severity: 'info',
        message: `${testCase.name} — no issues found`,
        duration: Date.now() - start,
      };
    }

    return {
      id: testCase.id,
      name: testCase.name,
      status: 'failed',
      severity,
      message: issues.join(' | '),
      duration: Date.now() - start,
    };

  } catch (err) {
    return {
      id: testCase.id,
      name: testCase.name,
      status: 'error',
      severity: 'high',
      message: `Security check failed: ${(err as Error).message}`,
      duration: Date.now() - start,
    };
  }
}
