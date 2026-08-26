import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, onBack, rightAction }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-canvas border-b border-hairline sticky top-0 z-40 safe-top">
      <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-0">
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
    </header>
  );
}
