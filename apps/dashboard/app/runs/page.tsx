'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

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

type Toast = { id: number; message: string; type: 'success' | 'error' };

const GRADE_COLOR: Record<string, string> = {
  A: 'var(--accent-green)',
  B: '#7ecf6e',
  C: 'var(--accent-amber)',
  D: '#e8944a',
  F: 'var(--accent-red)',
};

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return { toasts, addToast };
}

export default function RunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { toasts, addToast } = useToast();

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('qa_token');
    if (!token) router.push('/login');
  }, [router]);

  const getToken = () => localStorage.getItem('qa_token') ?? '';

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/runs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : (data.runs ?? []));
    } catch {
      setError('Could not load runs. Is the API running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]')) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleDelete(run: Run) {
    setDeletingId(run.id);
    // Optimistic update — remove immediately
    setRuns(prev => prev.filter(r => r.id !== run.id));
    setActiveMenu(null);

    try {
      const res = await fetch(`${API_URL}/api/runs/${run.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error('Delete failed');
      addToast('Run deleted successfully');
    } catch {
      // Restore on failure
      setRuns(prev => [run, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      addToast('Failed to delete run', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRerun(run: Run) {
    setRerunningId(run.id);
    setActiveMenu(null);

    try {
      const res = await fetch(`${API_URL}/api/runs/${run.id}/rerun`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error('Re-run failed');

      const data = await res.json();
      addToast('Re-run queued — redirecting...');

      setTimeout(() => router.push(`/runs/${data.runId}`), 800);
    } catch {
      addToast('Failed to queue re-run', 'error');
    } finally {
      setRerunningId(null);
    }
  }

  function handleShare(run: Run) {
    const url = `${window.location.origin}/runs/${run.id}`;
    navigator.clipboard.writeText(url).then(() => {
      addToast('Results link copied to clipboard');
    }).catch(() => {
      addToast('Could not copy to clipboard', 'error');
    });
    setActiveMenu(null);
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px' }}>

      {/* Toast notifications */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1000,
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            padding: '12px 20px',
            background: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
            color: '#000',
            borderRadius: '2px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '0.78rem',
            letterSpacing: '0.05em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            animation: 'slideIn 0.2s ease',
          }}>
            {toast.message}
          </div>
        ))}
      </div>

      {/* Page header */}
      <div style={{ marginBottom: '40px' }}>
        <div className="font-mono" style={{
          fontSize: '0.65rem', letterSpacing: '0.2em',
          color: 'var(--accent-amber)', textTransform: 'uppercase' as const,
          marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ display: 'inline-block', width: '24px', height: '1px', background: 'var(--accent-amber)' }} />
          Case Archive
        </div>
        <h1 className="font-display" style={{
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          color: 'var(--text-primary)', lineHeight: 1,
        }}>
          ALL INVESTIGATIONS
        </h1>
      </div>

      {loading && (
        <div className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          LOADING CASE ARCHIVE<span className="animate-blink">_</span>
        </div>
      )}

      {error && (
        <div className="font-mono" style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}>
          {'⚠ '}{error}
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '80px 0' }}>
          <div className="font-display" style={{
            fontSize: '2rem', color: 'var(--text-muted)', marginBottom: '16px',
          }}>
            NO CASES ON FILE
          </div>
          <a href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            {'→ OPEN FIRST CASE'}
          </a>
        </div>
      )}

      {runs.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column' as const, gap: '1px',
          background: 'var(--border)', border: '1px solid var(--border)',
          borderRadius: '2px', overflow: 'hidden',
        }}>
          {runs.map(run => (
            <div key={run.id} style={{
              background: deletingId === run.id ? 'rgba(239,68,68,0.05)' : 'var(--bg-card)',
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '16px',
              alignItems: 'center',
              padding: '20px 24px',
              transition: 'background 0.15s',
              opacity: deletingId === run.id ? 0.5 : 1,
            }}>

              {/* Run info — clickable */}
              <a href={`/runs/${run.id}`} style={{
                textDecoration: 'none', minWidth: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span className={`badge badge-${run.status ?? 'pending'}`}>
                    {(run.status ?? 'pending').toUpperCase()}
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  fontSize: '0.95rem', fontWeight: 500,
                  color: 'var(--text-primary)', marginBottom: '4px',
                  wordBreak: 'break-all' as const,
                }}>
                  {run.url.replace(/^https?:\/\//, '')}
                </div>
                <div className="font-mono" style={{
                  fontSize: '0.72rem', color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const, maxWidth: '500px',
                }}>
                  {run.description}
                </div>
              </a>

              {/* Grade */}
              <div style={{
                textAlign: 'right' as const,
                display: 'flex', flexDirection: 'column' as const,
                alignItems: 'flex-end', gap: '4px',
              }}>
                {run.grade && (
                  <span className="font-display" style={{
                    fontSize: '2rem', lineHeight: 1,
                    color: GRADE_COLOR[run.grade.charAt(0)] ?? 'var(--text-muted)',
                  }}>
                    {run.grade.charAt(0)}
                  </span>
                )}
                {run.score !== undefined && run.score !== null && (
                  <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {run.score}/100
                  </span>
                )}
              </div>

              {/* Action menu */}
              <div data-menu="true" style={{ position: 'relative' as const }}>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setActiveMenu(prev => prev === run.id ? null : run.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '0.85rem',
                    lineHeight: 1,
                  }}
                  title="Actions"
                >
                  ···
                </button>

                {activeMenu === run.id && (
                  <div
                    data-menu="true"
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute' as const,
                      right: 0, top: 'calc(100% + 4px)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '2px',
                      zIndex: 100,
                      minWidth: '160px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      overflow: 'hidden',
                    }}
                  >
                    {[
                      {
                        label: rerunningId === run.id ? 'QUEUING...' : '↺  RE-RUN',
                        onClick: () => handleRerun(run),
                        disabled: rerunningId === run.id,
                        color: 'var(--text-primary)',
                      },
                      {
                        label: '⎘  SHARE LINK',
                        onClick: () => handleShare(run),
                        disabled: false,
                        color: 'var(--text-primary)',
                      },
                      {
                        label: '✕  DELETE',
                        onClick: () => handleDelete(run),
                        disabled: deletingId === run.id,
                        color: 'var(--accent-red)',
                      },
                    ].map(action => (
                      <button
                        key={action.label}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          color: action.disabled ? 'var(--text-muted)' : action.color,
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '0.72rem',
                          letterSpacing: '0.08em',
                          textAlign: 'left' as const,
                          cursor: action.disabled ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={e => {
                          if (!action.disabled) {
                            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)';
                          }
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '32px', textAlign: 'right' as const }}>
        <a href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
          {'→ NEW INVESTIGATION'}
        </a>
      </div>
    </div>
  );
}
