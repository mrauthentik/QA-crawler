import { Page } from 'playwright';
import { TestResult } from '../types';

type NetworkQuality = 'fast' | 'medium' | 'slow' | 'unknown';

interface NetworkMeasurement {
  quality: NetworkQuality;
  latencyMs: number;
  note: string;
}

// Measure network quality by fetching a known fast endpoint
async function measureNetworkQuality(): Promise<NetworkMeasurement> {
  const targets = [
    'https://www.google.com',
    'https://cloudflare.com',
    'https://httpbin.org/get',
  ];

  const timings: number[] = [];

  for (const target of targets) {
    try {
      const start = Date.now();
      await fetch(target, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      timings.push(Date.now() - start);
    } catch {
      // Skip failed targets
    }
  }

  if (timings.length === 0) {
    return { quality: 'unknown', latencyMs: 0, note: 'Could not measure network quality' };
  }

  const avgLatency = timings.reduce((a, b) => a + b, 0) / timings.length;

  if (avgLatency < 200) {
    return { quality: 'fast', latencyMs: avgLatency, note: `Fast network detected (avg latency: ${Math.round(avgLatency)}ms)` };
  } else if (avgLatency < 600) {
    return { quality: 'medium', latencyMs: avgLatency, note: `Medium network detected (avg latency: ${Math.round(avgLatency)}ms)` };
  } else {
    return { quality: 'slow', latencyMs: avgLatency, note: `Slow network detected (avg latency: ${Math.round(avgLatency)}ms) — performance thresholds adjusted` };
  }
}

// Adjust thresholds based on network quality
function getThresholds(network: NetworkQuality) {
  switch (network) {
    case 'fast':   return { critical: 5000, slow: 3000 };
    case 'medium': return { critical: 8000, slow: 5000 };
    case 'slow':   return { critical: 12000, slow: 8000 };
    default:       return { critical: 5000, slow: 3000 };
  }
}

export async function runPerformanceTest(
  page: Page,
  testCase: { id: string; name: string },
  baseUrl: string
): Promise<TestResult> {
  const start = Date.now();

  try {
    // Measure network quality before testing
    const network = await measureNetworkQuality();
    const thresholds = getThresholds(network.quality);

    const navStart = Date.now();
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const loadTime = Date.now() - navStart;

    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      const resources = performance.getEntriesByType('resource');
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime ?? null;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
        resourceCount: resources.length,
        firstContentfulPaint: fcp ? Math.round(fcp) : null,
      };
    });

    const issues: string[] = [];
    let severity: TestResult['severity'] = 'info';

    // Load time check — network aware
    if (loadTime > thresholds.critical) {
      issues.push(`Very slow load time: ${loadTime}ms (threshold: ${thresholds.critical}ms on ${network.quality} network)`);
      severity = 'critical';
    } else if (loadTime > thresholds.slow) {
      issues.push(`Slow load time: ${loadTime}ms (threshold: ${thresholds.slow}ms on ${network.quality} network)`);
      if (severity === 'info') severity = 'medium';
    }

    // FCP check
    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 3000) {
      issues.push(`Slow First Contentful Paint: ${metrics.firstContentfulPaint}ms (recommended: <3000ms)`);
      if (severity === 'info') severity = 'low';
    }

    // Resource count
    if (metrics.resourceCount > 100) {
      issues.push(`Too many resources: ${metrics.resourceCount} (recommended: <100)`);
      if (severity === 'info') severity = 'low';
    }

    // Network quality note
    const networkNote = network.quality !== 'fast' && network.quality !== 'unknown'
      ? ` | Note: ${network.note}`
      : '';

    if (issues.length > 0) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        severity,
        message: issues.join(' | ') + networkNote,
        duration: Date.now() - start,
        metadata: { loadTime, ...metrics, networkQuality: network.quality, networkLatency: network.latencyMs },
      };
    }

    return {
      id: testCase.id,
      name: testCase.name,
      status: 'passed',
      severity: 'info',
      message: `Loaded in ${loadTime}ms. FCP: ${metrics.firstContentfulPaint ?? 'N/A'}ms. DOM interactive: ${metrics.domInteractive}ms. Resources: ${metrics.resourceCount}. ${network.note}`,
      duration: Date.now() - start,
      metadata: { loadTime, ...metrics, networkQuality: network.quality, networkLatency: network.latencyMs },
    };
  } catch (err) {
    return {
      id: testCase.id,
      name: testCase.name,
      status: 'error',
      severity: 'high',
      message: `Performance test failed: ${(err as Error).message}`,
      duration: Date.now() - start,
    };
  }
}
