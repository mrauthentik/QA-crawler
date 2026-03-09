// Core types shared across all packages

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error'
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface TestRun {
    id: string
    url: string
    description: string
    status: TestStatus
    createdAt: Date
    completedAt?: Date
}

export interface TestResult {
    id: string
    runId: string
    name: string
    status: TestStatus
    severity: Severity
    message: string
    screenshot?: string
    duration:number
}

export interface DetectiveReport {
    runId: string
    summary: string
    score: number
    critical: TestResult[]
    high: TestResult[]
    medium: TestResult[]
    low: TestResult[]
    recommendations: string[]
}