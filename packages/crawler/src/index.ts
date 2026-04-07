import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { AuthCredentials, SiteCrawlOptions } from '@qa-detective/shared';

export interface FormInfo {
  action: string;
  method: string;
  fields: string[];
}

export interface CrawlResult {
  url: string;
  title: string;
  links: string[];
  forms: FormInfo[];
  errors: string[];
  authenticated?: boolean;
}

export interface SiteCrawlResult {
  baseUrl: string;
  pages: CrawlResult[];
  totalPages: number;
  skippedUrls: string[];
  authenticated: boolean;
}

const IGNORED_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|webp|pdf|zip|mp4|mp3|woff|woff2|ttf|css|js)(\?.*)?$/i;
const MAX_PAGES_DEFAULT = 10;

// Common selectors for login forms
const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[name="username"]',
  'input[id="email"]',
  'input[placeholder*="email" i]',
  'input[placeholder*="username" i]',
];

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[name="password"]',
  'input[id="password"]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Sign in")',
  'button:has-text("Login")',
  'button:has-text("Log in")',
  'button:has-text("Continue")',
];

function normaliseUrl(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base);
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function getRootDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isSameOrigin(url: string, base: string): boolean {
  try {
    const urlDomain = getRootDomain(url);
    const baseDomain = getRootDomain(base);
    if (!urlDomain || !baseDomain) return false;
    return urlDomain === baseDomain;
  } catch {
    return false;
  }
}

async function findSelector(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el) return selector;
    } catch {
      continue;
    }
  }
  return null;
}

