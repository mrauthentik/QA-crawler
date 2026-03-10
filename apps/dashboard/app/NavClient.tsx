"use client";

import React from 'react';

export default function NavClient() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <a href="/" style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '0.72rem',
        letterSpacing: '0.1em',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        textTransform: 'uppercase',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-amber)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        New Run
      </a>
      <a href="/runs" style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '0.72rem',
        letterSpacing: '0.1em',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        textTransform: 'uppercase',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-amber)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        History
      </a>
      <span style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '0.65rem',
        color: 'var(--accent-green)',
        letterSpacing: '0.08em',
        display: 'flex',
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
  );
}
