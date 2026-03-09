import { Page } from 'playwright';
import { TestResult } from '../types';

export async function runPerformanceTest(
  page: Page,
  testCase: { id: string; name: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();

  try {
    const navStart = Date.now();
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const loadTime = Date.now() - navStart;

    // Get performance metrics from the browser
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      const resources = performance.getEntriesByType('resource');
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
        resourceCount: resources.length,
      };
    });

    const issues: string[] = [];
    let severity: TestResult['severity'] = 'info';

    if (loadTime > 5000) {
      issues.push(`Very slow load time: ${loadTime}ms (threshold: 5000ms)`);
      severity = 'critical';
    } else if (loadTime > 3000) {
      issues.push(`Slow load time: ${loadTime}ms (threshold: 3000ms)`);
      severity = 'medium';
    }

    if (metrics.resourceCount > 100) {
      issues.push(`Too many resources: ${metrics.resourceCount} (recommended: <100)`);
      if (severity === 'info') severity = 'low';
    }

    if (issues.length > 0) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        severity,
        message: issues.join(' | '),
        duration: Date.now() - start,
        metadata: { loadTime, ...metrics },
      };
    }

    return {
      id: testCase.id,
      name: testCase.name,
      status: 'passed',
      severity: 'info',
      message: `Loaded in ${loadTime}ms. DOM interactive: ${metrics.domInteractive}ms. Resources: ${metrics.resourceCount}`,
      duration: Date.now() - start,
      metadata: { loadTime, ...metrics },
    };

  } catch (err) {
    return {
      id: testCase.id,
      name: testCase.name,
      status: 'error',
      severity: 'high',
      message: `Performance test failed: ${(err as Error).message}`,
      duration: Date.now() - start,
    };
  }
}
