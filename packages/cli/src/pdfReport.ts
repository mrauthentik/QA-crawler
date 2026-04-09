import puppeteer from 'puppeteer';

/**
 * Generates a PDF report from scan results.
 * @param result The scan result object
 * @param outputPath Where to save the PDF
 */
export async function generatePdfReport(result: any, outputPath: string) {
  // Simple HTML template for the report
  const html = `
    <html>
      <head>
        <title>QA Detective Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 2em; }
          h1 { color: #2a4365; }
          pre { background: #f4f4f4; padding: 1em; border-radius: 6px; }
          .result { margin-bottom: 1.5em; }
          .severity-high { color: #c53030; }
          .severity-info { color: #2b6cb0; }
        </style>
      </head>
      <body>
        <h1>QA Detective Scan Report</h1>
        <p><b>URL:</b> ${result.url}</p>
        <p><b>Total Checks:</b> ${result.total}</p>
        <h2>Results</h2>
        ${result.results.map((r: any) => `
          <div class="result">
            <b>ID:</b> ${r.id || ''}<br/>
            <b>Name:</b> ${r.name || ''}<br/>
            <b>Status:</b> ${r.status || ''}<br/>
            <b>Severity:</b> <span class="severity-${r.severity}">${r.severity}</span><br/>
            <b>What:</b> ${r.what || ''}<br/>
            <b>Why:</b> ${r.why || ''}<br/>
            <b>How:</b> ${r.how || ''}<br/>
          </div>
        `).join('')}
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
  await browser.close();
}
