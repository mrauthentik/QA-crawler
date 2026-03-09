import { executeTestPlan } from './index';

// These are the test cases the AI generated for us earlier
const testCases = [
  {
    id: 'TC001',
    name: 'Verify Page Title',
    type: 'functional' as const,
    priority: 'low' as const,
    steps: ['Navigate to URL', 'Check title exists'],
    expectedOutcome: 'Page has a valid title',
  },
  {
    id: 'TC002',
    name: 'Verify Page Content',
    type: 'functional' as const,
    priority: 'low' as const,
    steps: ['Navigate to URL', 'Check page has content'],
    expectedOutcome: 'Page has meaningful content',
  },
  {
    id: 'TC003',
    name: 'Verify No Broken Links',
    type: 'navigation' as const,
    priority: 'medium' as const,
    steps: ['Navigate to URL', 'Check all links return 200'],
    expectedOutcome: 'All links are working',
  },
  {
    id: 'TC004',
    name: 'Verify Page Load Time',
    type: 'performance' as const,
    priority: 'high' as const,
    steps: ['Navigate to URL', 'Measure load time'],
    expectedOutcome: 'Page loads in under 3 seconds',
  },
  {
    id: 'TC005',
    name: 'Verify Security Headers',
    type: 'security' as const,
    priority: 'high' as const,
    steps: ['Navigate to URL', 'Check response headers'],
    expectedOutcome: 'All required security headers present',
  },
];

async function main() {
  console.log('🕵️  QA Detective — Executor Starting\n');

  const result = await executeTestPlan('https://example.com', testCases);

  console.log('\n════════════════════════════════════');
  console.log('           EXECUTION SUMMARY');
  console.log('════════════════════════════════════');
  console.log(`URL:      ${result.url}`);
  console.log(`Total:    ${result.totalTests} tests`);
  console.log(`✅ Passed: ${result.passed}`);
  console.log(`❌ Failed: ${result.failed}`);
  console.log(`⚠️  Errors: ${result.errors}`);
  console.log(`⏱  Time:   ${(result.duration / 1000).toFixed(1)}s`);
  console.log('════════════════════════════════════\n');

  console.log('DETAILED RESULTS:');
  result.results.forEach(r => {
    const icon = r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : '⚠️';
    console.log(`\n${icon} [${r.severity.toUpperCase()}] ${r.id}: ${r.name}`);
    console.log(`   Status:   ${r.status}`);
    console.log(`   Message:  ${r.message}`);
    console.log(`   Duration: ${r.duration}ms`);
    if (r.screenshot) console.log(`   Screenshot: ${r.screenshot}`);
  });
}

main().catch(console.error);
