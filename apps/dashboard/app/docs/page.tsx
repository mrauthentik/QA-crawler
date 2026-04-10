import {
  ArrowRight,
  FileText,
  Play,
  Bot,
  Search,
  Terminal,
  Package,
  Github,
  GitPullRequest,
  ExternalLink,
} from 'lucide-react';

const NPM_URL = 'https://www.npmjs.com/package/qa-detective-cli';
const GITHUB_URL = 'https://github.com/mrauthentik/QA-crawler';
const CONTRIBUTING_URL = 'https://github.com/mrauthentik/QA-crawler/blob/main/CONTRIBUTING.md';

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function highlight(code: string, language: 'bash' | 'js' | 'json' | 'text') {
  const src = escapeHtml(code);

  const wrap = (token: string, color: string) => `<span style="color: ${color}">${token}</span>`;

  if (language === 'bash') {
    const re = /(#[^\n]*|\bhttps?:\/\/[^\s]+|&quot;[^\n]*?&quot;|\B--[a-zA-Z0-9-]+\b|\B-[a-zA-Z]\b|\b(?:npm|npx|pnpm|node|qa-detective)\b)/g;
    return src.replace(re, (m) => {
      if (m.startsWith('#')) return wrap(m, 'var(--text-muted)');
      if (m.startsWith('http')) return wrap(m, 'var(--accent-green)');
      if (m.startsWith('&quot;')) return wrap(m, '#c792ea');
      if (m.startsWith('--') || /^-[a-zA-Z]$/.test(m)) return wrap(m, 'var(--accent-blue)');
      return wrap(m, 'var(--accent-amber)');
    });
  }

  if (language === 'js') {
    const kw = /^(import|from|export|default|const|let|var|await|async|return|new)$/;
    const re = /(\/\/[^\n]*|\bhttps?:\/\/[^\s'&]+|&quot;.*?&quot;|&#39;.*?&#39;|\b(import|from|export|default|const|let|var|await|async|return|new)\b|\b\d+\b|\b(?:execa|npx|qa-detective-cli|qa-detective)\b)/g;
    return src.replace(re, (m) => {
      if (m.startsWith('//')) return wrap(m, 'var(--text-muted)');
      if (m.startsWith('http')) return wrap(m, 'var(--accent-green)');
      if (m.startsWith('&quot;') || m.startsWith('&#39;')) return wrap(m, '#ecc48d');
      if (kw.test(m)) return wrap(m, '#c792ea');
      if (/^\d+$/.test(m)) return wrap(m, '#f78c6c');
      return wrap(m, 'var(--accent-amber)');
    });
  }

  if (language === 'json') {
    const re = /(&quot;[^\n]*?&quot;\s*:|:\s*&quot;.*?&quot;|\btrue\b|\bfalse\b|\bnull\b|\b\d+\b)/g;
    return src.replace(re, (m) => {
      if (m.endsWith(':')) return wrap(m, 'var(--accent-blue)');
      if (m.startsWith(':')) return `: ${wrap(m.slice(1).trimStart(), '#ecc48d')}`;
      if (m === 'true' || m === 'false' || m === 'null') return wrap(m, '#c792ea');
      if (/^\d+$/.test(m)) return wrap(m, '#f78c6c');
      return wrap(m, 'var(--text-primary)');
    });
  }

  return src;
}

function CodeBlock({ children, language = 'text' }: { children: string; language?: 'bash' | 'js' | 'json' | 'text' }) {
  return (
    <pre
      className="font-mono"
      style={{
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        border: '1px solid var(--border-bright)',
        borderRadius: '2px',
        padding: '12px 14px',
        color: 'var(--text-primary)',
        fontSize: '0.78rem',
        lineHeight: 1.6,
        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
      }}
    >
      <code
        dangerouslySetInnerHTML={{
          __html: highlight(children, language),
        }}
      />
    </pre>
  );
}

export default function DocsHomePage() {
  return (
    <div className="page-container">
      <div style={{ marginBottom: '28px' }}>
        <div
          className="font-mono"
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: 'var(--accent-amber)',
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
              background: 'var(--accent-amber)',
            }}
          />
          Documentation
        </div>

        <h1
          className="font-display"
          style={{ fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', marginTop: '16px', lineHeight: 0.95 }}
        >
          DOCUMENTATION
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            fontWeight: 300,
            maxWidth: '72ch',
            marginTop: '12px',
          }}
        >
          QA Detective has two primary ways to run investigations:
          the web app (this dashboard) and the developer CLI.
          Use the CLI locally or in CI to scan a target URL and generate JSON/PDF reports.
        </p>
      </div>

      <div className="steps-grid" style={{ marginBottom: '18px' }}>
        {[
          { icon: <Search size={24} />, title: 'Crawl', desc: 'Discover pages, links, forms, and navigation.' },
          { icon: <Bot size={24} />, title: 'Generate', desc: 'Create focused test cases using AI.' },
          { icon: <Play size={24} />, title: 'Execute', desc: 'Run tests in a real browser with Playwright.' },
          { icon: <FileText size={24} />, title: 'Report', desc: 'Review findings, grades, and recommendations.' },
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

      <div className="card scanlines" style={{ padding: '26px', marginBottom: '18px' }}>
        <div
          className="font-mono"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Terminal size={16} />
          CLI QUICKSTART
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
          <div>
            <div className="font-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--accent-amber)' }}>
              INSTALL
            </div>
            <div style={{ marginTop: '8px' }}>
              <CodeBlock language="bash">{`npm install -g qa-detective-cli\n# or\nnpx qa-detective-cli --help`}</CodeBlock>
            </div>
          </div>

          <div>
            <div className="font-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--accent-amber)' }}>
              BASIC SCAN
            </div>
            <div style={{ marginTop: '8px' }}>
              <CodeBlock language="bash">{`qa-detective scan https://myapp.com`}</CodeBlock>
            </div>
          </div>

          <div>
            <div className="font-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--accent-amber)' }}>
              AUTHENTICATED SCAN
            </div>
            <div style={{ marginTop: '8px' }}>
              <CodeBlock language="bash">{`qa-detective scan https://myapp.com \
  --auth-email user@site.com \
  --auth-password pass \
  --auth-login-url https://myapp.com/login`}</CodeBlock>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono"
            style={{
              color: 'var(--accent-amber)',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Package size={14} />
            NPM PACKAGE
            <ExternalLink size={14} />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Github size={14} />
            GITHUB
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="card scanlines" style={{ padding: '26px', marginBottom: '18px' }}>
        <div
          className="font-mono"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          CLI OPTIONS (REFERENCE)
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
          {[
            { flag: '--output <file>', desc: 'Write results to a file.' },
            { flag: '--format json|pdf', desc: 'Output format (default: json).' },
            { flag: '--checks <list>', desc: 'Comma-separated checks (security,performance,accessibility,load,lighthouse).' },
            { flag: '--max-pages <n>', desc: 'Max pages to scan (default: 10).' },
            { flag: '--timeout <ms>', desc: 'Navigation timeout (default: 30000).' },
            { flag: '--header <header...>', desc: 'Custom HTTP headers. Repeatable. Example: -H "Authorization: Bearer ..."' },
            { flag: '--fail-on <severity>', desc: 'Exit code 1 if findings at or above severity (info,low,medium,high,critical).' },
          ].map(item => (
            <div
              key={item.flag}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                borderRadius: '2px',
                padding: '12px 14px',
              }}
            >
              <div className="font-mono" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em', fontSize: '0.78rem' }}>
                {item.flag}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginTop: '6px' }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '14px' }}>
          <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            REPORT OUTPUT
          </div>
          <div style={{ marginTop: '8px' }}>
            <CodeBlock language="bash">{`qa-detective scan https://myapp.com --output report.json\nqa-detective scan https://myapp.com --output report.pdf --format pdf`}</CodeBlock>
          </div>
        </div>
      </div>

      <div className="card scanlines" style={{ padding: '26px', marginBottom: '18px' }}>
        <div
          className="font-mono"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Package size={16} />
          DEVELOPER INTEGRATION (NPM)
        </div>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 300, maxWidth: '72ch', marginTop: '12px' }}>
          The published npm package is primarily a CLI tool (it exposes the qa-detective binary).
          For developer integration, the recommended approach is to invoke the CLI from scripts,
          CI pipelines, or Node.js via child_process.
        </p>

        <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
          <div>
            <div className="font-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--accent-amber)' }}>
              CI (FAIL THE PIPELINE ON SEVERITY)
            </div>
            <div style={{ marginTop: '8px' }}>
              <CodeBlock language="bash">{`qa-detective scan https://staging.myapp.com --fail-on high --output report.json`}</CodeBlock>
            </div>
          </div>

          <div>
            <div className="font-mono" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--accent-amber)' }}>
              NODE.JS SCRIPT (PROGRAMMATIC INVOCATION)
            </div>
            <div style={{ marginTop: '8px' }}>
              <CodeBlock language="js">{`import { execa } from 'execa';\n\nawait execa('npx', [\n  'qa-detective-cli',\n  'scan',\n  'https://myapp.com',\n  '--output',\n  'report.json',\n], { stdio: 'inherit' });`}</CodeBlock>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginTop: '8px' }}>
              Tip: if you don’t want to add dependencies, you can also use Node’s built-in child_process.
            </div>
          </div>
        </div>
      </div>

      <div className="card scanlines" style={{ padding: '26px', marginBottom: '18px' }}>
        <div
          className="font-mono"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <GitPullRequest size={16} />
          CONTRIBUTING
        </div>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontWeight: 300, maxWidth: '72ch', marginTop: '12px' }}>
          Contributions are welcome. Please read the contributing guide before opening a PR.
        </p>

        <div style={{ marginTop: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href={CONTRIBUTING_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none' }}
          >
            <ArrowRight size={14} />
            CONTRIBUTING GUIDE
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono"
            style={{
              color: 'var(--accent-amber)',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              alignSelf: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            OPEN REPO
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="card scanlines" style={{ padding: '26px' }}>
        <div className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Quick links
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
          {[
            { href: '/', title: 'Start a new run', desc: 'Open an investigation on a target URL.' },
            { href: '/runs', title: 'View history', desc: 'Browse past runs and reports.' },
            { href: '/about', title: 'About QA Detective', desc: 'Purpose, architecture, and capabilities.' },
            { href: '/donate', title: 'Donate', desc: 'Support QA Detective and help fund continued development.' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{
                textDecoration: 'none',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                borderRadius: '2px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="font-mono" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em', fontSize: '0.78rem' }}>
                  {link.title.toUpperCase()}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginTop: '6px' }}>
                  {link.desc}
                </div>
              </div>
              <ArrowRight size={16} style={{ flexShrink: 0, color: 'var(--accent-amber)' }} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
