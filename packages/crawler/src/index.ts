import { chromium, Browser, Page } from 'playwright';

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
}

export interface SiteCrawlResult {
  baseUrl: string;
  pages: CrawlResult[];
  totalPages: number;
  skippedUrls: string[];
}

const IGNORED_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|webp|pdf|zip|mp4|mp3|woff|woff2|ttf|css|js)(\?.*)?$/i;
const MAX_PAGES_DEFAULT = 10;

function normaliseUrl(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base);
    // Strip hash — #section links are the same page
    url.hash = '';
    // Strip trailing slash for deduplication
    const href = url.href.replace(/\/$/, '');
    return href;
  } catch {
    return null;
  }
}

function getRootDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Strip www. prefix for comparison
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
    // Same root domain — treat www.example.com and example.com as same origin
    return urlDomain === baseDomain;
  } catch {
    return false;
  }
}

async function crawlSinglePage(
  page: Page,
  url: string,
  baseUrl: string
): Promise<CrawlResult> {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (err) {
    return { url, title: '', links: [], forms: [], errors: [`Navigation failed: ${(err as Error).message}`] };
  }

  const title = await page.title().catch(() => '');

  const links = await page.$$eval('a[href]', (anchors, base) =>
    anchors
      .map(a => {
        try { return new URL((a as HTMLAnchorElement).href, base).href; } catch { return ''; }
      })
      .filter(Boolean),
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

  return {
    url,
    title,
    links: [...new Set(links)],
    forms,
    errors,
  };
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

// ─── Multi-page BFS crawl ─────────────────────────────────────────────────────
export async function crawlSite(
  startUrl: string,
  maxPages = MAX_PAGES_DEFAULT
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

  const normalised = normaliseUrl(startUrl, startUrl);
  if (!normalised) throw new Error(`Invalid start URL: ${startUrl}`);

  queue.push(normalised);

  try {
    while (queue.length > 0 && visited.size < maxPages) {
      const currentUrl = queue.shift()!;

      if (visited.has(currentUrl)) continue;
      if (IGNORED_EXTENSIONS.test(currentUrl)) {
        skippedUrls.push(currentUrl);
        continue;
      }

      visited.add(currentUrl);
      console.log(`  🔗 Crawling [${visited.size}/${maxPages}]: ${currentUrl}`);

      const page = await browser.newPage();
      try {
        const result = await crawlSinglePage(page, currentUrl, startUrl);
        pages.push(result);

        // Enqueue same-origin links not yet visited
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

    // Track URLs we found but didn't visit due to maxPages cap
    for (const url of queue) {
      skippedUrls.push(url);
    }

  } finally {
    await browser.close();
  }

  return {
    baseUrl: startUrl,
    pages,
    totalPages: pages.length,
    skippedUrls: [...new Set(skippedUrls)],
  };
}
