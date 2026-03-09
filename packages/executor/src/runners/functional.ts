
import { Page } from 'playwright';
import { TestResult } from '../types';

export async function runFunctionalTest(
  page: Page,
  testCase: { id: string; name: string; expectedOutcome: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Check page has actual content
    const bodyText = await page.innerText('body');
    if (!bodyText || bodyText.trim().length < 10) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        severity: 'high',
        message: 'Page body is empty or has no meaningful content',
        duration: Date.now() - start,
      };
    }

    // Check title exists
    const title = await page.title();
    if (!title) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        severity: 'medium',
        message: 'Page has no title tag',
        duration: Date.now() - start,
      };
    }

    // Check for common error indicators in the page
    const errorIndicators = ['404', 'not found', '500', 'server error', 'forbidden', '403'];
    const lowerBody = bodyText.toLowerCase();
    const foundError = errorIndicators.find(e => lowerBody.includes(e));

    if (foundError) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        severity: 'critical',
        message: `Page appears to show an error: "${foundError}" detected in content`,
        duration: Date.now() - start,
      };
    }

    return {
      id: testCase.id,
      name: testCase.name,
      status: 'passed',
      severity: 'info',
      message: `Page loaded with title "${title}" and ${bodyText.length} characters of content`,
      duration: Date.now() - start,
    };

  } catch (err) {
    return {
      id: testCase.id,
      name: testCase.name,
      status: 'error',
      severity: 'critical',
      message: `Functional test failed: ${(err as Error).message}`,
      duration: Date.now() - start,
    };
  }
}
