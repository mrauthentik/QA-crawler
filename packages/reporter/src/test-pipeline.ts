import * as dotenv from 'dotenv'
import {resolve} from 'path'
dotenv.config({path: resolve(__dirname, '../../../.env')})

import { crawlPage } from '../../crawler/src/index'
import {generateTestPlan} from '../../ai-engine/src/planner'
import {executeTestPlan} from '../../executor/src/index'
import { generateReport, printReport} from './index'

async function runFullPipeline(url:string, appDescription: string) {
     console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🕵️  QA DETECTIVE — FULL PIPELINE                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n🎯 Target: ${url}`);
  console.log(`📋 Description: ${appDescription}\n`);

  // ── PHASE 1: CRAWL ──────────────────────────────────────────
  console.log('📡 PHASE 1: Crawling the application...');
  const crawlResult = await crawlPage(url);
  console.log(`✅ Crawl complete — found ${crawlResult.links.length} links, ${crawlResult.forms.length} forms\n`);

  // ── PHASE 2: AI TEST GENERATION ─────────────────────────────
  console.log('🤖 PHASE 2: AI generating test plan...');
  const testPlan = await generateTestPlan(appDescription, crawlResult);
  console.log(`✅ Test plan ready — ${testPlan.totalTests} test cases generated\n`);

  // ── PHASE 3: EXECUTION ──────────────────────────────────────
  console.log('🔬 PHASE 3: Executing tests...');
  const executionResult = await executeTestPlan(url, testPlan.cases);
  console.log(`✅ Execution complete — ${executionResult.passed} passed, ${executionResult.failed} failed\n`);

  // ── PHASE 4: REPORT ─────────────────────────────────────────
  console.log('📝 PHASE 4: Generating detective report...');
  const report = await generateReport(executionResult);

  printReport(report);
}


runFullPipeline(
    'https://example.com',
    'A simple information website. It should display a heading , descriptive text, and and a link to more information. It should load fast, have no broken links, and follow web security best practices.'
).catch(console.error)