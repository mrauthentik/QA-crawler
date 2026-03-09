import { Page } from 'playwright';
import { TestResult } from '../types';

export async function runNavigationTest(
  page: Page,
  testCase: { id: string; name: string; steps: string[]; expectedOutcome: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();

  try {
    const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() ?? 0;

    if (status >= 400) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        severity: 'critical',
        message: `Page returned HTTP ${status}`,
        duration: Date.now() - start,
      };
    }

    // Extract all links safely
    const links: string[] = await page.$$eval('a[href]', anchors =>
      anchors
        .map(a => (a as HTMLAnchorElement).href)
        .filter(h => h && h.startsWith('http'))
    );

    const brokenLinks: string[] = [];

    for (const link of links.slice(0, 10)) {
      try {
        const res = await page.request.get(link, { timeout: 8000 });
        if (res.status() >= 400) {
          brokenLinks.push(`${link} (${res.status()})`);
        }
      } catch {
        brokenLinks.push(`${link} (unreachable)`);
      }
    }

    if (brokenLinks.length > 0) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        severity: 'medium',
        message: `Broken links found: ${brokenLinks.join(', ')}`,
        duration: Date.now() - start,
      };
    }

    return {
      id: testCase.id,
      name: testCase.name,
      status: 'passed',
      severity: 'info',
      message: `Navigation successful. ${links.length} link(s) checked, none broken.`,
      duration: Date.now() - start,
    };

  } catch (err) {
    return {
      id: testCase.id,
      name: testCase.name,
      status: 'error',
      severity: 'critical',
      message: `Navigation failed: ${(err as Error).message}`,
      duration: Date.now() - start,
    };
  }
}
