import { Pool, PoolClient } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import path from 'path'
import fs from 'fs/promises'
import { runInThisContext } from 'vm'

dotenv.config({path: resolve(__dirname, '../../../.env')})

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
})

export interface TestResult {
    id: string;
    run_id: string;
    test_id: string;
    name: string;
    status: string;
    severity: string;
    message: string;
    duration: number;
    screenshot?: string;
}

export interface TestRun {
    status: string;
    score?: number;
    grade?: string;
    summary?: string;
    completed_at?: Date;
}

export interface TestRunUpdate {
    status: string;
    score?: number;
    grade?: string;
    summary?: string;
    completedAt?: Date;
}

export async function initDb(): Promise<void>{
    try{
       const schema = await fs.readFile(
        path.join(__dirname, 'schema.sql'),
        'utf-8'
       )
       await pool.query(schema)
       console.log('Database initialized ✅')
    }catch(err){
        console.error('Error initializing database:', err)
        throw err
    }
}

export async function createTestRun(
    url: string,
    description:string
    
): Promise<string>{
    const query =   `INSERT INTO test_runs (url, description, status)
    VALUES ($1, $2, 'pending') RETURNING id`

    const {rows} = await pool.query(query, 
        [url, description]
    )
    return rows[0].id
  
}

export async function updateTestRun(
    id:string,
    updates:TestRunUpdate
): Promise<void>{
    try{
        const query =  `UPDATE test_runs SET
            status = $1,
            score = $2,
            grade=$3,
            summary=$4,
            completed_at=$5
            WHERE id= $6`
    
        await pool.query(query,
            [updates.status,updates.score, updates.grade, updates.summary,updates.completedAt, id]
        )
    }catch(err){
        console.error('Error updating test run:', err)
        throw err
    }
}

export async function saveTestResults(
    runId: string,
    results:TestResult[]
): Promise<void> {

    const client: PoolClient = await pool.connect()

    try{
        await client.query('BEGIN')
        const query = `INSERT INTO test_results
            (run_id, test_id, name, status, severity,message,duration,screenshot)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`
        for (const r of results) {
            await client.query(query,
                [
                    runId,
                  r.test_id,
                  r.name,
                  r.status,
                  r.severity,
                  r.message,
                  r.duration,
                  r.screenshot
                ]
            )
        }
    }catch(err){    
        console.error('Error saving test results:', err)
        throw err
    }
        finally{
            client.release()
        }
}

export async function saveRecommendations(
    runId: string,
    recommendations: string[]
):Promise<void>{
    try{
        const query = `INSERT INTO recommendations (run_id, content, position)
       VALUES ($1, $2, $3)`
    for (let i = 0; i < recommendations.length; i++) {
        await pool.query(query, [runId, recommendations[i], i])
    }
    }
    catch(err){
        console.error('Error saving recommendations:', err)
        throw err
    }
    
}

export async function getTestRun(
    id:string
){
    try{

        const query = `SELECT * FROM test_runs WHERE id = $1`
        const {rows} = await pool.query(query, [id])
        if (rows.length === 0) return null
    
        const resultsQuery = `SELECT * FROM test_results WHERE run_id = $1`
        const results = await pool.query(resultsQuery, [id])
    
        const recsQuery = `SELECT content FROM recommendations WHERE run_id = $1 ORDER BY position`
        const recs = await pool.query(recsQuery, [id])
    
        return {
            ...rows[0],
            results: results.rows,
            recommendations: recs.rows.map((r:{ content: string} )=> r.content)
        }
    }catch(err){
        console.error('Error fetching test run:', err)
        throw err
    }
}

export async function getAllTestRuns(){
    try{
        const query = ` SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 50`
        const {rows} = await pool.query(query)
        return rows 
    }catch(err){
        console.error('Error fetching all test runs:', err)
        throw err
    }
}