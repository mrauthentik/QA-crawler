import { chromium } from 'playwright';

export interface CrawlResult {
  url: string;
  title: string;
  links: string[];
  forms: FormInfo[];
  errors: string[];
}

export interface FormInfo {
  action: string;
  method: string;
  fields: string[];
}

export async function crawlPage(url: string): Promise<CrawlResult> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors: string[] = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  const title = await page.title();

  // Extract all links
  const links = await page.$$eval('a[href]', anchors =>
    anchors.map(a => (a as HTMLAnchorElement).href).filter(href =>
      href.startsWith('http')
    )
  );

  // Extract all forms
  const forms = await page.$$eval('form', formEls =>
    formEls.map(form => ({
      action: (form as HTMLFormElement).action || '',
      method: (form as HTMLFormElement).method || 'get',
      fields: Array.from(form.querySelectorAll('input, textarea, select'))
        .map(el => (el as HTMLInputElement).name || (el as HTMLInputElement).type)
        .filter(Boolean)
    }))
  );

  await browser.close();

  return { url, title, links: [...new Set(links)], forms, errors };
}
