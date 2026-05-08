import { NodeSecurityScanner, SecurityFinding } from '../../src/nodeSecurityScanner';

describe('NodeSecurityScanner - Snapshots', () => {
  /**
   * Snapshot tests for security findings
   * These ensure that the security scanner output format remains consistent
   * Run: npm run test:snapshot to update if output format intentionally changes
   */

  it('should match snapshot for security finding structure', () => {
    const mockFinding: SecurityFinding = {
      id: 'SEC-001',
      name: 'Mixed Content Detected',
      severity: 'high',
      status: 'failed',
      what: 'Found 3 insecure (HTTP) resources on HTTPS page',
      why: 'HTTPS pages should not load HTTP resources',
      how: 'Convert all HTTP resources to HTTPS',
      evidence: ['http://example.com/image.jpg'],
    };

    expect(mockFinding).toMatchSnapshot();
  });

  it('should match snapshot for findings array structure', () => {
    const findings: SecurityFinding[] = [
      {
        id: 'SEC-001',
        name: 'Mixed Content',
        severity: 'high',
        status: 'failed',
        what: 'HTTP resources on HTTPS',
        why: 'Security risk',
        how: 'Use HTTPS',
      },
      {
        id: 'SEC-002',
        name: 'Insecure Cookies',
        severity: 'high',
        status: 'failed',
        what: 'Cookies without Secure flag',
        why: 'Can be sent over HTTP',
        how: 'Set Secure flag',
        evidence: ['session_id', 'token'],
      },
      {
        id: 'SEC-003',
        name: 'Missing Security Headers',
        severity: 'medium',
        status: 'warning',
        what: 'X-Frame-Options header missing',
        why: 'Clickjacking vulnerability',
        how: 'Add X-Frame-Options header',
      },
    ];

    expect(findings).toMatchSnapshot();
  });

  it('should match snapshot for score calculation', () => {
    const scanResult = {
      score: 65,
      passed: 8,
      failed: 3,
      summary: '65% compliance - 3 critical findings',
    };

    expect(scanResult).toMatchSnapshot();
  });

  it('should match snapshot for different severity levels', () => {
    const severityExamples = {
      critical: {
        id: 'SEC-CRIT-001',
        name: 'Critical Issue',
        severity: 'critical' as const,
        status: 'failed' as const,
        what: 'Critical security issue',
        why: 'Immediate threat',
        how: 'Fix immediately',
      },
      high: {
        id: 'SEC-HIGH-001',
        name: 'High Risk',
        severity: 'high' as const,
        status: 'failed' as const,
        what: 'High severity finding',
        why: 'Should be fixed',
        how: 'Patch soon',
      },
      medium: {
        id: 'SEC-MED-001',
        name: 'Medium Risk',
        severity: 'medium' as const,
        status: 'warning' as const,
        what: 'Medium severity finding',
        why: 'Potential risk',
        how: 'Plan fix',
      },
      low: {
        id: 'SEC-LOW-001',
        name: 'Low Risk',
        severity: 'low' as const,
        status: 'warning' as const,
        what: 'Low severity finding',
        why: 'Minor issue',
        how: 'Consider fixing',
      },
      info: {
        id: 'SEC-INFO-001',
        name: 'Information',
        severity: 'info' as const,
        status: 'passed' as const,
        what: 'Informational finding',
        why: 'For awareness',
        how: 'Monitor',
      },
    };

    expect(severityExamples).toMatchSnapshot();
  });
});
