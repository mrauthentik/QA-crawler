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
