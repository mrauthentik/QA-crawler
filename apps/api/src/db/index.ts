import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import path from 'path';
import fs from 'fs/promises';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export interface TestRunUpdate {
  status: string;
  score?: number;
  grade?: string;
  summary?: string;
  completedAt?: Date;
}

export async function initDb(): Promise<void> {
  try {
    const schema = await fs.readFile(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );
    await pool.query(schema);
    console.log('✅ Database initialised');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

export async function createTestRun(
  url: string,
  description: string
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO test_runs (url, description, status)
     VALUES ($1, $2, 'pending') RETURNING id`,
    [url, description]
  );
  return rows[0].id;
}

export async function updateTestRun(
  id: string,
  updates: TestRunUpdate
): Promise<void> {
  await pool.query(
    `UPDATE test_runs SET
      status = $1,
      score = $2,
      grade = $3,
      summary = $4,
      completed_at = $5
     WHERE id = $6`,
    [updates.status, updates.score, updates.grade, updates.summary, updates.completedAt, id]
  );
}

export async function saveTestResults(
  runId: string,
  results: Array<{
    test_id: string;
    name: string;
    status: string;
    severity: string;
    message: string;
    duration: number;
    screenshot?: string;
  }>
): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of results) {
      await client.query(
        `INSERT INTO test_results
          (run_id, test_id, name, status, severity, message, duration, screenshot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [runId, r.test_id, r.name, r.status, r.severity, r.message, r.duration, r.screenshot]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function saveRecommendations(
  runId: string,
  recommendations: string[]
): Promise<void> {
  for (let i = 0; i < recommendations.length; i++) {
    await pool.query(
      `INSERT INTO recommendations (run_id, content, position)
       VALUES ($1, $2, $3)`,
      [runId, recommendations[i], i]
    );
  }
}

export async function getTestRun(id: string) {
  const { rows } = await pool.query(
    'SELECT * FROM test_runs WHERE id = $1',
    [id]
  );
  if (rows.length === 0) return null;

  const results = await pool.query(
    'SELECT * FROM test_results WHERE run_id = $1 ORDER BY created_at',
    [id]
  );

  const recs = await pool.query(
    'SELECT content FROM recommendations WHERE run_id = $1 ORDER BY position',
    [id]
  );

  return {
    ...rows[0],
    results: results.rows,
    recommendations: recs.rows.map((r: { content: string }) => r.content),
  };
}

export async function getAllTestRuns() {
  const { rows } = await pool.query(
    'SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 50'
  );
  return rows;
}

export async function saveFindings(
  runId: string,
  findings: Array<{
    testId: string;
    testName: string;
    status: string;
    severity: string;
    what: string;
    why: string;
    how: string;
    screenshot?: string;
  }>
): Promise<void> {
  await pool.query(
    `UPDATE test_runs SET findings = $1 WHERE id = $2`,
    [JSON.stringify(findings), runId]
  );
}
