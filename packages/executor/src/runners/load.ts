import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TestResult } from '../types';

interface K6Metrics {
  http_req_duration: { avg: number; p95: number; max: number };
  http_req_failed: { rate: number };
  http_reqs: { rate: number; count: number };
  vus_max: { value: number };
  iterations: { count: number };
}

function generateK6Script(url: string, vus: number, duration: string): string {
  return `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: ${Math.floor(vus / 2)} },  // ramp up
    { duration: '${duration}', target: ${vus} },            // hold
    { duration: '10s', target: 0 },                         // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const res = http.get('${url}');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });
  sleep(1);
}
`;
}

function parseK6Output(output: string): K6Metrics | null {
  try {
    const lines = output.split('\n').filter(Boolean);
    const summaryLine = lines.find(l => l.includes('"type":"summary"'));
    if (!summaryLine) return null;
    const summary = JSON.parse(summaryLine);
    const m = summary.data?.metrics;
    if (!m) return null;
    return {
      http_req_duration: {
        avg: m.http_req_duration?.values?.avg ?? 0,
        p95: m.http_req_duration?.values?.['p(95)'] ?? 0,
        max: m.http_req_duration?.values?.max ?? 0,
      },
      http_req_failed: {
        rate: m.http_req_failed?.values?.rate ?? 0,
      },
      http_reqs: {
        rate: m.http_reqs?.values?.rate ?? 0,
        count: m.http_reqs?.values?.count ?? 0,
      },
      vus_max: {
        value: m.vus_max?.values?.value ?? 0,
      },
      iterations: {
        count: m.iterations?.values?.count ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export async function runLoadTest(
  testCase: { id: string; name: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();
  const scriptPath = join(tmpdir(), `k6-${testCase.id}-${Date.now()}.js`);

  // Scale VUs based on available resources — conservative for shared hosting
  const vus = 20;
  const duration = '20s';

  try {
    // Check k6 is available
    try {
      execSync('k6 version', { stdio: 'pipe' });
    } catch {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'error',
        severity: 'low',
        message: 'k6 is not installed on this server — load testing unavailable',
        duration: Date.now() - start,
      };
    }

    // Write k6 script to temp file
    const script = generateK6Script(baseUrl, vus, duration);
    writeFileSync(scriptPath, script);

    // Run k6 with JSON output
    let output = '';
    try {
      output = execSync(
        `k6 run --out json=- --summary-export=/dev/stdout ${scriptPath}`,
        {
          timeout: 120000, // 2 minute timeout
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
    } catch (execErr: unknown) {
      // k6 exits with non-zero if thresholds fail — that's expected
      const err = execErr as { stdout?: string; stderr?: string };
      output = err.stdout ?? '';
    }

    const metrics = parseK6Output(output);

    if (!metrics) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'error',
        severity: 'low',
        message: 'Could not parse k6 output — load test may have timed out',
        duration: Date.now() - start,
      };
    }

    const p95 = Math.round(metrics.http_req_duration.p95);
    const avgMs = Math.round(metrics.http_req_duration.avg);
    const errorRate = Math.round(metrics.http_req_failed.rate * 100);
    const reqPerSec = Math.round(metrics.http_reqs.rate * 10) / 10;
    const totalReqs = metrics.http_reqs.count;

    const issues: string[] = [];
    let severity: TestResult['severity'] = 'info';

    if (errorRate > 10) {
      issues.push(`High error rate: ${errorRate}% of requests failed under ${vus} concurrent users`);
      severity = 'critical';
    } else if (errorRate > 1) {
      issues.push(`Some errors: ${errorRate}% of requests failed under ${vus} concurrent users`);
      if (severity === 'info') severity = 'medium';
    }

    if (p95 > 5000) {
      issues.push(`Slow p95 response: ${p95}ms — 95% of users wait over 5 seconds`);
      if (severity === 'info') severity = 'high';
    } else if (p95 > 3000) {
      issues.push(`Moderate p95 response: ${p95}ms under load`);
      if (severity === 'info') severity = 'medium';
    }

    if (avgMs > 2000) {
      issues.push(`High average response time: ${avgMs}ms under ${vus} concurrent users`);
      if (severity === 'info') severity = 'medium';
    }

    const summary = `Load test: ${vus} concurrent users | ${totalReqs} total requests | ${reqPerSec} req/s | avg: ${avgMs}ms | p95: ${p95}ms | errors: ${errorRate}%`;

    if (issues.length > 0) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        severity,
        message: issues.join(' | ') + ` | ${summary}`,
        duration: Date.now() - start,
        metadata: { vus, p95, avgMs, errorRate, reqPerSec, totalReqs },
      };
    }

    return {
      id: testCase.id,
      name: testCase.name,
      status: 'passed',
      severity: 'info',
      message: `Site handled ${vus} concurrent users. ${summary}`,
      duration: Date.now() - start,
      metadata: { vus, p95, avgMs, errorRate, reqPerSec, totalReqs },
    };

  } finally {
    if (existsSync(scriptPath)) unlinkSync(scriptPath);
  }
}
