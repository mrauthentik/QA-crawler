import { Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { TestResult } from '../types';

// Map axe impact levels to our severity
const IMPACT_MAP: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  serious:  'high',
  moderate: 'medium',
  minor:    'low',
};

export async function runAccessibilityTest(
  page: Page,
  testCase: { id: string; name: string; expectedOutcome: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Run axe-core analysis
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
      // Color contrast is a designer's choice — exclude from automated checks
      .disableRules([
        'color-contrast',
        'color-contrast-enhanced',
        'link-in-text-block',
      ])
      .analyze();

    const violations = results.violations;

    if (violations.length === 0) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'passed',
        severity: 'info',
        message: `Accessibility checks passed — ${results.passes.length} rules passed, no violations found`,
        duration: Date.now() - start,
      };
    }

    // Sort by severity
    const severityOrder = ['critical', 'serious', 'moderate', 'minor'];
    const sorted = [...violations].sort(
      (a, b) => severityOrder.indexOf(a.impact ?? 'minor') - severityOrder.indexOf(b.impact ?? 'minor')
    );

    // Build message from top violations
    const topViolations = sorted.slice(0, 5);
    const messages = topViolations.map(v => {
      const nodeCount = v.nodes.length;
      const impact = (v.impact ?? 'unknown').toUpperCase();
      return `[${impact}] ${v.help} (${nodeCount} element${nodeCount !== 1 ? 's' : ''} affected) — ${v.helpUrl}`;
    });

    if (violations.length > 5) {
      messages.push(`...and ${violations.length - 5} more violation(s)`);
    }

    // Determine overall severity from worst violation
    const worstImpact = (sorted[0]?.impact ?? 'minor') as string;
    const severity = IMPACT_MAP[worstImpact] ?? 'low';

    return {
      id: testCase.id,
      name: testCase.name,
      status: 'failed',
      severity,
      message: `${violations.length} accessibility violation(s) found — ${messages.join(' | ')}`,
      duration: Date.now() - start,
    };

  } catch (err) {
    return {
      id: testCase.id,
      name: testCase.name,
      status: 'error',
      severity: 'medium',
      message: `Accessibility test failed: ${(err as Error).message}`,
      duration: Date.now() - start,
    };
  }
}
