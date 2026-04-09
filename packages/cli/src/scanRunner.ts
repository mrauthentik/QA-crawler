import { spawn } from 'child_process';
import path from 'path';

export interface ScanOptions {
  url: string;
  authEmail?: string;
  authPassword?: string;
  authLoginUrl?: string;
  checks?: string;
  maxPages?: string | number;
  timeout?: string | number;
  headers?: string[];
}

/**
 * Runs the Python security agent with the given options.
 * Returns the parsed JSON result from the agent.
 */
export function runScan(options: ScanOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    // Path to the Python agent script
    const agentPath = path.resolve(__dirname, '../../security-agent/main.py');

    // Build argument list
    const args = [agentPath, options.url];
    if (options.authEmail) args.push('--auth-email', options.authEmail);
    if (options.authPassword) args.push('--auth-password', options.authPassword);
    if (options.authLoginUrl) args.push('--auth-login-url', options.authLoginUrl);
    if (options.checks) args.push('--checks', options.checks);
    if (options.maxPages) args.push('--max-pages', String(options.maxPages));
    if (options.timeout) args.push('--timeout', String(options.timeout));
    if (options.headers && Array.isArray(options.headers)) {
      for (const h of options.headers) {
        args.push('--header', h);
      }
    }

    // Spawn the Python process
    const proc = spawn('python3', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Scan failed (code ${code}):\n${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (err) {
          reject(new Error('Failed to parse scan result as JSON.\n' + stdout));
        }
      }
    });
  });
}
