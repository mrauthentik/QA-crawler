import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({path: resolve(__dirname, '../../../.env')})

import { Worker } from 'bullmq'
import { crawlPage } from '../../../packages/crawler/src/index'
import { generateTestPlan } from '../../../packages/ai-engine/src/planner';
import { executeTestPlan } from '../../../packages/executor/src/index';
import { generateReport } from '../../../packages/reporter/src/index';

import {
    updateTestRun,
    saveTestResults,
    saveRecommendations,
} from '../db/index'

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
}

export const pipelineWorker = new Worker(
    'pipeline',
    async (job) => {
        const { runId, url, description } = job.data;
        console.log(`\n🔄 Processing job ${job.id} for run ${runId}`);

        try{
            // Update status to running
            await updateTestRun(runId, {status: 'running'})
            await job.updateProgress(10)

            // Phase 1: Crawl
      console.log(`📡 Crawling ${url}...`);
      const crawlResult = await crawlPage(url);
      await job.updateProgress(30);

      // Phase 2: Generate test plan
      console.log('🤖 Generating test plan...');
      const testPlan = await generateTestPlan(description, crawlResult);
      await job.updateProgress(50);

      // Phase 3: Execute tests
      console.log('🔬 Executing tests...');
      const executionResult = await executeTestPlan(url, testPlan.cases);
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
        screenshot: r.screenshot,
      })));

      await saveRecommendations(runId, report.recommendations)
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

console.log('👷 Pipeline worker started — waiting for jobs...');