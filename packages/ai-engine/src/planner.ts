import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export interface TestCase {
  id: string;
  name: string;
  type: 'functional' | 'navigation' | 'form' | 'security' | 'performance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: string[];
  expectedOutcome: string;
}

export interface TestPlan {
  appDescription: string;
  totalTests: number;
  cases: TestCase[];
}

export interface CrawlSummary {
  url: string;
  title: string;
  links: string[];
  forms: Array<{
    action: string;
    method: string;
    fields: string[];
  }>;
  errors: string[];
}

function extractJSON(raw: string): string {
  // Remove markdown code fences
  const cleaned = raw.replace(/```json|```/g, '').trim();

  // Find ALL JSON objects in the response — take the largest one
  const matches: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        matches.push(cleaned.slice(start, i + 1));
        start = -1;
      }
    }
  }

  if (matches.length === 0) throw new Error('No JSON object found in AI response');

  // Return the largest JSON block — that's the complete one
  return matches.sort((a, b) => b.length - a.length)[0];
}

const MANDATORY_SECURITY_TESTS = [
  { name: 'Verify HTTPS Connection and SSL', priority: 'critical' },
  { name: 'Test Content Security Policy (CSP)', priority: 'high' },
  { name: 'Check XSS Protection Headers', priority: 'high' },
  { name: 'Verify Clickjacking Protection', priority: 'high' },
];

export async function generateTestPlan(
  appDescription: string,
  crawlData: CrawlSummary
): Promise<TestPlan> {
  console.log('🤖 AI is analysing the crawl data...');

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in your .env file');
  }

  const hasForms = crawlData.forms.length > 0;

  const prompt = `You are a senior QA engineer. Generate a test plan as a single JSON object.

APP: ${appDescription}
URL: ${crawlData.url}
TITLE: ${crawlData.title}
LINKS (${crawlData.links.length}): ${crawlData.links.slice(0, 8).join(', ') || 'none'}
FORMS: ${hasForms
    ? crawlData.forms.map(f => `action="${f.action}" fields=[${f.fields.join(', ')}]`).join(' | ')
    : 'NONE — do not create form tests'}
CONSOLE ERRORS: ${crawlData.errors.join(', ') || 'none'}

Generate test cases in this EXACT order with these EXACT names and types:

1. { "id": "TC001", "name": "Page Load Performance Test", "type": "performance", "priority": "medium" }
${crawlData.links.length > 0
    ? '2. { "id": "TC002", "name": "Verify Navigation Links", "type": "navigation", "priority": "medium" }'
    : ''}
${hasForms
    ? crawlData.forms.map((f, i) => `${crawlData.links.length > 0 ? i + 3 : i + 2}. { "id": "TC00${crawlData.links.length > 0 ? i + 3 : i + 2}", "name": "Test Form Submission", "type": "form", "priority": "high" }`).join('\n')
    : ''}
${MANDATORY_SECURITY_TESTS.map((t, i) => {
    const base = 1 + (crawlData.links.length > 0 ? 1 : 0) + (hasForms ? crawlData.forms.length : 0);
    return `${base + i + 1}. { "id": "TC00${base + i + 1}", "name": "${t.name}", "type": "security", "priority": "${t.priority}" }`;
  }).join('\n')}

For each test case add:
- "steps": array of 2-3 steps
- "expectedOutcome": string describing success

RULES:
- Return ONLY the JSON object — no explanation, no extra text before or after
- Do not add a "topic" field
- Do not rename any test case
- totalTests must equal the number of cases

JSON structure:
{
  "appDescription": "string",
  "totalTests": number,
  "cases": [...]
}`;

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'You are a JSON API. You output only valid JSON objects. Never add explanations or text outside the JSON.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const raw = response.choices[0].message.content || '';

  try {
    const jsonStr = extractJSON(raw);
    const plan = JSON.parse(jsonStr) as TestPlan;

    // Strip any extra fields the AI added (like "topic")
    plan.cases = plan.cases.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      priority: c.priority,
      steps: c.steps,
      expectedOutcome: c.expectedOutcome,
    }));

    // Remove form tests if no forms exist
    if (!hasForms) {
      plan.cases = plan.cases.filter(c => c.type !== 'form');
    }

    // Ensure mandatory security tests are present — inject if AI dropped any
    for (const mandatory of MANDATORY_SECURITY_TESTS) {
      if (!plan.cases.find(c => c.name === mandatory.name)) {
        console.warn(`⚠ Injecting missing security test: "${mandatory.name}"`);
        plan.cases.push({
          id: `TC${String(plan.cases.length + 1).padStart(3, '0')}`,
          name: mandatory.name,
          type: 'security',
          priority: mandatory.priority as 'critical' | 'high',
          steps: ['Navigate to the target URL', 'Inspect response headers and security configuration'],
          expectedOutcome: `${mandatory.name} passes all checks`,
        });
      }
    }

    plan.totalTests = plan.cases.length;

    // Log distribution
    const typeCounts = plan.cases.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('📋 Test type distribution:', typeCounts);

    return plan;

  } catch (err) {
    console.error('❌ Raw AI response:', raw);
    throw new Error(`AI engine failed to parse test plan: ${(err as Error).message}`);
  }
}
