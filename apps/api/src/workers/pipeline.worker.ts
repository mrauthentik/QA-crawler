import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({path: resolve(__dirname, '../../../.env')})

import { Worker } from 'bullmq'
import fs from 'fs'
import path from 'path'
import { crawlSite } from '@qa-detective/crawler';
import { generateTestPlan, flattenSiteCrawl } from '@qa-detective/ai-engine';
import { executeTestPlan } from '@qa-detective/executor';
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
        const { runId, url, description } = job.data;
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
      const siteCrawl = await crawlSite(url, 10);
      console.log(`📄 Crawled ${siteCrawl.totalPages} page(s): ${siteCrawl.pages.map(p => p.url).join(', ')}`);
      await job.updateProgress(30);

      // Phase 2: Generate test plan from flattened multi-page data
      console.log('🤖 Generating test plan...');
      const crawlResult = flattenSiteCrawl({
        baseUrl: siteCrawl.baseUrl,
        pages: siteCrawl.pages,
        totalPages: siteCrawl.totalPages,
      });
      // Save crawled pages metadata
      await saveCrawledPages(runId, siteCrawl.pages.map(p => ({
        url: p.url,
        title: p.title,
        formsCount: p.forms.length,
        linksCount: p.links.length,
      })));

      const testPlan = await generateTestPlan(description, crawlResult);
      await job.updateProgress(50);

      // Phase 3: Execute tests
      console.log('🔬 Executing tests...');
      const executionResult = await executeTestPlan(url, testPlan.cases, SCREENSHOTS_DIR);
      await job.updateProgress(75);

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
    }, {connection}

)

pipelineWorker.on('completed', job=> {
    console.log(`✅ Job ${job.id} completed`);
})

pipelineWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
})

console.log('👷 Pipeline worker started — waiting for jobs...');// Note: In production, SCREENSHOTS_DIR points to /tmp which is ephemeral
// Screenshots will not persist across deploys — add S3/Cloudinary for persistence
