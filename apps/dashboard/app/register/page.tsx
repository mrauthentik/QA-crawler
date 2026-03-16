'use client';

import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3002';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      localStorage.setItem('qa_token', data.token);
      localStorage.setItem('qa_user', JSON.stringify(data.user));
      router.push('/');
    } catch {
      setError('Could not connect to auth service');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    boxSizing: 'border-box' as const,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '2px',
    color: 'var(--text-primary)',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.9rem',
    outline: 'none',
  };

  const labelStyle = {
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '8px',
    fontFamily: 'IBM Plex Mono, monospace',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '48px 40px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' as const }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><Fingerprint size={32} color='var(--accent-amber)' strokeWidth={1.5} /></div>
          <h1 style={{
            fontSize: '1.4rem',
            letterSpacing: '0.15em',
            color: 'var(--accent-amber)',
            marginBottom: '8px',
            fontFamily: 'IBM Plex Mono, monospace',
          }}>
            QA DETECTIVE
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Create your account
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '20px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '2px',
            color: '#ef4444',
            fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
          <div>
            <label style={labelStyle}>FULL NAME</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              placeholder="John Doe"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0' }}>
            8+ characters, one uppercase letter, one number.
          </p>

          <button
            onClick={handleRegister}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? 'var(--border)' : 'var(--accent-amber)',
              color: loading ? 'var(--text-muted)' : '#000',
              border: 'none',
              borderRadius: '2px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '0.85rem',
              letterSpacing: '0.15em',
              fontWeight: 600,
              marginTop: '8px',
            }}
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>

          <a href={`${AUTH_URL}/auth/google`} style={{
            width: '100%',
            padding: '14px',
            display: 'block',
            textAlign: 'center' as const,
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '2px',
            textDecoration: 'none',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '0.85rem',
            letterSpacing: '0.1em',
            color: 'var(--text-secondary)',
          }}>
            CONTINUE WITH GOOGLE
          </a>
        </div>

        <p style={{
          textAlign: 'center' as const,
          marginTop: '24px',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
        }}>
          {'Already have an account? '}
          <Link href="/login" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
