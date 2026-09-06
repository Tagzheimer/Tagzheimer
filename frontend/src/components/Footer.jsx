import { Link } from 'react-router-dom';
import { DOCS_URL, REPO_WEB_URL, APP_VERSION } from '../utils/constants';

/**
 * Shared monochrome footer — mirrors the doc-site footer language
 * (canvas #0a0a0a · ink #fafafa · mono · 0px corners · no hue).
 * Used inside the authenticated layout and on public pages.
 */
export default function Footer({ compact = false }) {
  return (
    <footer className="border-t border-hairline bg-surface mt-auto">
      <div className={`w-full max-w-5xl mx-auto px-4 md:px-8 ${compact ? 'py-4' : 'py-6'}`}>
        {/* Link grid is desktop-only — on mobile it would crush page content
            (e.g. the map) under ~400px of footer, so phones get the bottom bar. */}
        {!compact && (
          <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="label-mono mb-3">Product</div>
              <ul className="space-y-2 text-[13px]">
                <li>
                  <Link to="/dashboard" className="text-ink-2 hover:text-ink transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/map" className="text-ink-2 hover:text-ink transition-colors">
                    Map view
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="text-ink-2 hover:text-ink transition-colors">
                    Profile
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="label-mono mb-3">Resources</div>
              <ul className="space-y-2 text-[13px]">
                <li>
                  <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-2 hover:text-ink transition-colors inline-flex items-center gap-1"
                  >
                    Documentation
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href={REPO_WEB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-2 hover:text-ink transition-colors inline-flex items-center gap-1"
                  >
                    GitHub
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="label-mono mb-3">Legal</div>
              <ul className="space-y-2 text-[13px]">
                <li>
                  <Link to="/terms" className="text-ink-2 hover:text-ink transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-ink-2 hover:text-ink transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="label-mono mb-3">System</div>
              <div className="flex items-center gap-1.5 text-[12px] text-ink-2 mb-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-soft" />
                <span className="label-mono">Telemetry online</span>
              </div>
              <p className="text-[11px] text-ink-3 leading-relaxed font-mono">
                Canvas #0a0a0a · Ink #fafafa
                <br />
                Mono · Tabular · 0px corners
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between gap-2 pt-4 border-t border-hairline">
          <p className="text-[11px] text-ink-3 label-mono text-center md:text-left">
            Tagzheimer {APP_VERSION} · Keeping loved ones safe
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/terms" className="text-ink-3 hover:text-ink transition-colors label-mono">
              Terms
            </Link>
            <span className="text-ink-4">·</span>
            <Link to="/privacy" className="text-ink-3 hover:text-ink transition-colors label-mono">
              Privacy
            </Link>
            <span className="text-ink-4">·</span>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-3 hover:text-ink transition-colors label-mono"
            >
              Docs ↗
            </a>
          </div>
        </div>
      </div>
      {/* Bottom padding so mobile BottomNav never covers the footer */}
      <div className="h-16 md:hidden" aria-hidden="true" />
    </footer>
  );
}
