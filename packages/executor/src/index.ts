import { chromium } from 'playwright';
import { TestResult } from './types';
import { runNavigationTest } from './runners/navigation';
import { runPerformanceTest } from './runners/performance';
import { runSecurityTest } from './runners/security';
import { runFunctionalTest } from './runners/functional';
import { runFormTest } from './runners/form';
import { runAccessibilityTest } from './runners/accessibility';

export interface TestCase {
  id: string;
  name: string;
  type: 'functional' | 'navigation' | 'form' | 'security' | 'performance' | 'accessibility';
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: string[];
  expectedOutcome: string;
}

export interface ExecutionResult {
  url: string;
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  duration: number;
  results: TestResult[];
}

export async function executeTestPlan(
  url: string,
  testCases: TestCase[],
  screenshotsDir?: string
): Promise<ExecutionResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'QA-Detective/1.0 (Automated Testing)',
  });

  const results: TestResult[] = [];
  const start = Date.now();

  console.log(`\n🔬 Executing ${testCases.length} test cases against ${url}\n`);

  for (const testCase of testCases) {
    const page = await context.newPage();
    console.log(`  Running [${testCase.priority.toUpperCase()}] ${testCase.id}: ${testCase.name}...`);

    let result: TestResult;

    try {
      switch (testCase.type) {
        case 'navigation':
          result = await runNavigationTest(page, testCase, url);
          break;
        case 'performance':
          result = await runPerformanceTest(page, testCase, url);
          break;
        case 'security':
          result = await runSecurityTest(page, testCase, url);
          break;
        case 'form':
          result = await runFormTest(page, testCase, url);
          break;
        case 'accessibility':
          result = await runAccessibilityTest(page, testCase, url);
          break;
        case 'functional':
        default:
          result = await runFunctionalTest(page, testCase, url);
          break;
      }

      // Screenshot on failure
      if (result.status === 'failed' || result.status === 'error') {
        try {
          const screenshotPath = screenshotsDir
            ? `${screenshotsDir}/${testCase.id}.png`
            : `/tmp/${testCase.id}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          result.screenshot = screenshotPath;
        } catch {
          // Screenshot failed — not critical
        }
      }

    } catch (err) {
      result = {
        id: testCase.id,
        name: testCase.name,
        status: 'error',
        severity: 'high',
        message: `Unexpected error: ${(err as Error).message}`,
        duration: 0,
      };
    }

    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
    console.log(`  ${icon} ${result.status.toUpperCase()} — ${result.message.slice(0, 80)}`);
    results.push(result);
    await page.close();
  }

  await browser.close();

  const totalDuration = Date.now() - start;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errors = results.filter(r => r.status === 'error').length;

  return {
    url,
    totalTests: testCases.length,
    passed,
    failed,
    errors,
    duration: totalDuration,
    results,
  };
}
