import { execSync } from 'child_process';
import { join } from 'path';
import { TestResult } from '../types';

interface AgentFinding {
  id: string;
  name: string;
  status: string;
  severity: string;
  what: string;
  why: string;
  how: string;
}

interface AgentResult {
  url: string;
  total: number;
  results: AgentFinding[];
}

export async function runSecurityAgent(
  testCase: { id: string; name: string },
  url: string,
  authEmail?: string,
  authPassword?: string,
  authLoginUrl?: string
): Promise<TestResult[]> {
  const agentPath = join(__dirname, '../../../security-agent/main.py');

  let cmd = `python3 "${agentPath}" "${url}"`;
  if (authEmail && authPassword) {
    cmd += ` --auth-email "${authEmail}" --auth-password "${authPassword}"`;
    if (authLoginUrl) cmd += ` --auth-login-url "${authLoginUrl}"`;
  }

  try {
    const output = execSync(cmd, {
      timeout: 120000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const agentResult: AgentResult = JSON.parse(output);

    return agentResult.results.map(finding => ({
      id: finding.id,
      name: finding.name,
      status: finding.status as TestResult['status'],
      severity: finding.severity as TestResult['severity'],
      message: `${finding.what} | WHY: ${finding.why} | FIX: ${finding.how}`,
      duration: 0,
    }));

  } catch (err) {
    return [{
      id: testCase.id,
      name: 'Python Security Agent',
      status: 'error',
      severity: 'low',
      message: `Security agent failed: ${(err as Error).message.slice(0, 200)}`,
      duration: 0,
    }];
  }
}
