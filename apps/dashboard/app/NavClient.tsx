"use client";

import React, { useState, useEffect } from 'react';

export default function NavClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('qa_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem('qa_token');
    localStorage.removeItem('qa_user');
    window.location.href = '/login';
  }

  const linkStyle = {
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.72rem',
    letterSpacing: '0.1em',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    textTransform: 'uppercase' as const,
    transition: 'color 0.2s',
  };

  return (
    <>
      {/* Desktop nav — hidden on mobile via CSS */}
      <nav className="nav-desktop">
        <a href="/" style={linkStyle}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-amber)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          New Run
        </a>
        <a href="/runs" style={linkStyle}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-amber)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          History
        </a>
        {/* SYSTEM ONLINE — desktop only */}
        <span className="hide-mobile" style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '0.65rem',
          color: 'var(--accent-green)',
          letterSpacing: '0.08em',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent-green)',
            display: 'inline-block',
            animation: 'pulse-amber 2s infinite',
          }} />
          SYSTEM ONLINE
        </span>
      </nav>

      {/* Mobile hamburger button */}
      <button
        className="nav-mobile-toggle"
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="Toggle navigation menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile nav menu — contains nav links + auth */}
      <div className={`nav-mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="/" style={linkStyle} onClick={() => setMenuOpen(false)}>
          New Run
        </a>
        <a href="/runs" style={linkStyle} onClick={() => setMenuOpen(false)}>
          History
        </a>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'var(--border)',
          margin: '4px 0',
        }} />

        {/* Auth section inside hamburger */}
        {user ? (
          <>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              padding: '10px 0',
            }}>
              {user.name}
            </span>
            <button
              onClick={() => { handleLogout(); setMenuOpen(false); }}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--text-muted)',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '0.72rem',
                letterSpacing: '0.1em',
                padding: '10px 16px',
                cursor: 'pointer',
                textAlign: 'left' as const,
                textTransform: 'uppercase' as const,
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <a
            href="/login"
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              color: 'var(--accent-amber)',
              textDecoration: 'none',
              textTransform: 'uppercase' as const,
              padding: '10px 0',
            }}
          >
            Sign In
          </a>
        )}
      </div>
    </>
  );
}
