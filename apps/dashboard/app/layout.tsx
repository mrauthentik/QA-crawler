import type { Metadata, Viewport } from 'next';
import './globals.css';
import NavClient from './NavClient';
import AuthNav from './AuthNav';
import { Fingerprint } from 'lucide-react';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

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
            <div className="header-right">
              <NavClient />
              <AuthNav />
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="footer-inner">
              <div className="footer-brand">
                <div className="footer-brand__row">
                  <Fingerprint size={18} />
                  <span className="font-display footer-brand__name">QA DETECTIVE</span>
                </div>
                <div className="font-mono footer-text footer-brand__tagline">
                  AUTONOMOUS TESTING INTELLIGENCE
                </div>
              </div>

              <div className="footer-links">
                <a className="font-mono footer-link" href="/docs">Docs</a>
                <a className="font-mono footer-link" href="/about">About</a>
                <a className="font-mono footer-link" href="/donate">Donate</a>
              </div>
            </div>

            <div className="footer-bottom">
              <span className="font-mono footer-text">© {new Date().getFullYear()} QA DETECTIVE</span>
              <span className="font-mono footer-text">v0.1.0</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
