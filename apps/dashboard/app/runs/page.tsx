'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Run {
  id: string;
  url: string;
  description: string;
  status: string;
  score?: number;
  grade?: string;
  created_at: string;
  completed_at?: string;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/runs`)
      .then(r => r.json())
      .then(data => {
        // API returns { runs: [...] } or plain array
        setRuns(Array.isArray(data) ? data : (data.runs ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load runs. Is the API running?');
        setLoading(false);
      });
  }, []);

  const gradeColor: Record<string, string> = {
    A: 'var(--accent-green)', B: '#7ecf6e',
    C: 'var(--accent-amber)', D: '#e8944a', F: 'var(--accent-red)',
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>
      <div style={{ marginBottom: '40px' }}>
        <div className="font-mono" style={{
          fontSize: '0.65rem', letterSpacing: '0.2em',
          color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ display: 'inline-block', width: '24px', height: '1px', background: 'var(--accent-amber)' }} />
          Case Archive
        </div>
        <h1 className="font-display" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: 'var(--text-primary)', lineHeight: 1 }}>
          ALL INVESTIGATIONS
        </h1>
      </div>

      {loading && (
        <div className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          LOADING CASE ARCHIVE<span className="animate-blink">_</span>
        </div>
      )}

      {error && (
        <div className="font-mono" style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}>⚠ {error}</div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="font-display" style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            NO CASES ON FILE
          </div>
          <a href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            → OPEN FIRST CASE
          </a>
        </div>
      )}

      {runs.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '1px',
          background: 'var(--border)', border: '1px solid var(--border)',
          borderRadius: '2px', overflow: 'hidden',
        }}>
          {runs.map(run => (
            <a key={run.id} href={`/runs/${run.id}`} style={{
              background: 'var(--bg-card)', padding: '20px 24px',
              display: 'grid', gridTemplateColumns: '1fr auto',
              gap: '16px', alignItems: 'center', textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span className={`badge badge-${run.status ?? 'pending'}`}>
                    {(run.status ?? 'pending').toUpperCase()}
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.95rem', fontWeight: 500,
                  color: 'var(--text-primary)', marginBottom: '4px', wordBreak: 'break-all',
                }}>
                  {run.url.replace(/^https?:\/\//, '')}
                </div>
                <div className="font-mono" style={{
                  fontSize: '0.72rem', color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px',
                }}>
                  {run.description}
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                {run.grade && (
                  <span className="font-display" style={{
                    fontSize: '2rem', lineHeight: 1,
                    color: gradeColor[run.grade.charAt(0)] ?? 'var(--text-muted)',
                  }}>
                    {run.grade.charAt(0)}
                  </span>
                )}
                {run.score !== undefined && run.score !== null && (
                  <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {run.score}/100
                  </span>
                )}
                <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>→</span>
              </div>
            </a>
          ))}
        </div>
      )}

      <div style={{ marginTop: '32px', textAlign: 'right' }}>
        <a href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
          → NEW INVESTIGATION
        </a>
      </div>
    </div>
  );
}
