'use client';

import { useState, useEffect } from 'react';

export default function AuthNav() {
  const [user, setUser] = useState<{ name: string; email?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('qa_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  function logout() {
    localStorage.removeItem('qa_token');
    localStorage.removeItem('qa_user');
    window.location.href = '/login';
  }

  if (!user) {
    return (
      <a href="/login" style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem',
        letterSpacing: '0.1em', color: 'var(--accent-amber)',
        textDecoration: 'none', padding: '8px 16px',
        border: '1px solid var(--accent-amber)', borderRadius: '2px',
      }}>
        SIGN IN
      </a>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <span style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        {user.name}
      </span>
      <button onClick={logout} style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem',
        letterSpacing: '0.1em', color: 'var(--text-muted)',
        background: 'transparent', border: '1px solid var(--border)',
        borderRadius: '2px', padding: '6px 12px', cursor: 'pointer',
      }}>
        SIGN OUT
      </button>
    </div>
  );
}
