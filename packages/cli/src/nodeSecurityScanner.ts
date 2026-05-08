/**
 * Node.js Security Scanner
 * Pure Node.js alternative to Python security-agent
 * Provides basic security checks without external dependencies
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface SecurityFinding {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'failed' | 'passed' | 'warning';
  what: string;
  why: string;
  how: string;
  evidence?: string[];
}

export interface SecurityScanResults {
  url: string;
  timestamp: string;
  findings: SecurityFinding[];
  score: number;
  passed: number;
  failed: number;
}

class NodeSecurityScanner {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async scan(url: string, authEmail?: string, authPassword?: string): Promise<SecurityScanResults> {
    if (!this.browser) await this.init();

    const page = await this.browser!.newPage();
    const findings: SecurityFinding[] = [];

    try {
      // Authenticate if credentials provided
      if (authEmail && authPassword) {
        await this.authenticate(page, url, authEmail, authPassword);
      }

      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Run security checks
      findings.push(...(await this.checkMixedContent(page, url)));
      findings.push(...(await this.checkCookieSecurity(page)));
      findings.push(...(await this.checkSecurityHeaders(page, url)));
      findings.push(...(await this.checkConsoleErrors(page, url)));
      findings.push(...(await this.checkInlineScripts(page)));
      findings.push(...(await this.checkCORSIssues(page)));

      // Calculate score
      const failed = findings.filter(f => f.status === 'failed').length;
      const critical = findings.filter(f => f.severity === 'critical' && f.status === 'failed').length;
      const score = Math.max(0, 100 - (critical * 25) - (failed * 5));

      return {
        url,
        timestamp: new Date().toISOString(),
        findings,
        score,
        passed: findings.filter(f => f.status === 'passed').length,
        failed,
      };
    } finally {
      await page.close();
    }
  }

  private async authenticate(
    page: Page,
    url: string,
    email: string,
    password: string
  ): Promise<void> {
    // Try common login patterns
    const loginSelectors = [
      'input[type="email"]',
      'input[type="text"]',
      'input[placeholder*="email" i]',
      'input[name="email"]',
      '[type="email"]',
    ];

    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '[type="password"]',
    ];

    try {
      // Find and fill email
      for (const selector of loginSelectors) {
        const emailInput = await page.$(selector);
        if (emailInput) {
          await emailInput.type(email);
          break;
        }
      }

      // Find and fill password
      for (const selector of passwordSelectors) {
        const passInput = await page.$(selector);
        if (passInput) {
          await passInput.type(password);
          break;
        }
      }

      // Try to find and click submit
      const submitSelectors = [
        'button[type="submit"]',
        'button:contains("Login")',
        'button:contains("Sign")',
        '[type="submit"]',
      ];

      for (const selector of submitSelectors) {
        const submitBtn = await page.$(selector);
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForNavigation({ timeout: 5000 }).catch(() => null);
          break;
        }
      }
    } catch (err) {
      console.warn('Authentication attempt failed, continuing anyway');
    }
  }

  private async checkMixedContent(
    page: Page,
    url: string
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const resources = await page.evaluate(() => {
      return {
        images: Array.from(document.querySelectorAll('img')).map((el: any) => el.src),
        scripts: Array.from(document.querySelectorAll('script')).map((el: any) => el.src).filter((s: string) => !!s),
        links: Array.from(document.querySelectorAll('link')).map((el: any) => el.href).filter((h: string) => !!h),
        stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((el: any) => el.href),
      };
    });

    const isHttps = url.startsWith('https://');
    const httpResources: string[] = [];

    if (isHttps) {
      [...resources.images, ...resources.scripts, ...resources.links, ...resources.stylesheets].forEach((src: string) => {
        if (src.startsWith('http://')) {
          httpResources.push(src);
        }
      });
    }

    if (httpResources.length > 0) {
      findings.push({
        id: 'SEC-001',
        name: 'Mixed Content Detected',
        severity: 'high',
        status: 'failed',
        what: `Found ${httpResources.length} insecure (HTTP) resources on HTTPS page`,
        why: 'HTTPS pages should not load HTTP resources (mixed content). This can be exploited by MITM attacks.',
        how: 'Convert all HTTP resources to HTTPS or use protocol-relative URLs (//example.com/resource)',
        evidence: httpResources.slice(0, 5),
      });
    } else if (isHttps) {
      findings.push({
        id: 'SEC-001',
        name: 'No Mixed Content',
        severity: 'info',
        status: 'passed',
        what: 'All resources loaded over HTTPS',
        why: 'Good security practice for HTTPS sites',
        how: 'Continue monitoring for mixed content',
      });
    }

    return findings;
  }

  private async checkCookieSecurity(page: Page): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const cookies = await page.cookies();

    const insecureCookies = cookies.filter((c: any) => !c.secure && !c.name.startsWith('__'));
    const missingHttpOnly = cookies.filter((c: any) => !c.httpOnly && !c.name.startsWith('__'));
    const missingSameSite = cookies.filter((c: any) => !c.sameSite && !c.name.startsWith('__'));

    if (insecureCookies.length > 0) {
      findings.push({
        id: 'SEC-002-A',
        name: 'Insecure Cookies',
        severity: 'high',
        status: 'failed',
        what: `Found ${insecureCookies.length} cookies without Secure flag`,
        why: 'Cookies without Secure flag can be sent over HTTP, exposing them to eavesdropping',
        how: 'Set Secure flag on all cookies: Set-Cookie: name=value; Secure',
        evidence: insecureCookies.map((c: any) => c.name),
      });
    }

    if (missingHttpOnly.length > 0) {
      findings.push({
        id: 'SEC-002-B',
        name: 'Missing HttpOnly Flag',
        severity: 'medium',
        status: 'failed',
        what: `Found ${missingHttpOnly.length} cookies without HttpOnly flag`,
        why: 'Cookies without HttpOnly flag are accessible to JavaScript (XSS vulnerability)',
        how: 'Set HttpOnly flag: Set-Cookie: name=value; HttpOnly; Secure',
        evidence: missingHttpOnly.map((c: any) => c.name),
      });
    }

    if (missingSameSite.length > 0) {
      findings.push({
        id: 'SEC-002-C',
        name: 'Missing SameSite Flag',
        severity: 'medium',
        status: 'failed',
        what: `Found ${missingSameSite.length} cookies without SameSite flag`,
        why: 'Missing SameSite flag leaves cookies vulnerable to CSRF attacks',
        how: 'Set SameSite flag: Set-Cookie: name=value; SameSite=Strict',
        evidence: missingSameSite.map((c: any) => c.name),
      });
    }

    return findings;
  }

  private async checkSecurityHeaders(page: Page, url: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      const headers = response?.headers() || {};

      const requiredHeaders = [
        { name: 'X-Content-Type-Options', severity: 'high', why: 'Prevents MIME sniffing attacks' },
        { name: 'X-Frame-Options', severity: 'high', why: 'Prevents clickjacking attacks' },
        { name: 'Content-Security-Policy', severity: 'high', why: 'Protects against XSS attacks' },
        { name: 'Strict-Transport-Security', severity: 'high', why: 'Enforces HTTPS' },
        { name: 'X-XSS-Protection', severity: 'medium', why: 'Legacy XSS protection' },
      ];

      requiredHeaders.forEach(header => {
        if (headers[header.name.toLowerCase()]) {
          findings.push({
            id: `SEC-003-${header.name}`,
            name: `Has ${header.name}`,
            severity: 'info',
            status: 'passed',
            what: `${header.name} header is present`,
            why: header.why,
            how: 'Header is properly configured',
          });
        } else {
          findings.push({
            id: `SEC-003-${header.name}`,
            name: `Missing ${header.name}`,
            severity: header.severity as 'high' | 'medium',
            status: 'failed',
            what: `${header.name} header is missing`,
            why: header.why,
            how: `Add header: ${header.name}: <value>`,
          });
        }
      });
    } catch (err) {
      findings.push({
        id: 'SEC-003',
        name: 'Could not check security headers',
        severity: 'low',
        status: 'warning',
        what: 'Failed to retrieve response headers',
        why: 'May be blocked by network policies',
        how: 'Check network configuration',
      });
    }

    return findings;
  }

  private async checkConsoleErrors(page: Page, url: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const errors: string[] = [];

    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (err) {
      // Continue anyway
    }

    if (errors.length > 0) {
      findings.push({
        id: 'SEC-004',
        name: 'Console Errors Detected',
        severity: 'low',
        status: 'warning',
        what: `Found ${errors.length} console errors`,
        why: 'Console errors may indicate security or functionality issues',
        how: 'Review browser console for errors',
        evidence: errors.slice(0, 3),
      });
    }

    return findings;
  }

  private async checkInlineScripts(page: Page): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const inlineScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script:not([src])')).length;
    });

    if (inlineScripts > 0) {
      findings.push({
        id: 'SEC-005',
        name: 'Inline Scripts Detected',
        severity: 'medium',
        status: 'warning',
        what: `Found ${inlineScripts} inline <script> tags`,
        why: 'Inline scripts increase XSS vulnerability and complicate CSP',
        how: 'Move scripts to external files and use Content-Security-Policy',
      });
    }

    return findings;
  }

  private async checkCORSIssues(page: Page): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const corsIssues: string[] = [];

    page.on('response', (response: any) => {
      const allowOrigin = response.headers()['access-control-allow-origin'];
      if (allowOrigin === '*') {
        corsIssues.push(response.url());
      }
    });

    try {
      await page.reload({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => null);
    } catch {
      // Continue anyway
    }

    if (corsIssues.length > 0) {
      findings.push({
        id: 'SEC-006',
        name: 'Overly Permissive CORS',
        severity: 'high',
        status: 'failed',
        what: `Found ${corsIssues.length} endpoints with Access-Control-Allow-Origin: *`,
        why: 'CORS * allows any site to access your API, potential data exposure',
        how: 'Specify exact domains: Access-Control-Allow-Origin: https://trusted.com',
        evidence: corsIssues.slice(0, 3),
      });
    }

    return findings;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI usage
async function runSecurityScan() {
  const url = process.argv[2] || 'https://example.com';
  const scanner = new NodeSecurityScanner();

  try {
    console.log(`🔍 Scanning ${url}...`);
    const results = await scanner.scan(url);

    console.log(`\n✅ Security Scan Complete\n`);
    console.log(`Score: ${results.score}/100`);
    console.log(`Passed: ${results.passed} | Failed: ${results.failed}\n`);

    results.findings.forEach(finding => {
      const icon = finding.status === 'passed' ? '✓' : finding.status === 'failed' ? '✗' : '⚠';
      console.log(`${icon} [${finding.severity.toUpperCase()}] ${finding.name}`);
      console.log(`  What: ${finding.what}`);
      console.log(`  Why: ${finding.why}`);
      console.log(`  How: ${finding.how}`);
      if (finding.evidence) {
        console.log(`  Evidence: ${finding.evidence.join(', ')}`);
      }
      console.log();
    });
  } finally {
    await scanner.close();
  }
}

export { NodeSecurityScanner };

// Run if called directly
if (require.main === module) {
  runSecurityScan().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
