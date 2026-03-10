'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TestResult {
  test_id: string;
  name: string;
  status: string;
  severity: string;
  message: string;
  duration: number;
  screenshot?: string;
}

interface Run {
  id: string;
  url: string;
  description: string;
  status: string;
  score?: number;
  grade?: string;
  summary?: string;
  created_at: string;
  completed_at?: string;
  results: TestResult[];
  recommendations: string[];
  findings?: Array<{
    testId: string;
    testName: string;
    status: string;
    severity: string;
    what: string;
    why: string;
    how: string;
    screenshot?: string;
  }>;
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

const SEVERITY_STYLES: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  critical: { color: 'var(--accent-red)',       bg: 'var(--accent-red-dim)',        border: 'rgba(232,64,64,0.3)',   icon: '🔴' },
  high:     { color: '#e8944a',                  bg: 'rgba(232,148,74,0.1)',         border: 'rgba(232,148,74,0.3)', icon: '🟠' },
  medium:   { color: 'var(--accent-amber)',       bg: 'var(--accent-amber-dim)',      border: 'rgba(245,166,35,0.3)', icon: '🟡' },
  low:      { color: 'var(--accent-green)',       bg: 'var(--accent-green-dim)',      border: 'rgba(61,214,140,0.3)', icon: '🟢' },
  info:     { color: 'var(--text-secondary)',     bg: 'rgba(85,85,80,0.1)',           border: 'var(--border)',        icon: '⚪' },
};

function GradeDisplay({ grade, score }: { grade: string; score: number }) {
  const letter = grade.charAt(0);
  const colorMap: Record<string, string> = {
    A: 'var(--accent-green)', B: '#7ecf6e',
    C: 'var(--accent-amber)', D: '#e8944a', F: 'var(--accent-red)',
  };
  const color = colorMap[letter] || 'var(--text-secondary)';
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="font-display" style={{ fontSize: '6rem', lineHeight: 1, color, textShadow: `0 0 40px ${color}44` }}>
        {letter}
      </div>
      <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: '8px' }}>
        {score}/100
      </div>
    </div>
  );
}

