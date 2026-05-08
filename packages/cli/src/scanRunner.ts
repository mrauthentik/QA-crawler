import path from 'path';
import { execSync, spawn } from 'child_process';

export interface ScanOptions {
  url: string;
  authEmail?: string;
  authPassword?: string;
  authLoginUrl?: string;
  checks?: string;
  maxPages?: string | number;
  timeout?: string | number;
  headers?: string[];
  apiUrl?: string;
  apiToken?: string;
}

const DEFAULT_API_URL = 'https://qa-detective-api-production.up.railway.app';
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 10 * 60 * 1000;

async function submitRun(options: ScanOptions): Promise<string> {
  const apiUrl = options.apiUrl || process.env.QA_DETECTIVE_API_URL || DEFAULT_API_URL;
  const token = options.apiToken || process.env.QA_DETECTIVE_TOKEN || '';

  const body: Record<string, unknown> = {
    url: options.url,
    description: `CLI scan of ${options.url}`,
  };

  if (options.authEmail) body.authEmail = options.authEmail;
  if (options.authPassword) body.authPassword = options.authPassword;
  if (options.authLoginUrl) body.authLoginUrl = options.authLoginUrl;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${apiUrl}/api/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new Error(
      'Authentication required.\n' +
      'Register at https://qa-detective-dashboard-production.up.railway.app\n' +
      'Then: export QA_DETECTIVE_TOKEN=your_token\n' +
      'Or:   qa-detective scan <url> --token your_token'
    );
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`API error: ${data.error || res.statusText}`);
  }

  const data = await res.json() as { runId: string };
  return data.runId;
}

async function pollRun(
  runId: string,
  apiUrl: string,
  onProgress?: (status: string) => void
): Promise<Record<string, unknown>> {
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${apiUrl}/api/runs/${runId}`);
    if (!res.ok) continue;

    const data = await res.json() as { run: Record<string, unknown> };
    const run = data.run;

    if (onProgress) onProgress(run.status as string);

    if (run.status === 'completed' || run.status === 'failed') {
      return run;
    }
  }

  throw new Error('Scan timed out after 10 minutes');
}

export async function runScan(
  options: ScanOptions,
  onProgress?: (status: string) => void
): Promise<Record<string, unknown>> {
  const apiUrl = options.apiUrl || process.env.QA_DETECTIVE_API_URL || DEFAULT_API_URL;
  const runId = await submitRun(options);
  if (onProgress) onProgress('queued');
  const run = await pollRun(runId, apiUrl, onProgress);

  const findings = (run.findings as any[]) ?? [];
  return {
    url: options.url,
    runId,
    score: run.score,
    grade: run.grade,
    summary: run.summary,
    total: findings.length,
    results: findings.map((f: any) => ({
      id: f.testId,
      name: f.testName,
      status: f.status,
      severity: f.severity,
      what: f.what,
      why: f.why,
      how: f.how,
    })),
    reportUrl: `${process.env.QA_DETECTIVE_DASHBOARD_URL || 'https://qa-detective-dashboard-production.up.railway.app'}/runs/${runId}`,
  };
}

export function runLocalScan(options: ScanOptions): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    function getPythonCommand(): string {
      for (const cmd of ['python3', 'python']) {
        try {
          execSync(`${cmd} --version`, { stdio: 'pipe' });
          return cmd;
        } catch {
          continue;
        }
      }
      throw new Error('Python not found. Use the default API mode instead.');
    }

    const agentPath = path.resolve(__dirname, '../../security-agent/main.py');
    const args = [agentPath, options.url];
    if (options.authEmail) args.push('--auth-email', options.authEmail);
    if (options.authPassword) args.push('--auth-password', options.authPassword);
    if (options.authLoginUrl) args.push('--auth-login-url', options.authLoginUrl);

    const pythonCmd = getPythonCommand();
    const proc = spawn(pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code: number) => {
      if (code !== 0) reject(new Error(`Local scan failed (code ${code}):\n${stderr}`));
      else {
        try { resolve(JSON.parse(stdout)); }
        catch { reject(new Error('Failed to parse scan result.\n' + stdout)); }
      }
    });
  });
}
