import { Page } from 'playwright';
import { TestResult } from '../types';

export async function runSecurityTest(
  page: Page,
  testCase: { id: string; name: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();
  const issues: string[] = [];

  try {
    const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const headers = response?.headers() ?? {};

    // Check security headers
    const requiredHeaders: Record<string, string> = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY or SAMEORIGIN',
      'strict-transport-security': 'HSTS header',
      'content-security-policy': 'CSP header',
    };

    for (const [header, description] of Object.entries(requiredHeaders)) {
      if (!headers[header]) {
        issues.push(`Missing security header: ${header} (${description})`);
      }
    }

    // Check for mixed content
    if (baseUrl.startsWith('https')) {
      const mixedContent = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources
          .filter(r => r.name.startsWith('http://'))
          .map(r => r.name);
      });

      if (mixedContent.length > 0) {
        issues.push(`Mixed content detected: ${mixedContent.slice(0, 3).join(', ')}`);
      }
    }

    // Check console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.waitForTimeout(1000);

    if (consoleErrors.length > 0) {
      issues.push(`Console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
    }

    // Check for sensitive data exposed in source
    const bodyText = await page.content();
    const sensitivePatterns = [
      { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{10,}/gi, label: 'API key' },
      { pattern: /password\s*[:=]\s*['"][^'"]{3,}/gi, label: 'Password' },
      { pattern: /secret\s*[:=]\s*['"][^'"]{5,}/gi, label: 'Secret' },
    ];

    for (const { pattern, label } of sensitivePatterns) {
      if (pattern.test(bodyText)) {
        issues.push(`Possible ${label} exposed in page source`);
      }
    }

    if (issues.length === 0) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'passed',
        severity: 'info',
        message: 'All security checks passed',
        duration: Date.now() - start,
      };
    }

    const severity = issues.some(i => i.includes('exposed'))
      ? 'critical'
      : issues.length >= 3 ? 'high' : 'medium';

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
      message: `Security test failed: ${(err as Error).message}`,
      duration: Date.now() - start,
    };
  }
}
