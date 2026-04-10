import { Fingerprint } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '28px' }}>
        <div
          className="font-mono"
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
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
              background: 'var(--border-bright)',
            }}
          />
          About
        </div>
      </div>

      <div className="card scanlines" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Fingerprint size={18} />
          <h1 className="font-display" style={{ fontSize: '2.2rem', lineHeight: 1 }}>
            QA Detective
          </h1>
        </div>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 300, maxWidth: '68ch' }}>
          QA Detective is an autonomous testing tool that crawls your application, generates end-to-end test cases
          with AI, executes them in a real browser, and produces an investigation-style report.
        </p>

        <div style={{ marginTop: '22px', display: 'grid', gap: '10px' }}>
          {[
            { k: 'Crawl', v: 'Map pages, links, forms, and flows.' },
            { k: 'Generate', v: 'Create targeted test cases based on app behavior.' },
            { k: 'Execute', v: 'Run tests with Playwright in a real browser.' },
            { k: 'Report', v: 'Ship actionable findings and recommendations.' },
          ].map(item => (
            <div
              key={item.k}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                borderRadius: '2px',
                padding: '12px 14px',
              }}
            >
              <div className="font-mono" style={{ fontSize: '0.68rem', letterSpacing: '0.14em', color: 'var(--accent-amber)' }}>
                {item.k.toUpperCase()}
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem', marginTop: '6px' }}>
                {item.v}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px' }}>
          <a href="/docs" className="font-mono" style={{ color: 'var(--accent-amber)', textDecoration: 'none', letterSpacing: '0.08em' }}>
            READ THE DOCS →
          </a>
        </div>
      </div>
    </div>
  );
}
