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

  const links = [
    { href: '/new-run', label: 'New Run' },
    { href: '/runs', label: 'History' },
    { href: '/docs', label: 'Docs' },
    { href: '/about', label: 'About' },
  ];

  return (
    <>
      {/* Desktop nav */}
      <nav className="nav-desktop">
        {links.map(link => (
          <a
            key={link.href}
            href={link.href}
            style={linkStyle}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-amber)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            {link.label}
          </a>
        ))}
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
        {links.map(link => (
          <a key={link.href} href={link.href} style={linkStyle} onClick={() => setMenuOpen(false)}>
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}
