import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env FIRST before anything else runs
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

export async function generateTestPlan(
  appDescription: string,
  crawlData: CrawlSummary
): Promise<TestPlan> {
  console.log('🤖 AI is analysing the crawl data...');

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in your .env file');
  }

  const prompt = `You are a senior QA engineer and security analyst.
You have just crawled a web application and need to generate a comprehensive test plan.

APP DESCRIPTION (what the app is supposed to do):
${appDescription}

CRAWL DATA (what was discovered):
- URL: ${crawlData.url}
- Page Title: ${crawlData.title}
- Links found: ${crawlData.links.join(', ') || 'none'}
- Forms found: ${crawlData.forms.length} form(s)
  ${crawlData.forms.map(f => `  Form: action="${f.action}" method="${f.method}" fields=[${f.fields.join(', ')}]`).join('\n')}
- Console errors detected: ${crawlData.errors.length > 0 ? crawlData.errors.join(', ') : 'none'}

Generate a test plan as a JSON object with this exact structure:
{
  "appDescription": "brief description",
  "totalTests": number,
  "cases": [
    {
      "id": "TC001",
      "name": "Test case name",
      "type": "functional|navigation|form|security|performance",
      "priority": "critical|high|medium|low",
      "steps": ["step 1", "step 2", "step 3"],
      "expectedOutcome": "what should happen if the test passes"
    }
  ]
}

Rules:
- Generate between 5 and 10 test cases
- Cover: navigation, forms (if any), security basics, performance
- Be specific to the actual URLs and forms discovered
- Return ONLY the JSON object, no extra text, no markdown backticks`;

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const raw = response.choices[0].message.content || '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error('❌ AI response:', raw);
    throw new Error('AI did not return a JSON object');
  }

  try {
    const plan = JSON.parse(jsonMatch[0]) as TestPlan;
    return plan;
  } catch (err) {
    console.error('❌ AI returned invalid JSON:', jsonMatch[0]);
    throw new Error('AI engine failed to return valid test plan JSON');
  }
}
