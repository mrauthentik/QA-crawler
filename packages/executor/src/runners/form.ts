import { Page } from 'playwright';
import { TestResult } from '../types';

interface FormInfo {
  action: string;
  method: string;
  fields: string[];
}

// Realistic test data mapped by field name/type
const TEST_DATA: Record<string, string> = {
  // Name fields
  name: 'John Doe',
  fullname: 'John Doe',
  'full-name': 'John Doe',
  firstname: 'John',
  'first-name': 'John',
  lastname: 'Doe',
  'last-name': 'Doe',
  username: 'testuser_qa',

  // Contact fields
  email: 'qa-detective@testmail.com',
  phone: '+1234567890',
  mobile: '+1234567890',
  tel: '+1234567890',

  // Auth fields
  password: 'TestPassword123!',
  'confirm-password': 'TestPassword123!',
  confirmpassword: 'TestPassword123!',
  'password-confirm': 'TestPassword123!',

  // Content fields
  message: 'This is an automated QA test message. Please ignore.',
  comment: 'Automated test comment from QA Detective.',
  subject: 'QA Detective Automated Test',
  title: 'Test Title',
  description: 'Test description from QA Detective automated testing.',

  // Address fields
  address: '123 Test Street',
  city: 'Test City',
  state: 'Test State',
  zip: '12345',
  postcode: '12345',
  country: 'US',

  // Search
  search: 'test query',
  query: 'test query',
  q: 'test',

  // Default
  default: 'test_value',
};

function getTestValue(fieldName: string, fieldType: string): string {
  const name = fieldName.toLowerCase().replace(/[\[\]_]/g, '-');

  // Match by field name first
  for (const [key, value] of Object.entries(TEST_DATA)) {
    if (name.includes(key)) return value;
  }

  // Fall back to field type
  switch (fieldType) {
    case 'email':    return TEST_DATA.email;
    case 'password': return TEST_DATA.password;
    case 'tel':      return TEST_DATA.phone;
    case 'number':   return '42';
    case 'url':      return 'https://example.com';
    case 'date':     return '2024-01-01';
    case 'search':   return TEST_DATA.search;
    default:         return TEST_DATA.default;
  }
}

async function detectForms(page: Page): Promise<FormInfo[]> {
  return page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    return forms.map(form => ({
      action: form.action || '',
      method: form.method || 'get',
      fields: Array.from(form.querySelectorAll('input, textarea, select'))
        .map(el => (el as HTMLInputElement).name || (el as HTMLInputElement).type || 'unknown')
        .filter(name => name !== 'hidden' && name !== 'submit' && name !== 'button'),
    }));
  });
}

async function testFormFill(
  page: Page,
  baseUrl: string
): Promise<{ filled: number; issues: string[] }> {
  const issues: string[] = [];
  let filled = 0;

  // Fill all visible inputs
  const inputs = await page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea');

  for (const input of inputs) {
    try {
      const isVisible = await input.isVisible();
      const isDisabled = await input.isDisabled();
      if (!isVisible || isDisabled) continue;

      const name = await input.getAttribute('name') ?? '';
      const type = await input.getAttribute('type') ?? 'text';
      const value = getTestValue(name, type);

      await input.fill(value);
      filled++;
    } catch {
      // Input not fillable — skip
    }
  }

  // Handle checkboxes
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    try {
      const isVisible = await checkbox.isVisible();
      if (isVisible) await checkbox.check();
    } catch {
      // Skip
    }
  }

  // Handle selects
  const selects = await page.$$('select');
  for (const select of selects) {
    try {
      const isVisible = await select.isVisible();
      if (!isVisible) continue;
      const options = await select.$$('option');
      if (options.length > 1) {
        const value = await options[1].getAttribute('value');
        if (value) await select.selectOption(value);
      }
    } catch {
      // Skip
    }
  }

  return { filled, issues };
}

async function testEmptySubmission(
  page: Page,
  baseUrl: string
): Promise<{ hasValidation: boolean; message: string }> {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // Find submit button
  const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Sign"), button:has-text("Login"), button:has-text("Register"), button:has-text("Send")');

  if (!submitBtn) {
    return { hasValidation: false, message: 'No submit button found' };
  }

  const urlBefore = page.url();

  try {
    await submitBtn.click();
    await page.waitForTimeout(1500);
  } catch {
    // Click failed
  }

  const urlAfter = page.url();

  // Check for HTML5 validation messages
  const validationMessages = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    return inputs
      .map(el => (el as HTMLInputElement).validationMessage)
      .filter(msg => msg && msg.length > 0);
  });

  // Check for error text on page
  const bodyText = await page.innerText('body').catch(() => '');
  const errorKeywords = ['required', 'invalid', 'error', 'please enter', 'must be', 'cannot be empty'];
  const hasErrorText = errorKeywords.some(kw => bodyText.toLowerCase().includes(kw));
  const stayedOnPage = urlAfter === urlBefore || urlAfter.includes(new URL(baseUrl).hostname);

  const hasValidation = validationMessages.length > 0 || hasErrorText;

  return {
    hasValidation,
    message: hasValidation
      ? `Form validation working — ${validationMessages.length} field(s) validated, stayed on page: ${stayedOnPage}`
      : `No validation detected on empty submit — form may accept empty data`,
  };
}

export async function runFormTest(
  page: Page,
  testCase: { id: string; name: string; expectedOutcome: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();
  const issues: string[] = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Detect forms on page
    const forms = await detectForms(page);

    if (forms.length === 0) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'passed',
        severity: 'info',
        message: 'No forms found on page — nothing to test',
        duration: Date.now() - start,
      };
    }

    // Test 1: Empty submission validation
    const validationResult = await testEmptySubmission(page, baseUrl);
    if (!validationResult.hasValidation) {
      issues.push(`Missing form validation: ${validationResult.message}`);
    }

    // Test 2: Fill form with test data
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const { filled } = await testFormFill(page, baseUrl);

    if (filled === 0) {
      issues.push('No form fields could be filled — inputs may be inaccessible');
    }

    // Test 3: Check for CSRF protection
    const hasCsrf = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="hidden"]'));
      return inputs.some(el => {
        const name = (el as HTMLInputElement).name.toLowerCase();
        return name.includes('csrf') || name.includes('token') || name.includes('_token');
      });
    });

    if (!hasCsrf && forms.some(f => f.method.toLowerCase() === 'post')) {
      issues.push('No CSRF token detected in POST form — potential cross-site request forgery vulnerability');
    }

    // Test 4: Check form has labels for accessibility
    const missingLabels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])'));
      return inputs.filter(input => {
        const id = input.getAttribute('id');
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
        const hasPlaceholder = input.hasAttribute('placeholder');
        return !hasLabel && !hasAriaLabel && !hasPlaceholder;
      }).length;
    });

    if (missingLabels > 0) {
      issues.push(`${missingLabels} input(s) missing labels — accessibility issue`);
    }

    if (issues.length === 0) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'passed',
        severity: 'info',
        message: `Form tests passed — ${forms.length} form(s) found, ${filled} field(s) filled, validation working`,
        duration: Date.now() - start,
      };
    }

    const severity = issues.some(i => i.includes('CSRF')) ? 'high'
      : issues.some(i => i.includes('validation')) ? 'medium'
      : 'low';

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
      message: `Form test failed: ${(err as Error).message}`,
      duration: Date.now() - start,
    };
  }
}
