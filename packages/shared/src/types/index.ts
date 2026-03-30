export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  severity: Severity;
  message: string;
  duration: number;
  screenshot?: string;
  metadata?: Record<string, unknown>;
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

export interface TestCase {
  id: string;
  name: string;
  type: 'functional' | 'navigation' | 'form' | 'security' | 'performance' | 'load';
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: string[];
  expectedOutcome: string;
}

export interface DetectiveReport {
  url: string;
  score: number;
  grade: string;
  summary: string;
  findings: Finding[];
  recommendations: string[];
  generatedAt: string;
}

export interface Finding {
  testId: string;
  testName: string;
  status: TestStatus;
  severity: Severity;
  what: string;
  why: string;
  how: string;
  screenshot?: string;
}
export interface AuthCredentials {
  email: string;
  password: string;
  loginUrl?: string;        // defaults to baseUrl if not provided
  emailSelector?: string;   // CSS selector for email field, defaults to common patterns
  passwordSelector?: string; // CSS selector for password field
  submitSelector?: string;  // CSS selector for submit button
}

export interface SiteCrawlOptions {
  maxPages?: number;
  auth?: AuthCredentials;
}
