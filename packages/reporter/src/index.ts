import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

import OpenAI from 'openai';
import type { TestResult, ExecutionResult, DetectiveReport, Finding, Severity } from '@qa-detective/shared';

export type { TestResult, ExecutionResult, DetectiveReport, Finding } from '@qa-detective/shared';

const client = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

function calculateScore(results: TestResult[]): number {
  if (results.length === 0) return 0;

  const weights: Record<Severity, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
    info: 0,
  };

  let deductions = 0;
  for (const result of results) {
    if (result.status === 'failed' || result.status === 'error') {
      deductions += weights[result.severity];
    }
  }

  return Math.max(0, 100 - deductions);
}

function getGrade(score: number): string {
  if (score >= 90) return 'A — Excellent';
  if (score >= 75) return 'B — Good';
  if (score >= 60) return 'C — Needs Improvement';
  if (score >= 40) return 'D — Poor';
  return 'F — Critical Issues';
}

async function analyseWithAI(
  url: string,
  results: TestResult[]
): Promise<{ findings: Finding[]; recommendations: string[]; summary: string }> {
  console.log('🤖 AI Detective is analysing results...');

  const failedTests = results.filter(r => r.status !== 'passed');
  const passedTests = results.filter(r => r.status === 'passed');

  const prompt = `You are a senior security and QA detective writing an investigation report.

TARGET: ${url}

PASSED TESTS (${passedTests.length}):
${passedTests.map(t => `- ${t.id}: ${t.name} (${t.duration}ms)`).join('\n')}

FAILED/ERROR TESTS (${failedTests.length}):
${failedTests.map(t => `- ${t.id}: ${t.name}
  Status: ${t.status}
  Severity: ${t.severity}
  Message: ${t.message}`).join('\n\n')}

For each failed/error test, provide a detective-style analysis.
Also write an overall summary and 3-5 actionable recommendations.

Respond ONLY with this exact JSON structure, no extra text:
{
  "summary": "2-3 sentence executive summary of overall findings",
  "findings": [
    {
      "testId": "TC001",
      "testName": "test name",
      "status": "failed",
      "severity": "high",
      "what": "Plain English explanation of what was found",
      "why": "Why this is a problem and what risk it creates",
      "how": "Exact steps to fix this issue"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ]
}`;

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const raw = response.choices[0].message.content || '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('AI reporter did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const findings = parsed.findings.map((f: Finding) => {
    const original = results.find(r => r.id === f.testId);
    return { ...f, screenshot: original?.screenshot };
  });

  return {
    summary: parsed.summary,
    findings,
    recommendations: parsed.recommendations,
  };
}

export async function generateReport(
  executionResult: ExecutionResult
): Promise<DetectiveReport> {
  const score = calculateScore(executionResult.results);
  const grade = getGrade(score);

  const { summary, findings, recommendations } = await analyseWithAI(
    executionResult.url,
    executionResult.results
  );

  return {
    url: executionResult.url,
    score,
    grade,
    summary,
    findings,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

export function printReport(report: DetectiveReport): void {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🕵️  QA DETECTIVE — INVESTIGATION REPORT         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n🎯 TARGET:     ${report.url}`);
  console.log(`📅 DATE:       ${new Date(report.generatedAt).toLocaleString()}`);
  console.log(`📊 SCORE:      ${report.score}/100`);
  console.log(`🏆 GRADE:      ${report.grade}`);

  console.log('\n──────────────────────────────────────────────────────────');
  console.log('  EXECUTIVE SUMMARY');
  console.log('──────────────────────────────────────────────────────────');
  console.log(`\n${report.summary}\n`);

  if (report.findings.length > 0) {
    console.log('──────────────────────────────────────────────────────────');
    console.log('  FINDINGS');
    console.log('──────────────────────────────────────────────────────────');

    const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    const sorted = [...report.findings].sort(
      (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    );

    sorted.forEach((finding, i) => {
      const icon = finding.severity === 'critical' ? '🔴'
        : finding.severity === 'high' ? '🟠'
        : finding.severity === 'medium' ? '🟡'
        : '🟢';

      console.log(`\n${icon} FINDING ${i + 1}: ${finding.testName.toUpperCase()}`);
      console.log(`   Severity: ${finding.severity.toUpperCase()}`);
      console.log(`   Status:   ${finding.status.toUpperCase()}`);
      console.log(`\n   WHAT:  ${finding.what}`);
      console.log(`   WHY:   ${finding.why}`);
      console.log(`   FIX:   ${finding.how}`);
      if (finding.screenshot) {
        console.log(`   📸 Screenshot: ${finding.screenshot}`);
      }
    });
  } else {
    console.log('\n✅ No findings — all tests passed!');
  }

  console.log('\n──────────────────────────────────────────────────────────');
  console.log('  RECOMMENDATIONS');
  console.log('──────────────────────────────────────────────────────────\n');

  report.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                   END OF REPORT                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}
