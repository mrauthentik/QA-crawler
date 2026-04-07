'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Search, Bot, Play, FileText, AlertCircle, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const EXAMPLE_URLS = [
  { url: 'https://example.com', label: 'Example.com' },
  { url: 'https://github.com', label: 'GitHub' },
  { url: 'https://news.ycombinator.com', label: 'Hacker News' },
];

export default function HomePage() {
  const router = useRouter();
  const { authHeaders } = useAuth();

  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoginUrl, setAuthLoginUrl] = useState('');

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError('A target URL is required.');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL including https://');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/runs`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          url: url.trim(),
          description: description.trim() || `Automated QA investigation of ${url.trim()}`,
          ...(showAuth && authEmail && authPassword ? {
            authEmail: authEmail.trim(),
            authPassword,
            authLoginUrl: authLoginUrl.trim() || undefined,
          } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to queue run');
      }

      const data = await res.json();
      router.push(`/runs/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Is the API running?');
      setLoading(false);
    }
  };

  return (
    <div className="page-container page-container--hero">

      {/* Hero */}
      <div style={{ marginBottom: '64px', animation: 'fadeUp 0.5s ease forwards' }}>
        <div className="font-mono" style={{
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          color: 'var(--accent-amber)',
          textTransform: 'uppercase',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{
            display: 'inline-block',
            width: '24px',
            height: '1px',
            background: 'var(--accent-amber)',
          }} />
          Autonomous Testing Intelligence
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(2.5rem, 8vw, 5.5rem)',
          lineHeight: 0.95,
          letterSpacing: '0.02em',
          color: 'var(--text-primary)',
          marginBottom: '24px',
        }}>
          OPEN AN<br />
          <span style={{ color: 'var(--accent-amber)' }}>INVESTIGATION</span>
        </h1>

        <p style={{
          fontFamily: 'IBM Plex Sans, sans-serif',
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          maxWidth: '520px',
          fontWeight: 300,
        }}>
          Submit a URL. The detective crawls the app, generates test cases with AI,
          executes them with a real browser, and delivers a full investigation report.
        </p>
      </div>

      {/* Main form card */}
      <div className="card scanlines form-card" style={{
        animation: 'fadeUp 0.6s ease 0.1s both',
        borderColor: 'var(--border-bright)',
      }}>

        {/* Case file header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="font-mono" style={{
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              CASE FILE
            </span>
            <span className="font-mono" style={{
              fontSize: '0.65rem',
              color: 'var(--accent-amber)',
              letterSpacing: '0.1em',
            }}>
              #NEW
            </span>
          </div>
          <div className="font-mono" style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
          }}>
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </div>

        {/* URL field */}
        <div style={{ marginBottom: '24px' }}>
          <label className="font-mono" style={{
            display: 'block',
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Target URL <span style={{ color: 'var(--accent-red)' }}>*</span>
          </label>
          <input
            className="input-dark"
            type="url"
            placeholder="https://your-app.com"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
            style={{ fontSize: '1rem' }}
          />

          {/* Quick fill buttons */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {EXAMPLE_URLS.map(ex => (
              <button
                key={ex.url}
                onClick={() => setUrl(ex.url)}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  padding: '4px 10px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-amber)';
                  e.currentTarget.style.color = 'var(--accent-amber)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description field */}
        <div style={{ marginBottom: '32px' }}>
          <label className="font-mono" style={{
            display: 'block',
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Case Description <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>(optional)</span>
          </label>
          <textarea
            className="input-dark"
            placeholder="Describe what this app does and what you want to test. e.g. 'A SaaS dashboard where users log in, manage projects and invite team members.'"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
            style={{
              resize: 'vertical',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '0.85rem',
              lineHeight: 1.6,
            }}
          />
          <p className="font-mono" style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            marginTop: '8px',
            letterSpacing: '0.05em',
          }}>
            More detail → better test cases from the AI
          </p>
        </div>

        {/* Optional auth credentials */}
        <div style={{ marginTop: '24px' }}>
          <button
            onClick={() => setShowAuth(prev => !prev)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              color: 'var(--text-muted)',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {showAuth ? '− HIDE LOGIN CREDENTIALS' : '+ ADD LOGIN CREDENTIALS'}
          </button>
          <p className="font-mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '6px', letterSpacing: '0.05em' }}>
            Optional — lets QA Detective test authenticated pages and dashboards
          </p>

          {showAuth && (
            <div style={{
              marginTop: '16px',
              padding: '20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: '14px',
            }}>
              <div className="auth-creds-grid">
                <div>
                  <label className="font-mono" style={{ fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    LOGIN EMAIL
                  </label>
                  <input
                    type="email"
                    className="input-dark"
                    placeholder="test@example.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    disabled={loading}
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="font-mono" style={{ fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    LOGIN PASSWORD
                  </label>
                  <input
                    type="password"
                    className="input-dark"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    disabled={loading}
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <label className="font-mono" style={{ fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  LOGIN PAGE URL <span style={{ opacity: 0.6 }}>(optional — leave blank to auto-detect)</span>
                </label>
                <input
                  type="url"
                  className="input-dark"
                  placeholder="https://yourapp.com/login"
                  value={authLoginUrl}
                  onChange={e => setAuthLoginUrl(e.target.value)}
                  disabled={loading}
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem', width: '100%' }}
                />
              </div>
              <p className="font-mono" style={{ fontSize: '0.62rem', color: 'var(--accent-amber)', letterSpacing: '0.05em' }}>
                ⚠ Use test credentials only — never your real password
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--accent-red-dim)',
            border: '1px solid rgba(232,64,64,0.3)',
            borderRadius: '2px',
            padding: '12px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
              <AlertCircle size={18} />
              <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent-red)' }}>
                {error}
              </span>
            </div>
        )}

        {/* Submit */}
        <div className="submit-row" style={{ marginTop: 0 }}>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ minWidth: '180px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{
                  width: '10px', height: '10px',
                  border: '2px solid rgba(0,0,0,0.3)',
                  borderTopColor: '#000',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }} />
                QUEUING...
              </span>
            ) : (
              <>
                <ArrowRight size={14} />
                OPEN CASE
              </>
            )}
          </button>

          <span className="font-mono" style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
          }}>
            Takes ~60–90 seconds
          </span>
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginTop: '64px', animation: 'fadeUp 0.6s ease 0.2s both' }}>
        <div className="font-mono" style={{
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: '28px',
        }}>
          How the investigation works
        </div>

        <div className="steps-grid">
          {[
            { step: '01', icon: <Search size={28} />, label: 'Crawl', desc: 'Maps every page, link, and form' },
            { step: '02', icon: <Bot size={28} />, label: 'Generate', desc: 'AI writes targeted test cases' },
            { step: '03', icon: <Play size={28} />, label: 'Execute', desc: 'Real browser runs every test' },
            { step: '04', icon: <FileText size={28} />, label: 'Report', desc: 'Detective report with fixes' },
          ].map(item => (
            <div key={item.step} style={{
              background: 'var(--bg-card)',
              padding: '24px 20px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
            >
              <div className="font-mono" style={{
                fontSize: '0.6rem',
                color: 'var(--accent-amber)',
                letterSpacing: '0.15em',
                marginBottom: '12px',
              }}>
                STEP {item.step}
              </div>
              <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{
                fontFamily: 'IBM Plex Sans, sans-serif',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '6px',
              }}>
                {item.label}
              </div>
              <div className="font-mono" style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}