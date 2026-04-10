import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="page-container" style={{ paddingTop: '80px' }}>
      <div className="card scanlines" style={{ padding: '32px' }}>
        <div className="font-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          404
        </div>

        <h1 className="font-display" style={{ fontSize: '3.2rem', lineHeight: 0.95, marginTop: '12px' }}>
          PAGE NOT FOUND
        </h1>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 300, marginTop: '12px', maxWidth: '70ch' }}>
          The requested page does not exist. If you expected a report, check your run history.
        </p>

        <div style={{ marginTop: '22px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
            <ArrowRight size={14} />
            GO HOME
          </a>
          <a
            href="/runs"
            className="font-mono"
            style={{
              color: 'var(--accent-amber)',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              alignSelf: 'center',
            }}
          >
            VIEW HISTORY →
          </a>
        </div>
      </div>
    </div>
  );
}
