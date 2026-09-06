import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DOCS_URL, REPO_WEB_URL, APP_VERSION } from '../utils/constants';

const mainLinks = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    match: (p) => p === '/dashboard' || p.startsWith('/device/'),
    icon: (active) =>
      active ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
  },
  {
    id: 'map',
    label: 'Map',
    path: '/map',
    match: (p) => p === '/map',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    match: (p) => p === '/profile',
    icon: (active) =>
      active ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentPath = location.pathname;

  const navBtn = (active) =>
    `w-full flex items-center gap-3 px-3 h-10 text-[13px] font-medium transition-colors tap-highlight border ${
      active
        ? 'bg-white text-canvas border-white'
        : 'text-ink-2 hover:text-ink hover:bg-surface-2 border-transparent'
    }`;

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 bg-surface border-r border-hairline z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-hairline">
        <div className="w-8 h-8 border border-hairline-3 flex items-center justify-center relative">
          <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="absolute -top-px -left-px w-1.5 h-1.5 border-t border-l border-white" />
          <div className="absolute -top-px -right-px w-1.5 h-1.5 border-t border-r border-white" />
          <div className="absolute -bottom-px -left-px w-1.5 h-1.5 border-b border-l border-white" />
          <div className="absolute -bottom-px -right-px w-1.5 h-1.5 border-b border-r border-white" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-ink tracking-tight">Tagzheimer</p>
          <p className="text-[10px] text-ink-3 label-mono">Patient Tracker</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        <div>
          <div className="label-mono px-3 pb-2">Navigation</div>
          <div className="space-y-1">
            {mainLinks.map((link) => {
              const active = link.match(currentPath);
              return (
                <button key={link.id} onClick={() => navigate(link.path)} className={navBtn(active)}>
                  {link.icon(active)}
                  {link.label}
                </button>
              );
            })}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('scan:open'))}
              className={navBtn(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
              </svg>
              Scan
            </button>
          </div>
        </div>

        <div>
          <div className="label-mono px-3 pb-2">Resources</div>
          <div className="space-y-1">
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 h-10 text-[13px] font-medium text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors tap-highlight border border-transparent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              Documentation
              <svg className="w-3 h-3 ml-auto text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
            <a
              href={REPO_WEB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 h-10 text-[13px] font-medium text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors tap-highlight border border-transparent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
              GitHub
              <svg className="w-3 h-3 ml-auto text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <div className="label-mono px-3 pb-2">Legal</div>
          <div className="px-3 flex items-center gap-2 text-[12px]">
            <Link to="/terms" className="text-ink-3 hover:text-ink transition-colors">
              Terms
            </Link>
            <span className="text-ink-4">·</span>
            <Link to="/privacy" className="text-ink-3 hover:text-ink transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer / user */}
      <div className="px-3 py-4 border-t border-hairline">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 border border-hairline-3 flex items-center justify-center text-ink font-semibold text-[12px] flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink truncate">{user?.name}</p>
            <p className="text-[11px] text-ink-3 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 h-9 text-[12px] font-medium text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors tap-highlight border border-hairline hover:border-hairline-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Logout
        </button>
        <p className="text-center text-[10px] text-ink-4 mt-3 label-mono">
          Tagzheimer {APP_VERSION}
        </p>
      </div>
    </aside>
  );
}
