import { ArrowRight, Bot, FileText, Play, Search, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="page-container page-container--hero">
      <div style={{ marginBottom: '56px', animation: 'fadeUp 0.5s ease forwards' }}>
        <div
          className="font-mono"
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: 'var(--accent-amber)',
            textTransform: 'uppercase',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '24px',
              height: '1px',
              background: 'var(--accent-amber)',
            }}
          />
          Autonomous Testing Intelligence
        </div>

        <h1
          className="font-display"
          style={{
            fontSize: 'clamp(2.6rem, 8vw, 5.8rem)',
            lineHeight: 0.92,
            letterSpacing: '0.02em',
            color: 'var(--text-primary)',
            marginBottom: '22px',
          }}
        >
          SHIP
          <br />
          <span style={{ color: 'var(--accent-amber)' }}>CONFIDENTLY</span>
        </h1>

        <p
          style={{
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: '62ch',
            fontWeight: 300,
          }}
        >
          QA Detective crawls your application, generates end-to-end test cases, executes them in a real browser,
          and produces an investigation-grade report with actionable findings.
        </p>

        <div className="submit-row" style={{ marginTop: '26px' }}>
          <a href="/register" className="btn-primary" style={{ textDecoration: 'none' }}>
            <ArrowRight size={14} />
            GET STARTED
          </a>
          <a
            href="/login"
            className="font-mono"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              padding: '12px 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            SIGN IN
          </a>
          <a
            href="/docs"
            className="font-mono"
            style={{
              color: 'var(--accent-amber)',
              textDecoration: 'none',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '12px 0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            READ DOCS →
          </a>
        </div>
      </div>

      <div className="card scanlines" style={{ padding: '26px', marginBottom: '18px' }}>
        <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          WHAT YOU GET
        </div>

        <div style={{ marginTop: '14px' }} className="steps-grid">
          {[
            { icon: <Search size={24} />, title: 'Crawl', desc: 'Maps pages, links, forms, and user paths.' },
            { icon: <Bot size={24} />, title: 'Generate', desc: 'Builds focused test cases based on behavior.' },
            { icon: <Play size={24} />, title: 'Execute', desc: 'Runs tests with a real browser engine.' },
            { icon: <FileText size={24} />, title: 'Report', desc: 'Findings + recommendations you can ship.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'var(--bg-card)', padding: '22px 20px' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{item.icon}</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '6px' }}>{item.title}</div>
              <div className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.55 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card scanlines" style={{ padding: '26px' }}>
        <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          READY TO RUN AN INVESTIGATION?
        </div>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 300, marginTop: '12px', maxWidth: '72ch' }}>
          You can start a run right away. For authenticated coverage and saved history, create an account.
        </p>

        <div className="submit-row" style={{ marginTop: '18px' }}>
          <a href="/new-run" className="btn-primary" style={{ textDecoration: 'none' }}>
            <ArrowRight size={14} />
            OPEN A RUN
          </a>
          <a
            href="/about"
            className="font-mono"
            style={{
              color: 'var(--accent-amber)',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              alignSelf: 'center',
            }}
          >
            LEARN MORE →
          </a>
          <span className="font-mono" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={14} />
            USE TEST CREDENTIALS ONLY
          </span>
        </div>
      </div>
    </div>
  );
}