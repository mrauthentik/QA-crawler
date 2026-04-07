import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({path: resolve(__dirname, '../../../.env')})

import { Worker } from 'bullmq'
import fs from 'fs'
import path from 'path'
import { crawlSite, detectLoginUrl } from '@qa-detective/crawler';
import { generateTestPlan, flattenSiteCrawl } from '@qa-detective/ai-engine';
import { executeTestPlan } from '@qa-detective/executor';
import { runSecurityAgent } from '@qa-detective/executor/src/runners/security-agent';
import { generateReport } from '@qa-detective/reporter';
import {
    updateTestRun,
    saveTestResults,
    saveRecommendations,
    saveFindings,
    saveCrawledPages,
} from '../db/index'

function getRedisConnection() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };
}

const connection = getRedisConnection();

export const pipelineWorker = new Worker(
    'pipeline',
    async (job) => {
        const { runId, url, description, authEmail, authPassword, authLoginUrl } = job.data;
        console.log(`\n🔄 Processing job ${job.id} for run ${runId}`);

        // Ensure screenshots dir exists
        const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || path.join(__dirname, '../../../screenshots');
        if (!fs.existsSync(SCREENSHOTS_DIR)) {
          fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        }

        try{
            // Update status to running
            await updateTestRun(runId, {status: 'running'})
            await job.updateProgress(10)

            // Phase 1: Multi-page crawl
      console.log(`📡 Crawling site: ${url}...`);
      // Auto-detect login URL from crawled links if not provided
      let resolvedLoginUrl = authLoginUrl;
      if (authEmail && authPassword && !resolvedLoginUrl) {
        // Quick single-page crawl to find login link
        const { crawlPage } = await import('@qa-detective/crawler');
        const homeCrawl = await crawlPage(url);
        resolvedLoginUrl = detectLoginUrl(homeCrawl.links, url) ?? undefined;
        if (resolvedLoginUrl) {
          console.log(`🔑 Auto-detected login page: ${resolvedLoginUrl}`);
        }
      }

      const crawlOptions = authEmail && authPassword ? {
        auth: {
          email: authEmail,
          password: authPassword,
          loginUrl: resolvedLoginUrl,
        }
      } : {};
      const siteCrawl = await crawlSite(url, 10, crawlOptions);
      console.log(`📄 Crawled ${siteCrawl.totalPages} page(s): ${siteCrawl.pages.map(p => p.url).join(', ')}`);
      await job.updateProgress(30);

      // Phase 2: Generate test plan from flattened multi-page data
      console.log('🤖 Generating test plan...');
      const crawlResult = flattenSiteCrawl({
        baseUrl: siteCrawl.baseUrl,
        pages: siteCrawl.pages,
        totalPages: siteCrawl.totalPages,
      });
      // Save crawled pages metadata + take screenshots of each page
      const { chromium } = await import('playwright');
      const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
      const screenshotBrowser = await chromium.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
      });

      const pagesWithScreenshots = await Promise.all(
        siteCrawl.pages.map(async (p, i) => {
          const screenshotPath = `${SCREENSHOTS_DIR}/page-${runId}-${i}.png`;
          try {
            const pg = await screenshotBrowser.newPage();
            await pg.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await pg.screenshot({ path: screenshotPath, fullPage: false });
            await pg.close();
            return {
              url: p.url,
              title: p.title,
              formsCount: p.forms.length,
              linksCount: p.links.length,
              screenshot: `/screenshots/page-${runId}-${i}.png`,
            };
          } catch {
            return {
              url: p.url,
              title: p.title,
              formsCount: p.forms.length,
              linksCount: p.links.length,
            };
          }
        })
      );

      await screenshotBrowser.close();
      await saveCrawledPages(runId, pagesWithScreenshots);

      const testPlan = await generateTestPlan(description, crawlResult);
      await job.updateProgress(50);

      // Phase 3: Execute tests
      console.log('🔬 Executing tests...');
      const executionResult = await executeTestPlan(url, testPlan.cases, SCREENSHOTS_DIR);
      await job.updateProgress(75);

      // Phase 3b: Python security agent
      console.log('🐍 Running Python security agent...');
      try {
        const agentResults = await runSecurityAgent(
          { id: 'SA000', name: 'Deep Security Analysis' },
          url,
          authEmail,
          authPassword,
          authLoginUrl,
        );
        // Merge agent results into execution results
        executionResult.results.push(...agentResults);
        executionResult.totalTests += agentResults.length;
        executionResult.passed += agentResults.filter(r => r.status === 'passed').length;
        executionResult.failed += agentResults.filter(r => r.status === 'failed').length;
        console.log(`🐍 Security agent found ${agentResults.filter(r => r.status === 'failed').length} issue(s)`);
      } catch (err) {
        console.error('🐍 Security agent error:', (err as Error).message);
      }
      await job.updateProgress(80);

      // Phase 4: Generate report
      console.log('📝 Generating report...');
      const report = await generateReport(executionResult);
      await job.updateProgress(90);

      // Save everything to database
      await updateTestRun(runId, {
        status: 'completed',
        score: report.score,
        grade: report.grade,
        summary: report.summary,
        completedAt: new Date(),
      });

      await saveTestResults(runId, executionResult.results.map(r => ({
        test_id: r.id,
        name: r.name,
        status: r.status,
        severity: r.severity,
        message: r.message,
        duration: r.duration,
        screenshot: r.screenshot
          ? `/screenshots/${path.basename(r.screenshot)}`
          : undefined,
      })));

      await saveRecommendations(runId, report.recommendations)
      await saveFindings(runId, report.findings.map(f => ({
        testId: f.testId,
        testName: f.testName,
        status: f.status,
        severity: f.severity,
        what: f.what,
        why: f.why,
        how: f.how,
        screenshot: f.screenshot ? `/screenshots/${path.basename(f.screenshot)}` : undefined,
      })))
      await job.updateProgress(100)
        console.log(`✅ Run ${runId} completed. Score: ${report.score}/100`);
      return { runId, score: report.score, grade: report.grade };


        }catch(err){
             console.error(`❌ Run ${runId} failed:`, err);
      await updateTestRun(runId, {
        status: 'failed',
        summary: `Pipeline failed: ${(err as Error).message}`,
      });
      throw err;
        }
    }, {
    connection,
    lockDuration: 300000,      // 5 minutes — long enough for k6 load test
    lockRenewTime: 60000,      // Renew every 60 seconds
    stalledInterval: 60000,    // Check for stalled jobs every 60 seconds
    maxStalledCount: 3,        // Allow 3 stall renewals before marking failed
}
)

pipelineWorker.on('completed', job=> {
    console.log(`✅ Job ${job.id} completed`);
})

pipelineWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
})

console.log('👷 Pipeline worker started — waiting for jobs...');// Note: In production, SCREENSHOTS_DIR points to /tmp which is ephemeral
// Screenshots will not persist across deploys — add S3/Cloudinary for persistence