export default function RunPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/runs/${id}`);
      if (!res.ok) throw new Error('Run not found');
      const data = await res.json();
      const runData = data.run ?? data;
      setRun(runData);
      return runData.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load run');
      return 'error';
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const start = async () => {
      const status = await fetchRun();
      if (status === 'pending' || status === 'running') {
        setPolling(true);
        interval = setInterval(async () => {
          const s = await fetchRun();
          if (s !== 'pending' && s !== 'running') {
            setPolling(false);
            clearInterval(interval);
          }
        }, 4000);
      }
    };
    start();
    return () => clearInterval(interval);
  }, [fetchRun]);

  if (loading) return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
      <div className="font-mono" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontSize: '0.8rem' }}>
        LOADING CASE FILE<span className="animate-blink">_</span>
      </div>
    </div>
  );

  if (error || !run) return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
      <div className="font-mono" style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>⚠ {error || 'Run not found'}</div>
      <button onClick={() => router.push('/')} style={{
        marginTop: '24px', background: 'transparent', border: '1px solid var(--border)',
        color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '0.75rem', padding: '10px 20px', cursor: 'pointer', letterSpacing: '0.1em',
      }}>← BACK TO HOME</button>
    </div>
  );

  const failed = run.results?.filter(r => r.status === 'failed' || r.status === 'error') ?? [];
  const passed  = run.results?.filter(r => r.status === 'passed') ?? [];
  const sortedFailed = [...failed].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>

      <a href="/runs" style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)',
        textDecoration: 'none', letterSpacing: '0.1em', display: 'inline-flex',
        alignItems: 'center', gap: '6px', marginBottom: '32px',
      }}>← ALL CASES</a>

      {polling && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
          background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)',
          borderRadius: '2px', marginBottom: '32px',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block', animation: 'pulse-amber 1s infinite' }} />
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', letterSpacing: '0.08em' }}>
            INVESTIGATION IN PROGRESS — POLLING FOR RESULTS
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'start', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span className={`badge badge-${run.status}`}>{run.status.toUpperCase()}</span>
            <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              {new Date(run.created_at).toLocaleString()}
            </span>
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '10px', wordBreak: 'break-all' }}>
            {run.url.replace(/^https?:\/\//, '')}
          </h1>
          <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em', fontStyle: 'italic' }}>
            {run.description}
          </p>
        </div>
        {run.score !== undefined && run.grade && <GradeDisplay grade={run.grade} score={run.score} />}
      </div>

      {run.status === 'completed' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '2px', marginBottom: '40px', overflow: 'hidden' }}>
          {[
            { label: 'Total Tests', value: run.results?.length ?? 0, color: 'var(--text-primary)' },
            { label: 'Passed',      value: passed.length,            color: 'var(--accent-green)' },
            { label: 'Failed',      value: failed.length,            color: failed.length > 0 ? 'var(--accent-red)' : 'var(--text-muted)' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-card)', padding: '20px 24px' }}>
              <div className="font-display" style={{ fontSize: '2.4rem', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '6px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {run.summary && (
        <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Executive Summary
          </div>
          <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 300 }}>
            {run.summary}
          </p>
        </div>
      )}


      {/* AI Findings with WHAT/WHY/FIX */}
      {run.findings && run.findings.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div className="font-mono" style={{
            fontSize: '0.65rem', letterSpacing: '0.2em',
            color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px',
          }}>
            Detective Findings — AI Analysis
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {run.findings.map((finding, i) => {
              const s = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.info;
              return (
                <div key={finding.testId ?? i} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${s.color}`, borderRadius: '2px', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '16px 20px', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>{s.icon}</span>
                      <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {finding.testName}
                      </span>
                    </div>
                    <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {finding.severity}
                    </span>
                  </div>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { label: 'WHAT', value: finding.what, color: 'var(--text-primary)' },
                      { label: 'WHY',  value: finding.why,  color: 'var(--accent-amber)' },
                      { label: 'FIX',  value: finding.how,  color: 'var(--accent-green)' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <span className="font-mono" style={{
                          fontSize: '0.65rem', letterSpacing: '0.12em',
                          color: item.color, minWidth: '36px', marginTop: '3px', opacity: 0.8,
                        }}>
                          {item.label}
                        </span>
                        <span style={{
                          fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.88rem',
                          color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 300,
                        }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                    {finding.screenshot && (
                      <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                        📸 {finding.screenshot}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sortedFailed.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>
            Findings — {sortedFailed.length} issue{sortedFailed.length !== 1 ? 's' : ''} detected
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>
            {sortedFailed.map((result, i) => {
              const s = SEVERITY_STYLES[result.severity] ?? SEVERITY_STYLES.info;
              return (
                <div key={result.test_id ?? i} style={{ background: 'var(--bg-card)', padding: '20px 24px', borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>{s.icon}</span>
                      <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{result.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{result.severity}</span>
                      <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{result.duration}ms</span>
                    </div>
                  </div>
                  <p className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{result.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {passed.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>
            Passed — {passed.length} test{passed.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            {passed.map((result, i) => (
              <div key={result.test_id ?? i} style={{ background: 'var(--bg-card)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem' }}>✓</span>
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.name}</span>
                </div>
                <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{result.duration}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {run.recommendations && run.recommendations.length > 0 && (
        <div className="card" style={{ padding: '28px' }}>
          <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: '20px' }}>
            Recommendations
          </div>
          <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {run.recommendations.map((rec, i) => (
              <li key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', minWidth: '20px', marginTop: '3px' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 300 }}>
                  {rec}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(run.status === 'pending' || run.status === 'running') && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="font-display" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.05em' }}>
            INVESTIGATING<span className="animate-blink">.</span>
          </div>
          <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Crawling → Generating test cases → Executing → Writing report
          </p>
        </div>
      )}

      {run.status === 'completed' && (
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <a href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '14px 32px' }}>
            → OPEN NEW CASE
          </a>
        </div>
      )}
    </div>
  );
}
