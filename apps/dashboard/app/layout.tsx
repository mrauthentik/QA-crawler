import type { Metadata } from 'next';
import './globals.css';
import NavClient from './NavClient';
import AuthNav from './AuthNav';
import { Fingerprint } from 'lucide-react';

export const metadata: Metadata = {
  title: 'QA Detective — Autonomous Testing Intelligence',
  description: 'AI-powered end-to-end testing that crawls, investigates, and reports on your web application.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <header className="site-header">
            <a href="/" className="site-logo">
              <span><Fingerprint size={28} /></span>
              <span className="font-display logo-text">QA DETECTIVE</span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <NavClient />
              <AuthNav />
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <span className="font-mono footer-text">
              QA DETECTIVE v0.1.0 — AUTONOMOUS TESTING INTELLIGENCE
            </span>
            <span className="font-mono footer-text">
              POWERED BY GROQ + PLAYWRIGHT
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
