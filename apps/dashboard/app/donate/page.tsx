import { ArrowRight, ExternalLink, HeartHandshake, BadgeDollarSign } from 'lucide-react';

const DONATE_PRIMARY_URL = '';
const DONATE_SECONDARY_URL = '';
const SPONSORS_URL = '';

export default function DonatePage() {
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
          Donate
        </div>

        <h1 className="font-display" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', marginTop: '16px', lineHeight: 0.95 }}>
          SUPPORT QA DETECTIVE
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 300, maxWidth: '72ch', marginTop: '12px' }}>
          If QA Detective saves you time, catches bugs, or helps you ship with confidence, consider donating.
          Your support helps fund continued development, improvements to scans and reports, and keeping the tool accessible.
        </p>
      </div>

      <div className="card scanlines" style={{ padding: '26px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <HeartHandshake size={18} />
          <div className="font-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--accent-amber)' }}>
            WAYS TO DONATE
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          {[
            {
              title: 'PRIMARY LINK',
              desc: 'Add your preferred donation link (e.g., PayPal, Buy Me a Coffee, Stripe, Lemon Squeezy).',
              url: DONATE_PRIMARY_URL,
            },
            {
              title: 'SECONDARY LINK',
              desc: 'Optional backup link (useful for international donors).',
              url: DONATE_SECONDARY_URL,
            },
            {
              title: 'GITHUB SPONSORS',
              desc: 'Optional—best for recurring support and open-source sponsorship.',
              url: SPONSORS_URL,
            },
          ].map(item => (
            <div
              key={item.title}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                borderRadius: '2px',
                padding: '12px 14px',
              }}
            >
              <div className="font-mono" style={{ fontSize: '0.68rem', letterSpacing: '0.14em', color: 'var(--accent-amber)' }}>
                {item.title}
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem', marginTop: '6px' }}>
                {item.desc}
              </div>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono"
                  style={{
                    marginTop: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--accent-amber)',
                    textDecoration: 'none',
                    letterSpacing: '0.08em',
                  }}
                >
                  OPEN LINK
                  <ExternalLink size={14} />
                </a>
              ) : (
                <div className="font-mono" style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                  LINK PENDING
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <a href="/new-run" className="btn-primary" style={{ textDecoration: 'none' }}>
            <ArrowRight size={14} />
            OPEN A RUN
          </a>
          <a
            href="/docs"
            className="font-mono"
            style={{
              color: 'var(--accent-amber)',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              alignSelf: 'center',
            }}
          >
            BACK TO DOCS →
          </a>
          <span className="font-mono" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <BadgeDollarSign size={14} />
            THANK YOU
          </span>
        </div>
      </div>

      <div className="card scanlines" style={{ padding: '26px' }}>
        <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          NOTE
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 300, marginTop: '12px', maxWidth: '72ch' }}>
          If you’re using QA Detective at work, consider asking your team to sponsor the project. It’s one of the best ways to
          support ongoing maintenance and new features.
        </p>
      </div>
    </div>
  );
}
