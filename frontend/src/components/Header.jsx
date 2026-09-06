import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DOCS_URL } from '../utils/constants';

export default function Header({ title, onBack, rightAction }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-canvas border-b border-hairline sticky top-0 z-40 safe-top">
      {/* Full-bleed bar — the inner row aligns with the content column. */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8">
      <div className="flex items-center justify-between h-14 md:h-16">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="min-touch flex items-center justify-center -ml-2 text-ink-2 hover:text-ink transition-colors border border-hairline-2 w-9 h-9"
              aria-label="Go back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            {!title ? (
              <>
                <div className="label-mono">Welcome back</div>
                <h1 className="text-[17px] md:text-xl font-semibold text-ink truncate tracking-tight">
                  {user?.name?.split(' ')[0] || 'User'}
                </h1>
              </>
            ) : (
              <h1 className="text-[17px] md:text-xl font-semibold text-ink truncate tracking-tight">
                {title}
              </h1>
            )}
          </div>
        </div>

        <div className="relative flex items-center gap-2 md:hidden">
          {rightAction}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="min-touch flex items-center justify-center border border-hairline-2 w-9 h-9 hover:bg-surface-2 transition-colors"
            aria-label="Open profile menu"
            aria-expanded={menuOpen}
          >
            <span className="text-[13px] font-bold text-ink">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-canvas/60" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-hairline-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-hairline">
                  <div className="label-mono mb-1">Signed in as</div>
                  <p className="text-[14px] font-semibold text-ink truncate">{user?.name}</p>
                  <p className="text-[12px] text-ink-3 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                  className="w-full px-4 py-3 text-left text-[14px] text-ink-2 font-medium tap-highlight hover:bg-surface-2 hover:text-ink transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Profile
                </button>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 text-left text-[14px] text-ink-2 font-medium tap-highlight hover:bg-surface-2 hover:text-ink transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Documentation ↗
                </a>
                <div className="px-4 py-2 border-t border-hairline flex items-center gap-2 text-[11px] label-mono">
                  <Link to="/terms" onClick={() => setMenuOpen(false)} className="text-ink-3 hover:text-ink transition-colors">
                    Terms
                  </Link>
                  <span className="text-ink-4">·</span>
                  <Link to="/privacy" onClick={() => setMenuOpen(false)} className="text-ink-3 hover:text-ink transition-colors">
                    Privacy
                  </Link>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full px-4 py-3 text-left text-[14px] text-ink font-medium tap-highlight hover:bg-surface-2 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