async function performLogin(
  page: Page,
  loginUrl: string,
  credentials: AuthCredentials
): Promise<boolean> {
  try {
    console.log(`  🔑 Attempting login at ${loginUrl}...`);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Find email/username field
    const emailSelector = credentials.emailSelector
      ?? await findSelector(page, EMAIL_SELECTORS);
    if (!emailSelector) {
      console.log('  ⚠️  Could not find email/username field');
      return false;
    }

    // Find password field
    const passwordSelector = credentials.passwordSelector
      ?? await findSelector(page, PASSWORD_SELECTORS);
    if (!passwordSelector) {
      console.log('  ⚠️  Could not find password field');
      return false;
    }

    // Find submit button
    const submitSelector = credentials.submitSelector
      ?? await findSelector(page, SUBMIT_SELECTORS);
    if (!submitSelector) {
      console.log('  ⚠️  Could not find submit button');
      return false;
    }

    // Dismiss overlays before clicking
    await page.evaluate(() => {
      const overlays = document.querySelectorAll(
        '[class*="fixed"][class*="bottom"], [class*="fixed"][class*="z-50"], ' +
        '[class*="cookie"], [class*="consent"], [class*="banner"], ' +
        '[class*="toast"], [class*="notification"], [class*="popup"]'
      );
      overlays.forEach((el: Element) => el.remove());
    });
    await page.waitForTimeout(300);

    // Fill and submit
    await page.fill(emailSelector, credentials.email);
    await page.fill(passwordSelector, credentials.password);

    // Force click — bypass any remaining overlays
    try {
      await page.click(submitSelector, { force: true, timeout: 10000 });
    } catch {
      await page.evaluate((sel: string) => {
        const btn = document.querySelector(sel) as HTMLElement;
        if (btn) btn.click();
      }, submitSelector);
    }

    // Wait for navigation after login
    await page.waitForURL(url => url.href !== loginUrl, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('domcontentloaded');

    // Check if login succeeded — if we're still on the login page, it failed
    const currentUrl = page.url();
    const stillOnLogin = normaliseUrl(currentUrl, loginUrl) === normaliseUrl(loginUrl, loginUrl);

    if (stillOnLogin) {
      console.log('  ⚠️  Login may have failed — still on login page');
      return false;
    }

    console.log(`  ✅ Login successful — now at ${currentUrl}`);
    return true;
  } catch (err) {
    console.log(`  ⚠️  Login failed: ${(err as Error).message}`);
    return false;
  }
}

async function crawlSinglePage(
  page: Page,
  url: string,
  baseUrl: string,
  authenticated = false
): Promise<CrawlResult> {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (err) {
    return {
      url, title: '', links: [], forms: [], errors: [`Navigation failed: ${(err as Error).message}`],
      authenticated,
    };
  }

  const title = await page.title().catch(() => '');

  const links = await page.$$eval('a[href]', (anchors, base) =>
    anchors.map(a => {
      try { return new URL((a as HTMLAnchorElement).href, base).href; } catch { return ''; }
    }).filter(Boolean),
    baseUrl
  ).catch(() => [] as string[]);

  const forms = await page.$$eval('form', formEls =>
    formEls.map(form => ({
      action: (form as HTMLFormElement).action || '',
      method: (form as HTMLFormElement).method || 'get',
      fields: Array.from(form.querySelectorAll('input, textarea, select'))
        .map(el => (el as HTMLInputElement).name || (el as HTMLInputElement).type)
        .filter(Boolean),
    }))
  ).catch(() => [] as FormInfo[]);

  return { url, title, links: [...new Set(links)], forms, errors, authenticated };
}

// ─── Auto-detect login page from crawled links ───────────────────────────────────
export function detectLoginUrl(links: string[], baseUrl: string): string | null {
  const loginPatterns = [
    /\/login$/i, /\/auth$/i, /\/signin$/i, /\/sign-in$/i,
    /\/log-in$/i, /\/account\/login/i, /\/user\/login/i,
    /\/auth\/login/i, /\/auth\/signin/i,
  ];

  for (const pattern of loginPatterns) {
    const match = links.find(l => pattern.test(l));
    if (match) return match;
  }
  return null;
}

// ─── Single page crawl (backwards compatible) ─────────────────────────────────
export async function crawlPage(url: string): Promise<CrawlResult> {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const page = await browser.newPage();
  try {
    return await crawlSinglePage(page, url, url);
  } finally {
    await browser.close();
  }
}

// ─── Multi-page BFS crawl with optional auth ──────────────────────────────────
export async function crawlSite(
  startUrl: string,
  maxPages = MAX_PAGES_DEFAULT,
  options: SiteCrawlOptions = {}
): Promise<SiteCrawlResult> {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser: Browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  const visited = new Set<string>();
  const queue: string[] = [];
  const skippedUrls: string[] = [];
  const pages: CrawlResult[] = [];
  let authenticated = false;

  const normalised = normaliseUrl(startUrl, startUrl);
  if (!normalised) throw new Error(`Invalid start URL: ${startUrl}`);
  queue.push(normalised);

  // Create a persistent browser context to maintain session across pages
  const context: BrowserContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; QADetective/1.0)',
  });

  try {
    // Perform login if credentials provided
    if (options.auth) {
      const loginPage = await context.newPage();
      const loginUrl = options.auth.loginUrl ?? startUrl;
      authenticated = await performLogin(loginPage, loginUrl, options.auth);
      await loginPage.close();

      if (authenticated) {
        console.log('  🔓 Crawling authenticated pages...');
      } else {
        console.log('  ⚠️  Proceeding without authentication');
      }
    }

    while (queue.length > 0 && visited.size < maxPages) {
      const currentUrl = queue.shift()!;

      if (visited.has(currentUrl)) continue;
      if (IGNORED_EXTENSIONS.test(currentUrl)) {
        skippedUrls.push(currentUrl);
        continue;
      }

      visited.add(currentUrl);
      console.log(`  🔗 Crawling [${visited.size}/${maxPages}]: ${currentUrl}`);

      const page = await context.newPage();
      try {
        const result = await crawlSinglePage(page, currentUrl, startUrl, authenticated);
        pages.push(result);

        for (const link of result.links) {
          const norm = normaliseUrl(link, startUrl);
          if (
            norm &&
            !visited.has(norm) &&
            !queue.includes(norm) &&
            isSameOrigin(norm, startUrl) &&
            !IGNORED_EXTENSIONS.test(norm)
          ) {
            queue.push(norm);
          } else if (norm && !isSameOrigin(norm, startUrl)) {
            skippedUrls.push(norm);
          }
        }
      } finally {
        await page.close();
      }
    }

    for (const url of queue) skippedUrls.push(url);

  } finally {
    await context.close();
    await browser.close();
  }

  return {
    baseUrl: startUrl,
    pages,
    totalPages: pages.length,
    skippedUrls: [...new Set(skippedUrls)],
    authenticated,
  };
}
