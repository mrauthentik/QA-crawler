"use client";

import React, { useState } from 'react';

export default function NavClient() {
  const [menuOpen, setMenuOpen] = useState(false);

  const linkStyle = {
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '0.72rem',
    letterSpacing: '0.1em',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    textTransform: 'uppercase' as const,
    transition: 'color 0.2s',
  };

  const statusIndicator = (
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
  );

  return (
    <>
      {/* Desktop nav */}
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
        {statusIndicator}
      </nav>

      {/* Mobile hamburger button */}
      <button
        className="nav-mobile-toggle"
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="Toggle navigation menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile nav menu */}
      <div className={`nav-mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="/" style={linkStyle} onClick={() => setMenuOpen(false)}>
          New Run
        </a>
        <a href="/runs" style={linkStyle} onClick={() => setMenuOpen(false)}>
          History
        </a>
        {statusIndicator}
      </div>
    </>
  );
}
