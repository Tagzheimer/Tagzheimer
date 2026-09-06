import { useNavigate, Link } from 'react-router-dom';
import Footer from './Footer';

/**
 * Shared shell for long-form legal / doc-style pages.
 * Mirrors tagzheimer.github.io/Tagzheimer-doc: topbar with TZ brand mark,
 * eyebrow + hero title, bracket-card body, tabular mono metadata.
 *
 * Props:
 *  - eyebrow: small label above the title (e.g. "Legal · v3.0")
 *  - title: hero title (white part)
 *  - titleDim: dimmed second half of the hero title
 *  - description: hero paragraph
 *  - meta: array of { label, value, sub } rendered as doc-style stat grid
 *  - toc: array of { id, label } rendered as on-page index
 *  - updated: "Last updated …" string
 *  - children: prose sections (each <section id=…>)
 */
export default function LegalLayout({
  eyebrow,
  title,
  titleDim,
  description,
  meta = [],
  toc = [],
  updated,
  children,
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      {/* Topbar — mirrors doc site */}
      <header className="sticky top-0 z-40 h-14 bg-canvas/85 backdrop-blur-md border-b border-hairline">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-full flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="min-touch w-9 h-9 border border-hairline-2 flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 bg-white text-canvas grid place-items-center font-mono font-extrabold text-[13px] tracking-tighter flex-shrink-0">
              TZ
            </span>
            <span className="flex flex-col leading-none min-w-0">
              <span className="font-mono font-bold text-[12px] tracking-[0.14em] uppercase text-ink truncate">
                Tagzheimer
              </span>
              <span className="font-mono text-[10px] tracking-[0.12em] text-ink-3 uppercase">
                Legal · v3.0
              </span>
            </span>
          </Link>
          <nav className="ml-auto hidden sm:flex items-center gap-1">
            <Link
              to="/terms"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-ink px-2.5 py-2 transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-ink px-2.5 py-2 transition-colors"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Hero — doc-site style */}
        <section className="relative border border-hairline bg-surface overflow-hidden mb-6">
          <div
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
            aria-hidden="true"
          />
          <div className="relative p-6 md:p-9">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-ink-3 border border-hairline-2 bg-canvas px-2.5 py-1.5 mb-4">
              <span className="w-1.5 h-1.5 bg-white animate-pulse-soft" aria-hidden="true" />
              {eyebrow}
            </div>
            <h1 className="font-mono font-extrabold tracking-tight leading-[0.95] text-3xl md:text-5xl text-ink max-w-[20ch]">
              {title} <span className="text-ink-3 font-normal">{titleDim}</span>
            </h1>
            <p className="text-[14px] md:text-[15px] text-ink-2 leading-relaxed max-w-[62ch] mt-4">
              {description}
            </p>

            {meta.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline border border-hairline mt-6">
                {meta.map((m) => (
                  <div key={m.label} className="bg-surface-2 p-3.5">
                    <div className="label-mono !text-[10px] mb-1">{m.label}</div>
                    <div className="font-mono font-bold text-[15px] text-ink">{m.value}</div>
                    {m.sub && <div className="font-mono text-[11px] text-ink-3 mt-0.5">{m.sub}</div>}
                  </div>
                ))}
              </div>
            )}

            {updated && (
              <p className="font-mono text-[11px] text-ink-3 mt-4">
                Last updated · <span className="text-ink-2">{updated}</span>
              </p>
            )}
          </div>
        </section>

        <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
          {/* On-page index — sticky on desktop */}
          {toc.length > 0 && (
            <aside className="hidden md:block sticky top-20 border border-hairline bg-surface p-4">
              <div className="label-mono mb-3">On this page</div>
              <nav className="flex flex-col gap-0.5">
                {toc.map((item, i) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="text-[12px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors px-2 py-1.5 border-l-2 border-transparent hover:border-white font-mono"
                  >
                    <span className="text-ink-4 mr-1.5">{String(i + 1).padStart(2, '0')}</span>
                    {item.label}
                  </a>
                ))}
              </nav>
            </aside>
          )}

          {/* Body — bracket-card like doc site */}
          <article className="relative border border-hairline bg-surface p-6 md:p-9 min-w-0">
            <div className="absolute -top-px -left-px w-2 h-2 border-t-2 border-l-2 border-white" aria-hidden="true" />
            <div className="absolute -top-px -right-px w-2 h-2 border-t-2 border-r-2 border-white" aria-hidden="true" />
            <div className="absolute -bottom-px -left-px w-2 h-2 border-b-2 border-l-2 border-white" aria-hidden="true" />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b-2 border-r-2 border-white" aria-hidden="true" />

            {/* Mobile TOC */}
            {toc.length > 0 && (
              <details className="md:hidden border border-hairline bg-canvas mb-6 group">
                <summary className="px-4 py-3 text-[12px] font-mono uppercase tracking-[0.08em] text-ink-2 cursor-pointer list-none flex items-center justify-between tap-highlight">
                  On this page
                  <svg className="w-4 h-4 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <nav className="px-2 pb-2 flex flex-col">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="text-[13px] text-ink-2 hover:text-ink px-2 py-2 font-mono"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </details>
            )}

            <div className="legal-prose">{children}</div>

            {/* Cross-links */}
            <div className="grid sm:grid-cols-2 gap-px bg-hairline border border-hairline mt-10">
              <Link to="/terms" className="bg-surface-2 hover:bg-surface-3 transition-colors p-4 group">
                <div className="label-mono mb-1">Legal · 01</div>
                <div className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  Terms of Service
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>
              <Link to="/privacy" className="bg-surface-2 hover:bg-surface-3 transition-colors p-4 group">
                <div className="label-mono mb-1">Legal · 02</div>
                <div className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  Privacy Policy
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>
            </div>
          </article>
        </div>
      </main>

      <Footer compact />

      {/* Local prose styles — scoped to legal pages so the global theme stays untouched */}
      <style>{`
        .legal-prose { min-width: 0; overflow-wrap: anywhere; }
        .legal-prose section { scroll-margin-top: 5rem; }
        .legal-prose section + section { margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid #262626; }
        .legal-prose h2 { font-family: 'DejaVu Sans Mono', ui-monospace, monospace; font-size: 1.15rem; font-weight: 700; letter-spacing: -0.01em; color: #fafafa; margin: 0 0 0.6rem; display: flex; align-items: baseline; gap: 0.6rem; }
        .legal-prose h2 .sec-no { color: #52525b; font-weight: 400; font-size: 0.85rem; flex-shrink: 0; }
        .legal-prose h3 { font-family: 'DejaVu Sans Mono', ui-monospace, monospace; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #fafafa; margin: 1.4rem 0 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
        .legal-prose h3::before { content: ""; width: 10px; height: 2px; background: #fff; display: inline-block; flex-shrink: 0; }
        .legal-prose p { color: #a3a3a3; font-size: 0.9rem; line-height: 1.75; margin: 0.6rem 0; }
        .legal-prose strong { color: #fafafa; font-weight: 600; }
        .legal-prose ul, .legal-prose ol { margin: 0.6rem 0; padding-left: 1.35rem; color: #a3a3a3; font-size: 0.88rem; line-height: 1.75; }
        .legal-prose li { margin: 0.3rem 0; }
        .legal-prose li::marker { color: #52525b; }
        .legal-prose a { color: #fafafa; text-decoration: underline; text-decoration-color: #404040; text-underline-offset: 3px; }
        .legal-prose a:hover { text-decoration-color: #fafafa; }
        .legal-prose code { font-family: 'DejaVu Sans Mono', ui-monospace, monospace; font-size: 0.78rem; color: #fafafa; background: #1f1f1f; padding: 1px 5px; border: 1px solid #262626; }
        .legal-callout { border: 1px solid #262626; border-left: 3px solid #fff; background: #0f0f0f; padding: 0.75rem 0.9rem; margin: 0.9rem 0; font-size: 0.83rem; line-height: 1.65; color: #a3a3a3; }
        .legal-callout strong { color: #fafafa; }
        .legal-table-wrap { overflow-x: auto; border: 1px solid #262626; margin: 0.8rem 0 1rem; background: #0f0f0f; }
        .legal-table-wrap table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .legal-table-wrap th { font-family: 'DejaVu Sans Mono', ui-monospace, monospace; font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; color: #6b6b6b; text-align: left; padding: 0.6rem 0.75rem; background: #161616; border-bottom: 1px solid #262626; white-space: nowrap; }
        .legal-table-wrap td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #262626; color: #a3a3a3; vertical-align: top; }
        .legal-table-wrap tr:last-child td { border-bottom: none; }
      `}</style>
    </div>
  );
}
