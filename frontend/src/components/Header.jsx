import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, onBack, rightAction }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 md:rounded-none md:border-b safe-top">
      <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="min-touch flex items-center justify-center -ml-2 text-gray-600"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-[17px] md:text-[20px] font-semibold text-gray-900 truncate">
              {title || `Welcome back, ${user?.name?.split(' ')[0] || 'User'}`}
            </h1>
            {!title && (
              <p className="text-[13px] md:text-[14px] text-gray-500">Tagzheimer Patient Tracker</p>
            )}
          </div>
        </div>

        <div className="relative flex items-center gap-2 md:hidden">
          {rightAction}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="min-touch flex items-center justify-center"
            aria-label="Open profile menu"
            aria-expanded={menuOpen}
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-[15px]">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-[15px] font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-[13px] text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full px-4 py-3 text-left text-[15px] text-danger font-medium tap-highlight"
                >
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
